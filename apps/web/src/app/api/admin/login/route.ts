/**
 * Admin Login API
 * 
 * Verifies admin password and grants admin access by setting Clerk metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { clerkClient } from '@clerk/nextjs/server';
import { setUserAsAdmin } from '@/lib/auth/admin.server';
import { createHash, timingSafeEqual } from 'crypto';
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/utils/rate-limit';
import { AdminLoginSchema, validateBody } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const userId = await getClerkUserId();
    
    // Rate limit by IP for admin login attempts (before auth check)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const rateLimit = checkRateLimit(
      `admin_login:${ip}`,
      RATE_LIMITS.adminLogin.maxRequests,
      RATE_LIMITS.adminLogin.windowMs
    );
    
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetAt);
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated. Please sign in first.' },
        { status: 401 }
      );
    }

    // Fetch user from Clerk to verify they exist
    let user;
    try {
      user = await (await clerkClient()).users.getUser(userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to fetch user information' },
        { status: 500 }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }


    // Get password from request body
    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    // Validate input with Zod schema
    const validation = validateBody(body, AdminLoginSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { password } = validation.data;

    // Verify admin password from environment variable
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    
    if (!adminPassword || adminPassword.trim() === '') {
      return NextResponse.json(
        { error: 'Admin authentication is not configured. Please set ADMIN_PASSWORD environment variable.' },
        { status: 500 }
      );
    }

    // Use timing-safe comparison to prevent timing attacks
    // Compare fixed-size hashes so password length and NUL bytes cannot change comparison behavior.
    const passwordBuffer = createHash('sha256').update(password).digest();
    const adminPasswordBuffer = createHash('sha256').update(adminPassword).digest();
    
    const passwordsMatch = passwordBuffer.length === adminPasswordBuffer.length &&
      timingSafeEqual(passwordBuffer, adminPasswordBuffer);
    
    if (!passwordsMatch) {
      return NextResponse.json(
        { error: 'Invalid admin password' },
        { status: 401 }
      );
    }


    // Check if user is already admin (optional - we'll set it anyway to ensure it's correct)
    const { checkIsAdmin } = await import('@/lib/auth/admin.server');
    const alreadyAdmin = await checkIsAdmin(userId, request);
    
    // Password is correct - grant admin access (even if already admin, this ensures consistency)
    try {
      await setUserAsAdmin(userId);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Failed to grant admin access' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: alreadyAdmin ? 'Admin access confirmed' : 'Admin access granted'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
