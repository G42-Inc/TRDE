/**
 * Stripe Customer Management
 * 
 * Handles creating and retrieving Stripe customers for Clerk users.
 * Ensures one-to-one mapping between Clerk users and Stripe customers.
 */

import Stripe from 'stripe';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
});

/**
 * Get or create a Stripe customer for a Clerk user
 * 
 * Uses Supabase to store the mapping between Clerk user_id and Stripe customer_id
 * to ensure we can always retrieve the correct customer.
 * 
 * @param userId - Clerk user ID
 * @param email - User's email (from Clerk)
 * @param name - User's name (optional, from Clerk)
 * @returns Stripe customer object
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email?: string,
  name?: string
): Promise<Stripe.Customer> {
  const supabase = getSupabaseServiceClient();

  try {
    // First, check if we already have a Stripe customer ID for this user
    const { data: existingMapping, error: fetchError } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" - which is fine
      console.error('Error fetching Stripe customer mapping:', fetchError);
      throw new Error('Failed to fetch customer mapping');
    }

    if (existingMapping?.stripe_customer_id) {
      // Customer exists, retrieve from Stripe
      try {
        const customer = await stripe.customers.retrieve(existingMapping.stripe_customer_id);
        if (!customer.deleted) {
          return customer as Stripe.Customer;
        }
        // Customer was deleted in Stripe, create a new one
        console.log('Stripe customer was deleted, creating new one');
      } catch (error: any) {
        if (error.code === 'resource_missing') {
          // Customer doesn't exist in Stripe, create a new one
          console.log('Stripe customer not found, creating new one');
        } else {
          throw error;
        }
      }
    }

    // Create new Stripe customer with idempotency key to prevent duplicates
    // Use userId as idempotency key to ensure only one customer per user
    const customer = await stripe.customers.create({
      email: email,
      name: name,
      metadata: {
        clerk_user_id: userId,
      },
    }, {
      idempotencyKey: `customer_${userId}`,
    });

    // Update customer email if it changed in Clerk (sync email changes)
    // This ensures Stripe customer always has latest email from Clerk
    if (customer.email && email && customer.email !== email) {
      try {
        await stripe.customers.update(customer.id, {
          email: email,
        });
      } catch (updateError) {
        // Log but don't fail - email update is non-critical
        console.log('Could not update customer email:', updateError);
      }
    }

    // Store the mapping in Supabase
    // Use transaction-like logic: check again before inserting to handle race conditions
    const { data: existingAfterCreate } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingAfterCreate?.stripe_customer_id && existingAfterCreate.stripe_customer_id !== customer.id) {
      // Race condition: another request created a customer first
      // Delete the customer we just created and use the existing one
      try {
        await stripe.customers.del(customer.id);
      } catch (deleteError) {
        // Ignore delete errors - customer might already be in use
        console.log('Could not delete duplicate customer:', deleteError);
      }
      
      // Return the existing customer
      const existingCustomer = await stripe.customers.retrieve(existingAfterCreate.stripe_customer_id);
      if (!existingCustomer.deleted) {
        return existingCustomer as Stripe.Customer;
      }
    }

    const { error: insertError } = await supabase
      .from('stripe_customers')
      .upsert({
        user_id: userId,
        stripe_customer_id: customer.id,
        email: email || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (insertError) {
      console.error('Error storing Stripe customer mapping:', insertError);
      // Don't throw - we have the customer, mapping can be retried
    }

    return customer;
  } catch (error: any) {
    console.error('Error getting/creating Stripe customer:', error);
    throw new Error(`Failed to get or create Stripe customer: ${error.message}`);
  }
}

/**
 * Get Stripe customer ID for a Clerk user
 * 
 * @param userId - Clerk user ID
 * @returns Stripe customer ID or null if not found
 */
export async function getStripeCustomerId(userId: string): Promise<string | null> {
  const supabase = getSupabaseServiceClient();

  try {
    const { data, error } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching Stripe customer ID:', error);
      return null;
    }

    return data?.stripe_customer_id || null;
  } catch (error) {
    console.error('Error getting Stripe customer ID:', error);
    return null;
  }
}

/**
 * Get Stripe customer for a Clerk user
 * Also syncs email if it changed in Clerk
 * 
 * @param userId - Clerk user ID
 * @param currentEmail - Current email from Clerk (optional, for syncing)
 * @returns Stripe customer object or null if not found
 */
export async function getStripeCustomer(
  userId: string, 
  currentEmail?: string
): Promise<Stripe.Customer | null> {
  try {
    const customerId = await getStripeCustomerId(userId);
    if (!customerId) {
      return null;
    }

    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return null;
    }

    const stripeCustomer = customer as Stripe.Customer;

    // Sync email if provided and different from Stripe customer email
    if (currentEmail && stripeCustomer.email && stripeCustomer.email !== currentEmail) {
      try {
        await stripe.customers.update(stripeCustomer.id, {
          email: currentEmail,
        });
        // Update local cache
        const supabase = getSupabaseServiceClient();
        await supabase.from('stripe_customers').update({
          email: currentEmail,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId);
      } catch (updateError) {
        // Log but don't fail - email sync is non-critical
        console.log('Could not sync customer email:', updateError);
      }
    }

    return stripeCustomer;
  } catch (error: any) {
    if (error.code === 'resource_missing') {
      return null;
    }
    console.error('Error retrieving Stripe customer:', error);
    return null;
  }
}
