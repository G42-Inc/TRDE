import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { PlanTier, Entitlement } from './types';
import { hasPlanAccess } from './types';

/**
 * Get user's current entitlement from database
 * Returns null if no entitlement found
 */
export async function getUserEntitlement(userId: string): Promise<Entitlement | null> {
  try {
    console.log('getUserEntitlement: Starting fetch for user:', userId);
    console.log('getUserEntitlement: userId type:', typeof userId, 'length:', userId?.length);
    console.log('getUserEntitlement: userId value:', JSON.stringify(userId));
    
    const supabase = getSupabaseServiceClient();
    console.log('getUserEntitlement: Supabase client created');
    
    // First, let's check if the table exists and has any data
    const { data: allData, error: countError } = await supabase
      .from('entitlements')
      .select('user_id')
      .limit(5);
    
    console.log('getUserEntitlement: Sample entitlements in DB:', {
      count: allData?.length || 0,
      userIds: allData?.map(e => e.user_id) || [],
      error: countError,
    });
    
    // Now query for the specific user
    // Log the exact query we're about to run
    console.log('getUserEntitlement: About to query with:', {
      table: 'entitlements',
      column: 'user_id',
      value: userId,
      valueType: typeof userId,
      valueLength: userId?.length,
      valueJSON: JSON.stringify(userId),
      valueBytes: Buffer.from(userId || '').toString('hex'),
    });
    
    const { data, error } = await supabase
      .from('entitlements')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() - returns null if no rows instead of error

    console.log('getUserEntitlement: Query result:', {
      hasData: !!data,
      hasError: !!error,
      error: error ? {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      } : null,
      searchedUserId: userId,
      searchedUserIdJSON: JSON.stringify(userId),
      foundUserId: data?.user_id,
      foundUserIdJSON: data?.user_id ? JSON.stringify(data.user_id) : null,
      userIdsMatch: data?.user_id === userId,
      userIdsMatchStrict: data?.user_id === userId,
      searchedLength: userId?.length,
      foundLength: data?.user_id?.length,
      // Character-by-character comparison
      charComparison: userId && data?.user_id ? {
        sameLength: userId.length === data.user_id.length,
        firstChar: { searched: userId[0], found: data.user_id[0], match: userId[0] === data.user_id[0] },
        lastChar: { searched: userId[userId.length - 1], found: data.user_id[data.user_id.length - 1], match: userId[userId.length - 1] === data.user_id[data.user_id.length - 1] },
      } : null,
    });

    if (error) {
      console.error('getUserEntitlement: Supabase query error:', error);
      console.error('getUserEntitlement: Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      console.error('getUserEntitlement: User ID:', userId);
      return null;
    }

    if (!data) {
      console.log('getUserEntitlement: No entitlement found for user:', userId);
      console.log('getUserEntitlement: This means the query returned no rows - userId may not exist in database');
      return null;
    }

    console.log('getUserEntitlement: Found entitlement for user:', userId, {
      plan: data.plan,
      status: data.status,
      override_enabled: data.override_enabled,
      override_expires_at: data.override_expires_at,
      current_period_end: data.current_period_end,
      userId: data.user_id, // Log to verify match
    });

    return data as Entitlement;
  } catch (error: any) {
    console.error('getUserEntitlement: Exception caught:', error);
    console.error('getUserEntitlement: Exception details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw error; // Re-throw to be caught by the API route
  }
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
