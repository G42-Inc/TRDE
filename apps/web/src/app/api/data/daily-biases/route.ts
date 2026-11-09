import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { DailyBias } from '@trde/core';

/**
 * GET /api/data/daily-biases
 * Fetch all daily biases for the authenticated user
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
      .from('daily_biases')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching daily biases:', error);
      return NextResponse.json(
        { error: 'Failed to fetch daily biases' },
        { status: 500 }
      );
    }

    const biases: DailyBias[] = (data || []).map((row: any) => ({
      date: row.date,
      bias: row.bias,
      reason: row.reason || '',
      confidence: row.confidence || 50,
      confirmed: row.confirmed,
      confirmationNotes: row.confirmation_notes,
      confirmedAt: row.confirmed_at,
    }));

    // Use 'daily-biases' key to match endpoint name for mobile client
    return NextResponse.json({ 'daily-biases': biases, biases });
  } catch (error: any) {
    console.error('Error in GET /api/data/daily-biases:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/daily-biases
 * Create or update daily biases
 * Body: { biases: DailyBias[] }
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
    const { biases } = body;

    if (!Array.isArray(biases)) {
      return NextResponse.json(
        { error: 'biases must be an array' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    // If biases array is empty, delete all for this user (clear operation)
    if (biases.length === 0) {
      const { error: deleteError } = await supabase
        .from('daily_biases')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting daily biases:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete daily biases' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true, count: 0, deleted: true });
    }

    const dbBiases = biases.map((bias: DailyBias) => ({
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
      .upsert(dbBiases, {
        onConflict: 'user_id,date',
      });

    if (error) {
      console.error('Error saving daily biases:', error);
      return NextResponse.json(
        { error: 'Failed to save daily biases' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, count: biases.length });
  } catch (error: any) {
    console.error('Error in POST /api/data/daily-biases:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
