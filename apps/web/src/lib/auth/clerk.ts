import { currentUser, auth } from '@clerk/nextjs/server';
import { cookies, headers } from 'next/headers';
import { authLogger } from '@/lib/utils/logger';

/**
 * Get the current authenticated user's Clerk ID
 * Returns null if not authenticated
 * 
 * SECURITY NOTE: This function relies on Clerk middleware for authentication.
 * The x-clerk-user-id header is ONLY trusted because middleware sets it
 * after verifying the user's session. Never trust this header from external sources.
 * 
 * Auth methods (in priority order):
 * 1. x-clerk-user-id header (set by middleware for web requests)
 * 2. Clerk's auth() helper (server-side session)
 * 3. currentUser() from Clerk (web session)
 * 
 * NOTE: Cookie fallback has been removed for security - we should never
 * parse JWTs without signature verification.
 */
export async function getClerkUserId(): Promise<string | null> {
  try {
    const headersList = await headers();
    const headerUserId = headersList.get('x-clerk-user-id');
    
    // First, trust x-clerk-user-id header if set by middleware
    // Middleware already verified auth before setting this header
    // SECURITY: This header is only set by our middleware, never by clients
    if (headerUserId && headerUserId.startsWith('user_')) {
      return headerUserId;
    }
    
    // Second, try Clerk's auth() helper for cases where middleware didn't set header
    try {
      const { userId } = await auth();
      if (userId) {
        return userId;
      }
    } catch {
      // auth() unavailable, try currentUser()
    }
    
    // Third, try currentUser() for web sessions
    try {
      const user = await currentUser();
      if (user?.id) {
        return user.id;
      }
    } catch {
      // currentUser() failed
    }
    
    return null;
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
 * Admin role can be determined by:
 * 1. publicMetadata.role === "admin" (set in Clerk Dashboard)
 * 2. admin_session cookie (set via admin login form)
 * MUST be checked server-side only
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getClerkUser();
  if (!user) {
    authLogger.debug('isAdmin: No user found');
    return false;
  }

  const userId = user.id;

  // Check admin session cookie first (from admin login form)
  const cookieStore = await cookies();
  const adminSession = cookieStore.get('admin_session');
  
  if (adminSession && adminSession.value === userId) {
    authLogger.debug('Admin access granted via session cookie');
    return true;
  }
  
  // Fallback: Check Clerk metadata
  const metadata = user.publicMetadata || {};
  const role = metadata.role as string | undefined;
  
  if (role === 'admin') {
    authLogger.debug('Admin access granted via metadata role');
    return true;
  }
  
  // Check if user has admin in other metadata fields
  if (metadata.isAdmin === true || metadata.admin === true) {
    authLogger.debug('Admin access granted via metadata field');
    return true;
  }
  
  authLogger.debug('User is not admin');
  return false;
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
