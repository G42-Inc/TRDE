import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripeClient, verifyStripeWebhook } from '@/lib/stripe/client';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { handleCheckoutCompleted, handleSubscriptionUpdate, handleSubscriptionDeleted, handlePaymentSucceeded, handlePaymentFailed } from '@/lib/stripe/webhook-handlers';
import { queueWebhookRetry } from '@/lib/webhooks/retry-queue';



// CRITICAL: Disable body parsing for webhook route
// Stripe signature verification requires raw request body
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/webhook
 * 
 * Handles Stripe webhook events for subscription lifecycle management.
 * 
 * Supported events:
 * - checkout.session.completed: New subscription created
 * - customer.subscription.created: Subscription created
 * - customer.subscription.updated: Subscription updated (plan change, status change)
 * - customer.subscription.deleted: Subscription canceled
 * - invoice.payment_succeeded: Successful payment
 * - invoice.payment_failed: Failed payment
 * 
 * All operations are idempotent using event ID tracking.
 * 
 * IMPORTANT: This endpoint requires Stripe CLI to be running for local development:
 *   stripe listen --forward-to localhost:3000/api/billing/webhook
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  // Validate webhook secret
  // CRITICAL: Without this secret, webhooks cannot be verified and will fail
  // This prevents entitlements from being created after successful payments
  if (!webhookSecret || webhookSecret.trim() === '' || webhookSecret === '!') {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured - webhooks will fail!');
    console.error('   Entitlements will NOT be created after payment.');
    console.error('   Add STRIPE_WEBHOOK_SECRET to .env.local');
    console.error('   Get it from: stripe listen --forward-to localhost:3000/api/billing/webhook');
    return NextResponse.json(
      { 
        error: 'Webhook not configured',
        message: 'STRIPE_WEBHOOK_SECRET environment variable is required',
        hint: 'Run "stripe listen --forward-to localhost:3000/api/billing/webhook" and copy the secret',
      },
      { status: 500 }
    );
  }

  // CRITICAL: Read raw body as text for signature verification
  // This MUST be done before any other processing
  let body: string;
  try {
    body = await request.text();
  } catch (error: any) {
    console.error('❌ Failed to read request body:', error.message);
    return NextResponse.json(
      { error: 'Failed to read request body', message: error.message },
      { status: 400 }
    );
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ Missing stripe-signature header');
    console.error('   This usually means the request is not coming from Stripe CLI or Stripe servers.');
    console.error('   Ensure "stripe listen" is running and forwarding to this endpoint.');
    return NextResponse.json(
      { 
        error: 'Missing stripe-signature header',
        hint: 'Ensure Stripe CLI is running: stripe listen --forward-to localhost:3000/api/billing/webhook',
      },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  // Verify webhook signature
  try {
    event = await verifyStripeWebhook(body, signature, webhookSecret);
  } catch {
    // Verification errors can contain request details; never log secrets or bodies.
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  // Implement idempotency: check if we've processed this event before
  const eventId = event.id;
  const { data: processedEvent, error: lookupError } = await supabase
    .from('stripe_webhook_events')
    .select('id, error')
    .eq('stripe_event_id', eventId)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: 'Unable to check webhook delivery' }, { status: 500 });
  }

  // Failed attempts remain eligible for Stripe redelivery.
  if (processedEvent && !processedEvent.error) {
    console.log(`✓ Event ${eventId} already processed, skipping (idempotent)`);
    return NextResponse.json({ received: true, idempotent: true });
  }

  try {
    // Validate event structure before processing
    if (!validateWebhookEvent(event)) {
      console.error('❌ Invalid webhook event structure:', event.id);
      // Mark as processed with error to prevent retries
      await supabase.from('stripe_webhook_events').upsert({
        stripe_event_id: eventId,
        event_type: event.type,
        processed_at: new Date().toISOString(),
        error: 'Invalid event structure',
      }, { onConflict: 'stripe_event_id' });
      return NextResponse.json({ received: true, error: 'Invalid event structure' });
    }

    // Add structured logging for audit trail
    console.log('📨 Processing webhook event:', {
      id: eventId,
      type: event.type,
      userId: (event.data.object as any)?.metadata?.userId || (event.data.object as any)?.client_reference_id,
      timestamp: new Date().toISOString(),
    });

    await handleWebhookEvent(event, supabase, getStripeClient());

    // Mark event as processed (only if no error thrown)
    const { error: recordError } = await supabase.from('stripe_webhook_events').upsert({
      stripe_event_id: eventId,
      event_type: event.type,
      processed_at: new Date().toISOString(),
      error: null,
    }, { onConflict: 'stripe_event_id' });
    if (recordError) throw recordError;

    console.log('✅ Webhook event processed successfully:', {
      eventId,
      type: event.type,
      userId: (event.data.object as any)?.metadata?.userId || (event.data.object as any)?.client_reference_id,
    });

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ Error processing webhook:', error);
    
    // Determine if error is transient (retryable) or permanent (non-retryable)
    const isTransientError = error.code === 'ECONNRESET' || 
                            error.code === 'ETIMEDOUT' ||
                            error.message?.includes('timeout') ||
                            error.message?.includes('network') ||
                            error.message?.includes('ECONNREFUSED');

    // Log error to database
    await supabase.from('stripe_webhook_events').upsert({
      stripe_event_id: eventId,
      event_type: event.type,
      processed_at: new Date().toISOString(),
      error: error.message || 'Unknown error',
    }, { onConflict: 'stripe_event_id' });

    // The local queue supplements Stripe redelivery for known transient errors.
    if (isTransientError) {
      // Queue for retry with exponential backoff
      try { await queueWebhookRetry({
        webhookType: 'stripe',
        eventId: eventId,
        eventType: event.type,
        eventData: event.data.object,
        error: error.message || 'Unknown error',
      }); } catch {
        // Stripe still retries when the local queue itself is unavailable.
        console.error('Unable to queue Stripe webhook retry');
      }

      return NextResponse.json(
        { error: 'Webhook processing failed; retry required' },
        { status: 500 }
      );
    }

    // Handler/database failures must not acknowledge a lost billing update.
    return NextResponse.json({ error: 'Webhook processing failed; retry required' }, { status: 500 });
  }
}

/**
 * Validates webhook event structure before processing
 */
function validateWebhookEvent(event: Stripe.Event): boolean {
  if (!event.id || !event.type || !event.data) {
    console.error('Invalid webhook event structure:', { id: event.id, type: event.type, hasData: !!event.data });
    return false;
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      return !!(session.id && (session.metadata?.userId || session.client_reference_id || session.subscription));

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      return !!(subscription.id && (subscription.metadata?.userId || subscription.metadata?.clerk_user_id || subscription.items?.data?.[0]?.price?.id));

    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      const invoice = event.data.object as Stripe.Invoice;
      return !!(invoice.id && (invoice.subscription || invoice.customer));

    default:
      // For unknown event types, validate basic structure only
      return true;
  }
}

/**
 * Dispatches webhook events to specific handlers
 */
async function handleWebhookEvent(
  event: Stripe.Event,
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  stripe: Stripe
) {
  const eventTimestamp = event.created;

  // For subscription events, log potential race conditions
  if (event.type === 'customer.subscription.updated' || 
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId || subscription.metadata?.clerk_user_id;
    
    if (userId) {
      const { data: recentEvents } = await supabase
        .from('stripe_webhook_events')
        .select('stripe_event_id, event_type, processed_at')
        .eq('event_type', event.type)
        .gte('processed_at', new Date((eventTimestamp - 300) * 1000).toISOString()) // Last 5 minutes
        .order('processed_at', { ascending: false })
        .limit(10);

      // Log for audit if we have recent events (potential race condition)
      if (recentEvents && recentEvents.length > 0) {
        console.log(`Processing ${event.type} event ${event.id} (timestamp: ${eventTimestamp}). Recent events: ${recentEvents.length}. Using event timestamp for ordering.`);
      }
    }
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session, supabase, stripe);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(subscription, supabase, stripe);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription, supabase);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentSucceeded(invoice, supabase, stripe);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice, supabase, stripe);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}
