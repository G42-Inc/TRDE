import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import type Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe/client';
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';


/**
 * GET /api/billing/verify-session
 * 
 * Verifies a Stripe Checkout session (for UI feedback).
 * The webhook handles the actual entitlement update.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getClerkUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      );
    }

    // Rate limiting
    const rateLimit = checkRateLimit(userId, RATE_LIMITS.verifySession.maxRequests, RATE_LIMITS.verifySession.windowMs);
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

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Billing service not configured' },
        { status: 500 }
      );
    }

    try {
      const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
      
      // Check if session has expired (Stripe checkout sessions expire after 24 hours)
      const sessionAge = Date.now() - (session.created * 1000);
      const sessionAgeHours = sessionAge / (1000 * 60 * 60);
      const SESSION_EXPIRY_HOURS = 24;

      if (sessionAgeHours > SESSION_EXPIRY_HOURS) {
        return NextResponse.json(
          { 
            error: 'Session expired',
            expired: true,
            sessionAgeHours: Math.round(sessionAgeHours * 100) / 100,
          },
          { status: 410 } // 410 Gone - resource has expired
        );
      }

      // Verify the session belongs to this user
      const sessionUserId = session.metadata?.userId || session.client_reference_id;
      if (sessionUserId !== userId) {
        return NextResponse.json(
          { error: 'Invalid session' },
          { status: 403 }
        );
      }

      // Check payment status
      if (session.payment_status === 'unpaid' || session.payment_status === 'no_payment_required') {
        return NextResponse.json(
          { 
            verified: false,
            status: session.payment_status,
            message: 'Payment not completed',
          },
          { status: 402 } // 402 Payment Required
        );
      }

      return NextResponse.json({
        verified: true,
        status: session.payment_status,
        subscriptionId: session.subscription,
        sessionAgeHours: Math.round(sessionAgeHours * 100) / 100,
      });
    } catch (stripeError: any) {
      if (stripeError.code === 'resource_missing') {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      throw stripeError;
    }
  } catch (error: any) {
    console.error('Error verifying session:', error);
    return NextResponse.json(
      { error: 'Failed to verify session', message: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
