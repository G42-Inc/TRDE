import { saveOwnedRecords, RecordConflictError, InvalidRecordError } from '@/lib/db/owned-records';
import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { Collection } from '@trde/core';

/**
 * GET /api/data/collections
 * Fetch all collections for the authenticated user
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
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching collections:', error);
      return NextResponse.json(
        { error: 'Failed to fetch collections' },
        { status: 500 }
      );
    }

    const collections: Collection[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      tradeIds: row.trade_ids || [],
      createdAt: row.created_at,
    }));

    return NextResponse.json({ collections });
  } catch (error: any) {
    console.error('Error in GET /api/data/collections:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/collections
 * Create or update collections
 * Body: { collections: Collection[] }
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

    const body = await request.json();
    const { collections } = body;

    if (!Array.isArray(collections)) {
      return NextResponse.json(
        { error: 'collections must be an array' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    // If collections array is empty, delete all for this user (clear operation)
    if (collections.length === 0) {
      const { error: deleteError } = await supabase
        .from('collections')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting collections:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete collections' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true, count: 0, deleted: true });
    }

    const dbCollections = collections.map((collection: Collection) => ({
      id: collection.id,
      user_id: userId,
      name: collection.name,
      description: collection.description || null,
      trade_ids: collection.tradeIds || [],
      created_at: collection.createdAt,
      updated_at: collection.createdAt, // Collection type doesn't have updatedAt, use createdAt
      metadata: {},
    }));

    await saveOwnedRecords(supabase, 'collections', userId, dbCollections);

    return NextResponse.json({ success: true, count: collections.length });
  } catch (error: any) {
    if (error instanceof RecordConflictError || error instanceof InvalidRecordError) {
      return NextResponse.json({ error: error.message }, { status: error instanceof RecordConflictError ? 409 : 400 });
    }
    console.error('Error in POST /api/data/collections:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
