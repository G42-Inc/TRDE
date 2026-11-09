import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/clerk';
import Stripe from 'stripe';
import { getStripeCustomerId } from '@/lib/stripe/customer';
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
});

/**
 * POST /api/billing/portal
 * 
 * Creates a Stripe Customer Portal session for subscription management.
 * Allows users to update payment methods, view invoices, cancel subscriptions, etc.
 * 
 * Response:
 * - portalUrl: Stripe Customer Portal URL to redirect user to
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Billing service not configured' },
        { status: 500 }
      );
    }

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
    const origin = request.nextUrl.origin;

    // Rate limiting
    const rateLimit = checkRateLimit(userId, RATE_LIMITS.portal.maxRequests, RATE_LIMITS.portal.windowMs);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Get Stripe customer ID
    const customerId = await getStripeCustomerId(userId);
    if (!customerId) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 404 }
      );
    }

    // Create portal session with explicit configuration
    // Note: Portal features are configured in Stripe Dashboard → Settings → Billing → Customer Portal
    // This code creates a session - actual features (cancel, update plan, etc.) are configured in Stripe
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
      // Portal features (what users can do) are configured in Stripe Dashboard
      // This is just the session creation - features like subscription cancellation,
      // plan changes, payment method updates are controlled in Stripe Dashboard settings
    });

    return NextResponse.json({ portalUrl: session.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
