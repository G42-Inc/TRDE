import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { UserEngagementStats, StreakUpdateResult } from '@/lib/engagement/types';

/**
 * GET /api/streaks
 * Get user's streak and engagement stats
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
      .from('user_engagement_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[API/streaks] Error fetching stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch streaks' },
        { status: 500 }
      );
    }

    // Return default stats if none exist
    if (!data) {
      const defaultStats: UserEngagementStats = {
        userId,
        totalXp: 0,
        currentLevel: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        totalTradesLogged: 0,
        totalJournalsWritten: 0,
        totalReviewsCompleted: 0,
        analyticsViews: 0,
        updatedAt: new Date().toISOString(),
      };
      return NextResponse.json({ stats: defaultStats });
    }

    // Transform to camelCase
    const stats: UserEngagementStats = {
      userId: data.user_id,
      totalXp: data.total_xp,
      currentLevel: data.current_level,
      currentStreak: data.current_streak,
      longestStreak: data.longest_streak,
      lastActivityDate: data.last_activity_date,
      totalTradesLogged: data.total_trades_logged,
      totalJournalsWritten: data.total_journals_written,
      totalReviewsCompleted: data.total_reviews_completed,
      analyticsViews: data.analytics_views,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error('[API/streaks] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/streaks
 * Update streak (called when user performs an activity)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getClerkUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    const supabase = getSupabaseServiceClient();

    // Update streak using the database function
    if (action === 'update_streak') {
      const { data, error } = await supabase
        .rpc('update_user_streak', { p_user_id: userId });

      if (error) {
        console.error('[API/streaks] Error updating streak:', error);
        return NextResponse.json(
          { error: 'Failed to update streak' },
          { status: 500 }
        );
      }

      const result: StreakUpdateResult = data?.[0] || {
        newStreak: 1,
        streakBroken: false,
        isNewRecord: false,
      };

      // Transform snake_case to camelCase
      return NextResponse.json({
        success: true,
        streak: {
          newStreak: result.newStreak || (data?.[0]?.new_streak ?? 1),
          streakBroken: result.streakBroken || (data?.[0]?.streak_broken ?? false),
          isNewRecord: result.isNewRecord || (data?.[0]?.is_new_record ?? false),
        },
      });
    }

    // Increment specific stat
    if (action === 'increment_stat') {
      const { stat } = body;
      const validStats = [
        'total_trades_logged',
        'total_journals_written',
        'total_reviews_completed',
        'analytics_views',
      ];

      if (!validStats.includes(stat)) {
        return NextResponse.json(
          { error: 'Invalid stat' },
          { status: 400 }
        );
      }

      // First ensure the user has a stats record
      const { data: existing } = await supabase
        .from('user_engagement_stats')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        // Create initial record
        await supabase.from('user_engagement_stats').insert({
          user_id: userId,
          total_xp: 0,
          current_level: 1,
          [stat]: 1,
        });
      } else {
        // Get current value and increment
        const { data: currentData } = await supabase
          .from('user_engagement_stats')
          .select(stat)
          .eq('user_id', userId)
          .single();

        const currentValue = Number(currentData?.[stat]) || 0;
        
        await supabase
          .from('user_engagement_stats')
          .update({ 
            [stat]: currentValue + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[API/streaks] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
