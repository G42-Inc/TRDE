import { currentUser, auth } from '@clerk/nextjs/server';
import { hasAdminMetadata } from './policy';

/**
 * Get the current authenticated user's Clerk ID
 * Returns null if not authenticated
 * 
 * Use Clerk's verified request authentication for both browser sessions and
 * mobile Bearer tokens. A caller-supplied user ID is never authentication.
 */
export async function getClerkUserId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId;
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user object from Clerk
 * Returns null if not authenticated
 */
export async function getClerkUser() {
  return await currentUser();
}

/**
 * Check if the current user is an admin
 * Admin role is determined by server-controlled Clerk publicMetadata.
 * MUST be checked server-side only
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await getClerkUser();
    return !!user && hasAdminMetadata(user.publicMetadata);
  } catch {
    return false;
  }
}

/**
 * Require authentication - throws if not authenticated
 * Use in server components/actions
 */
export async function requireAuth(): Promise<string> {
  const userId = await getClerkUserId();
  if (!userId) {
    throw new Error('Unauthorized: Authentication required');
  }
  return userId;
}

/**
 * Require admin role - throws if not admin
 * Use in server components/actions
 */
export async function requireAdmin(): Promise<string> {
  const userId = await requireAuth();
  const admin = await isAdmin();
  if (!admin) {
    throw new Error('Forbidden: Admin access required');
  }
  return userId;
}
