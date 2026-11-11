import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { RiskRules } from '@trde/core';
import { saveUserRiskRules } from '../src/lib/journal/risk-rules';

const rules: RiskRules = { dailyLossLimitUsd: 100.25, maxTradesPerDay: 2, maxContractsPerTrade: 1, stopAfterConsecutiveLosses: 0, stopAfterDownR: 0, requirePlannedRisk: false, requireStopDefined: true };
const table = readFileSync(new URL('../supabase/bootstrap.sql', import.meta.url), 'utf8').match(/CREATE TABLE public\.risk_rules \(([\s\S]*?)\n\);/)![1];
const columns = new Set([...table.matchAll(/^  ([a-z_]+) /gm)].map((match) => match[1]));

function database() {
  const rows = new Map<string, Record<string, unknown>>();
  let failUpdate = false;
  const client = { from(name: string) {
    assert.equal(name, 'risk_rules');
    return {
      async upsert(row: Record<string, unknown>, options: unknown) {
        for (const key of Object.keys(row)) assert.ok(columns.has(key), `Unknown risk_rules column: ${key}`);
        assert.deepEqual(options, { onConflict: 'user_id', ignoreDuplicates: true });
        assert.equal(typeof row.created_at, 'number');
        if (!rows.has(row.user_id as string)) rows.set(row.user_id as string, { ...row });
        return { error: null };
      },
      update(changes: Record<string, unknown>) {
        for (const key of Object.keys(changes)) assert.ok(columns.has(key), `Unknown risk_rules column: ${key}`);
        assert.equal('created_at' in changes, false);
        assert.equal('user_id' in changes, false);
        return { eq(column: string, owner: string) {
          assert.equal(column, 'user_id');
          return { async select(selected: string) {
            assert.equal(selected, 'user_id');
            if (failUpdate) return { data: null, error: new Error('Unavailable') };
            const row = rows.get(owner);
            if (row) rows.set(owner, { ...row, ...changes });
            return { data: row ? [{ user_id: owner }] : [], error: null };
          } };
        } };
      },
    };
  } };
  return { client: client as any, rows, fail: () => { failUpdate = true; } };
}

test('risk rules use actual bootstrap columns on first save and owner-scoped edits preserve creation', async () => {
  assert.match(table, /user_id TEXT PRIMARY KEY/);
  assert.equal(columns.has('id'), false);
  const db = database();
  await saveUserRiskRules(db.client, 'owner-a', rules, 1000);
  await saveUserRiskRules(db.client, 'owner-b', { ...rules, dailyLossLimitUsd: 200 }, 2000);
  await saveUserRiskRules(db.client, 'owner-a', { ...rules, dailyLossLimitUsd: 150.5 }, 3000);
  assert.equal(db.rows.get('owner-a')?.created_at, 1000);
  assert.equal(db.rows.get('owner-a')?.updated_at, 3000);
  assert.equal(db.rows.get('owner-a')?.daily_loss_limit_usd, 150.5);
  assert.equal(db.rows.get('owner-a')?.stop_after_down_r, 0);
  assert.equal(db.rows.get('owner-b')?.daily_loss_limit_usd, 200);
});

test('risk save errors propagate instead of reporting a completed update', async () => {
  const db = database(); db.fail();
  await assert.rejects(saveUserRiskRules(db.client, 'owner-a', rules), /Unavailable/);
  await assert.rejects(saveUserRiskRules(db.client, '', rules), /authenticated owner/);
});
