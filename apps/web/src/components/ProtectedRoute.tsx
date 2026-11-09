/**
 * Protected Route Component (Server Component)
 * 
 * Server-side route protection using unified entitlement check.
 * Replaces client-side EntitlementGate to prevent race conditions.
 * 
 * AUTO-CREATES demo entitlement for authenticated users without one.
 * This handles the case where users skip onboarding via the demo button.
 * 
 * NOTE: This component lives in a persistent layout ((app)/layout.tsx)
 * so it only runs once when the user first enters the route group.
 * Subsequent navigation within the group does not re-render this layout.
 * checkUserAccess is wrapped with React cache() for deduplication.
 */

import { redirect } from 'next/navigation';
import { checkUserAccess, ensureDemoEntitlement } from '@/lib/auth/entitlements.server';
import type { PlanTier } from '@/lib/entitlements/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPlan: PlanTier;
}

/**
 * Protected Route Component
 * 
 * Checks user access server-side before rendering.
 * If no access but user is authenticated, creates demo entitlement.
 * If still no access, redirects to pricing page.
 * If access granted, renders children directly (no Suspense wrapper).
 * 
 * This prevents race conditions by doing all checks server-side.
 */
export async function ProtectedRoute({ children, requiredPlan }: ProtectedRouteProps) {
  // Check access server-side (cached within the render pass)
  let accessResult = await checkUserAccess(undefined, requiredPlan);

  // If user is authenticated but has no entitlement, create demo entitlement
  // This handles users who clicked "demo" and skipped the preferences save
  if (!accessResult.hasAccess && accessResult.userId && !accessResult.entitlement) {
    const created = await ensureDemoEntitlement(accessResult.userId);
    
    if (created) {
      // Re-check access after creating entitlement
      accessResult = await checkUserAccess(accessResult.userId, requiredPlan);
    }
  }

  // If still no access, redirect to pricing
  if (!accessResult.hasAccess) {
    // Re-throw NEXT_REDIRECT errors (expected behavior)
    try {
      redirect('/pricing?locked=true');
    } catch (error: any) {
      if (error?.digest?.startsWith('NEXT_REDIRECT')) {
        throw error;
      }
      throw error;
    }
  }

  // Access granted - render children directly without a Suspense wrapper.
  // The persistent layout means this only evaluates once per session entry,
  // so no loading flash on subsequent intra-group navigation.
  return <>{children}</>;
}
