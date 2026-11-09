import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { checkDemoStatus, createDemoBlockedResponse } from '@/lib/demo/guards';
import type { Strategy } from '@trde/core';

/**
 * GET /api/data/strategies
 * Fetch all personal strategies for the authenticated user
 * 
 * Uses user_strategies table (separate from community strategies)
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

    const supabase = getSupabaseServiceClient();
    
    const { data, error } = await supabase
      .from('user_strategies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching strategies:', error);
      return NextResponse.json(
        { error: 'Failed to fetch strategies' },
        { status: 500 }
      );
    }

    const strategies: Strategy[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ strategies });
  } catch (error: any) {
    console.error('Error in GET /api/data/strategies:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/strategies
 * Create or update personal strategies
 * Body: { strategies: Strategy[] }
 * 
 * Uses user_strategies table (separate from community strategies)
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

    // Check demo mode - block write operations
    const demoCheck = await checkDemoStatus(userId);
    if (demoCheck.isDemo) {
      return createDemoBlockedResponse('creating strategies');
    }

    const body = await request.json();
    const { strategies } = body;

    if (!Array.isArray(strategies)) {
      return NextResponse.json(
        { error: 'strategies must be an array' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    // If strategies array is empty, delete all for this user (clear operation)
    if (strategies.length === 0) {
      const { error: deleteError } = await supabase
        .from('user_strategies')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting strategies:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete strategies' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true, count: 0, deleted: true });
    }

    const dbStrategies = strategies.map((strategy: Strategy) => ({
      id: strategy.id,
      user_id: userId,
      name: strategy.name,
      description: strategy.description || null,
      created_at: strategy.createdAt,
      updated_at: strategy.createdAt,
      metadata: {},
    }));

    const { error } = await supabase
      .from('user_strategies')
      .upsert(dbStrategies, { onConflict: 'id' });

    if (error) {
      console.error('Error saving strategies:', error);
      return NextResponse.json(
        { error: 'Failed to save strategies' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, count: strategies.length });
  } catch (error: any) {
    console.error('Error in POST /api/data/strategies:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
