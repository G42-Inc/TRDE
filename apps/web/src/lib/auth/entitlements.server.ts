/**
 * Unified Entitlement Check System
 * 
 * Single source of truth for checking user access.
 * All checks happen server-side to prevent race conditions.
 * 
 * Uses React cache() to deduplicate calls within a single server render pass.
 */

import { cache } from 'react';
import { currentUser } from '@clerk/nextjs/server';
import { getClerkUserId } from './clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { PlanTier, Entitlement } from '@/lib/entitlements/types';
import { hasPlanAccess } from '@/lib/entitlements/types';
import { checkIsAdmin } from './admin.server';

export interface AccessCheckResult {
  hasAccess: boolean;
  entitlement: Entitlement | null;
  isAdmin: boolean;
  userId: string | null;
  error?: string;
}

/**
 * Check if a user has access to a required plan tier
 * 
 * This is the SINGLE source of truth for access checks.
 * All entitlement checks should use this function.
 * 
 * Wrapped with React cache() to deduplicate calls within a single
 * server render pass (e.g. layout + page both calling checkUserAccess).
 * 
 * @param userId - Clerk user ID (optional, will fetch from currentUser if not provided)
 * @param requiredPlan - Minimum plan tier required
 * @returns AccessCheckResult with hasAccess, entitlement, and isAdmin status
 */
export const checkUserAccess = cache(async function checkUserAccess(
  userId?: string,
  requiredPlan: PlanTier = 'basic'
): Promise<AccessCheckResult> {
  try {
    const finalUserId = await getClerkUserId();
    if (!finalUserId || (userId && userId !== finalUserId)) {
      return { hasAccess: false, entitlement: null, isAdmin: false, userId: null, error: 'No user authenticated' };
    }

    // Check if user is admin (via Clerk metadata)
    const isAdmin = await checkIsAdmin(finalUserId);
    
    if (isAdmin) {
      // Admins bypass all entitlement checks
      return {
        hasAccess: true,
        entitlement: null,
        isAdmin: true,
        userId: finalUserId,
      };
    }

    // Get entitlement from database
    const entitlement = await getUserEntitlement(finalUserId);
    
    if (!entitlement) {
      return {
        hasAccess: false,
        entitlement: null,
        isAdmin: false,
        userId: finalUserId,
      };
    }

    // Check if entitlement is active
    const isActive = isEntitlementActive(entitlement);
    
    if (!isActive) {
      return {
        hasAccess: false,
        entitlement,
        isAdmin: false,
        userId: finalUserId,
      };
    }

    // Check plan access
    const hasPlan = hasPlanAccess(entitlement.plan, requiredPlan);
    
    return {
      hasAccess: hasPlan,
      entitlement,
      isAdmin: false,
      userId: finalUserId,
    };
  } catch (error: any) {
    console.error('checkUserAccess: Error:', error);
    return {
      hasAccess: false,
      entitlement: null,
      isAdmin: false,
      userId: userId || null,
      error: error.message || 'Unknown error',
    };
  }
});

/**
 * Get user's entitlement from database
 */
async function getUserEntitlement(userId: string): Promise<Entitlement | null> {
  try {
    const supabase = getSupabaseServiceClient();
    
    const { data, error } = await supabase
      .from('entitlements')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('getUserEntitlement: Database error:', error);
      return null;
    }

    return data as Entitlement | null;
  } catch (error: any) {
    console.error('getUserEntitlement: Exception:', error);
    return null;
  }
}

/**
 * Check if entitlement is active
 */
function isEntitlementActive(entitlement: Entitlement): boolean {
  // Check override first (admin-granted access)
  if (entitlement.override_enabled) {
    if (entitlement.override_expires_at) {
      const expiresAt = new Date(entitlement.override_expires_at);
      if (isNaN(expiresAt.getTime())) {
        return false; // Invalid date
      }
      return expiresAt > new Date(); // Not expired
    }
    // No expiration means permanent access
    return true;
  }

  // Demo status grants view-only access
  // Limitations are enforced at the API/UI level, not here
  if (entitlement.status === 'demo') {
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
 * Check if user is in demo mode
 * Useful for UI guards and API restrictions
 */
export async function isUserInDemoMode(userId?: string): Promise<boolean> {
  try {
    let finalUserId = userId;
    
    if (!finalUserId) {
      const user = await currentUser();
      finalUserId = user?.id || undefined;
    }
    
    if (!finalUserId) return false;
    
    const entitlement = await getUserEntitlement(finalUserId);
    return entitlement?.status === 'demo';
  } catch {
    return false;
  }
}

/**
 * Ensure user has at least a demo entitlement
 * Creates one if it doesn't exist
 * 
 * This handles the case where users skip onboarding via the demo button
 * and land directly on a protected route without an entitlement.
 * 
 * @returns true if entitlement exists or was created, false on error
 */
export async function ensureDemoEntitlement(userId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseServiceClient();
    
    // Check if entitlement already exists
    const { data: existing } = await supabase
      .from('entitlements')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (existing) {
      return true; // Already has entitlement
    }
    
    // Ensure profile exists first (foreign key constraint)
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!profile) {
      // Create minimal profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          email: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });
      
      if (profileError) {
        console.error('ensureDemoEntitlement: Failed to create profile:', profileError);
        return false;
      }
      console.log('ensureDemoEntitlement: Created profile for user:', userId);
    }
    
    // Create demo entitlement
    const { error: entitlementError, data: entitlementData } = await supabase
      .from('entitlements')
      .upsert({
        user_id: userId,
        plan: 'basic',
        status: 'demo',
        source: 'manual',
        override_enabled: false,
        notes: 'Auto-created on protected route access (demo flow)',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select();
    
    if (entitlementError) {
      // CRITICAL: Most common cause is database constraint not including 'demo' status
      console.error('ensureDemoEntitlement: CRITICAL - Failed to create entitlement');
      console.error('ensureDemoEntitlement: Error:', entitlementError.message);
      console.error('ensureDemoEntitlement: Code:', entitlementError.code);
      console.error('ensureDemoEntitlement: Details:', entitlementError.details);
      console.error('ensureDemoEntitlement: Hint:', entitlementError.hint);
      console.error('ensureDemoEntitlement: FIX - Run this SQL in Supabase:');
      console.error('  ALTER TABLE entitlements DROP CONSTRAINT IF EXISTS entitlements_status_check;');
      console.error('  ALTER TABLE entitlements ADD CONSTRAINT entitlements_status_check CHECK (status IN (\'active\', \'past_due\', \'canceled\', \'comped\', \'demo\'));');
      return false;
    }
    
    console.log('ensureDemoEntitlement: Created demo entitlement for user:', userId);
    console.log('ensureDemoEntitlement: Data:', entitlementData);
    return true;
  } catch (error: any) {
    console.error('ensureDemoEntitlement: Exception:', error);
    return false;
  }
}

/**
 * Require access - throws error if user doesn't have access
 * Use in server components/actions that require access
 */
export async function requireAccess(
  userId?: string,
  requiredPlan: PlanTier = 'basic'
): Promise<{ userId: string; isAdmin: boolean; entitlement: Entitlement | null }> {
  const result = await checkUserAccess(userId, requiredPlan);
  
  if (!result.hasAccess || !result.userId) {
    throw new Error(`Access denied: ${requiredPlan} plan required`);
  }

  return {
    userId: result.userId,
    isAdmin: result.isAdmin,
    entitlement: result.entitlement,
  };
}
