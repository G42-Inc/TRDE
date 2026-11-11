import assert from 'node:assert/strict';
import test from 'node:test';
import { exportTradesToCsv } from '@trde/mock-db';
import type { Trade } from '@trde/core';
import { clearUserJournal, JOURNAL_TABLES } from '../src/lib/data/clear-journal';
import { UserPreferencesSchema, NotificationPreferencesSchema } from '../src/lib/validation/preferences';

const trade = {
  id: 'export-example', assetClass: 'FUTURES', instrumentRoot: 'ES', tradeDate: '2026-11-09',
  entryTime: 1794236400000, exitTime: 1794236460000, direction: 'LONG', quantity: 1,
  resultUsd: -12.5, resultR: 0, outcome: 'LOSS', grade: 'B', strategyId: '',
  setupTags: [], mistakes: [], session: 'NEW_YORK', marketRegime: 'RANGE', notes: '',
} as unknown as Trade;

test('CSV includes futures/options instruments and preserves comma, quote and multiline notes', () => {
  const csv = exportTradesToCsv([{ ...trade, notes: 'Entry, then "wait"\nReview next line' }]);
  assert.match(csv, /^ID,Asset Class,Instrument,Date,/);
  assert.match(csv, /export-example,FUTURES,ES,2026-11-09,/);
  assert.ok(csv.endsWith('"Entry, then ""wait""\nReview next line"'));
  const options = { ...trade, assetClass: 'OPTIONS', underlying: 'SPY', strike: 500, optionType: 'CALL' } as Trade;
  assert.match(exportTradesToCsv([options]), /,OPTIONS,SPY 500CALL,/);
});

test('CSV exports literal text formulas without altering negative numeric P&L or zero values', () => {
  const csv = exportTradesToCsv([{ ...trade, notes: '=HYPERLINK("https://example.com")', strategyId: '@example' }]);
  assert.ok(csv.includes(',-12.5,0,LOSS,B,\'@example,'));
  assert.ok(csv.endsWith('"\'=HYPERLINK(""https://example.com"")"'));
  assert.doesNotThrow(() => exportTradesToCsv([{ ...trade, entryTime: NaN }]));
});

test('preferences validate types and timezone before database writes', () => {
  for (const input of [null, [], { soundEnabled: 'false' }, { timezone: 'invalid/timezone' }, { assetClasses: [null] }]) {
    assert.equal(UserPreferencesSchema.safeParse(input).success, false);
  }
  assert.equal(UserPreferencesSchema.safeParse({ timezone: 'America/New_York', soundEnabled: false, onboardingCompleted: true }).success, true);
  assert.equal(NotificationPreferencesSchema.safeParse({ dailyDigest: 'false' }).success, false);
  assert.deepEqual(NotificationPreferencesSchema.parse({ weeklySummary: false, userId: 'another-user' }), { weeklySummary: false });
});

test('journal deletion constrains every operation to the authenticated owner and preserves account tables', async () => {
  const calls: Array<{ table: string; column: string; userId: string }> = [];
  const client = { from: (table: string) => ({ delete: () => ({ eq: async (column: string, userId: string) => {
    calls.push({ table, column, userId }); return { error: null };
  } }) }) };
  await clearUserJournal(client as any, 'fixture-owner');
  assert.deepEqual(calls.map((call) => call.table), [...JOURNAL_TABLES]);
  assert.ok(calls.every((call) => call.column === 'user_id' && call.userId === 'fixture-owner'));
  for (const protectedTable of ['profiles', 'entitlements', 'stripe_customers', 'api_connections', 'user_api_keys', 'user_preferences', 'notification_preferences', 'strategies']) {
    assert.ok(!calls.some((call) => call.table === protectedTable));
  }
  assert.ok(calls.findIndex((call) => call.table === 'user_strategy_versions') < calls.findIndex((call) => call.table === 'user_strategies'));
  await assert.rejects(clearUserJournal(client as any, ''), /authenticated/);
});

test('journal deletion stops and reports partial failure instead of claiming success', async () => {
  const calls: string[] = [];
  const client = { from: (table: string) => ({ delete: () => ({ eq: async () => {
    calls.push(table); return { error: table === 'trades' ? { message: 'Database unavailable' } : null };
  } }) }) };
  await assert.rejects(clearUserJournal(client as any, 'fixture-owner'), /could not be deleted/);
  assert.deepEqual(calls, ['trade_journals', 'rule_violations', 'trades']);
});
