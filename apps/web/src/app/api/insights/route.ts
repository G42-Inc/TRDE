import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { Insight } from '@/lib/engagement/types';

/**
 * GET /api/insights
 * Fetch active insights for the authenticated user
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

    const searchParams = request.nextUrl.searchParams;
    const includeDismissed = searchParams.get('include_dismissed') === 'true';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const supabase = getSupabaseServiceClient();
    
    let query = supabase
      .from('user_insights')
      .select('*')
      .eq('user_id', userId)
      .order('relevance', { ascending: false })
      .order('generated_at', { ascending: false })
      .limit(limit);

    // Filter out dismissed unless requested
    if (!includeDismissed) {
      query = query.eq('dismissed', false);
    }

    // Filter out expired insights
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    const { data, error } = await query;

    if (error) {
      console.error('[API/insights] Error fetching insights:', error);
      return NextResponse.json(
        { error: 'Failed to fetch insights' },
        { status: 500 }
      );
    }

    // Transform to camelCase
    const insights: Insight[] = (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      type: row.insight_type,
      title: row.title,
      description: row.description,
      relevance: row.relevance,
      actionUrl: row.action_url,
      data: row.data,
      dismissed: row.dismissed,
      generatedAt: row.generated_at,
      expiresAt: row.expires_at,
    }));

    // Get count of unread (not dismissed) insights
    const activeCount = insights.filter(i => !i.dismissed).length;

    return NextResponse.json({
      insights,
      activeCount,
    });
  } catch (error: any) {
    console.error('[API/insights] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/insights
 * Dismiss an insight
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
    const { insightId, action } = body;

    if (!insightId) {
      return NextResponse.json(
        { error: 'Insight ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    if (action === 'dismiss') {
      const { error } = await supabase
        .from('user_insights')
        .update({ dismissed: true })
        .eq('id', insightId)
        .eq('user_id', userId);

      if (error) {
        console.error('[API/insights] Error dismissing insight:', error);
        return NextResponse.json(
          { error: 'Failed to dismiss insight' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'dismiss_all') {
      const { error } = await supabase
        .from('user_insights')
        .update({ dismissed: true })
        .eq('user_id', userId)
        .eq('dismissed', false);

      if (error) {
        console.error('[API/insights] Error dismissing all insights:', error);
        return NextResponse.json(
          { error: 'Failed to dismiss insights' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[API/insights] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/insights
 * Clean up expired insights (called by cron job)
 */
export async function DELETE() {
  try {
    // This endpoint could be protected by API key for cron jobs
    const supabase = getSupabaseServiceClient();

    const { error } = await supabase
      .from('user_insights')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('[API/insights] Error cleaning up insights:', error);
      return NextResponse.json(
        { error: 'Failed to clean up insights' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API/insights] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
