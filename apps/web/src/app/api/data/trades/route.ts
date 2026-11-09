import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { updateStrategyStatistics } from '@/lib/actions/strategies.server';
import { checkDemoStatus, createDemoBlockedResponse } from '@/lib/demo/guards';
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/utils/rate-limit';
import { apiLogger } from '@/lib/utils/logger';
import { TradesArraySchema, validateBody } from '@/lib/validation/schemas';
import type { Trade } from '@trde/core';

/**
 * GET /api/data/trades
 * Fetch all trades for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Read userId from middleware header first (most reliable)
    const headerUserId = request.headers.get('x-clerk-user-id');
    const userId = headerUserId || await getClerkUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limit
    const rateLimit = checkRateLimit(
      `trades:read:${userId}`,
      RATE_LIMITS.dataRead.maxRequests,
      RATE_LIMITS.dataRead.windowMs
    );
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const supabase = getSupabaseServiceClient();
    
    // Fetch only this user's trades - no cross-user queries
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      apiLogger.error('Error fetching trades', error);
      return NextResponse.json(
        { error: 'Failed to fetch trades' },
        { status: 500 }
      );
    }

    // Convert database format to Trade format
    // Note: Database stores all fields, but Trade is a union type
    // Using type assertion since database schema is more flexible than TypeScript types
    const trades = (data || []).map((row: any) => ({
      id: row.id,
      assetClass: row.asset_class,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tradeDate: row.trade_date,
      entryTime: row.entry_time,
      exitTime: row.exit_time,
      direction: row.direction,
      quantity: row.quantity,
      feesUsd: row.fees_usd,
      plannedRiskUsd: row.planned_risk_usd,
      resultUsd: parseFloat(row.result_usd),
      resultR: parseFloat(row.result_r),
      outcome: row.outcome,
      grade: row.grade,
      strategyId: row.strategy_id || '',
      strategyVersionId: row.strategy_version_id || '',
      session: row.session,
      marketRegime: row.market_regime,
      marketHoursTag: row.market_hours_tag,
      setupTags: row.setup_tags || [],
      newsTags: row.news_tags || [],
      mistakes: row.mistakes || [],
      notes: row.notes || '',
      attachments: row.attachments || [],
      reviewFlag: row.review_flag,
      collections: row.collections || [],
      disciplineFlags: row.discipline_flags || {},
      // Futures-specific
      instrumentRoot: row.instrument_root,
      entryPrice: row.entry_price ? parseFloat(row.entry_price) : undefined,
      exitPrice: row.exit_price ? parseFloat(row.exit_price) : undefined,
      tickSize: row.tick_size ? parseFloat(row.tick_size) : undefined,
      tickValueUsd: row.tick_value_usd ? parseFloat(row.tick_value_usd) : undefined,
      pointsPnL: row.points_pnl ? parseFloat(row.points_pnl) : 0,
      ticksPnL: row.ticks_pnl ? parseFloat(row.ticks_pnl) : 0,
      rthEth: row.rth_eth,
      // Options-specific
      underlying: row.underlying,
      expiration: row.expiration,
      dte: row.dte,
      strike: row.strike ? parseFloat(row.strike) : undefined,
      optionType: row.option_type,
      entryPremium: row.entry_premium ? parseFloat(row.entry_premium) : undefined,
      exitPremium: row.exit_premium ? parseFloat(row.exit_premium) : undefined,
      netPremiumPnLUsd: row.net_premium_pnl_usd ? parseFloat(row.net_premium_pnl_usd) : 0,
      contractMultiplier: row.contract_multiplier || 100,
      // Note: metadata doesn't exist on Trade type, but stored in DB
    } as Trade));

    return NextResponse.json({ trades });
  } catch (error: any) {
    apiLogger.error('Error in GET /api/data/trades', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/trades
 * Create or update trades
 * Body: { trades: Trade[] }
 */
export async function POST(request: NextRequest) {
  try {
    // Read userId from middleware header first (most reliable)
    const headerUserId = request.headers.get('x-clerk-user-id');
    const userId = headerUserId || await getClerkUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limit
    const rateLimit = checkRateLimit(
      `trades:write:${userId}`,
      RATE_LIMITS.dataWrite.maxRequests,
      RATE_LIMITS.dataWrite.windowMs
    );
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    // Check demo mode - block write operations
    const demoCheck = await checkDemoStatus(userId);
    if (demoCheck.isDemo) {
      return createDemoBlockedResponse('logging trades');
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    
    // Validate input with Zod schema
    const validation = validateBody(body, TradesArraySchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: `Validation error: ${validation.error}` },
        { status: 400 }
      );
    }
    
    const { trades } = validation.data;

    const supabase = getSupabaseServiceClient();
    
    // Convert Trade format to database format
    const dbTrades = trades.map((trade) => ({
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
      // Futures-specific
      instrument_root: trade.assetClass === 'futures' ? (trade as any).instrumentRoot : null,
      entry_price: trade.assetClass === 'futures' ? (trade as any).entryPrice : null,
      exit_price: trade.assetClass === 'futures' ? (trade as any).exitPrice : null,
      tick_size: trade.assetClass === 'futures' ? (trade as any).tickSize : null,
      tick_value_usd: trade.assetClass === 'futures' ? (trade as any).tickValueUsd : null,
      points_pnl: (trade as any).pointsPnL || (trade as any).pointsPnl || null,
      ticks_pnl: (trade as any).ticksPnL || (trade as any).ticksPnl || null,
      rth_eth: trade.assetClass === 'futures' ? (trade as any).rthEth : null,
      // Options-specific
      underlying: trade.assetClass === 'options' ? (trade as any).underlying : null,
      expiration: trade.assetClass === 'options' ? (trade as any).expiration : null,
      dte: trade.assetClass === 'options' ? (trade as any).dte : null,
      strike: trade.assetClass === 'options' ? (trade as any).strike : null,
      option_type: trade.assetClass === 'options' ? (trade as any).optionType : null,
      entry_premium: trade.assetClass === 'options' ? (trade as any).entryPremium : null,
      exit_premium: trade.assetClass === 'options' ? (trade as any).exitPremium : null,
      net_premium_pnl_usd: (trade as any).netPremiumPnLUsd || (trade as any).netPremiumPnlUsd || null,
      contract_multiplier: trade.assetClass === 'options' ? (trade as any).contractMultiplier : null,
      metadata: (trade as any).metadata || {},
    }));

    // If trades array is empty, delete all trades for this user (clear operation)
    if (trades.length === 0) {
      const { error: deleteError } = await supabase
        .from('trades')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        apiLogger.error('Error deleting trades', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete trades' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true, count: 0, deleted: true });
    }

    // Upsert all trades
    const { error } = await supabase
      .from('trades')
      .upsert(dbTrades, {
        onConflict: 'id',
      });

    if (error) {
      apiLogger.error('Error saving trades', error);
      return NextResponse.json(
        { error: 'Failed to save trades' },
        { status: 500 }
      );
    }

    // Update strategy statistics for any strategies affected by these trades
    const uniqueStrategyIds = [...new Set(trades.map(t => t.strategyId).filter(Boolean))];
    for (const strategyId of uniqueStrategyIds) {
      try {
        await updateStrategyStatistics(strategyId as string);
      } catch (statError) {
        apiLogger.warn(`Error updating stats for strategy ${strategyId}`, { context: { strategyId } });
        // Don't fail the request if stats update fails
      }
    }

    return NextResponse.json({ success: true, count: trades.length });
  } catch (error: any) {
    apiLogger.error('Error in POST /api/data/trades', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
