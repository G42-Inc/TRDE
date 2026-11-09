/**
 * Subscription plan tiers
 */
export type PlanTier = 'basic' | 'edge' | 'pro';

/**
 * Entitlement status
 * - active: Paid subscription active
 * - past_due: Payment failed, grace period
 * - canceled: Subscription canceled
 * - comped: Complimentary access (admin granted)
 * - demo: View-only demo mode (can browse, cannot write)
 */
export type EntitlementStatus = 'active' | 'past_due' | 'canceled' | 'comped' | 'demo';

/**
 * Entitlement source
 */
export type EntitlementSource = 'stripe' | 'manual';

/**
 * Entitlement record from database
 */
export interface Entitlement {
  user_id: string;
  plan: PlanTier;
  status: EntitlementStatus;
  current_period_end: string | null;
  source: EntitlementSource;
  override_enabled: boolean;
  override_expires_at: string | null;
  notes: string | null;
  updated_at: string;
}

/**
 * Plan hierarchy for access checks
 */
export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  basic: 1,
  edge: 2,
  pro: 3,
};

/**
 * Check if a plan tier has access to a required tier
 */
export function hasPlanAccess(userPlan: PlanTier | null, requiredPlan: PlanTier): boolean {
  if (!userPlan) return false;
  return PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[requiredPlan];
}
