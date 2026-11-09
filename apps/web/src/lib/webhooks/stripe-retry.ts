/**
 * Stripe Webhook Retry Handler
 */

import Stripe from 'stripe';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { 
  handleCheckoutCompleted, 
  handleSubscriptionUpdate, 
  handleSubscriptionDeleted, 
  handlePaymentSucceeded, 
  handlePaymentFailed 
} from '@/app/api/billing/webhook/route';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
});

export async function handleStripeWebhookRetry(webhook: any): Promise<boolean> {
  if (!stripe) {
    console.error('Stripe not configured for webhook retry');
    return false;
  }

  try {
    const supabase = getSupabaseServiceClient();
    const eventType = webhook.event_type;
    const eventData = webhook.event_data;

    // Reconstruct Stripe event-like object
    const event: Stripe.Event = {
      id: webhook.webhook_event_id,
      type: eventType as Stripe.Event.Type,
      data: {
        object: eventData,
      },
      created: Math.floor(new Date(webhook.created_at).getTime() / 1000),
      livemode: false,
      pending_webhooks: 0,
      request: null,
      api_version: '2024-11-20.acacia',
    } as Stripe.Event;

    // Process based on event type
    switch (eventType) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(eventData, supabase, stripe);
        return true;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(eventData, supabase, stripe);
        return true;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(eventData, supabase);
        return true;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(eventData, supabase, stripe);
        return true;

      case 'invoice.payment_failed':
        await handlePaymentFailed(eventData, supabase, stripe);
        return true;

      default:
        console.log(`Unhandled retry event type: ${eventType}`);
        return false;
    }
  } catch (error: any) {
    console.error('Error retrying Stripe webhook:', error);
    return false;
  }
}
