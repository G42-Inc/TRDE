import { checkDemoStatus, createDemoBlockedResponse } from '@/lib/demo/guards';
import { saveOwnedRecords, RecordConflictError, InvalidRecordError } from '@/lib/db/owned-records';
import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { RuleViolation } from '@trde/core';

/**
 * GET /api/data/rule-violations
 * Fetch all rule violations for the authenticated user
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
      .from('rule_violations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rule violations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rule violations' },
        { status: 500 }
      );
    }

    const ruleViolations: RuleViolation[] = (data || []).map((row: any) => ({
      id: row.id,
      tradeId: row.trade_id,
      violatedRules: row.violated_rules || [],
      createdAt: row.created_at,
      reviewed: row.reviewed || false,
      reviewNotes: row.review_notes || undefined,
      reviewedAt: row.reviewed_at || undefined,
    }));

    return NextResponse.json({ ruleViolations });
  } catch (error: any) {
    console.error('Error in GET /api/data/rule-violations:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/rule-violations
 * Create or update rule violations
 * Body: { ruleViolations: RuleViolation[] }
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
    const { ruleViolations } = body;

    if (!Array.isArray(ruleViolations)) {
      return NextResponse.json(
        { error: 'ruleViolations must be an array' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    
    // If ruleViolations array is empty, delete all for this user (clear operation)
    if (ruleViolations.length === 0) {
      const { error: deleteError } = await supabase
        .from('rule_violations')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting rule violations:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete rule violations' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true, count: 0, deleted: true });
    }

    const dbViolations = ruleViolations.map((violation: RuleViolation) => ({
      id: violation.id,
      user_id: userId,
      trade_id: violation.tradeId,
      violated_rules: violation.violatedRules || [],
      created_at: violation.createdAt,
      reviewed: violation.reviewed || false,
      review_notes: violation.reviewNotes || null,
      reviewed_at: violation.reviewedAt || null,
      updated_at: Date.now(),
      metadata: {},
    }));

    await saveOwnedRecords(supabase, 'rule_violations', userId, dbViolations);

    return NextResponse.json({ success: true, count: ruleViolations.length });
  } catch (error: any) {
    if (error instanceof RecordConflictError || error instanceof InvalidRecordError) {
      return NextResponse.json({ error: error.message }, { status: error instanceof RecordConflictError ? 409 : 400 });
    }
    console.error('Error in POST /api/data/rule-violations:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
