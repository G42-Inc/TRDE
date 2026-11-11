import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { updateStrategyStatistics } from '@/lib/actions/strategies.server';
import { checkDemoStatus, createDemoBlockedResponse } from '@/lib/demo/guards';
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/utils/rate-limit';
import { apiLogger } from '@/lib/utils/logger';
import { TradesArraySchema, validateBody } from '@/lib/validation/schemas';
import { tradeFromRow, saveUserTrades, TradeConflictError } from '@/lib/trades/persistence';

/**
 * GET /api/data/trades
 * Fetch all trades for the authenticated user
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

    const trades = (data ?? []).map(tradeFromRow);

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
    const userId = await getClerkUserId();
    
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
    
    const { trades, deletedIds, clearAll } = validation.data;

    const supabase = getSupabaseServiceClient();
    
    await saveUserTrades(supabase, userId, trades);

    // Deletions are explicit; an empty/stale cache must never clear cloud data.
    if (clearAll || deletedIds.length) {
      let deletion = supabase.from('trades').delete().eq('user_id', userId);
      if (!clearAll) deletion = deletion.in('id', deletedIds);
      const { error } = await deletion;
      if (error) throw error;
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
    if (error instanceof TradeConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    apiLogger.error('Error in POST /api/data/trades', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
