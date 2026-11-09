/**
 * Stripe Price ID Validation at Startup
 * 
 * Validates that all Stripe price IDs are configured correctly.
 * Call this at application startup to fail fast if configuration is incorrect.
 */

import { validatePriceIds, PLAN_PRICE_IDS } from './prices';

/**
 * Validate Stripe price IDs and throw error if invalid
 * Call this at application startup (e.g., in middleware or startup script)
 */
export function validateStripePriceIds(): void {
  if (!validatePriceIds()) {
    const missing: string[] = [];
    const invalid: string[] = [];

    Object.entries(PLAN_PRICE_IDS).forEach(([plan, priceId]) => {
      if (!priceId || priceId.trim() === '') {
        missing.push(plan);
      } else if (!priceId.startsWith('price_')) {
        invalid.push(plan);
      }
    });

    const errors: string[] = [];
    if (missing.length > 0) {
      errors.push(`Missing price IDs: ${missing.join(', ')}`);
    }
    if (invalid.length > 0) {
      errors.push(`Invalid price ID format (must start with "price_"): ${invalid.join(', ')}`);
    }

    throw new Error(
      `Stripe price ID validation failed:\n\n${errors.join('\n')}\n\n` +
      `Please set the following environment variables:\n` +
      `- STRIPE_PRICE_ID_BASIC\n` +
      `- STRIPE_PRICE_ID_EDGE\n` +
      `- STRIPE_PRICE_ID_PRO\n\n` +
      `Get your price IDs from Stripe Dashboard → Products → Prices`
    );
  }
}
