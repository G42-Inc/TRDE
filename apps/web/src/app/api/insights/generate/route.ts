import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { InsightType } from '@/lib/engagement/types';

interface GeneratedInsight {
  type: InsightType;
  title: string;
  description: string;
  relevance: number;
  actionUrl?: string;
  data?: Record<string, any>;
}

/**
 * POST /api/insights/generate
 * Generate new personalized insights based on user's trading data
 */
export async function POST() {
  try {
    const userId = await getClerkUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServiceClient();

    // Clear old insights first (except dismissed ones for history)
    await supabase
      .from('user_insights')
      .delete()
      .eq('user_id', userId)
      .eq('dismissed', false);

    // Fetch user's trade data
    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!trades || trades.length === 0) {
      return NextResponse.json({
        insights: [],
        message: 'No trades to analyze',
      });
    }

    // Fetch user preferences for personalization
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Generate insights
    const insights = generateInsights(trades, prefs);

    // Save insights to database
    const insightsToInsert = insights.map((insight) => ({
      user_id: userId,
      insight_type: insight.type,
      title: insight.title,
      description: insight.description,
      relevance: insight.relevance,
      action_url: insight.actionUrl,
      data: insight.data,
      dismissed: false,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }));

    if (insightsToInsert.length > 0) {
      const { error } = await supabase
        .from('user_insights')
        .insert(insightsToInsert);

      if (error) {
        console.error('[API/insights/generate] Error saving insights:', error);
      }
    }

    return NextResponse.json({
      insights,
      count: insights.length,
    });
  } catch (error: any) {
    console.error('[API/insights/generate] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate insights based on trading data
 */
function generateInsights(
  trades: any[],
  prefs: any | null
): GeneratedInsight[] {
  const insights: GeneratedInsight[] = [];

  // Need at least 5 trades for meaningful insights
  if (trades.length < 5) {
    insights.push({
      type: 'tip',
      title: 'Build Your Data Foundation',
      description: `You have ${trades.length} trade${trades.length === 1 ? '' : 's'} logged. Log at least 5 trades to start seeing personalized insights about your trading patterns.`,
      relevance: 100,
      actionUrl: '/trades/new',
    });
    return insights;
  }

  // Calculate basic stats
  const wins = trades.filter(t => t.outcome === 'win').length;
  const losses = trades.filter(t => t.outcome === 'loss').length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

  // Time-based analysis
  const tradesByHour = analyzeByHour(trades);
  const tradesByDay = analyzeByDay(trades);
  
  // Grade analysis
  const gradeStats = analyzeByGrade(trades);

  // Generate time-of-day insight
  if (tradesByHour.bestHour && tradesByHour.bestHour.winRate > winRate + 10) {
    insights.push({
      type: 'pattern',
      title: 'Peak Performance Hour',
      description: `Your win rate is ${tradesByHour.bestHour.winRate.toFixed(0)}% at ${formatHour(tradesByHour.bestHour.hour)} vs ${winRate.toFixed(0)}% overall. Consider focusing your trading during this time.`,
      relevance: 85,
      actionUrl: '/analytics',
      data: { bestHour: tradesByHour.bestHour },
    });
  }

  if (tradesByHour.worstHour && tradesByHour.worstHour.winRate < winRate - 15 && tradesByHour.worstHour.count >= 3) {
    insights.push({
      type: 'warning',
      title: 'Challenging Time Period',
      description: `Your win rate drops to ${tradesByHour.worstHour.winRate.toFixed(0)}% at ${formatHour(tradesByHour.worstHour.hour)}. Consider reducing position size or avoiding trades during this hour.`,
      relevance: 90,
      actionUrl: '/analytics',
      data: { worstHour: tradesByHour.worstHour },
    });
  }

  // Day of week insight
  if (tradesByDay.bestDay && tradesByDay.bestDay.winRate > winRate + 10) {
    insights.push({
      type: 'pattern',
      title: `${tradesByDay.bestDay.day} Is Your Day`,
      description: `You have a ${tradesByDay.bestDay.winRate.toFixed(0)}% win rate on ${tradesByDay.bestDay.day}s, compared to ${winRate.toFixed(0)}% overall.`,
      relevance: 80,
      data: { bestDay: tradesByDay.bestDay },
    });
  }

  // Grade-based insight
  if (gradeStats.aGradeWinRate !== null && gradeStats.cGradeWinRate !== null) {
    const diff = gradeStats.aGradeWinRate - gradeStats.cGradeWinRate;
    if (diff > 20) {
      insights.push({
        type: 'improvement',
        title: 'Quality Over Quantity',
        description: `Your A-grade setups have a ${gradeStats.aGradeWinRate.toFixed(0)}% win rate vs ${gradeStats.cGradeWinRate.toFixed(0)}% for C-grades. Focus on waiting for high-quality setups.`,
        relevance: 95,
        actionUrl: '/analytics',
        data: { gradeStats },
      });
    }
  }

  // Win rate improvement check (compare recent vs older)
  const recentTrades = trades.slice(0, Math.min(20, Math.floor(trades.length / 2)));
  const olderTrades = trades.slice(-Math.min(20, Math.floor(trades.length / 2)));
  
  if (recentTrades.length >= 10 && olderTrades.length >= 10) {
    const recentWinRate = (recentTrades.filter(t => t.outcome === 'win').length / recentTrades.length) * 100;
    const olderWinRate = (olderTrades.filter(t => t.outcome === 'win').length / olderTrades.length) * 100;
    
    if (recentWinRate > olderWinRate + 10) {
      insights.push({
        type: 'celebration',
        title: 'You\'re Improving!',
        description: `Your recent win rate of ${recentWinRate.toFixed(0)}% is up from ${olderWinRate.toFixed(0)}% in your earlier trades. Keep up the great work!`,
        relevance: 85,
        data: { recentWinRate, olderWinRate },
      });
    } else if (recentWinRate < olderWinRate - 10) {
      insights.push({
        type: 'warning',
        title: 'Performance Dip Detected',
        description: `Your recent win rate of ${recentWinRate.toFixed(0)}% is down from ${olderWinRate.toFixed(0)}%. Review your recent trades to identify what changed.`,
        relevance: 90,
        actionUrl: '/trades',
        data: { recentWinRate, olderWinRate },
      });
    }
  }

  // Streak insight
  let currentStreak = 0;
  let streakType: 'win' | 'loss' | null = null;
  for (const trade of trades) {
    if (streakType === null) {
      streakType = trade.outcome;
      currentStreak = 1;
    } else if (trade.outcome === streakType) {
      currentStreak++;
    } else {
      break;
    }
  }

  if (currentStreak >= 3) {
    if (streakType === 'win') {
      insights.push({
        type: 'celebration',
        title: `${currentStreak} Wins in a Row!`,
        description: `You're on a ${currentStreak}-trade winning streak. Stay focused and don't let overconfidence affect your next trade.`,
        relevance: 75,
      });
    } else {
      insights.push({
        type: 'warning',
        title: 'Losing Streak',
        description: `You've had ${currentStreak} consecutive losses. Consider taking a break or reducing position size until momentum shifts.`,
        relevance: 95,
        actionUrl: '/journal',
      });
    }
  }

  // Tip based on preferences
  if (prefs?.primary_goal === 'improve_discipline' && trades.length >= 10) {
    const gradeBreakdown = trades.reduce((acc: Record<string, number>, t) => {
      acc[t.grade || 'none'] = (acc[t.grade || 'none'] || 0) + 1;
      return acc;
    }, {});
    
    const cCount = (gradeBreakdown['C'] || 0) + (gradeBreakdown['D'] || 0);
    const lowGradePercent = (cCount / trades.length) * 100;
    
    if (lowGradePercent > 30) {
      insights.push({
        type: 'tip',
        title: 'Discipline Focus',
        description: `${lowGradePercent.toFixed(0)}% of your trades are C or D grade. Since improving discipline is your goal, try setting a rule to only take A or B grade setups for one week.`,
        relevance: 85,
        actionUrl: '/risk',
      });
    }
  }

  // Sort by relevance
  insights.sort((a, b) => b.relevance - a.relevance);

  // Return top 10 insights
  return insights.slice(0, 10);
}

function analyzeByHour(trades: any[]): {
  bestHour: { hour: number; winRate: number; count: number } | null;
  worstHour: { hour: number; winRate: number; count: number } | null;
} {
  const hourStats: Record<number, { wins: number; total: number }> = {};

  for (const trade of trades) {
    const date = new Date(trade.created_at);
    const hour = date.getHours();
    
    if (!hourStats[hour]) {
      hourStats[hour] = { wins: 0, total: 0 };
    }
    
    hourStats[hour].total++;
    if (trade.outcome === 'win') {
      hourStats[hour].wins++;
    }
  }

  let bestHour = null;
  let worstHour = null;

  for (const [hourStr, stats] of Object.entries(hourStats)) {
    if (stats.total < 3) continue; // Need at least 3 trades
    
    const hour = parseInt(hourStr);
    const winRate = (stats.wins / stats.total) * 100;
    
    if (!bestHour || winRate > bestHour.winRate) {
      bestHour = { hour, winRate, count: stats.total };
    }
    if (!worstHour || winRate < worstHour.winRate) {
      worstHour = { hour, winRate, count: stats.total };
    }
  }

  return { bestHour, worstHour };
}

function analyzeByDay(trades: any[]): {
  bestDay: { day: string; winRate: number; count: number } | null;
} {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayStats: Record<string, { wins: number; total: number }> = {};

  for (const trade of trades) {
    const date = new Date(trade.created_at);
    const day = days[date.getDay()];
    
    if (!dayStats[day]) {
      dayStats[day] = { wins: 0, total: 0 };
    }
    
    dayStats[day].total++;
    if (trade.outcome === 'win') {
      dayStats[day].wins++;
    }
  }

  let bestDay = null;

  for (const [day, stats] of Object.entries(dayStats)) {
    if (stats.total < 3) continue;
    
    const winRate = (stats.wins / stats.total) * 100;
    
    if (!bestDay || winRate > bestDay.winRate) {
      bestDay = { day, winRate, count: stats.total };
    }
  }

  return { bestDay };
}

function analyzeByGrade(trades: any[]): {
  aGradeWinRate: number | null;
  cGradeWinRate: number | null;
} {
  const aGrades = trades.filter(t => t.grade === 'A');
  const cGrades = trades.filter(t => t.grade === 'C' || t.grade === 'D');

  return {
    aGradeWinRate: aGrades.length >= 3 
      ? (aGrades.filter(t => t.outcome === 'win').length / aGrades.length) * 100 
      : null,
    cGradeWinRate: cGrades.length >= 3 
      ? (cGrades.filter(t => t.outcome === 'win').length / cGrades.length) * 100 
      : null,
  };
}

function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}
