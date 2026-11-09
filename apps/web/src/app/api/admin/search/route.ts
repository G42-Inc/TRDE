/**
 * Admin User Search API
 * 
 * Search for users via Clerk API or Supabase profiles.
 * Requires Clerk auth + admin metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin.server';
import { clerkClient } from '@clerk/nextjs/server';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';

interface UserResult {
  user_id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  entitlement: {
    plan: string;
    status: string;
    override_enabled: boolean;
    override_expires_at: string | null;
  } | null;
}

/**
 * Search users by email, name, or userId
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin access (pass request to extract userId from headers)
    await requireAdmin(undefined, request);

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const email = searchParams.get('email');
    const firstName = searchParams.get('firstName');
    const lastName = searchParams.get('lastName');
    const userId = searchParams.get('userId');

    // Validate search criteria
    const hasSpecificFilters = email || firstName || lastName || userId;
    const hasGeneralQuery = query && query.trim().length >= 2;

    if (!hasSpecificFilters && !hasGeneralQuery) {
      return NextResponse.json({ 
        users: [],
        message: 'Please provide at least one search criteria.' 
      });
    }

    const supabase = getSupabaseServiceClient();
    const users: UserResult[] = [];

    // Strategy 1: Search via Clerk API (if email or userId provided)
    if (email || userId) {
      try {
        if (userId) {
          // Direct user lookup by ID
          const clerkUser = await (await clerkClient()).users.getUser(userId);
          if (clerkUser) {
            const profile = await getProfileFromSupabase(clerkUser.id);
            const entitlement = await getEntitlementFromSupabase(clerkUser.id);
            
            users.push({
              user_id: clerkUser.id,
              email: clerkUser.emailAddresses[0]?.emailAddress || '',
              display_name: profile?.display_name || clerkUser.fullName || null,
              first_name: profile?.first_name || clerkUser.firstName || null,
              last_name: profile?.last_name || clerkUser.lastName || null,
              entitlement,
            });
          }
        } else if (email) {
          // Search by email via Clerk
          const clerkUsers = await (await clerkClient()).users.getUserList({
            emailAddress: [email],
            limit: 20,
          });

          for (const clerkUser of clerkUsers.data) {
            const profile = await getProfileFromSupabase(clerkUser.id);
            const entitlement = await getEntitlementFromSupabase(clerkUser.id);
            
            users.push({
              user_id: clerkUser.id,
              email: clerkUser.emailAddresses[0]?.emailAddress || '',
              display_name: profile?.display_name || clerkUser.fullName || null,
              first_name: profile?.first_name || clerkUser.firstName || null,
              last_name: profile?.last_name || clerkUser.lastName || null,
              entitlement,
            });
          }
        }
      } catch (clerkError: any) {
        console.error('Clerk API search error:', clerkError);
        // Continue to Supabase search as fallback
      }
    }

    // Strategy 2: Search via Supabase profiles table
    if (users.length === 0 || query || firstName || lastName) {
      let queryBuilder = supabase
        .from('profiles')
        .select('user_id, email, display_name, first_name, last_name');

      if (hasSpecificFilters) {
        if (email) {
          queryBuilder = queryBuilder.ilike('email', `%${email.trim()}%`);
        }
        if (userId) {
          queryBuilder = queryBuilder.ilike('user_id', `%${userId.trim()}%`);
        }
        if (firstName) {
          queryBuilder = queryBuilder.or(`first_name.ilike.%${firstName.trim()}%,display_name.ilike.%${firstName.trim()}%`);
        }
        if (lastName) {
          queryBuilder = queryBuilder.or(`last_name.ilike.%${lastName.trim()}%,display_name.ilike.%${lastName.trim()}%`);
        }
      } else if (hasGeneralQuery) {
        const cleanQuery = query!.trim();
        const searchPattern = `%${cleanQuery}%`;
        queryBuilder = queryBuilder.or(`email.ilike.${searchPattern},display_name.ilike.${searchPattern},first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},user_id.ilike.${searchPattern}`);
      }

      const { data: profiles, error: profilesError } = await queryBuilder.limit(20);
      
      if (profilesError) {
        console.error('Supabase search error:', profilesError);
      } else if (profiles) {
        // Fetch entitlements for found profiles
        for (const profile of profiles) {
          // Check if already in results
          if (!users.find(u => u.user_id === profile.user_id)) {
            const entitlement = await getEntitlementFromSupabase(profile.user_id);
            
            users.push({
              user_id: profile.user_id,
              email: profile.email,
              display_name: profile.display_name,
              first_name: profile.first_name,
              last_name: profile.last_name,
              entitlement,
            });
          }
        }
      }
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    if (error.message === 'Admin access required' || error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users', details: error.message },
      { status: 500 }
    );
  }
}

// Helper functions
async function getProfileFromSupabase(userId: string) {
  try {
    const supabase = getSupabaseServiceClient();
    const { data } = await supabase
      .from('profiles')
      .select('display_name, first_name, last_name')
      .eq('user_id', userId)
      .maybeSingle();
    return data;
  } catch (error) {
    return null;
  }
}

async function getEntitlementFromSupabase(userId: string) {
  try {
    const supabase = getSupabaseServiceClient();
    const { data } = await supabase
      .from('entitlements')
      .select('plan, status, override_enabled, override_expires_at')
      .eq('user_id', userId)
      .maybeSingle();
    return data;
  } catch (error) {
    return null;
  }
}
