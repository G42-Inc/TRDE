import { checkDemoStatus, createDemoBlockedResponse } from '@/lib/demo/guards';
import { saveOwnedRecords, RecordConflictError, InvalidRecordError } from '@/lib/db/owned-records';
import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { DailyQuickJournal } from '@trde/core';

/**
 * GET /api/data/quick-journals
 * Fetch all quick journals for the authenticated user
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
      .from('quick_journals')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching quick journals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quick journals' },
        { status: 500 }
      );
    }

    const journals: DailyQuickJournal[] = (data || []).map((row: any) => ({
      timestamp: row.timestamp,
      moodLabel: row.mood_label,
      moodIntensity: row.mood_intensity ?? 3,
      shortNote: row.short_note || '',
      stressLevel: row.stress_level,
      sleepQuality: row.sleep_quality,
    }));

    // Use 'quick-journals' key to match endpoint name for mobile client
    return NextResponse.json({ 'quick-journals': journals, journals });
  } catch (error: any) {
    console.error('Error in GET /api/data/quick-journals:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/quick-journals
 * Create or update quick journals
 * Body: { journals: DailyQuickJournal[] }
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
        .from('quick_journals')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting quick journals:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete quick journals' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true, count: 0, deleted: true });
    }

    const dbJournals = journals.map((journal: DailyQuickJournal) => ({
      id: `journal-${userId}-${journal.timestamp}`,
      user_id: userId,
      timestamp: journal.timestamp,
      mood_label: journal.moodLabel,
      mood_intensity: journal.moodIntensity ?? 3,
      short_note: journal.shortNote || '',
      stress_level: journal.stressLevel ?? null,
      sleep_quality: journal.sleepQuality ?? null,
      created_at: journal.timestamp,
      updated_at: journal.timestamp,
      metadata: {},
    }));

    await saveOwnedRecords(supabase, 'quick_journals', userId, dbJournals);

    return NextResponse.json({ success: true, count: journals.length });
  } catch (error: any) {
    if (error instanceof RecordConflictError || error instanceof InvalidRecordError) {
      return NextResponse.json({ error: error.message }, { status: error instanceof RecordConflictError ? 409 : 400 });
    }
    console.error('Error in POST /api/data/quick-journals:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
