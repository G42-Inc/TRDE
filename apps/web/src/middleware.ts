/**
 * Simplified Middleware
 * 
 * Only handles Clerk authentication.
 * Entitlement checks happen in server components/layouts.
 * This prevents race conditions and simplifies the flow.
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Validate application configuration at startup
// This runs once when the middleware module is loaded
try {
  // Only validate in production or when explicitly enabled
  // In development, we allow missing env vars for flexibility
  if (process.env.NODE_ENV === 'production' || process.env.VALIDATE_ENV === 'true') {
    const { validateApplicationStartup } = require('@/lib/startup-validation');
    validateApplicationStartup();
  }
} catch (error) {
  // Log but don't crash - validation errors will show in logs
  console.error('Startup validation error (non-fatal):', error);
}

/**
 * Public routes that don't require authentication
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/login(.*)',
  '/legal(.*)',
  '/support(.*)',
  '/faq(.*)',
  '/guides(.*)',
  '/auth-redirect',
  '/api/billing/webhook', // Stripe webhooks
  '/api/clerk/webhook', // Clerk webhooks
  '/api/webhooks/retry', // Webhook retry processor (requires API key)
]);

/**
 * Protected routes that require authentication
 * Note: Entitlement checks happen in server components, not middleware
 */
const isProtectedRoute = createRouteMatcher([
  '/app(.*)',
  '/edge(.*)',
  '/flow(.*)',
  '/admin(.*)',
  '/trades(.*)',
  '/analytics(.*)',
  '/performance(.*)',
  '/journal(.*)',
  '/review(.*)',
  '/strategies(.*)',
  '/risk(.*)',
  '/settings(.*)',
  '/welcome(.*)', // Onboarding flow - requires auth but not entitlement
  '/api/entitlements(.*)',
  '/api/billing(.*)',
  '/api/auth(.*)',
  '/api/edge(.*)',
  '/api/settings(.*)',
  '/api/admin(.*)',
  '/api/connections(.*)',
  '/api/data(.*)',
  '/api/flow(.*)',
  '/api/preferences(.*)', // User preferences API
  '/api/achievements(.*)',
  '/api/insights(.*)',
  '/api/streaks(.*)',
  '/api/feedback(.*)', // Feedback submissions
  '/api/notifications(.*)', // Notification preferences
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname;
  
  // Always call auth() to ensure Clerk's auth context is available
  // This is required for server components to use auth() or currentUser()
  const { userId } = await auth();

  // Never forward a caller-supplied identity, including on public routes and
  // routes outside isProtectedRoute. Legacy handlers consume this header.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete('x-clerk-user-id');
  if (userId) {
    requestHeaders.set('x-clerk-user-id', userId);
  }

  const next = () => NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Allow public routes - auth context is now set up even if no userId
  if (isPublicRoute(req)) {
    return next();
  }

  // Protected routes require authentication
  if (isProtectedRoute(req) && !userId) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Note: Entitlement checks happen in server components/layouts
  // This middleware only ensures authentication is present

  return next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
