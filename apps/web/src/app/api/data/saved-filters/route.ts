import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { SavedFilter } from '@trde/core';

/**
 * GET /api/data/saved-filters
 * Fetch all saved filters for the authenticated user
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
      .from('saved_filters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved filters:', error);
      return NextResponse.json(
        { error: 'Failed to fetch saved filters' },
        { status: 500 }
      );
    }

    const savedFilters: SavedFilter[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      filters: row.filters || {},
      createdAt: row.created_at,
    }));

    return NextResponse.json({ savedFilters });
  } catch (error: any) {
    console.error('Error in GET /api/data/saved-filters:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/saved-filters
 * Create or update saved filters
 * Body: { savedFilters: SavedFilter[] }
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
    const { savedFilters } = body;

    if (!Array.isArray(savedFilters)) {
      return NextResponse.json(
        { error: 'savedFilters must be an array' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    // If savedFilters array is empty, delete all for this user (clear operation)
    if (savedFilters.length === 0) {
      const { error: deleteError } = await supabase
        .from('saved_filters')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting saved filters:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete saved filters' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true, count: 0, deleted: true });
    }

    const dbFilters = savedFilters.map((filter: SavedFilter) => ({
      id: filter.id,
      user_id: userId,
      name: filter.name,
      filters: filter.filters || {},
      created_at: filter.createdAt,
      updated_at: Date.now(),
      metadata: {},
    }));

    const { error } = await supabase
      .from('saved_filters')
      .upsert(dbFilters, {
        onConflict: 'id',
      });

    if (error) {
      console.error('Error saving saved filters:', error);
      return NextResponse.json(
        { error: 'Failed to save saved filters' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, count: savedFilters.length });
  } catch (error: any) {
    console.error('Error in POST /api/data/saved-filters:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
