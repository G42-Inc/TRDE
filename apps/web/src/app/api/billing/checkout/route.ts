import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId, getClerkUser } from '@/lib/auth/clerk';
import type Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe/client';
import type { PlanTier } from '@/lib/entitlements/types';
import { getOrCreateStripeCustomer } from '@/lib/stripe/customer';
import { getPriceId, validatePriceIds } from '@/lib/stripe/prices';
import { checkUserAccess } from '@/lib/auth/entitlements.server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';
import { CheckoutRequestSchema, validateBody } from '@/lib/validation/schemas';


/**
 * POST /api/billing/checkout
 * 
 * Creates a Stripe Checkout session for subscription purchase.
 * 
 * Request body:
 * - plan: 'basic' | 'edge' | 'pro'
 * 
 * Response:
 * - checkoutUrl: Stripe Checkout URL to redirect user to
 */
export async function POST(request: NextRequest) {
  try {
    // Validate Stripe configuration
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not configured');
      return NextResponse.json(
        { error: 'Billing service not configured' },
        { status: 500 }
      );
    }

    if (!validatePriceIds()) {
      console.error('Stripe price IDs not configured');
      return NextResponse.json(
        { error: 'Billing service not configured' },
        { status: 500 }
      );
    }

    const userId = await getClerkUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    
    // Get user details for email/name - but only if we can do it without errors
    // We'll try to get email/name, but if it fails, we'll use minimal data
    let email: string | undefined;
    let name: string | undefined;
    
    // Try to get user details, but don't fail if it doesn't work
    // The verified userId is sufficient for checkout - email/name are optional
    try {
      const user = await getClerkUser();
      if (user && user.id === userId) {
        email = user.emailAddresses?.[0]?.emailAddress || undefined;
        name = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`
          : user.username || email || undefined;
      }
    } catch (error: any) {
      // Silently continue - we can create checkout without email/name
      // Stripe will collect this information during checkout if needed
      console.log('Could not fetch user details, proceeding with userId only');
    }

    // Rate limiting - prevent abuse
    const rateLimit = checkRateLimit(userId, RATE_LIMITS.checkout.maxRequests, RATE_LIMITS.checkout.windowMs);
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
            'X-RateLimit-Limit': RATE_LIMITS.checkout.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate input with Zod schema
    const validation = validateBody(body, CheckoutRequestSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: `Validation error: ${validation.error}` },
        { status: 400 }
      );
    }

    const { plan, mode } = validation.data;
    const planTier = plan as PlanTier;

    // Get price ID for plan
    const priceId = getPriceId(planTier);
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for plan: ${planTier}` },
        { status: 500 }
      );
    }

    // Check if user already has an active subscription
    const accessCheck = await checkUserAccess(userId, 'basic');
    if (accessCheck.hasAccess && accessCheck.entitlement) {
      const currentPlan = accessCheck.entitlement.plan;
      const currentStatus = accessCheck.entitlement.status;
      
      // Demo users can always start a new subscription (they have no Stripe subscription yet)
      if (currentStatus === 'demo') {
        // Allow checkout - this will convert demo to paid subscription
        console.log(`[Checkout] Demo user ${userId} starting subscription for plan: ${planTier}`);
      } else {
        // User has an actual paid subscription
        const PLAN_HIERARCHY: Record<PlanTier, number> = {
          basic: 1,
          edge: 2,
          pro: 3,
        };

        // Check if this is an upgrade (new plan is higher tier)
        const currentTier = PLAN_HIERARCHY[currentPlan];
        const newTier = PLAN_HIERARCHY[planTier];

        if (newTier <= currentTier) {
          // Same or lower tier - redirect to portal for changes
          return NextResponse.json(
            { 
              error: 'You already have an active subscription. Please use the customer portal to change your plan.',
              hasSubscription: true,
              currentPlan: currentPlan,
              redirectToPortal: true,
            },
            { status: 400 }
          );
        }
        // Allow upgrade - checkout will create new subscription and cancel old one via Stripe
        // Webhook will handle the plan change
      }
    }

    // Get or create Stripe customer
    // email and name are already set from above (or undefined if getClerkUser failed)
    let customer;
    try {
      customer = await getOrCreateStripeCustomer(userId, email, name);
    } catch (error: any) {
      console.error('Error getting/creating Stripe customer:', error);
      return NextResponse.json(
        { error: 'Failed to initialize billing account' },
        { status: 500 }
      );
    }

    // Create Stripe Checkout Session
    const origin = request.nextUrl.origin;
    
    // Base session configuration
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: userId,
      metadata: {
        userId,
        plan: planTier,
        clerk_user_id: userId,
      },
      subscription_data: {
        metadata: {
          userId,
          plan: planTier,
          clerk_user_id: userId,
        },
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address for better fraud prevention
      billing_address_collection: 'auto',
      // Automatically save payment method for future payments
      payment_method_collection: 'always',
    };

    // Configure based on mode
    if (mode === 'embedded') {
      // Embedded checkout - returns client_secret for embedding in page
      sessionConfig.ui_mode = 'embedded';
      sessionConfig.return_url = `${origin}/app/checkout-success?session_id={CHECKOUT_SESSION_ID}`;
    } else {
      // Redirect checkout - returns URL for redirect
      sessionConfig.success_url = `${origin}/app/checkout-success?session_id={CHECKOUT_SESSION_ID}`;
      sessionConfig.cancel_url = `${origin}/pricing?checkout=canceled`;
    }

    const session = await getStripeClient().checkout.sessions.create(sessionConfig);

    // Return appropriate response based on mode
    if (mode === 'embedded') {
      if (!session.client_secret) {
        return NextResponse.json(
          { error: 'Failed to create embedded checkout session' },
          { status: 500 }
        );
      }
      return NextResponse.json({ 
        clientSecret: session.client_secret,
        sessionId: session.id,
      });
    } else {
      if (!session.url) {
        return NextResponse.json(
          { error: 'Failed to create checkout session' },
          { status: 500 }
        );
      }
      return NextResponse.json({ 
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    }
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    
    // Don't expose internal errors to client
    return NextResponse.json(
      { error: 'Failed to create checkout session. Please try again.' },
      { status: 500 }
    );
  }
}
