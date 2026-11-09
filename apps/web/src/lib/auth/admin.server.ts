/**
 * Admin Authentication and Authorization
 * 
 * Uses Clerk metadata to identify admins.
 * All admin checks happen server-side.
 */

import { currentUser, clerkClient } from '@clerk/nextjs/server';

/**
 * Check if current user is admin
 * Checks Clerk publicMetadata for role: 'admin'
 * 
 * IMPORTANT: In API routes, always pass userId or request to avoid currentUser() failures.
 * 
 * @param userId - Optional userId to check. If not provided, will NOT try currentUser().
 *                 For API routes, extract userId from request headers.
 * @param request - Optional NextRequest to extract userId from headers (x-clerk-user-id)
 */
export async function checkIsAdmin(
  userId?: string,
  request?: { headers: { get: (name: string) => string | null } }
): Promise<boolean> {
  try {
    // Try to get userId from request headers first (set by middleware)
    let finalUserId = userId;
    if (!finalUserId && request) {
      finalUserId = request.headers.get('x-clerk-user-id') || undefined;
    }
    
    // CRITICAL: Do NOT fall back to currentUser() in API routes
    // This causes "Clerk can't detect middleware" errors
    // If no userId provided and no request, return false (not admin)
    if (!finalUserId) {
      console.warn('checkIsAdmin: No userId provided and no request headers available. Returning false.');
      return false;
    }
    
    // Fetch user directly using userId
    let user;
    try {
      user = await clerkClient.users.getUser(finalUserId);
    } catch (error) {
      console.error('checkIsAdmin: Failed to fetch user:', error);
      return false;
    }
    
    if (!user) {
      return false;
    }

    const metadata = user.publicMetadata || {};
    const role = metadata.role as string | undefined;
    
    // Admin if role is 'admin' or isAdmin/admin flags are true
    return (
      role === 'admin' ||
      metadata.isAdmin === true ||
      metadata.admin === true
    );
  } catch (error: any) {
    console.error('checkIsAdmin: Error:', error);
    return false;
  }
}

/**
 * Alias for checkIsAdmin for backward compatibility
 * Check if current user has admin session
 * 
 * @deprecated Use checkIsAdmin(userId, request) instead to avoid currentUser() issues
 */
export async function hasAdminSession(
  userId?: string,
  request?: { headers: { get: (name: string) => string | null } }
): Promise<boolean> {
  return checkIsAdmin(userId, request);
}

/**
 * Require admin access - throws error if not admin
 * Use in server components/actions that require admin
 * 
 * @param userId - Optional userId. If not provided, will try to get from currentUser().
 *                 For API routes, it's better to pass userId from request headers.
 * @param request - Optional NextRequest to extract userId from headers (x-clerk-user-id)
 */
export async function requireAdmin(
  userId?: string, 
  request?: { headers: { get: (name: string) => string | null } }
): Promise<{ userId: string }> {
  // Try to get userId from request headers first (set by middleware)
  let finalUserId = userId;
  if (!finalUserId && request) {
    finalUserId = request.headers.get('x-clerk-user-id') || undefined;
  }
  
  // Fallback to currentUser() if still no userId
  if (!finalUserId) {
    try {
      const authUser = await currentUser();
      finalUserId = authUser?.id;
    } catch (error) {
      // currentUser() can fail if middleware isn't detected - that's ok, we'll check with userId from header
      console.log('requireAdmin: currentUser() failed, will use header userId if available');
    }
  }

  if (!finalUserId) {
    throw new Error('Not authenticated');
  }

  // Check admin status with the userId we have
  const isAdmin = await checkIsAdmin(finalUserId);
  
  if (!isAdmin) {
    throw new Error('Admin access required');
  }

  return { userId: finalUserId };
}

/**
 * Set user as admin in Clerk metadata
 * Use this to grant admin access to a user
 */
export async function setUserAsAdmin(clerkUserId: string): Promise<void> {
  try {
    await clerkClient.users.updateUserMetadata(clerkUserId, {
      publicMetadata: {
        role: 'admin',
        isAdmin: true,
        admin: true,
      },
    });
  } catch (error: any) {
    console.error('setUserAsAdmin: Error:', error);
    throw new Error(`Failed to set user as admin: ${error.message}`);
  }
}

/**
 * Remove admin access from user
 */
export async function removeAdminAccess(clerkUserId: string): Promise<void> {
  try {
    // Get current metadata to preserve other fields
    const user = await clerkClient.users.getUser(clerkUserId);
    const metadata = user.publicMetadata || {};
    
    // Remove admin flags
    delete metadata.role;
    delete metadata.isAdmin;
    delete metadata.admin;
    
    await clerkClient.users.updateUserMetadata(clerkUserId, {
      publicMetadata: metadata,
    });
  } catch (error: any) {
    console.error('removeAdminAccess: Error:', error);
    throw new Error(`Failed to remove admin access: ${error.message}`);
  }
}
