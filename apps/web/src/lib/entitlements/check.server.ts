import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { PlanTier, Entitlement } from './types';
import { hasPlanAccess } from './types';

/**
 * Get user's current entitlement from database
 * Returns null if no entitlement found
 */
export async function getUserEntitlement(userId: string): Promise<Entitlement | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('entitlements')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('getUserEntitlement: entitlement lookup failed');
    return null;
  }

  return data as Entitlement | null;
}

/**
 * Check if user has an active entitlement
 * Active means: status is 'active' or 'comped', and not expired
 */
export function isEntitlementActive(entitlement: Entitlement | null): boolean {
  if (!entitlement) return false;

  // Check override first (admin-granted access)
  if (entitlement.override_enabled) {
    // Handle null, undefined, empty string, or Date object for override_expires_at
    // TIMESTAMPTZ in Supabase comes back as a string, but check for both
    let expiresAt: Date | null = null;
    
    if (entitlement.override_expires_at) {
      if (typeof entitlement.override_expires_at === 'string') {
        // If it's a string, check if it's not empty
        const trimmed = entitlement.override_expires_at.trim();
        if (trimmed !== '') {
          expiresAt = new Date(trimmed);
          // Check if date is valid
          if (isNaN(expiresAt.getTime())) {
            expiresAt = null; // Invalid date
          }
        }
      } else if (entitlement.override_expires_at && typeof entitlement.override_expires_at === 'object' && 'getTime' in entitlement.override_expires_at) {
        // Check if it's a Date object (works at runtime even if TypeScript doesn't allow instanceof)
        expiresAt = entitlement.override_expires_at as Date;
      } else {
        // Try to parse as date
        expiresAt = new Date(entitlement.override_expires_at);
        if (isNaN(expiresAt.getTime())) {
          expiresAt = null;
        }
      }
    }
    
    if (expiresAt) {
      if (expiresAt < new Date()) {
        return false; // Override expired
      }
    }
    // Override is active (no expiration or not expired)
    return true;
  }

  // Check regular subscription status
  if (entitlement.status !== 'active' && entitlement.status !== 'comped') {
    return false;
  }

  // Check if subscription period has ended
  if (entitlement.current_period_end) {
    const periodEnd = new Date(entitlement.current_period_end);
    if (isNaN(periodEnd.getTime()) || periodEnd < new Date()) {
      return false; // Period ended or invalid date
    }
  }

  return true;
}

/**
 * Check if user has access to a required plan tier
 * Returns { hasAccess: boolean, entitlement: Entitlement | null }
 */
export async function checkEntitlementAccess(
  userId: string,
  requiredPlan: PlanTier
): Promise<{ hasAccess: boolean; entitlement: Entitlement | null }> {
  const entitlement = await getUserEntitlement(userId);
  
  if (!entitlement) {
    return { hasAccess: false, entitlement: null };
  }

  const isActive = isEntitlementActive(entitlement);
  if (!isActive) {
    return { hasAccess: false, entitlement };
  }

  const hasAccess = hasPlanAccess(entitlement.plan, requiredPlan);
  return { hasAccess, entitlement };
}

/**
 * Require entitlement access - throws if user doesn't have access
 * Use in server components/actions
 */
export async function requireEntitlement(
  userId: string,
  requiredPlan: PlanTier
): Promise<Entitlement> {
  const { hasAccess, entitlement } = await checkEntitlementAccess(userId, requiredPlan);
  
  if (!hasAccess || !entitlement) {
    throw new Error(`Access denied: ${requiredPlan} plan required`);
  }

  return entitlement;
}
