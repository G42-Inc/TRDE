import { saveOwnedRecords, RecordConflictError, InvalidRecordError, requireOwnedReferences } from '@/lib/db/owned-records';
import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { checkDemoStatus, createDemoBlockedResponse } from '@/lib/demo/guards';
import type { TradeJournal } from '@trde/core';

/**
 * GET /api/data/journals
 * Fetch all trade journals for the authenticated user
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

    const supabase = getSupabaseServiceClient();
    
    const { data, error } = await supabase
      .from('trade_journals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching journals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch journals' },
        { status: 500 }
      );
    }

    const journals: TradeJournal[] = (data || []).map((row: any) => ({
      tradeId: row.trade_id,
      preTrade: row.pre_trade || undefined,
      postTrade: row.post_trade || undefined,
    }));

    return NextResponse.json({ journals });
  } catch (error: any) {
    console.error('Error in GET /api/data/journals:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/journals
 * Create or update trade journals
 * Body: { journals: TradeJournal[] }
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

    // Check demo mode - block write operations
    const demoCheck = await checkDemoStatus(userId);
    if (demoCheck.isDemo) {
      return createDemoBlockedResponse('editing journals');
    }

    const body = await request.json();
    const { journals } = body;

    if (!Array.isArray(journals)) {
      return NextResponse.json(
        { error: 'journals must be an array' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    // If journals array is empty, delete all for this user (clear operation)
    if (journals.length === 0) {
      const { error: deleteError } = await supabase
        .from('trade_journals')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting journals:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete journals' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true, count: 0, deleted: true });
    }

    const dbJournals = journals.map((journal: TradeJournal) => ({
      id: `journal-${journal.tradeId}`,
      user_id: userId,
      trade_id: journal.tradeId,
      pre_trade: journal.preTrade || null,
      post_trade: journal.postTrade || null,
      created_at: Date.now(),
      updated_at: Date.now(),
      metadata: {},
    }));

    await requireOwnedReferences(supabase, 'trades', userId, journals.map((journal: TradeJournal) => journal.tradeId));
    await saveOwnedRecords(supabase, 'trade_journals', userId, dbJournals);

    return NextResponse.json({ success: true, count: journals.length });
  } catch (error: any) {
    if (error instanceof RecordConflictError || error instanceof InvalidRecordError) {
      return NextResponse.json({ error: error.message }, { status: error instanceof RecordConflictError ? 409 : 400 });
    }
    console.error('Error in POST /api/data/journals:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
