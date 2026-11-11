/**
 * Stripe Price ID Management
 * 
 * Maps plan tiers to Stripe price IDs and handles validation.
 */

import type { PlanTier } from '@/lib/entitlements/types';

/**
 * Map plan tiers to Stripe price IDs
 * 
 * These should be set as environment variables:
 * - STRIPE_PRICE_ID_BASIC
 * - STRIPE_PRICE_ID_EDGE
 * - STRIPE_PRICE_ID_PRO
 * 
 * To get your price IDs:
 * 1. Go to Stripe Dashboard → Products
 * 2. Create products for each plan tier
 * 3. Create prices (recurring monthly) for each product
 * 4. Copy the Price ID (starts with price_)
 * 5. Set as environment variables
 */
export const PLAN_PRICE_IDS: Record<PlanTier, string> = {
  get basic() { return process.env.STRIPE_PRICE_ID_BASIC || ''; },
  get edge() { return process.env.STRIPE_PRICE_ID_EDGE || ''; },
  get pro() { return process.env.STRIPE_PRICE_ID_PRO || ''; },
};

/**
 * Plan tier display information
 */
export const PLAN_INFO: Record<PlanTier, { name: string; price: number }> = {
  basic: {
    name: 'TRDE Basic',
    price: 9.99,
  },
  edge: {
    name: 'TRDE Edge',
    price: 14.99,
  },
  pro: {
    name: 'TRDE Pro',
    price: 19.99,
  },
};

/**
 * Validate that all price IDs are configured
 * 
 * Validates:
 * - Price IDs are not empty
 * - Price IDs start with 'price_'
 * - Price IDs have minimum length (Stripe price IDs are typically 28+ characters)
 * 
 * @returns true if all price IDs are configured, false otherwise
 */
export function validatePriceIds(): boolean {
  return Object.values(PLAN_PRICE_IDS).every(id => {
    // Validate format: must start with 'price_' and be at least 10 characters
    // Real Stripe price IDs are typically 28+ characters, but we allow shorter for test IDs
    return id.length > 0 && 
           id.startsWith('price_') && 
           id.length >= 10 &&
           /^price_[a-zA-Z0-9_]+$/.test(id); // Alphanumeric and underscores only
  });
}

/**
 * Get price ID for a plan tier
 * 
 * @param plan - Plan tier
 * @returns Price ID or null if not configured
 */
export function getPriceId(plan: PlanTier): string | null {
  const priceId = PLAN_PRICE_IDS[plan];
  if (!priceId || !priceId.startsWith('price_')) {
    return null;
  }
  return priceId;
}

/**
 * Get plan tier from price ID (reverse lookup)
 * 
 * Resolve runtime price configuration after Worker secrets are initialized.
 * 
 * @param priceId - Stripe price ID
 * @returns Plan tier or null if not found
 */
export function getPlanFromPriceId(priceId: string): PlanTier | null {
  return (Object.entries(PLAN_PRICE_IDS).find(([, configured]) => configured && configured === priceId)?.[0] as PlanTier | undefined) ?? null;
}
