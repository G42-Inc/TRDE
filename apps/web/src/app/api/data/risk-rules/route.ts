import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
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
      stopAfterConsecutiveLosses: data.stop_after_consecutive_losses || undefined,
      stopAfterDownR: data.stop_after_down_r || undefined,
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

    const body = await request.json();
    const { riskRules } = body;

    if (!riskRules) {
      return NextResponse.json(
        { error: 'riskRules is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    const dbRiskRules = {
      id: `risk-rules-${userId}`,
      user_id: userId,
      daily_loss_limit_usd: riskRules.dailyLossLimitUsd,
      max_trades_per_day: riskRules.maxTradesPerDay,
      max_contracts_per_trade: riskRules.maxContractsPerTrade,
      stop_after_consecutive_losses: riskRules.stopAfterConsecutiveLosses || null,
      stop_after_down_r: riskRules.stopAfterDownR || null,
      require_planned_risk: riskRules.requirePlannedRisk || false,
      require_stop_defined: riskRules.requireStopDefined || false,
      updated_at: Date.now(),
      metadata: {},
    };

    const { error } = await supabase
      .from('risk_rules')
      .upsert(dbRiskRules, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error saving risk rules:', error);
      return NextResponse.json(
        { error: 'Failed to save risk rules' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in POST /api/data/risk-rules:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
