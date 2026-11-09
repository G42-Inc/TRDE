import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { AchievementDefinition, AchievementCriteria } from '@/lib/engagement/types';

interface UnlockedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  xpReward: number;
}

interface CheckResult {
  newlyUnlocked: UnlockedAchievement[];
  xpGained: number;
  levelUp: boolean;
  newLevel: number;
}

/**
 * POST /api/achievements/check
 * Check and unlock any newly earned achievements
 * Call this after actions that might trigger achievements
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

    const supabase = getSupabaseServiceClient();
    
    // Get user's current stats
    const { data: stats, error: statsError } = await supabase
      .from('user_engagement_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (statsError) {
      console.error('[API/achievements/check] Error fetching stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch user stats' },
        { status: 500 }
      );
    }

    // If no stats exist, create default
    if (!stats) {
      await supabase.from('user_engagement_stats').insert({
        user_id: userId,
        total_xp: 0,
        current_level: 1,
      });
    }

    // Get all achievement definitions
    const { data: definitions, error: defError } = await supabase
      .from('achievement_definitions')
      .select('*');

    if (defError || !definitions) {
      console.error('[API/achievements/check] Error fetching definitions:', defError);
      return NextResponse.json(
        { error: 'Failed to fetch achievements' },
        { status: 500 }
      );
    }

    // Get user's already unlocked achievements
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || []);

    // Get additional data needed for achievement checking
    const additionalData = await getAdditionalStats(supabase, userId);

    // Check each achievement
    const newlyUnlocked: UnlockedAchievement[] = [];
    let totalXpGained = 0;

    for (const def of definitions) {
      // Skip if already unlocked
      if (unlockedIds.has(def.id)) continue;

      // Check if criteria is met
      const isEarned = checkCriteria(def.criteria, stats || {}, additionalData);

      if (isEarned) {
        // Unlock the achievement
        const { error: unlockError } = await supabase
          .from('user_achievements')
          .insert({
            user_id: userId,
            achievement_id: def.id,
            notified: false,
          });

        if (!unlockError) {
          newlyUnlocked.push({
            id: def.id,
            name: def.name,
            description: def.description,
            icon: def.icon,
            category: def.category,
            rarity: def.rarity,
            xpReward: def.xp_reward,
          });
          totalXpGained += def.xp_reward;
        }
      }
    }

    // Add XP if any achievements were unlocked
    let levelUp = false;
    let newLevel = stats?.current_level || 1;

    if (totalXpGained > 0) {
      const { data: xpResult } = await supabase
        .rpc('add_user_xp', {
          p_user_id: userId,
          p_xp_amount: totalXpGained,
        });

      if (xpResult && xpResult.length > 0) {
        levelUp = xpResult[0].level_changed;
        newLevel = xpResult[0].new_level;
      }
    }

    const result: CheckResult = {
      newlyUnlocked,
      xpGained: totalXpGained,
      levelUp,
      newLevel,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API/achievements/check] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get additional statistics needed for achievement checking
 */
async function getAdditionalStats(supabase: any, userId: string) {
  const results: Record<string, any> = {};

  // Get strategy count
  const { count: strategyCount } = await supabase
    .from('strategies')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  results.strategyCount = strategyCount || 0;

  // Get collection count
  const { count: collectionCount } = await supabase
    .from('collections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  results.collectionCount = collectionCount || 0;

  // Get saved filter count
  const { count: savedFilterCount } = await supabase
    .from('saved_filters')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  results.savedFilterCount = savedFilterCount || 0;

  // Check if risk rules are set
  const { data: riskRules } = await supabase
    .from('risk_rules')
    .select('id')
    .eq('user_id', userId)
    .limit(1);
  results.hasRiskRules = (riskRules?.length || 0) > 0;

  // Get unique instruments traded
  const { data: trades } = await supabase
    .from('trades')
    .select('instrument')
    .eq('user_id', userId);
  const uniqueInstruments = new Set(trades?.map((t: any) => t.instrument).filter(Boolean));
  results.uniqueInstruments = uniqueInstruments.size;

  // Get trade outcomes for win streak checking
  const { data: recentTrades } = await supabase
    .from('trades')
    .select('outcome, grade, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  results.recentTrades = recentTrades || [];

  // Calculate win streak
  let winStreak = 0;
  for (const trade of (recentTrades || [])) {
    if (trade.outcome === 'win') {
      winStreak++;
    } else {
      break;
    }
  }
  results.currentWinStreak = winStreak;

  // Calculate A-grade streak
  let gradeStreak = 0;
  for (const trade of (recentTrades || [])) {
    if (trade.grade === 'A') {
      gradeStreak++;
    } else {
      break;
    }
  }
  results.currentGradeStreak = gradeStreak;

  return results;
}

/**
 * Check if achievement criteria is met
 */
function checkCriteria(
  criteria: AchievementCriteria,
  stats: any,
  additionalData: Record<string, any>
): boolean {
  const threshold = criteria.threshold || 0;

  switch (criteria.type) {
    case 'trade_count':
      return (stats.total_trades_logged || 0) >= threshold;

    case 'streak':
      return (stats.current_streak || 0) >= threshold;

    case 'journal_count':
      return (stats.total_journals_written || 0) >= threshold;

    case 'analytics_views':
      return (stats.analytics_views || 0) >= threshold;

    case 'review_count':
      return (stats.total_reviews_completed || 0) >= threshold;

    case 'strategy_count':
      return additionalData.strategyCount >= threshold;

    case 'collection_count':
      return additionalData.collectionCount >= threshold;

    case 'saved_filter_count':
      return additionalData.savedFilterCount >= threshold;

    case 'risk_rules_set':
      return additionalData.hasRiskRules;

    case 'instrument_diversity':
      return additionalData.uniqueInstruments >= threshold;

    case 'win_streak':
      return additionalData.currentWinStreak >= threshold;

    case 'grade_streak':
      const grade = criteria.grade || 'A';
      if (grade === 'A') {
        return additionalData.currentGradeStreak >= threshold;
      }
      return false;

    case 'time_based':
      // These are checked when trades are logged
      return false;

    case 'first_day':
      // User has stats means they've been active
      return !!stats;

    case 'days_active':
      // Would need to track days active separately
      return false;

    default:
      return false;
  }
}
