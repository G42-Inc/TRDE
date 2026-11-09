/**
 * Admin Login API
 * 
 * Verifies admin password and grants admin access by setting Clerk metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { setUserAsAdmin } from '@/lib/auth/admin.server';
import { timingSafeEqual } from 'crypto';
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/utils/rate-limit';
import { AdminLoginSchema, validateBody } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    // Try to get userId from headers (set by middleware) first
    let userId = request.headers.get('x-clerk-user-id');
    
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
    
    // Fallback: If header is missing, try to get from Clerk auth() directly
    // This handles cases where middleware might not set the header properly
    if (!userId) {
      try {
        const { auth } = await import('@clerk/nextjs/server');
        const authResult = await auth();
        userId = authResult.userId || null;
        if (userId) {
          console.log('Admin login: Got userId from auth() fallback:', userId);
        }
      } catch (authError) {
        console.error('Admin login: Failed to get userId from auth() fallback:', authError);
      }
    }
    
    if (!userId) {
      console.error('Admin login: No user ID found in headers or auth()');
      return NextResponse.json(
        { error: 'Not authenticated. Please sign in first.' },
        { status: 401 }
      );
    }

    // Fetch user from Clerk to verify they exist
    let user;
    try {
      user = await clerkClient.users.getUser(userId);
    } catch (error) {
      console.error('Admin login: Failed to fetch user from Clerk:', error);
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

    console.log('Admin login: User authenticated:', userId);

    // Get password from request body
    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error('Admin login: Failed to parse request body');
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    // Validate input with Zod schema
    const validation = validateBody(body, AdminLoginSchema);
    if (!validation.success) {
      console.error('Admin login: Validation failed');
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { password } = validation.data;

    // Verify admin password from environment variable
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    
    if (!adminPassword || adminPassword.trim() === '') {
      console.error('Admin login: ADMIN_PASSWORD environment variable is not set');
      return NextResponse.json(
        { error: 'Admin authentication is not configured. Please set ADMIN_PASSWORD environment variable.' },
        { status: 500 }
      );
    }

    // Use timing-safe comparison to prevent timing attacks
    // Passwords must be same length for timingSafeEqual, so we hash or pad them
    const passwordBuffer = Buffer.from(password.padEnd(256, '\0'));
    const adminPasswordBuffer = Buffer.from(adminPassword.padEnd(256, '\0'));
    
    const passwordsMatch = passwordBuffer.length === adminPasswordBuffer.length &&
      timingSafeEqual(passwordBuffer, adminPasswordBuffer);
    
    if (!passwordsMatch) {
      console.error('Admin login: Password mismatch');
      return NextResponse.json(
        { error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    console.log('Admin login: Password correct, granting admin access to user:', user.id);

    // Check if user is already admin (optional - we'll set it anyway to ensure it's correct)
    const { checkIsAdmin } = await import('@/lib/auth/admin.server');
    const alreadyAdmin = await checkIsAdmin(userId, request);
    
    if (alreadyAdmin) {
      console.log('Admin login: User is already admin, but re-setting to ensure consistency');
    }

    // Password is correct - grant admin access (even if already admin, this ensures consistency)
    try {
      await setUserAsAdmin(userId);
      console.log('Admin login: Successfully granted admin access');
    } catch (error: any) {
      console.error('Admin login: Error setting user as admin:', error);
      console.error('Admin login: Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Failed to grant admin access', details: error.message || 'Unknown error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: alreadyAdmin ? 'Admin access confirmed' : 'Admin access granted'
    });
  } catch (error: any) {
    console.error('Admin login: Unexpected error:', error);
    console.error('Admin login: Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Authentication failed', details: error.message },
      { status: 500 }
    );
  }
}