import { getClerkUserId } from '@/lib/auth/clerk';
/**
 * Sync Profile API (POST)
 * 
 * Sync Clerk user profile to Supabase profiles table.
 * Can be called by admin to sync user data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { requireAdmin } from '@/lib/auth/admin.server';

/**
 * Sync user profile from Clerk to Supabase
 * 
 * If userId provided in body, syncs that user (admin only).
 * Otherwise, syncs the current authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    // Try to parse body, but handle empty body gracefully
    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (parseError) {
      // Body is empty or invalid JSON - that's okay, we'll use currentUser
      body = {};
    }
    
    const targetUserId = body.userId; // Optional: admin can specify userId

    let userId: string | null = null;
    
    if (targetUserId) {
      // Admin syncing another user - require admin access
      await requireAdmin(undefined, request);
      userId = targetUserId;
    } else {
      // Sync the authenticated user

      userId = await getClerkUserId();
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized - no user ID in request' }, { status: 401 });
      }
    }

    // Fetch user from Clerk
    let clerkUser;
    try {
      if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
      }
      clerkUser = await (await clerkClient()).users.getUser(userId);
      if (!clerkUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    } catch (clerkError: any) {
      console.error('Failed to fetch user from Clerk:', clerkError);
      return NextResponse.json(
        { error: 'Failed to fetch user from Clerk', details: clerkError.message },
        { status: 500 }
      );
    }

    const supabase = getSupabaseServiceClient();

    // Extract email (handle SSO users)
    let email = '';
    if (clerkUser.primaryEmailAddress) {
      email = clerkUser.primaryEmailAddress.emailAddress || '';
    } else if (clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
      const verifiedEmail = clerkUser.emailAddresses.find(e => e.verification?.status === 'verified');
      email = verifiedEmail?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress || '';
    }

    // Extract display name (handle SSO users)
    let displayName: string | null = null;
    if (clerkUser.firstName && clerkUser.lastName) {
      displayName = `${clerkUser.firstName} ${clerkUser.lastName}`;
    } else if (clerkUser.firstName) {
      displayName = clerkUser.firstName;
    } else if (clerkUser.lastName) {
      displayName = clerkUser.lastName;
    } else if (clerkUser.username) {
      displayName = clerkUser.username;
    } else if (clerkUser.fullName) {
      displayName = clerkUser.fullName;
    }

    // Upsert profile
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        email: email || '',
        display_name: displayName,
        first_name: clerkUser.firstName || null,
        last_name: clerkUser.lastName || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error syncing profile:', error);
      return NextResponse.json(
        { error: 'Failed to sync profile', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Admin access required' || error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Error in sync-profile:', error);
    return NextResponse.json(
      { error: 'Failed to sync profile', details: error.message },
      { status: 500 }
    );
  }
}
