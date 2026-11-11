import assert from 'node:assert/strict';
import test from 'node:test';
import { dailyBiasFromRow, mergeDailyBias, riskRulesToRow, strategyVersionFromRow, strategyVersionToRow } from '../src/lib/journal/records';
import { clearAllData } from '../src/lib/storage.db';

test('editing a daily bias replaces that day without duplicating dates or losing confidence zero', () => {
  const other = { date: '2026-11-08', bias: 'neutral' as const, reason: 'Previous day', confidence: 50 };
  const today = { ...other, date: '2026-11-09', reason: 'First draft' };
  const edited = { ...today, reason: 'Reviewed outlook', confidence: 0, confirmed: false, confirmedAt: 0 };
  assert.deepEqual(mergeDailyBias([other, today, today], edited), [other, edited]);
});

test('database daily bias preserves zero and false, and null is not a confirmed result', () => {
  const row = { date: '2026-11-09', bias: 'neutral', reason: '', confidence: 0, confirmed: false, confirmed_at: '0' };
  assert.equal(dailyBiasFromRow(row).confidence, 0);
  assert.equal(dailyBiasFromRow(row).confirmed, false);
  assert.equal(dailyBiasFromRow(row).confirmedAt, 0);
  assert.equal(dailyBiasFromRow({ ...row, confirmed: null, confirmed_at: null }).confirmed, undefined);
  assert.equal(dailyBiasFromRow({ ...row, confirmed_at: null }).confirmedAt, undefined);
});

test('strategy version metadata round trips definition, triggers, precise timestamp and explicit owner', () => {
  const version = { id: 'version-owned', strategyId: 'strategy-owned', version: 'v1', description: '', definition: 'Entry after 0.25 point break\nKeep exact notes.', triggers: 'Volume > 1.5×', createdAt: 1794236400123 };
  const row = strategyVersionToRow(version, 'user_owner');
  assert.equal(row.user_id, 'user_owner');
  assert.deepEqual(strategyVersionFromRow({ ...row, created_at: String(row.created_at) }), version);
  assert.equal(strategyVersionFromRow({ ...row, metadata: {} }).definition, undefined);
});

test('clear journal uses the explicit owned endpoint and propagates partial server failure', async (t) => {
  const calls: Array<{ url: string; body: unknown }> = [];
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    calls.push({ url, body: JSON.parse(options.body as string) });
    return new Response(JSON.stringify({ error: 'Some journal data could not be deleted. Please refresh and retry.' }), { status: 500 });
  });
  await assert.rejects(clearAllData(), /could not be deleted/);
  assert.deepEqual(calls, [{ url: '/api/data/clear-journal', body: { confirmation: 'DELETE JOURNAL DATA' } }]);
});

test('first risk save supplies required timestamps and preserves optional zeros and false', () => {
  const row = riskRulesToRow({ dailyLossLimitUsd: 100, maxTradesPerDay: 2, maxContractsPerTrade: 1, stopAfterConsecutiveLosses: 0, stopAfterDownR: 0, requirePlannedRisk: false, requireStopDefined: true }, 'risk-owner', 1794236400123);
  assert.equal(row.created_at, 1794236400123);
  assert.equal(row.updated_at, row.created_at);
  assert.equal(row.user_id, 'risk-owner');
  assert.equal('id' in row, false);
  assert.equal(row.stop_after_consecutive_losses, 0);
  assert.equal(row.stop_after_down_r, 0);
  assert.equal(row.require_planned_risk, false);
});
