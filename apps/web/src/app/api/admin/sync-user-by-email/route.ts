import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin.server';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * DEV-ONLY: Manual sync user profile by email
 * Allows admin to sync a user's profile from Clerk to Supabase
 * Useful for SSO users or users whose profiles haven't synced automatically
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin access (pass request to extract userId from headers)
    await requireAdmin(undefined, request);

    const body = await request.json();
    const { email, userId } = body;

    if (!email && !userId) {
      return NextResponse.json(
        { error: 'Email or userId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    try {
      // Try to get user from Clerk
      let clerkUser;
      if (userId) {
        clerkUser = await clerkClient.users.getUser(userId);
      } else {
        // Search by email - Clerk API allows searching by email
        const users = await clerkClient.users.getUserList({ emailAddress: [email] });
        if (!users.data || users.data.length === 0) {
          return NextResponse.json(
            { error: `No user found with email: ${email}` },
            { status: 404 }
          );
        }
        clerkUser = users.data[0];
      }

      if (!clerkUser) {
        return NextResponse.json(
          { error: 'User not found in Clerk' },
          { status: 404 }
        );
      }

      // Get email - handle SSO users
      let userEmail = '';
      if (clerkUser.primaryEmailAddress) {
        userEmail = clerkUser.primaryEmailAddress.emailAddress || '';
      } else if (clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
        const verifiedEmail = clerkUser.emailAddresses.find(e => e.verification?.status === 'verified');
        userEmail = verifiedEmail?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress || '';
      }

      // Get display name
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

      console.log('Manual sync profile:', {
        userId: clerkUser.id,
        email: userEmail,
        displayName,
        hasEmailAddresses: !!clerkUser.emailAddresses?.length,
        emailCount: clerkUser.emailAddresses?.length || 0,
      });

      // Upsert profile
      const { data, error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          user_id: clerkUser.id,
          email: userEmail || '',
          display_name: displayName,
          first_name: clerkUser.firstName || null,
          last_name: clerkUser.lastName || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (upsertError) {
        console.error('Error syncing profile:', upsertError);
        return NextResponse.json(
          { error: 'Failed to sync profile to Supabase', details: upsertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Profile synced successfully',
        profile: data,
      });
    } catch (clerkError: any) {
      console.error('Error fetching from Clerk:', clerkError);
      return NextResponse.json(
        { error: `Failed to fetch user from Clerk: ${clerkError.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in sync-user-by-email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync user' },
      { status: 500 }
    );
  }
}
