import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { 
  AchievementDefinition, 
  AchievementWithStatus,
  UserEngagementStats,
} from '@/lib/engagement/types';

/**
 * GET /api/achievements
 * Fetch all achievements with user's unlock status
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
    
    // Fetch all achievement definitions
    const { data: definitions, error: defError } = await supabase
      .from('achievement_definitions')
      .select('*')
      .order('sort_order', { ascending: true });

    if (defError) {
      console.error('[API/achievements] Error fetching definitions:', defError);
      return NextResponse.json(
        { error: 'Failed to fetch achievements' },
        { status: 500 }
      );
    }

    // Fetch user's unlocked achievements
    const { data: userAchievements, error: userError } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId);

    if (userError) {
      console.error('[API/achievements] Error fetching user achievements:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user achievements' },
        { status: 500 }
      );
    }

    // Fetch user stats for progress calculation
    const { data: stats } = await supabase
      .from('user_engagement_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Create a map of unlocked achievements
    const unlockedMap = new Map<string, string>();
    userAchievements?.forEach((ua) => {
      unlockedMap.set(ua.achievement_id, ua.unlocked_at);
    });

    // Build achievements with status
    const achievements: AchievementWithStatus[] = definitions?.map((def) => {
      const unlocked = unlockedMap.has(def.id);
      const achievement: AchievementWithStatus = {
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        category: def.category,
        rarity: def.rarity,
        xpReward: def.xp_reward,
        criteria: def.criteria,
        sortOrder: def.sort_order,
        unlocked,
        unlockedAt: unlockedMap.get(def.id),
      };

      // Calculate progress for non-unlocked achievements
      if (!unlocked && stats && def.criteria.threshold) {
        const progress = calculateProgress(def.criteria, stats);
        if (progress !== null) {
          achievement.progress = progress;
        }
      }

      return achievement;
    }) || [];

    // Count stats
    const totalAchievements = achievements.length;
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const totalXp = achievements
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + a.xpReward, 0);

    return NextResponse.json({
      achievements,
      stats: {
        total: totalAchievements,
        unlocked: unlockedCount,
        totalXp,
      },
    });
  } catch (error: any) {
    console.error('[API/achievements] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/achievements
 * Mark achievement as notified (after showing unlock modal)
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
    const { achievementId, action } = body;

    if (!achievementId) {
      return NextResponse.json(
        { error: 'Achievement ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    if (action === 'mark_notified') {
      // Mark achievement as notified
      const { error } = await supabase
        .from('user_achievements')
        .update({ notified: true })
        .eq('user_id', userId)
        .eq('achievement_id', achievementId);

      if (error) {
        console.error('[API/achievements] Error marking notified:', error);
        return NextResponse.json(
          { error: 'Failed to update achievement' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[API/achievements] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate progress for an achievement based on user stats
 */
function calculateProgress(
  criteria: { type: string; threshold?: number },
  stats: any
): { current: number; threshold: number; percentage: number } | null {
  if (!criteria.threshold) return null;

  let current = 0;
  const threshold = criteria.threshold;

  switch (criteria.type) {
    case 'trade_count':
      current = stats.total_trades_logged || 0;
      break;
    case 'streak':
      current = stats.current_streak || 0;
      break;
    case 'journal_count':
      current = stats.total_journals_written || 0;
      break;
    case 'analytics_views':
      current = stats.analytics_views || 0;
      break;
    case 'review_count':
      current = stats.total_reviews_completed || 0;
      break;
    default:
      return null;
  }

  return {
    current,
    threshold,
    percentage: Math.min(100, (current / threshold) * 100),
  };
}
