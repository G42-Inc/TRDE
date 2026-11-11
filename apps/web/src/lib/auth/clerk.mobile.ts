/** Mobile requests use the same Clerk middleware verification as browser sessions. */
import { verifyToken } from '@clerk/nextjs/server';
import { getClerkUserId } from './clerk';

export async function getClerkUserIdFromRequest(): Promise<string | null> {
  return getClerkUserId();
}

/** Verify the supplied token itself; decoding its claims is not authentication. */
export async function verifyBearerToken(token: string): Promise<string | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey || !token) return null;
  try {
    const claims = await verifyToken(token, { secretKey });
    // Only Clerk session tokens identify users, not machine/OAuth tokens.
    return claims.sub && claims.sid ? claims.sub : null;
  } catch {
    return null;
  }
}
