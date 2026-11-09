import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { UserPreferences, UserPreferencesInput } from '@/lib/engagement/types';
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/utils/rate-limit';
import { apiLogger } from '@/lib/utils/logger';

/**
 * GET /api/preferences
 * Fetch user preferences for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getClerkUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limit
    const rateLimit = checkRateLimit(
      `preferences:${userId}`,
      RATE_LIMITS.dataRead.maxRequests,
      RATE_LIMITS.dataRead.windowMs
    );
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const supabase = getSupabaseServiceClient();
    
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      apiLogger.error('Error fetching preferences', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // Return null if no preferences exist yet
    if (!data) {
      return NextResponse.json({ preferences: null });
    }

    // Transform from snake_case to camelCase
    const preferences: UserPreferences = {
      userId: data.user_id,
      tradingExperience: data.trading_experience,
      assetClasses: data.asset_classes || [],
      primaryGoals: data.primary_goals || [],
      timezone: data.timezone,
      soundEnabled: data.sound_enabled,
      onboardingCompleted: data.onboarding_completed,
      onboardingCompletedAt: data.onboarding_completed_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ preferences });
  } catch (error: any) {
    apiLogger.error('Error in GET /api/preferences', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/preferences
 * Update user preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getClerkUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: UserPreferencesInput = await request.json();
    const supabase = getSupabaseServiceClient();

    // Ensure profile exists first (handles race condition with webhook)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingProfile) {
      // Create minimal profile if webhook hasn't run yet
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
        console.error('[API/preferences] Error creating profile:', profileError);
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        );
      }
    }

    // Build update object (only include provided fields)
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.tradingExperience !== undefined) {
      if (!['beginner', 'intermediate', 'advanced'].includes(body.tradingExperience)) {
        return NextResponse.json(
          { error: 'Invalid trading experience value' },
          { status: 400 }
        );
      }
      updateData.trading_experience = body.tradingExperience;
    }

    if (body.assetClasses !== undefined) {
      if (!Array.isArray(body.assetClasses)) {
        return NextResponse.json(
          { error: 'Asset classes must be an array' },
          { status: 400 }
        );
      }
      updateData.asset_classes = body.assetClasses;
    }

    if (body.primaryGoals !== undefined) {
      if (!Array.isArray(body.primaryGoals)) {
        return NextResponse.json(
          { error: 'Primary goals must be an array' },
          { status: 400 }
        );
      }
      updateData.primary_goals = body.primaryGoals;
    }

    if (body.timezone !== undefined) {
      updateData.timezone = body.timezone;
    }

    if (body.soundEnabled !== undefined) {
      updateData.sound_enabled = body.soundEnabled;
    }

    if (body.onboardingCompleted !== undefined) {
      updateData.onboarding_completed = body.onboardingCompleted;
      if (body.onboardingCompleted) {
        updateData.onboarding_completed_at = new Date().toISOString();
        
        // Ensure user has at least demo entitlement when completing onboarding
        // This handles cases where the Clerk webhook failed or hasn't run yet
        const { data: existingEntitlement } = await supabase
          .from('entitlements')
          .select('user_id, status')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (!existingEntitlement) {
          console.log('[API/preferences] Creating demo entitlement for user:', userId);
          const { error: entitlementError, data: entitlementData } = await supabase
            .from('entitlements')
            .upsert({
              user_id: userId,
              plan: 'basic',
              status: 'demo',
              source: 'manual',
              override_enabled: false,
              notes: 'Auto-created on onboarding completion (webhook fallback)',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id',
            })
            .select();
          
          if (entitlementError) {
            // CRITICAL: If this fails, the user won't have access!
            // Most common cause: database doesn't have 'demo' in status constraint
            console.error('[API/preferences] CRITICAL: Failed to create demo entitlement:', entitlementError);
            console.error('[API/preferences] Error code:', entitlementError.code);
            console.error('[API/preferences] Error details:', entitlementError.details);
            console.error('[API/preferences] Error hint:', entitlementError.hint);
            
            // Return error so client knows something went wrong
            return NextResponse.json(
              { 
                error: 'Failed to create demo access. Database constraint may be missing.', 
                details: entitlementError.message,
                hint: 'Run migration: ALTER TABLE entitlements DROP CONSTRAINT IF EXISTS entitlements_status_check; ALTER TABLE entitlements ADD CONSTRAINT entitlements_status_check CHECK (status IN (\'active\', \'past_due\', \'canceled\', \'comped\', \'demo\'));'
              },
              { status: 500 }
            );
          } else {
            console.log('[API/preferences] Demo entitlement created successfully:', entitlementData);
          }
        } else {
          console.log('[API/preferences] User already has entitlement:', existingEntitlement);
        }
      }
    }

    // Upsert preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...updateData,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('[API/preferences] Error updating preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    // Transform response
    const preferences: UserPreferences = {
      userId: data.user_id,
      tradingExperience: data.trading_experience,
      assetClasses: data.asset_classes || [],
      primaryGoals: data.primary_goals || [],
      timezone: data.timezone,
      soundEnabled: data.sound_enabled,
      onboardingCompleted: data.onboarding_completed,
      onboardingCompletedAt: data.onboarding_completed_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ preferences });
  } catch (error: any) {
    console.error('[API/preferences] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
