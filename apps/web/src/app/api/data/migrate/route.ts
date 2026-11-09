import { saveOwnedRecords, requireOwnedReferences } from '@/lib/db/owned-records';
import { saveUserTrades } from '@/lib/trades/persistence';
import { TradesArraySchema } from '@/lib/validation/schemas';
import { checkDemoStatus, createDemoBlockedResponse } from '@/lib/demo/guards';
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
    const userId = await getClerkUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const demo = await checkDemoStatus(userId);
    if (demo.isDemo) return createDemoBlockedResponse('migrating data');

    const body = await request.json();
    const { data } = body;

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json(
        { error: 'data object is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const results: Record<string, { success: boolean; count: number; error?: string }> = {};

    // Share validation, zero-preserving serialization, and ownership-safe writes.
    if (data.trades !== undefined) {
      const validation = TradesArraySchema.safeParse({ trades: data.trades });
      if (!validation.success) return NextResponse.json({ error: 'Invalid trade data' }, { status: 400 });
      try {
        await saveUserTrades(supabase, userId, validation.data.trades);
        results.trades = { success: true, count: validation.data.trades.length };
      } catch {
        results.trades = { success: false, count: 0, error: 'Unable to save trades. Refresh and retry.' };
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

        await saveOwnedRecords(supabase, 'user_strategies', userId, dbStrategies);

        results.strategies = {
          success: true,
          count: dbStrategies.length,
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

        await requireOwnedReferences(supabase, 'user_strategies', userId, data.versions.map((version: any) => version.strategyId));
        await saveOwnedRecords(supabase, 'user_strategy_versions', userId, dbVersions);

        results.versions = {
          success: true,
          count: dbVersions.length,
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

        await saveOwnedRecords(supabase, 'collections', userId, dbCollections);

        results.collections = {
          success: true,
          count: dbCollections.length,
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

        await saveOwnedRecords(supabase, 'quick_journals', userId, dbJournals);

        results.quickJournals = {
          success: true,
          count: dbJournals.length,
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

        await requireOwnedReferences(supabase, 'trades', userId, data.journals.map((journal: any) => journal.tradeId));
        await saveOwnedRecords(supabase, 'trade_journals', userId, dbJournals);

        results.journals = {
          success: true,
          count: dbJournals.length,
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

        await saveOwnedRecords(supabase, 'weekly_reviews', userId, dbReviews);

        results.weeklyReviews = {
          success: true,
          count: dbReviews.length,
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

        await saveOwnedRecords(supabase, 'todos', userId, dbTodos);

        results.todos = {
          success: true,
          count: dbTodos.length,
        };
      } catch (error: any) {
        results.todos = { success: false, count: 0, error: error.message };
      }
    }

    const allSuccess = Object.values(results).every(r => r.success);
    
    return NextResponse.json({
      success: allSuccess,
      results,
    }, { status: allSuccess ? 200 : 409 });
  } catch (error: any) {
    console.error('Error in migration:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
