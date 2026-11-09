import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';

/**
 * POST /api/data/migrate
 * Migrate data from localStorage/AsyncStorage format to Supabase
 * Body: { data: { trades, strategies, versions, collections, ... } }
 * 
 * This endpoint accepts all user data in one request and migrates it to the database.
 * Used during the localStorage/AsyncStorage → Supabase migration.
 * 
 * Supports both web (localStorage) and mobile (AsyncStorage) migrations.
 */
export async function POST(request: NextRequest) {
  try {
    const headerUserId = request.headers.get('x-clerk-user-id');
    const userId = headerUserId || await getClerkUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json(
        { error: 'data object is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const results: Record<string, { success: boolean; count: number; error?: string }> = {};

    // Migrate trades
    if (data.trades && Array.isArray(data.trades)) {
      try {
        const dbTrades = data.trades.map((trade: any) => ({
          id: trade.id,
          user_id: userId,
          asset_class: trade.assetClass,
          created_at: trade.createdAt,
          updated_at: trade.updatedAt,
          trade_date: trade.tradeDate,
          entry_time: trade.entryTime,
          exit_time: trade.exitTime,
          direction: trade.direction,
          quantity: trade.quantity,
          fees_usd: trade.feesUsd,
          planned_risk_usd: trade.plannedRiskUsd,
          result_usd: trade.resultUsd,
          result_r: trade.resultR,
          outcome: trade.outcome,
          grade: trade.grade,
          strategy_id: trade.strategyId || null,
          strategy_version_id: trade.strategyVersionId || null,
          session: trade.session,
          market_regime: trade.marketRegime,
          market_hours_tag: trade.marketHoursTag,
          setup_tags: trade.setupTags || [],
          news_tags: trade.newsTags || [],
          mistakes: trade.mistakes || [],
          notes: trade.notes || '',
          attachments: trade.attachments || [],
          review_flag: trade.reviewFlag,
          collections: trade.collections || [],
          discipline_flags: trade.disciplineFlags || {},
          instrument_root: trade.instrumentRoot || null,
          entry_price: trade.entryPrice || null,
          exit_price: trade.exitPrice || null,
          tick_size: trade.tickSize || null,
          tick_value_usd: trade.tickValueUsd || null,
          points_pnl: trade.pointsPnl || null,
          ticks_pnl: trade.ticksPnl || null,
          rth_eth: trade.rthEth || null,
          underlying: trade.underlying || null,
          expiration: trade.expiration || null,
          dte: trade.dte || null,
          strike: trade.strike || null,
          option_type: trade.optionType || null,
          entry_premium: trade.entryPremium || null,
          exit_premium: trade.exitPremium || null,
          net_premium_pnl_usd: trade.netPremiumPnlUsd || null,
          contract_multiplier: trade.contractMultiplier || null,
          metadata: trade.metadata || {},
        }));

        const { error } = await supabase
          .from('trades')
          .upsert(dbTrades, { onConflict: 'id' });

        results.trades = {
          success: !error,
          count: dbTrades.length,
          error: error?.message,
        };
      } catch (error: any) {
        results.trades = { success: false, count: 0, error: error.message };
      }
    }

    // Migrate strategies (uses user_strategies table - separate from community strategies)
    if (data.strategies && Array.isArray(data.strategies)) {
      try {
        const dbStrategies = data.strategies.map((strategy: any) => ({
          id: strategy.id,
          user_id: userId,
          name: strategy.name,
          description: strategy.description || null,
          created_at: strategy.createdAt,
          updated_at: strategy.updatedAt || strategy.createdAt,
          metadata: {},
        }));

        const { error } = await supabase
          .from('user_strategies')
          .upsert(dbStrategies, { onConflict: 'id' });

        results.strategies = {
          success: !error,
          count: dbStrategies.length,
          error: error?.message,
        };
      } catch (error: any) {
        results.strategies = { success: false, count: 0, error: error.message };
      }
    }

    // Migrate strategy versions (uses user_strategy_versions table)
    if (data.versions && Array.isArray(data.versions)) {
      try {
        const dbVersions = data.versions.map((version: any) => ({
          id: version.id,
          strategy_id: version.strategyId,
          user_id: userId,
          name: version.name,
          description: version.description || null,
          created_at: version.createdAt,
          updated_at: version.updatedAt || version.createdAt,
          metadata: {},
        }));

        const { error } = await supabase
          .from('user_strategy_versions')
          .upsert(dbVersions, { onConflict: 'id' });

        results.versions = {
          success: !error,
          count: dbVersions.length,
          error: error?.message,
        };
      } catch (error: any) {
        results.versions = { success: false, count: 0, error: error.message };
      }
    }

    // Migrate collections
    if (data.collections && Array.isArray(data.collections)) {
      try {
        const dbCollections = data.collections.map((collection: any) => ({
          id: collection.id,
          user_id: userId,
          name: collection.name,
          description: collection.description || null,
          trade_ids: collection.tradeIds || [],
          created_at: collection.createdAt,
          updated_at: collection.updatedAt,
          metadata: {},
        }));

        const { error } = await supabase
          .from('collections')
          .upsert(dbCollections, { onConflict: 'id' });

        results.collections = {
          success: !error,
          count: dbCollections.length,
          error: error?.message,
        };
      } catch (error: any) {
        results.collections = { success: false, count: 0, error: error.message };
      }
    }

    // Migrate daily biases
    if (data.dailyBiases && Array.isArray(data.dailyBiases)) {
      try {
        const dbBiases = data.dailyBiases.map((bias: any) => ({
          id: `bias-${userId}-${bias.date}`,
          user_id: userId,
          date: bias.date,
          bias: bias.bias,
          reason: bias.reason || '',
          confidence: bias.confidence || 50,
          confirmed: bias.confirmed,
          confirmation_notes: bias.confirmationNotes || null,
          confirmed_at: bias.confirmedAt || null,
          created_at: Date.now(),
          updated_at: Date.now(),
          metadata: {},
        }));

        const { error } = await supabase
          .from('daily_biases')
          .upsert(dbBiases, { onConflict: 'user_id,date' });

        results.dailyBiases = {
          success: !error,
          count: dbBiases.length,
          error: error?.message,
        };
      } catch (error: any) {
        results.dailyBiases = { success: false, count: 0, error: error.message };
      }
    }

    // Migrate quick journals
    if (data.quickJournals && Array.isArray(data.quickJournals)) {
      try {
        const dbJournals = data.quickJournals.map((journal: any) => ({
          id: `journal-${userId}-${journal.timestamp}`,
          user_id: userId,
          timestamp: journal.timestamp,
          mood_label: journal.moodLabel,
          mood_intensity: journal.moodIntensity || 3,
          short_note: journal.shortNote || '',
          stress_level: journal.stressLevel || null,
          sleep_quality: journal.sleepQuality || null,
          created_at: journal.timestamp,
          updated_at: journal.timestamp,
          metadata: {},
        }));

        const { error } = await supabase
          .from('quick_journals')
          .upsert(dbJournals, { onConflict: 'id' });

        results.quickJournals = {
          success: !error,
          count: dbJournals.length,
          error: error?.message,
        };
      } catch (error: any) {
        results.quickJournals = { success: false, count: 0, error: error.message };
      }
    }

    // Migrate trade journals (pre/post trade notes)
    if (data.journals && Array.isArray(data.journals)) {
      try {
        const dbJournals = data.journals.map((journal: any) => ({
          id: `journal-${journal.tradeId}`,
          user_id: userId,
          trade_id: journal.tradeId,
          pre_trade: journal.preTrade || null,
          post_trade: journal.postTrade || null,
          created_at: Date.now(),
          updated_at: Date.now(),
          metadata: {},
        }));

        const { error } = await supabase
          .from('trade_journals')
          .upsert(dbJournals, { onConflict: 'id' });

        results.journals = {
          success: !error,
          count: dbJournals.length,
          error: error?.message,
        };
      } catch (error: any) {
        results.journals = { success: false, count: 0, error: error.message };
      }
    }

    // Migrate weekly reviews
    if (data.weeklyReviews && Array.isArray(data.weeklyReviews)) {
      try {
        const dbReviews = data.weeklyReviews.map((review: any) => ({
          id: review.id,
          user_id: userId,
          week_start: review.weekStart,
          week_end: review.weekEnd,
          summary: review.summary || '',
          wins: review.wins || [],
          losses: review.losses || [],
          improvements: review.improvements || [],
          next_week_plan: review.nextWeekPlan || '',
          created_at: review.createdAt || Date.now(),
          updated_at: Date.now(),
          metadata: {},
        }));

        const { error } = await supabase
          .from('weekly_reviews')
          .upsert(dbReviews, { onConflict: 'id' });

        results.weeklyReviews = {
          success: !error,
          count: dbReviews.length,
          error: error?.message,
        };
      } catch (error: any) {
        results.weeklyReviews = { success: false, count: 0, error: error.message };
      }
    }

    // Migrate todos
    if (data.todos && Array.isArray(data.todos)) {
      try {
        const dbTodos = data.todos.map((todo: any) => ({
          id: todo.id,
          user_id: userId,
          title: todo.title,
          description: todo.description || null,
          category: todo.category || 'OTHER',
          completed: todo.completed || false,
          completed_at: todo.completedAt || null,
          due_date: todo.dueDate || null,
          created_at: todo.createdAt || Date.now(),
          updated_at: Date.now(),
          metadata: {},
        }));

        const { error } = await supabase
          .from('todos')
          .upsert(dbTodos, { onConflict: 'id' });

        results.todos = {
          success: !error,
          count: dbTodos.length,
          error: error?.message,
        };
      } catch (error: any) {
        results.todos = { success: false, count: 0, error: error.message };
      }
    }

    const allSuccess = Object.values(results).every(r => r.success);
    
    return NextResponse.json({
      success: allSuccess,
      results,
    });
  } catch (error: any) {
    console.error('Error in migration:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
