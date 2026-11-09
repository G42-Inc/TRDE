import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { PlanTier, EntitlementStatus } from '@/lib/entitlements/types';
import { getPlanFromPriceId } from '@/lib/stripe/prices';
import { queueWebhookRetry } from '@/lib/webhooks/retry-queue';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

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

  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

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
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    console.error('   Check that STRIPE_WEBHOOK_SECRET in .env.local matches the secret from "stripe listen"');
    console.error('   Current secret (first 20 chars):', webhookSecret.substring(0, 20) + '...');
    console.error('   The secret changes every time you restart "stripe listen"');
    console.error('   Solution: Copy NEW secret from stripe listen output → Update .env.local → Restart server');
    return NextResponse.json(
      { 
        error: 'Invalid signature',
        message: err.message,
        hint: 'Verify STRIPE_WEBHOOK_SECRET matches the secret from stripe listen (it changes on restart)',
      },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();

  // Implement idempotency: check if we've processed this event before
  const eventId = event.id;
  const { data: processedEvent } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .maybeSingle();

  if (processedEvent) {
    console.log(`✓ Event ${eventId} already processed, skipping (idempotent)`);
    return NextResponse.json({ received: true, idempotent: true });
  }

  try {
    // Validate event structure before processing
    if (!validateWebhookEvent(event)) {
      console.error('❌ Invalid webhook event structure:', event.id);
      // Mark as processed with error to prevent retries
      await supabase.from('stripe_webhook_events').insert({
        stripe_event_id: eventId,
        event_type: event.type,
        processed_at: new Date().toISOString(),
        error: 'Invalid event structure',
      });
      return NextResponse.json({ received: true, error: 'Invalid event structure' });
    }

    // Add structured logging for audit trail
    console.log('📨 Processing webhook event:', {
      id: eventId,
      type: event.type,
      userId: (event.data.object as any)?.metadata?.userId || (event.data.object as any)?.client_reference_id,
      timestamp: new Date().toISOString(),
    });

    await handleWebhookEvent(event, supabase, stripe);

    // Mark event as processed (only if no error thrown)
    await supabase.from('stripe_webhook_events').insert({
      stripe_event_id: eventId,
      event_type: event.type,
      processed_at: new Date().toISOString(),
    });

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
    await supabase.from('stripe_webhook_events').insert({
      stripe_event_id: eventId,
      event_type: event.type,
      processed_at: new Date().toISOString(),
      error: error.message || 'Unknown error',
    });

    // Return 500 for transient errors (Stripe will retry)
    // Return 200 for permanent errors (prevent retries)
    if (isTransientError) {
      // Queue for retry with exponential backoff
      await queueWebhookRetry({
        webhookType: 'stripe',
        eventId: eventId,
        eventType: event.type,
        eventData: event.data,
        error: error.message || 'Unknown error',
      });

      return NextResponse.json(
        { error: 'Transient error, queued for retry', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true, error: error.message });
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

/**
 * Handle checkout.session.completed event
 * Exported for use in retry handler
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  stripe: Stripe
) {
  console.log('handleCheckoutCompleted: Processing session', { sessionId: session.id, status: session.status });
      const userId = session.metadata?.userId || session.client_reference_id;
  let plan = session.metadata?.plan as PlanTier | undefined;

  if (!userId) {
    const error = 'Missing userId in checkout session';
    console.error(error, { sessionId: session.id });
    throw new Error(error);
  }

  // Get subscription if available
  const subscriptionId = session.subscription as string | null;
  if (!subscriptionId) {
    const error = 'No subscription ID in checkout session';
    console.error(error, { sessionId: session.id, sessionStatus: session.status });
    throw new Error(error);
  }

  // Retry logic for subscription retrieval (Stripe may not have processed it yet)
  let subscription: Stripe.Subscription | undefined;
  let retries = 0;
  const MAX_SUBSCRIPTION_RETRIES = 3;
  const SUBSCRIPTION_RETRY_DELAY = 1000; // 1 second

  while (retries < MAX_SUBSCRIPTION_RETRIES) {
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log(`Subscription retrieved successfully (attempt ${retries + 1}/${MAX_SUBSCRIPTION_RETRIES})`, { subscriptionId });
      break; // Success, exit retry loop
    } catch (error: any) {
      retries++;
      if (retries >= MAX_SUBSCRIPTION_RETRIES) {
        console.error('Failed to retrieve subscription after retries:', {
          subscriptionId,
          error: error.message,
          sessionId: session.id,
        });
        throw new Error(`Failed to retrieve subscription: ${error.message}`);
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, SUBSCRIPTION_RETRY_DELAY * retries));
      console.log(`Retrying subscription retrieval (attempt ${retries + 1}/${MAX_SUBSCRIPTION_RETRIES})`);
    }
  }

  if (!subscription) {
    throw new Error('Failed to retrieve subscription after retries');
  }

  // If plan not in metadata, derive from price ID
  if (!plan) {
    const priceId = subscription.items.data[0]?.price.id;
    if (priceId) {
      plan = getPlanFromPriceId(priceId) || undefined;
      if (plan) {
        console.log('Derived plan from price ID:', { plan, priceId });
      }
    }
  }

  if (!plan) {
    const error = 'Could not determine plan for subscription';
    console.error(error, { subscriptionId, sessionId: session.id });
    throw new Error(error);
  }

  // Determine status based on subscription status
  let status: EntitlementStatus = 'active';
  if (subscription.status === 'past_due') {
    status = 'past_due';
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    status = 'canceled';
  }

      // Upsert entitlement
  const entitlementData = {
        user_id: userId,
        plan,
    status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    source: 'stripe' as const,
        override_enabled: false,
        override_expires_at: null,
        notes: `Stripe subscription: ${subscriptionId}`,
    created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
  };

  console.log('Creating entitlement:', {
    userId,
    plan,
    status,
    subscriptionId,
    periodEnd: entitlementData.current_period_end,
  });

  const { data: upsertedData, error } = await supabase
    .from('entitlements')
    .upsert(entitlementData, {
        onConflict: 'user_id',
    })
    .select();

  if (error) {
    const errorMsg = `Error upserting entitlement: ${error.message}`;
    console.error(errorMsg, {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId,
      plan,
      status,
      subscriptionId,
      entitlementData,
    });
    throw new Error(errorMsg);
  }

  console.log('✅ Entitlement created/updated successfully:', {
    userId,
    plan,
    status,
    subscriptionId,
    periodEnd: entitlementData.current_period_end,
    entitlementId: upsertedData?.[0]?.user_id,
  });
}

export async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  stripe: Stripe
) {
  console.log('handleSubscriptionUpdate: Processing subscription', { subscriptionId: subscription.id, status: subscription.status });
  const userId = subscription.metadata?.userId || subscription.metadata?.clerk_user_id;
  let plan = subscription.metadata?.plan as PlanTier | undefined;

  if (!userId) {
    const error = 'Missing userId in subscription metadata';
    console.error(error, { subscriptionId: subscription.id });
    throw new Error(error);
  }

  if (!plan) {
        const priceId = subscription.items.data[0]?.price.id;
    if (priceId) {
      plan = getPlanFromPriceId(priceId) || undefined;
      if (plan) {
        console.log('Derived plan from price ID:', { plan, priceId });
      }
    }
  }

        if (!plan) {
    const error = 'Could not determine plan for subscription';
    console.error(error, { subscriptionId: subscription.id });
    throw new Error(error);
  }

  let status: EntitlementStatus = 'active';
  switch (subscription.status) {
    case 'active':
    case 'trialing':
      status = 'active';
      break;
    case 'past_due':
      status = 'past_due';
      break;
    case 'canceled':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      status = 'canceled';
      break;
    default:
      console.warn(`Unknown subscription status: ${subscription.status} for subscription ${subscription.id}. Defaulting to active.`);
      status = 'active';
  }

  const periodEnd = new Date(subscription.current_period_end * 1000);
  const now = new Date();
  
  if (status === 'active' && periodEnd <= now) {
    console.warn(`Subscription ${subscription.id} has period_end in past but status is ${subscription.status}. Period end: ${periodEnd.toISOString()}`);
  }

  let notes = `Stripe subscription: ${subscription.id}`;
  if (subscription.status === 'canceled' && subscription.cancellation_details?.reason) {
    notes = `${notes} - Cancellation reason: ${subscription.cancellation_details.reason}`;
    if (subscription.cancellation_details.comment) {
      notes = `${notes} - Comment: ${subscription.cancellation_details.comment}`;
    }
  }

  if (subscription.status === 'trialing' && subscription.trial_end) {
    notes = `${notes} - Trial ends: ${new Date(subscription.trial_end * 1000).toISOString()}`;
  }

  const entitlementData = {
    user_id: userId,
    plan,
    status,
    current_period_end: periodEnd.toISOString(),
    source: 'stripe' as const,
    override_enabled: false,
    override_expires_at: null,
    notes,
    created_at: new Date().toISOString(), // Explicitly set for new records
    updated_at: new Date().toISOString(),
  };

  console.log('Updating entitlement:', {
    userId,
    plan,
    status,
    subscriptionId: subscription.id,
    periodEnd: entitlementData.current_period_end,
  });

  const { data: upsertedData, error } = await supabase.from('entitlements').upsert(entitlementData, {
    onConflict: 'user_id',
  })
  .select();

  if (error) {
    const errorMsg = `Error upserting entitlement: ${error.message}`;
    console.error(errorMsg, {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId,
      plan,
      status,
      subscriptionId: subscription.id,
      entitlementData,
    });
    throw new Error(errorMsg);
  }
  console.log('✅ Entitlement updated successfully:', {
    userId,
    plan,
    status,
    subscriptionId: subscription.id,
    periodEnd: entitlementData.current_period_end,
    entitlementId: upsertedData?.[0]?.user_id,
  });
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof getSupabaseServiceClient>
) {
  console.log('handleSubscriptionDeleted: Processing subscription deletion', { subscriptionId: subscription.id });
  const userId = subscription.metadata?.userId || subscription.metadata?.clerk_user_id;

  if (!userId) {
    const error = 'Missing userId in subscription metadata';
    console.error(error, { subscriptionId: subscription.id });
    throw new Error(error);
  }

  let notes = `Stripe subscription: ${subscription.id} - Canceled`;
  if (subscription.cancellation_details?.reason) {
    notes = `${notes} - Reason: ${subscription.cancellation_details.reason}`;
    if (subscription.cancellation_details.comment) {
      notes = `${notes} - Comment: ${subscription.cancellation_details.comment}`;
    }
  }

  console.log('Marking entitlement as canceled:', { userId, subscriptionId: subscription.id });
  const { data: updatedData, error } = await supabase.from('entitlements').update({
    status: 'canceled' as EntitlementStatus,
    current_period_end: new Date().toISOString(), // Set to now for canceled subscriptions
    notes,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)
  .select();

  if (error) {
    const errorMsg = `Error updating entitlement on deletion: ${error.message}`;
    console.error(errorMsg, {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId,
      subscriptionId: subscription.id,
    });
    throw new Error(errorMsg);
  }
  console.log('✅ Entitlement marked as canceled successfully:', {
    userId,
    subscriptionId: subscription.id,
    entitlementId: updatedData?.[0]?.user_id,
  });
}

export async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  stripe: Stripe
) {
  console.log('handlePaymentSucceeded: Processing invoice payment succeeded', { invoiceId: invoice.id, subscriptionId: invoice.subscription });
  const subscriptionId = invoice.subscription as string | null;
  if (!subscriptionId) {
    console.log('No subscription ID in invoice, skipping payment succeeded handler');
    return; // Not a subscription-related invoice
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId || subscription.metadata?.clerk_user_id;

    if (userId) {
      let status: EntitlementStatus = 'active';
      if (subscription.status === 'past_due') {
        status = 'past_due';
      } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
        status = 'canceled';
      }

      console.log('Updating entitlement status on payment succeeded:', { userId, subscriptionId, status });
      const { data: updatedData, error } = await supabase.from('entitlements').update({
        status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId)
      .select();

      if (error) {
        const errorMsg = `Error updating entitlement on payment succeeded: ${error.message}`;
        console.error(errorMsg, {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          userId,
          subscriptionId,
        });
        throw new Error(errorMsg);
      }
      console.log('✅ Entitlement status updated successfully on payment succeeded:', {
        userId,
        subscriptionId,
        status,
        entitlementId: updatedData?.[0]?.user_id,
      });
    } else {
      console.warn('Payment succeeded for subscription without associated userId in metadata:', { subscriptionId, invoiceId: invoice.id });
    }
  } catch (error: any) {
    console.error('Error handling payment succeeded:', error);
    throw error;
  }
}

export async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  stripe: Stripe
) {
  console.log('handlePaymentFailed: Processing invoice payment failed', { invoiceId: invoice.id, subscriptionId: invoice.subscription });
  const subscriptionId = invoice.subscription as string | null;
  if (!subscriptionId) {
    console.log('No subscription ID in invoice, skipping payment failed handler');
    return; // Not a subscription-related invoice
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId || subscription.metadata?.clerk_user_id;

      if (userId) {
      let status: EntitlementStatus = 'past_due';
      switch (subscription.status) {
        case 'canceled':
        case 'unpaid':
        case 'incomplete':
        case 'incomplete_expired':
          status = 'canceled';
          break;
        case 'active':
        case 'trialing':
          status = 'past_due';
          break;
        case 'past_due':
          status = 'past_due';
          break;
        default:
          console.warn(`Unknown subscription status: ${subscription.status} for subscription ${subscriptionId}. Defaulting to past_due.`);
          status = 'past_due';
      }

      console.log('Updating entitlement status on payment failed:', { userId, subscriptionId, status });
      const { data: updatedData, error } = await supabase.from('entitlements').update({
        status,
          updated_at: new Date().toISOString(),
      }).eq('user_id', userId)
      .select();

      if (error) {
        const errorMsg = `Error updating entitlement on payment failed: ${error.message}`;
        console.error(errorMsg, {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          userId,
          subscriptionId,
        });
        throw new Error(errorMsg);
      }
      console.log('✅ Entitlement status updated successfully on payment failed:', {
        userId,
        subscriptionId,
        status,
        entitlementId: updatedData?.[0]?.user_id,
      });
    } else {
      console.warn('Payment failed for subscription without associated userId in metadata:', { subscriptionId, invoiceId: invoice.id });
    }
  } catch (error: any) {
    console.error('Error handling payment failed:', error);
    throw error;
  }
}
