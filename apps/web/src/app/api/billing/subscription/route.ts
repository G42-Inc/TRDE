import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/clerk';
import { checkUserAccess } from '@/lib/auth/entitlements.server';

/**
 * GET /api/billing/subscription
 * 
 * Gets the current user's subscription information.
 * 
 * Response:
 * - plan: Current plan tier ('basic', 'edge', 'pro', or 'none')
 * - status: Subscription status ('active', 'past_due', 'canceled', 'comped')
 * - periodEnd: ISO string of when current period ends (or null)
 * - hasSubscription: Boolean indicating if user has any subscription
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user - prioritize header from middleware to avoid auth() detection issues
    let userId: string | null = request.headers.get('x-clerk-user-id');
    
    // Fallback to requireAuth if header not available
    if (!userId) {
      try {
        userId = await requireAuth();
      } catch (error: any) {
        return NextResponse.json(
          { error: 'Unauthorized: Authentication required' },
          { status: 401 }
        );
      }
    }
    
    const accessCheck = await checkUserAccess(userId, 'basic');

    if (!accessCheck.entitlement) {
      return NextResponse.json({
        plan: 'none',
        status: 'canceled',
        periodEnd: null,
        hasSubscription: false,
      });
    }

    return NextResponse.json({
      plan: accessCheck.entitlement.plan,
      status: accessCheck.entitlement.status,
      periodEnd: accessCheck.entitlement.current_period_end,
      hasSubscription: true,
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
