import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TradeSchema, TradesArraySchema } from '../src/lib/validation/schemas';
import { tradeFromRow, tradeToRow, saveUserTrades, TradeConflictError } from '../src/lib/trades/persistence';

const base = {
  id: 'trade-1794182400000', createdAt: 1794182400000, updatedAt: 1794182400000,
  tradeDate: '2026-11-09', entryTime: 1794182400000, exitTime: 1794182460000,
  direction: 'LONG', quantity: 1, feesUsd: 0, plannedRiskUsd: 0, resultUsd: 0, resultR: 0,
  outcome: 'BREAKEVEN', grade: 'A+', strategyId: '', strategyVersionId: '',
  session: 'NEW_YORK', marketRegime: 'TREND_UP', marketHoursTag: 'RTH_OPEN',
  setupTags: ['ORB'], newsTags: ['NONE'], mistakes: [], notes: 'A flat trade',
  attachments: [{ id: 'img-1', type: 'image', uri: 'data:image/png;base64,aGVsbG8=', caption: 'Entry chart' }],
  reviewFlag: false, collections: [], managementStyle: 'INTRADAY',
  disciplineFlags: {
    respectedDailyLossLimit: true, respectedMaxTrades: true, respectedMaxContracts: true,
    hadStopDefined: true, followedEntryRules: true, followedExitRules: true, journalCompleted: false,
  },
};
const futures = { ...base, assetClass: 'FUTURES', instrumentRoot: 'MNQ', contractSymbol: 'MNQZ6', entryPrice: 0, exitPrice: 0, tickSize: .25, tickValueUsd: .5, pointsPnL: 0, ticksPnL: 0, rthEth: 'RTH' };
const options = { ...base, id: 'options-text-id', assetClass: 'OPTIONS', underlying: 'SPY', expiration: '2026-11-09', dte: 0, strike: 0, optionType: 'PUT', entryPremium: 0, exitPremium: 0, netPremiumPnLUsd: 0, contractMultiplier: 100 };

for (const [kind, trade] of Object.entries({ futures, options, edge: { ...futures, id: 'edge-broker-123', grade: 'B-', marketRegime: 'RANGE', notes: '[EDGE Simulation]' } })) {
  test(`${kind} validates and round trips zeroes, timestamps, grades and attachments`, () => {
    const parsed = TradeSchema.parse(trade);
    const row = tradeToRow(parsed, 'user_A');
    assert.equal(row.user_id, 'user_A');
    assert.deepEqual(tradeFromRow(row), parsed);
    // Postgres numeric and bigint representations must also round trip.
    const decimalRow = Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'number' ? String(value) : value]));
    assert.deepEqual(tradeFromRow(decimalRow), parsed);
  });
}

test('rejects old/malformed contracts instead of silently dropping asset fields', () => {
  for (const patch of [
    { assetClass: 'futures' }, { direction: 'long' }, { createdAt: '2026-11-09T00:00:00Z' },
    { entryTime: null }, { quantity: 0 }, { grade: 'D' }, { resultUsd: Infinity },
    { tradeDate: '2026-02-30' }, { instrumentRoot: '' }, { entryPrice: undefined },
    { attachments: ['https://example.com/image.png'] },
    { attachments: [{ id: 'image', type: 'image', uri: 'javascript:alert(1)' }] },
  ]) assert.equal(TradeSchema.safeParse({ ...futures, ...patch }).success, false, JSON.stringify(patch));
  assert.equal(TradeSchema.safeParse({ ...options, optionType: 'call' }).success, false);
});

test('strips forged ownership and rejects ambiguous bulk operations', () => {
  const parsed = TradeSchema.parse({ ...futures, user_id: 'user_B', userId: 'user_B' });
  assert.equal('user_id' in parsed, false);
  assert.equal(TradesArraySchema.safeParse({ trades: [futures, futures] }).success, false);
  assert.equal(TradesArraySchema.safeParse({ trades: [futures], deletedIds: [futures.id] }).success, false);
  assert.equal(TradesArraySchema.safeParse({ trades: [futures], clearAll: true }).success, false);
  assert.deepEqual(TradesArraySchema.parse({ trades: [] }), { trades: [], deletedIds: [], clearAll: false });
});

// A small in-memory PostgREST adapter models conflict and ownership semantics,
// including service-role writes that do not receive automatic RLS filtering.
function database() {
  const rows = new Map<string, any>();
  const writes: Array<{ operation: string; filters: Record<string, unknown> }> = [];
  return {
    rows, writes,
    client: { from(table: string) {
      assert.equal(table, 'trades');
      let operation = 'read'; let values: any; const filters: Record<string, any> = {};
      const builder = {
        select() { return builder; },
        eq(key: string, value: unknown) { filters[key] = value; return builder; },
        in(key: string, value: unknown[]) { filters[key] = value; return builder; },
        insert(value: any[]) { operation = 'insert'; values = value; return builder; },
        update(value: any) { operation = 'update'; values = value; return builder; },
        then(resolve: (result: any) => unknown, reject: (error: any) => unknown) {
          try {
            if (operation === 'insert') {
              if (values.some((row: any) => rows.has(row.id))) return Promise.resolve({ data: null, error: { code: '23505' } }).then(resolve, reject);
              for (const row of values) rows.set(row.id, structuredClone(row));
              writes.push({ operation, filters });
              return Promise.resolve({ data: values, error: null }).then(resolve, reject);
            }
            const selected = [...rows.values()].filter(row => Object.entries(filters).every(([key, value]) => Array.isArray(value) ? value.includes(row[key]) : row[key] === value));
            if (operation === 'update') {
              writes.push({ operation, filters });
              for (const row of selected) rows.set(row.id, structuredClone({ ...row, ...values }));
            }
            return Promise.resolve({ data: structuredClone(selected), error: null }).then(resolve, reject);
          } catch (error) { return Promise.reject(error).then(resolve, reject); }
        },
      };
      return builder;
    } } as unknown as SupabaseClient,
  };
}

test('authenticated owner can create, read and edit; unchanged trades do not generate writes', async () => {
  const db = database();
  const trade = TradeSchema.parse(futures);
  await saveUserTrades(db.client, 'user_A', [trade]);
  assert.deepEqual(tradeFromRow(db.rows.get(trade.id)), trade);
  await saveUserTrades(db.client, 'user_A', [trade]);
  assert.equal(db.writes.length, 1);
  const edited = TradeSchema.parse({ ...trade, notes: 'Reviewed after refresh', exitPrice: 10, updatedAt: trade.updatedAt + 1 });
  await saveUserTrades(db.client, 'user_A', [edited]);
  assert.deepEqual(tradeFromRow(db.rows.get(trade.id)), edited);
  assert.deepEqual(db.writes[1], { operation: 'update', filters: { id: trade.id, user_id: 'user_A' } });
});

test('a service-role trade save cannot overwrite or reassign another user’s trade', async () => {
  const db = database();
  const original = TradeSchema.parse(futures);
  await saveUserTrades(db.client, 'user_A', [original]);
  await assert.rejects(saveUserTrades(db.client, 'user_B', [TradeSchema.parse({ ...original, notes: 'forged edit' })]), TradeConflictError);
  assert.equal(db.rows.get(original.id).user_id, 'user_A');
  assert.deepEqual(tradeFromRow(db.rows.get(original.id)), original);
});
