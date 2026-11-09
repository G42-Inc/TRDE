import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Public routes that don't require authentication
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/legal(.*)',
  '/api/billing/webhook', // Stripe webhooks don't use Clerk auth
]);

/**
 * Protected routes that require authentication
 */
const isProtectedRoute = createRouteMatcher([
  '/app(.*)',
  '/edge(.*)',
  '/admin(.*)',
  '/trades(.*)',
  '/analytics(.*)',
  '/journal(.*)',
  '/review(.*)',
  '/strategies(.*)',
  '/risk(.*)',
  '/settings(.*)',
  '/api/entitlements(.*)',
  '/api/billing/checkout(.*)',
  '/api/admin(.*)',
  '/api/connections(.*)',
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId } = await auth();
  const pathname = req.nextUrl.pathname;

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protected routes require authentication
  if (isProtectedRoute(req) && !userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Note: Full entitlement checks happen in route handlers/layouts
  // This middleware only ensures authentication is present

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
