import { saveOwnedRecords, RecordConflictError, InvalidRecordError } from '@/lib/db/owned-records';
import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { WeeklyReview } from '@trde/core';

/**
 * GET /api/data/weekly-reviews
 * Fetch all weekly reviews for the authenticated user
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
      .from('weekly_reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching weekly reviews:', error);
      return NextResponse.json(
        { error: 'Failed to fetch weekly reviews' },
        { status: 500 }
      );
    }

    const weeklyReviews: WeeklyReview[] = (data || []).map((row: any) => ({
      id: row.id,
      weekStart: row.week_start,
      weekEnd: row.week_end,
      summary: row.summary || '',
      wins: row.wins || [],
      losses: row.losses || [],
      improvements: row.improvements || [],
      nextWeekPlan: row.next_week_plan || '',
      createdAt: row.created_at,
    }));

    // Use 'weekly-reviews' key to match endpoint name for mobile client
    return NextResponse.json({ 'weekly-reviews': weeklyReviews, weeklyReviews });
  } catch (error: any) {
    console.error('Error in GET /api/data/weekly-reviews:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/weekly-reviews
 * Create or update weekly reviews
 * Body: { weeklyReviews: WeeklyReview[] }
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
    const { weeklyReviews } = body;

    if (!Array.isArray(weeklyReviews)) {
      return NextResponse.json(
        { error: 'weeklyReviews must be an array' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    // If weeklyReviews array is empty, delete all for this user (clear operation)
    if (weeklyReviews.length === 0) {
      const { error: deleteError } = await supabase
        .from('weekly_reviews')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting weekly reviews:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete weekly reviews' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true, count: 0, deleted: true });
    }

    const dbReviews = weeklyReviews.map((review: WeeklyReview) => ({
      id: review.id,
      user_id: userId,
      week_start: review.weekStart,
      week_end: review.weekEnd,
      summary: review.summary || '',
      wins: review.wins || [],
      losses: review.losses || [],
      improvements: review.improvements || [],
      next_week_plan: review.nextWeekPlan || '',
      created_at: review.createdAt,
      updated_at: Date.now(),
      metadata: {},
    }));

    await saveOwnedRecords(supabase, 'weekly_reviews', userId, dbReviews);

    return NextResponse.json({ success: true, count: weeklyReviews.length });
  } catch (error: any) {
    if (error instanceof RecordConflictError || error instanceof InvalidRecordError) {
      return NextResponse.json({ error: error.message }, { status: error instanceof RecordConflictError ? 409 : 400 });
    }
    console.error('Error in POST /api/data/weekly-reviews:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
