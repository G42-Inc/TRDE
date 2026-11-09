/**
 * Admin Entitlements API (POST/DELETE)
 * 
 * Grant or revoke user entitlements.
 * Requires Clerk auth + admin metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin.server';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { PlanTier, EntitlementStatus } from '@/lib/entitlements/types';

/**
 * Grant or update entitlement (POST)
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin access (pass request to extract userId from headers)
    const { userId: adminUserId } = await requireAdmin(undefined, request);
    
    const body = await request.json();
    const { userId, plan, status, override_enabled, override_expires_at, notes } = body;

    // Validate input
    if (!userId || !plan || !['basic', 'edge', 'pro'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid request: userId and plan (basic/edge/pro) required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    // Convert override_expires_at to ISO string (end of day) if provided, otherwise null
    let expiresAtIso: string | null = null;
    if (override_expires_at && override_expires_at.trim() !== '') {
      const date = new Date(override_expires_at);
      if (!isNaN(date.getTime())) {
        // Set to end of day to ensure access for the full day
        date.setHours(23, 59, 59, 999);
        expiresAtIso = date.toISOString();
      }
    }

    // Upsert entitlement
    const { data, error } = await supabase
      .from('entitlements')
      .upsert({
        user_id: userId,
        plan: plan as PlanTier,
        status: (status || 'comped') as EntitlementStatus,
        current_period_end: null,
        source: 'manual',
        override_enabled: override_enabled !== false,
        override_expires_at: expiresAtIso,
        notes: notes || `Granted by admin ${adminUserId}`,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error granting entitlement:', error);
      return NextResponse.json(
        { error: 'Failed to grant entitlement', details: error.message },
        { status: 500 }
      );
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      actor_user_id: adminUserId,
      action: 'grant_entitlement',
      target_user_id: userId,
      metadata: {
        plan,
        status,
        override_enabled,
        override_expires_at: expiresAtIso,
      },
    });

    return NextResponse.json({ success: true, entitlement: data });
  } catch (error: any) {
    if (error.message === 'Admin access required' || error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    console.error('Error granting entitlement:', error);
    return NextResponse.json(
      { error: 'Failed to grant entitlement', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Revoke entitlement (DELETE)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Require admin access (pass request to extract userId from headers)
    const { userId: adminUserId } = await requireAdmin(undefined, request);
    
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    // Update entitlement to canceled and disable override
    const { error } = await supabase
      .from('entitlements')
      .update({
        status: 'canceled' as EntitlementStatus,
        override_enabled: false,
        override_expires_at: null,
        notes: `Revoked by admin ${adminUserId}`,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error revoking entitlement:', error);
      return NextResponse.json(
        { error: 'Failed to revoke entitlement', details: error.message },
        { status: 500 }
      );
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      actor_user_id: adminUserId,
      action: 'revoke_entitlement',
      target_user_id: userId,
      metadata: {},
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Admin access required' || error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    console.error('Error revoking entitlement:', error);
    return NextResponse.json(
      { error: 'Failed to revoke entitlement', details: error.message },
      { status: 500 }
    );
  }
}
