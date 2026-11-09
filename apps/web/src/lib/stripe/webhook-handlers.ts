import type Stripe from 'stripe';
import type { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { PlanTier, EntitlementStatus } from '@/lib/entitlements/types';
import { getPlanFromPriceId } from '@/lib/stripe/prices';

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
