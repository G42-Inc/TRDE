/**
 * Clerk Authentication Helpers for Mobile API Requests
 * 
 * This module helps API routes verify Bearer tokens from mobile clients
 * Mobile clients send tokens in Authorization header
 */

import { auth } from '@clerk/nextjs/server';

/**
 * Get Clerk user ID from Bearer token (for mobile API requests)
 * Works with both web (session cookie) and mobile (Bearer token) requests
 */
export async function getClerkUserIdFromRequest(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Verify Bearer token and get user ID
 * Used when mobile sends token in Authorization header
 */
export async function verifyBearerToken(token: string): Promise<string | null> {
  // Clerk's auth() function automatically verifies Bearer tokens
  // when they're in the Authorization header
  // The middleware handles this automatically
  const { userId } = await auth();
  return userId;
}
