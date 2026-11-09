/**
 * Unified Access Check API Route
 * 
 * Single API endpoint for checking user access.
 * Used by client components that need to know access status.
 * 
 * This is the ONLY client-accessible way to check entitlements.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkUserAccess } from '@/lib/auth/entitlements.server';
import type { PlanTier } from '@/lib/entitlements/types';
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/utils/rate-limit';
import { apiLogger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Try to get userId from middleware header first (most reliable)
    const userIdFromHeader = request.headers.get('x-clerk-user-id');
    
    // Rate limit by userId or IP
    const rateLimitKey = userIdFromHeader || 
      request.headers.get('x-forwarded-for')?.split(',')[0] || 
      'unknown';
    const rateLimit = checkRateLimit(
      `check-access:${rateLimitKey}`,
      RATE_LIMITS.checkAccess.maxRequests,
      RATE_LIMITS.checkAccess.windowMs
    );
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const searchParams = request.nextUrl.searchParams;
    const planParam = searchParams.get('plan');
    
    // Validate plan parameter
    const validPlans: PlanTier[] = ['basic', 'edge', 'pro'];
    const requiredPlan: PlanTier = (planParam && validPlans.includes(planParam as PlanTier))
      ? planParam as PlanTier
      : 'basic';
    
    // Check access using unified function
    const result = await checkUserAccess(userIdFromHeader || undefined, requiredPlan);
    
    return NextResponse.json({
      hasAccess: result.hasAccess,
      isAdmin: result.isAdmin,
      entitlement: result.entitlement,
      userId: result.userId,
      error: result.error,
    });
  } catch (error: any) {
    apiLogger.error('Error in check-access', error);
    return NextResponse.json(
      {
        hasAccess: false,
        isAdmin: false,
        entitlement: null,
        userId: null,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
