/**
 * Clerk Webhook Endpoint
 * 
 * Handles Clerk webhook events for automatic profile synchronization.
 * 
 * Supported events:
 * - user.created: Create profile in Supabase
 * - user.updated: Update profile in Supabase
 * - user.deleted: Mark profile as deleted (optional)
 * 
 * Configure in Clerk Dashboard → Webhooks:
 * - Endpoint: https://your-domain.com/api/clerk/webhook
 * - Events: user.created, user.updated, user.deleted
 * - Signing Secret: CLERK_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { queueWebhookRetry } from '@/lib/webhooks/retry-queue';
import { handleUserCreated, handleUserUpdated, handleUserDeleted } from '@/lib/webhooks/clerk-handlers';


/**
 * POST /api/clerk/webhook
 * 
 * Handles Clerk webhook events
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }

  // Get headers
  const headersList = request.headers;
  const svixId = headersList.get('svix-id');
  const svixTimestamp = headersList.get('svix-timestamp');
  const svixSignature = headersList.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  // Get the body
  // Signatures cover the original bytes, including whitespace and key order.
  const body = await request.text();

  // Verify webhook signature
  const wh = new Webhook(webhookSecret);
  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (err: any) {
    console.error('Clerk webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();

  try {
    // Handle different event types
    switch (event.type) {
      case 'user.created': {
        await handleUserCreated(event, supabase);
        break;
      }

      case 'user.updated': {
        await handleUserUpdated(event, supabase);
        break;
      }

      case 'user.deleted': {
        await handleUserDeleted(event, supabase);
        break;
      }

      default:
        console.log(`Unhandled Clerk event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing Clerk webhook:', error);
    
    // Determine if error is retryable
    const isRetryable = error.code === 'ECONNRESET' || 
                       error.code === 'ETIMEDOUT' ||
                       error.message?.includes('timeout') ||
                       error.message?.includes('network');

    if (isRetryable) {
      // Queue for retry
      await queueWebhookRetry({
        webhookType: 'clerk',
        eventId: svixId,
        eventType: event.type,
        eventData: event,
        error: error.message || 'Unknown error',
      });

      return NextResponse.json(
        { error: 'Processing failed, queued for retry', message: error.message },
        { status: 500 }
      );
    }

    // Permanent error - log but don't retry
    return NextResponse.json({ received: true, error: error.message });
  }
}

