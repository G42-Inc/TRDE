import { checkDemoStatus, createDemoBlockedResponse } from '@/lib/demo/guards';
import { strategyVersionFromRow, strategyVersionToRow } from '@/lib/journal/records';
import { saveOwnedRecords, RecordConflictError, InvalidRecordError, requireOwnedReferences } from '@/lib/db/owned-records';
import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { StrategyVersion } from '@trde/core';

/**
 * GET /api/data/strategy-versions
 * Fetch all strategy versions for the authenticated user
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
      .from('user_strategy_versions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching strategy versions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch strategy versions' },
        { status: 500 }
      );
    }

    const versions = (data || []).map(strategyVersionFromRow);

    return NextResponse.json({ versions });
  } catch (error: any) {
    console.error('Error in GET /api/data/strategy-versions:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/strategy-versions
 * Create or update strategy versions
 * Body: { versions: StrategyVersion[] }
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
    if (demo.error) return NextResponse.json({ error: 'Could not verify journal access. Please retry.' }, { status: 503 });
    if (demo.isDemo) return createDemoBlockedResponse('saving journal data');

    const body = await request.json();
    const { versions } = body;

    if (!Array.isArray(versions)) {
      return NextResponse.json(
        { error: 'versions must be an array' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    // If versions array is empty, delete all for this user (clear operation)
    if (versions.length === 0) {
      const { error: deleteError } = await supabase
        .from('user_strategy_versions')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting strategy versions:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete strategy versions' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true, count: 0, deleted: true });
    }

    const dbVersions = versions.map((version: StrategyVersion) => strategyVersionToRow(version, userId));

    await requireOwnedReferences(supabase, 'user_strategies', userId, versions.map((version: StrategyVersion) => version.strategyId));
    await saveOwnedRecords(supabase, 'user_strategy_versions', userId, dbVersions);

    return NextResponse.json({ success: true, count: versions.length });
  } catch (error: any) {
    if (error instanceof RecordConflictError || error instanceof InvalidRecordError) {
      return NextResponse.json({ error: error.message }, { status: error instanceof RecordConflictError ? 409 : 400 });
    }
    console.error('Error in POST /api/data/strategy-versions:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
