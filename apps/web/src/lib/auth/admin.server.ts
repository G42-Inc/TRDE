/** Server-side administration, authorized only by verified Clerk metadata. */
import { clerkClient } from '@clerk/nextjs/server';
import { getClerkUserId } from './clerk';
import { hasAdminMetadata } from './policy';

type LegacyRequest = { headers: { get: (name: string) => string | null } };

/** Optional legacy arguments can restrict identity, but can never supply it. */
export async function checkIsAdmin(userId?: string, _request?: LegacyRequest): Promise<boolean> {
  const currentUserId = await getClerkUserId();
  if (!currentUserId || (userId && userId !== currentUserId)) return false;
  try {
    const user = await (await clerkClient()).users.getUser(currentUserId);
    return hasAdminMetadata(user.publicMetadata);
  } catch {
    return false;
  }
}

export async function hasAdminSession(userId?: string, request?: LegacyRequest): Promise<boolean> {
  return checkIsAdmin(userId, request);
}

export async function requireAdmin(userId?: string, request?: LegacyRequest): Promise<{ userId: string }> {
  const currentUserId = await getClerkUserId();
  if (!currentUserId) throw new Error('Not authenticated');
  if ((userId && userId !== currentUserId) || !(await checkIsAdmin(currentUserId, request))) {
    throw new Error('Admin access required');
  }
  return { userId: currentUserId };
}

/**
 * Set user as admin in Clerk metadata
 * Use this to grant admin access to a user
 */
export async function setUserAsAdmin(clerkUserId: string): Promise<void> {
  try {
    await (await clerkClient()).users.updateUserMetadata(clerkUserId, {
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
    const user = await (await clerkClient()).users.getUser(clerkUserId);
    const metadata = user.publicMetadata || {};
    
    // Remove admin flags
    delete metadata.role;
    delete metadata.isAdmin;
    delete metadata.admin;
    
    await (await clerkClient()).users.updateUserMetadata(clerkUserId, {
      publicMetadata: metadata,
    });
  } catch (error: any) {
    console.error('removeAdminAccess: Error:', error);
    throw new Error(`Failed to remove admin access: ${error.message}`);
  }
}
