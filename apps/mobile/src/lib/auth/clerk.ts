/**
 * Clerk Authentication Helpers for Mobile
 * 
 * Uses @clerk/clerk-expo (Expo/React Native specific)
 * Different from web which uses @clerk/nextjs
 */

import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-expo';

/**
 * Get the current authenticated user's Clerk ID
 * Returns null if not authenticated
 * 
 * Usage in components:
 * const userId = useClerkUserId();
 */
export function useClerkUserId(): string | null {
  const { userId } = useClerkAuth();
  return userId ?? null;
}

/**
 * Get the current authenticated user object from Clerk
 * Returns null if not authenticated
 * 
 * Usage in components:
 * const user = useClerkUser();
 */
export function useClerkUser() {
  return useUser();
}

/**
 * Check if the current user is authenticated
 * 
 * Usage in components:
 * const isAuthenticated = useIsAuthenticated();
 */
export function useIsAuthenticated(): boolean {
  const { isSignedIn } = useClerkAuth();
  return isSignedIn || false;
}

/**
 * Check if the current user is an admin
 * Admin role is determined by publicMetadata.role === "admin"
 * 
 * Usage in components:
 * const isAdmin = useIsAdmin();
 */
export function useIsAdmin(): boolean {
  const { user } = useUser();
  if (!user) return false;
  
  const role = user.publicMetadata?.role as string | undefined;
  return role === 'admin';
}

/**
 * Get auth token for API requests
 * Returns null if not authenticated
 * 
 * Note: This is a hook, so it can only be used in components.
 * For use in storage functions, use getToken from useAuth directly.
 */
export function useAuthToken() {
  const { getToken } = useClerkAuth();
  return getToken;
}
