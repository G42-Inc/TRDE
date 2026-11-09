/**
 * Stripe Webhook Retry Handler
 */

import { getStripeClient } from '@/lib/stripe/client';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { 
  handleCheckoutCompleted, 
  handleSubscriptionUpdate, 
  handleSubscriptionDeleted, 
  handlePaymentSucceeded, 
  handlePaymentFailed 
} from '@/lib/stripe/webhook-handlers';


export async function handleStripeWebhookRetry(webhook: any): Promise<boolean> {
  try {
    const stripe = getStripeClient();
    const supabase = getSupabaseServiceClient();
    const eventType = webhook.event_type;
    // New entries store the Stripe resource; older entries stored event.data.
    const eventData = webhook.event_data?.object && typeof webhook.event_data.object === 'object'
      ? webhook.event_data.object
      : webhook.event_data;
    if (!eventData || typeof eventData !== 'object') return false;

    const { data: previous, error: lookupError } = await supabase
      .from('stripe_webhook_events')
      .select('id, error')
      .eq('stripe_event_id', webhook.webhook_event_id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (previous && !previous.error) return true;

    // Process based on event type
    switch (eventType) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(eventData, supabase, stripe);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(eventData, supabase, stripe);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(eventData, supabase);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(eventData, supabase, stripe);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(eventData, supabase, stripe);
        break;

      default:
        console.log(`Unhandled retry event type: ${eventType}`);
        return false;
    }

    const { error: recordError } = await supabase.from('stripe_webhook_events').upsert({
      stripe_event_id: webhook.webhook_event_id,
      event_type: eventType,
      processed_at: new Date().toISOString(),
      error: null,
    }, { onConflict: 'stripe_event_id' });
    if (recordError) throw recordError;
    return true;
  } catch (error: any) {
    console.error('Error retrying Stripe webhook:', error);
    return false;
  }
}
