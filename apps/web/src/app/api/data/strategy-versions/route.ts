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
    const headerUserId = request.headers.get('x-clerk-user-id');
    const userId = headerUserId || await getClerkUserId();
    
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

    const versions: StrategyVersion[] = (data || []).map((row: any) => ({
      id: row.id,
      strategyId: row.strategy_id,
      version: row.version || '',
      description: row.description || undefined,
      createdAt: row.created_at,
    }));

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
    const headerUserId = request.headers.get('x-clerk-user-id');
    const userId = headerUserId || await getClerkUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    const dbVersions = versions.map((version: StrategyVersion) => ({
      id: version.id,
      strategy_id: version.strategyId,
      user_id: userId,
      version: version.version || '',
      description: version.description || null,
      created_at: version.createdAt,
      updated_at: version.createdAt, // StrategyVersion type doesn't have updatedAt, use createdAt
      metadata: {},
    }));

    const { error } = await supabase
      .from('user_strategy_versions')
      .upsert(dbVersions, {
        onConflict: 'id',
      });

    if (error) {
      console.error('Error saving strategy versions:', error);
      return NextResponse.json(
        { error: 'Failed to save strategy versions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, count: versions.length });
  } catch (error: any) {
    console.error('Error in POST /api/data/strategy-versions:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
