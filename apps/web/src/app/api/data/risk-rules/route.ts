import { checkDemoStatus, createDemoBlockedResponse } from '@/lib/demo/guards';
import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { saveUserRiskRules } from '@/lib/journal/risk-rules';
import type { RiskRules } from '@trde/core';

/**
 * GET /api/data/risk-rules
 * Fetch risk rules for the authenticated user
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
      .from('risk_rules')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching risk rules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch risk rules' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ riskRules: null });
    }

    const riskRules: RiskRules = {
      dailyLossLimitUsd: data.daily_loss_limit_usd,
      maxTradesPerDay: data.max_trades_per_day,
      maxContractsPerTrade: data.max_contracts_per_trade,
      stopAfterConsecutiveLosses: data.stop_after_consecutive_losses ?? undefined,
      stopAfterDownR: data.stop_after_down_r ?? undefined,
      requirePlannedRisk: data.require_planned_risk || false,
      requireStopDefined: data.require_stop_defined || false,
    };

    return NextResponse.json({ riskRules });
  } catch (error: any) {
    console.error('Error in GET /api/data/risk-rules:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/risk-rules
 * Create or update risk rules
 * Body: { riskRules: RiskRules }
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
    const { riskRules } = body;

    if (!riskRules) {
      return NextResponse.json(
        { error: 'riskRules is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    await saveUserRiskRules(supabase, userId, riskRules);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in POST /api/data/risk-rules:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
