import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { PlanTier, EntitlementStatus } from '@/lib/entitlements/types';
import { isAllowedAdminEmail } from '@/lib/env.server';

/**
 * Setup current user as paid user
 * This endpoint allows the currently signed-in user to grant themselves access
 * Only available in development or for initial setup
 */
export async function POST(request: NextRequest) {
  try {
    // Get userId from headers (set by middleware) - DO NOT use currentUser() in API routes
    const userId = request.headers.get('x-clerk-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated - no user ID in request' }, { status: 401 });
    }

    // Fetch user from Clerk to get email for authorization check
    let user;
    try {
      user = await clerkClient.users.getUser(userId);
    } catch (error) {
      console.error('Failed to fetch user from Clerk:', error);
      return NextResponse.json({ error: 'Failed to fetch user information' }, { status: 500 });
    }
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only allow setup for authorized admin emails
    const userEmail = user.emailAddresses[0]?.emailAddress;
    
    if (!isAllowedAdminEmail(userEmail)) {
      return NextResponse.json(
        { error: 'This endpoint is only available for authorized users' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServiceClient();

    // First, ensure profile exists
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        email: user.emailAddresses[0]?.emailAddress || '',
        display_name: user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.username || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (profileError) {
      console.error('Error syncing profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to sync profile' },
        { status: 500 }
      );
    }

    // Grant basic paid access
    const { data, error: entitlementError } = await supabase
      .from('entitlements')
      .upsert({
        user_id: userId,
        plan: 'basic' as PlanTier,
        status: 'active' as EntitlementStatus,
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        source: 'manual',
        override_enabled: true,
        override_expires_at: null, // No expiration
        notes: 'Initial setup - granted paid access',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (entitlementError) {
      console.error('Error granting entitlement:', entitlementError);
      return NextResponse.json(
        { error: 'Failed to grant entitlement' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User setup complete - paid access granted',
      entitlement: data 
    });
  } catch (error) {
    console.error('Error in setup-user:', error);
    return NextResponse.json(
      { error: 'Failed to setup user' },
      { status: 500 }
    );
  }
}
