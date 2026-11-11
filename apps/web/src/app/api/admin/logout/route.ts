import { getClerkUserId } from '@/lib/auth/clerk';
/**
 * Admin Logout API
 * 
 * Removes admin access from the current user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { removeAdminAccess } from '@/lib/auth/admin.server';

export async function POST(request: NextRequest) {
  try {

    const userId = await getClerkUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated - no user ID in request' },
        { status: 401 }
      );
    }

    // Remove admin access
    try {
      await removeAdminAccess(userId);
    } catch (error: any) {
      console.error('Error removing admin access:', error);
      return NextResponse.json(
        { error: 'Failed to remove admin access', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Admin access removed'
    });
  } catch (error: any) {
    console.error('Error in admin logout:', error);
    return NextResponse.json(
      { error: 'Logout failed', details: error.message },
      { status: 500 }
    );
  }
}