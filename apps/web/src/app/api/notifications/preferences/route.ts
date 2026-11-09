import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { NotificationPreferences, NotificationPreferencesInput } from '@/lib/engagement/types';

/**
 * GET /api/notifications/preferences
 * Fetch notification preferences for the authenticated user
 */
export async function GET() {
  try {
    const userId = await getClerkUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[API/notifications/preferences] Error fetching preferences:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notification preferences' },
        { status: 500 }
      );
    }

    // Return defaults if no preferences exist
    if (!data) {
      const defaults: NotificationPreferences = {
        userId,
        dailyDigest: false,
        weeklySummary: true,
        achievementNotifications: true,
        streakReminders: true,
        insightAlerts: true,
        marketingEmails: false,
        pushEnabled: false,
        updatedAt: new Date().toISOString(),
      };
      return NextResponse.json({ preferences: defaults });
    }

    // Transform from snake_case to camelCase
    const preferences: NotificationPreferences = {
      userId: data.user_id,
      dailyDigest: data.daily_digest,
      weeklySummary: data.weekly_summary,
      achievementNotifications: data.achievement_notifications,
      streakReminders: data.streak_reminders,
      insightAlerts: data.insight_alerts,
      marketingEmails: data.marketing_emails,
      pushEnabled: data.push_enabled,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ preferences });
  } catch (error: any) {
    console.error('[API/notifications/preferences] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
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

    const body: NotificationPreferencesInput = await request.json();
    const supabase = getSupabaseServiceClient();

    // Build update object (only include provided fields)
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.dailyDigest !== undefined) {
      updateData.daily_digest = body.dailyDigest;
    }
    if (body.weeklySummary !== undefined) {
      updateData.weekly_summary = body.weeklySummary;
    }
    if (body.achievementNotifications !== undefined) {
      updateData.achievement_notifications = body.achievementNotifications;
    }
    if (body.streakReminders !== undefined) {
      updateData.streak_reminders = body.streakReminders;
    }
    if (body.insightAlerts !== undefined) {
      updateData.insight_alerts = body.insightAlerts;
    }
    if (body.marketingEmails !== undefined) {
      updateData.marketing_emails = body.marketingEmails;
    }
    if (body.pushEnabled !== undefined) {
      updateData.push_enabled = body.pushEnabled;
    }

    // Upsert preferences
    const { data, error } = await supabase
      .from('notification_preferences')
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
      console.error('[API/notifications/preferences] Error updating preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update notification preferences' },
        { status: 500 }
      );
    }

    // Transform response
    const preferences: NotificationPreferences = {
      userId: data.user_id,
      dailyDigest: data.daily_digest,
      weeklySummary: data.weekly_summary,
      achievementNotifications: data.achievement_notifications,
      streakReminders: data.streak_reminders,
      insightAlerts: data.insight_alerts,
      marketingEmails: data.marketing_emails,
      pushEnabled: data.push_enabled,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ preferences });
  } catch (error: any) {
    console.error('[API/notifications/preferences] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
