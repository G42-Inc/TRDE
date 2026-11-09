/**
 * Route utilities for dashboard vs public page detection
 */

/**
 * Check if a pathname is a dashboard route
 * Dashboard routes require authentication and use the full theme system
 */
export function isDashboardRoute(pathname: string): boolean {
  return pathname.startsWith('/app') || 
         pathname.startsWith('/admin') || 
         pathname.startsWith('/settings') || 
         pathname.startsWith('/trades') || 
         pathname.startsWith('/analytics') || 
         pathname.startsWith('/journal') || 
         pathname.startsWith('/strategies') || 
         pathname.startsWith('/review') || 
         pathname.startsWith('/risk') ||
         pathname.startsWith('/edge') ||
         pathname.startsWith('/performance') ||
         pathname.startsWith('/flow');
}

/**
 * Get route type for a given pathname
 */
export type RouteType = 'dashboard' | 'public' | 'auth';

export function getRouteType(pathname: string): RouteType {
  if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) {
    return 'auth';
  }
  if (isDashboardRoute(pathname)) {
    return 'dashboard';
  }
  return 'public';
}
