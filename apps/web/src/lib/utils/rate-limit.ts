/**
 * Simple In-Memory Rate Limiter
 * 
 * Prevents abuse of API endpoints with basic rate limiting.
 * For production, consider using Redis or a dedicated rate limiting service.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (clears on server restart)
// For production, use Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Simple rate limiter for API routes
 * 
 * @param identifier - Unique identifier (e.g., userId, IP address)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute default
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    // No entry or expired - create new window
    const resetAt = now + windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetAt,
    });
    
    // Cleanup old entries periodically (every 100 requests)
    if (rateLimitStore.size > 1000) {
      for (const [k, v] of rateLimitStore.entries()) {
        if (v.resetAt < now) {
          rateLimitStore.delete(k);
        }
      }
    }
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
    };
  }
  
  // Entry exists and is valid
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit configuration for different endpoints
 */
export const RATE_LIMITS = {
  // Billing - strict limits
  checkout: { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
  portal: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  subscription: { maxRequests: 20, windowMs: 60000 }, // 20 requests per minute
  verifySession: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  
  // Authentication - strict limits to prevent brute force
  adminLogin: { maxRequests: 5, windowMs: 300000 }, // 5 attempts per 5 minutes
  checkAccess: { maxRequests: 60, windowMs: 60000 }, // 60 per minute (polled frequently)
  
  // Data operations - moderate limits
  dataWrite: { maxRequests: 30, windowMs: 60000 }, // 30 writes per minute
  dataRead: { maxRequests: 120, windowMs: 60000 }, // 120 reads per minute
  
  // Engagement features - moderate limits
  feedback: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  achievements: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
  insights: { maxRequests: 20, windowMs: 60000 }, // 20 per minute
  
  // General API - default fallback
  default: { maxRequests: 60, windowMs: 60000 }, // 60 per minute
} as const;

/**
 * Helper to create rate limit response headers
 */
export function createRateLimitHeaders(
  limit: number,
  remaining: number,
  resetAt: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetAt.toString(),
    'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
  };
}

/**
 * Create a rate-limited error response
 */
export function createRateLimitResponse(resetAt: number) {
  const { NextResponse } = require('next/server');
  return NextResponse.json(
    { 
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
    },
    { 
      status: 429,
      headers: createRateLimitHeaders(0, 0, resetAt),
    }
  );
}
