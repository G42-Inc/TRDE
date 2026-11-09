/**
 * Ensure Demo Entitlement API
 * 
 * Creates a demo entitlement for the current user if they don't have one.
 * Called from the onboarding flow when user selects "demo" option.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';

export async function POST(request: NextRequest) {
  try {
    // Get userId from header (set by middleware) or from Clerk
    const headerUserId = request.headers.get('x-clerk-user-id');
    const userId = headerUserId || await getClerkUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    // Check if entitlement already exists
    const { data: existing } = await supabase
      .from('entitlements')
      .select('user_id, status')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (existing) {
      // Already has entitlement
      return NextResponse.json({ 
        success: true, 
        message: 'Entitlement already exists',
        status: existing.status 
      });
    }
    
    // Ensure profile exists first (foreign key constraint)
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!profile) {
      // Create minimal profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          email: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });
      
      if (profileError) {
        console.error('[ensure-demo] Failed to create profile:', profileError);
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        );
      }
      console.log('[ensure-demo] Created profile for user:', userId);
    }
    
    // Create demo entitlement
    const { error: entitlementError } = await supabase
      .from('entitlements')
      .upsert({
        user_id: userId,
        plan: 'basic',
        status: 'demo',
        source: 'manual',
        override_enabled: false,
        notes: 'Created via demo onboarding flow',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });
    
    if (entitlementError) {
      console.error('[ensure-demo] Failed to create entitlement:', entitlementError);
      return NextResponse.json(
        { error: 'Failed to create entitlement' },
        { status: 500 }
      );
    }
    
    console.log('[ensure-demo] Created demo entitlement for user:', userId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Demo entitlement created',
      status: 'demo'
    });
  } catch (error: any) {
    console.error('[ensure-demo] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
