import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';

export type DashboardMetricId = 
  | 'totalPnLUsd' 
  | 'totalPnLR' 
  | 'winRate' 
  | 'profitFactor' 
  | 'expectancy' 
  | 'avgWinR' 
  | 'avgLossR' 
  | 'maxDrawdownUsd' 
  | 'maxDrawdownR'
  | 'consistencyScore' 
  | 'feeDrag' 
  | 'mistakeTaxUsd';

const DEFAULT_METRICS: DashboardMetricId[] = ['totalPnLUsd', 'winRate', 'profitFactor', 'mistakeTaxUsd'];

/**
 * GET /api/data/dashboard-metrics
 * Fetch dashboard metrics configuration for the authenticated user
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
      .from('dashboard_metrics')
      .select('metric_ids')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching dashboard metrics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch dashboard metrics' },
        { status: 500 }
      );
    }

    const dashboardMetrics = data?.metric_ids || DEFAULT_METRICS;

    return NextResponse.json({ dashboardMetrics });
  } catch (error: any) {
    console.error('Error in GET /api/data/dashboard-metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/dashboard-metrics
 * Save dashboard metrics configuration
 * Body: { dashboardMetrics: DashboardMetricId[] }
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
    const { dashboardMetrics } = body;

    if (!Array.isArray(dashboardMetrics)) {
      return NextResponse.json(
        { error: 'dashboardMetrics must be an array' },
        { status: 400 }
      );
    }

    if (dashboardMetrics.length !== 4) {
      return NextResponse.json(
        { error: 'dashboardMetrics must contain exactly 4 metrics' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    const { error } = await supabase
      .from('dashboard_metrics')
      .upsert({
        user_id: userId,
        metric_ids: dashboardMetrics,
        created_at: Date.now(),
        updated_at: Date.now(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error saving dashboard metrics:', error);
      return NextResponse.json(
        { error: 'Failed to save dashboard metrics' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in POST /api/data/dashboard-metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
