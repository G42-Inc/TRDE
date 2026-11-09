import assert from 'node:assert/strict';
import test from 'node:test';
import { createSimSession, placeMarketOrder, processFills, placeMarketOrderImmediate, updateSimSettings } from '../src/lib/edge/chart/sim/simulator';
import { calculateTotalPnL } from '../src/lib/edge/chart/sim/pnl';
import { saveSimTradesToJournal } from '../src/lib/edge/chart/sim/export';
import { getEdgeAccountScope, setEdgeAccount } from '../src/lib/edge/store/accountScope';
import { TradeSchema } from '../src/lib/validation/schemas';
import type { SimSessionState } from '../src/lib/edge/chart/sim/types';

const contract = { tickSize: 0.25, tickValue: 12.5 };
const bar = (price: number, index = 0) => ({ time: 1794236400 + index * 60, open: price, high: price, low: price, close: price });
const fresh = () => createSimSession('CON.F.US.ES.Z26', 'ES December', { slippageTicks: 0, commissionPerContractPerSide: 2.5 });
const fill = (session: SimSessionState, side: 'BUY' | 'SELL', qty: number, price: number, index = 0) => placeMarketOrderImmediate(session, side, qty, index, bar(price, index), contract);

test('queued simulation fills at the next open once, with directional slippage', () => {
  let session = updateSimSettings(fresh(), { slippageTicks: 1 });
  session = placeMarketOrder(session, 'BUY', 1, 0);
  assert.equal(processFills(session, 0, bar(4000), contract).fills.length, 0);
  session = processFills(session, 1, bar(4000, 1), contract);
  assert.equal(session.position.avgPrice, 4000.25);
  assert.equal(session.fills[0].feesApplied, 2.5);
  assert.equal(processFills(session, 1, bar(4000, 1), contract).fills.length, 1);
  session = fill(session, 'SELL', 1, 4010, 2);
  assert.equal(session.closedTrades[0].exitPrice, 4009.75);
  assert.equal(session.closedTrades[0].netUsd, 470);
});

test('long and short simulations charge both commission sides, including zero-fee trades', () => {
  for (const [entrySide, exitSide, exit] of [['BUY', 'SELL', 4010], ['SELL', 'BUY', 3990]] as const) {
    let session = fill(fresh(), entrySide, 1, 4000);
    assert.equal(calculateTotalPnL(session.position, 4000, [], contract).totalUsd, -2.5);
    session = fill(session, exitSide, 1, exit, 1);
    assert.equal(session.closedTrades[0].realizedUsd, 500);
    assert.equal(session.closedTrades[0].feesUsd, 5);
    assert.equal(session.closedTrades[0].netUsd, 495);
  }
  let free = fill(updateSimSettings(fresh(), { commissionPerContractPerSide: 0 }), 'BUY', 1, 4000);
  free = fill(free, 'SELL', 1, 4010, 1);
  assert.equal(free.closedTrades[0].netUsd, 500);
});

test('partial closes and flips allocate original entry fees even if settings change', () => {
  let session = fill(fresh(), 'BUY', 2, 4000);
  session = updateSimSettings(session, { commissionPerContractPerSide: 1 });
  session = fill(session, 'SELL', 1, 4010, 1);
  assert.equal(session.closedTrades[0].feesUsd, 3.5);
  assert.equal(session.position.entryFeesUsd, 2.5);
  session = fill(session, 'SELL', 2, 4020, 2); // Close one long, open one short.
  assert.equal(session.closedTrades[1].feesUsd, 3.5);
  assert.equal(session.position.qty, -1);
  assert.equal(session.position.entryFeesUsd, 1);
  session = fill(session, 'BUY', 1, 4010, 3);
  assert.equal(session.closedTrades[2].feesUsd, 2);
  assert.equal(session.position.entryFeesUsd, 0);
  assert.equal(session.closedTrades.reduce((sum, trade) => sum + trade.feesUsd, 0), session.fills.reduce((sum, entry) => sum + entry.feesApplied, 0));
});

test('simulation export is idempotent, preserves actual dates/net P&L, and never invents risk or instruments', async (t) => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  t.after(() => { setEdgeAccount(null); if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window'); });
  setEdgeAccount('simulation-test-owner');
  const scope = getEdgeAccountScope();
  let trades: any[] = []; let collections: any[] = []; let saves = 0; let requests = 0;
  t.mock.method(globalThis, 'fetch', async (url: string, options?: RequestInit) => {
    requests++;
    const key = url.split('/').pop();
    if (options?.method === 'POST') {
      const body = JSON.parse(options.body as string);
      if (key === 'trades') { saves++; trades = body.trades; }
      if (key === 'collections') collections = body.collections;
      return Response.json({ success: true });
    }
    return Response.json(key === 'trades' ? { trades } : key === 'collections' ? { collections } : key === 'risk-rules' ? { riskRules: null } : { ruleViolations: [] });
  });
  const closed = fill(fill(fresh(), 'BUY', 1, 4000), 'SELL', 1, 4010, 1).closedTrades[0];
  await saveSimTradesToJournal([closed, closed], scope);
  assert.equal(trades.length, 1);
  assert.equal(trades[0].resultUsd, 495);
  assert.equal(trades[0].plannedRiskUsd, 0);
  assert.equal(trades[0].resultR, 0);
  assert.equal(trades[0].entryTime, Date.parse(closed.entryTimeUtc));
  assert.equal(trades[0].tradeDate, '2026-11-09');
  assert.equal(trades[0].id, `trade-edge-simulation-test-owner-${closed.id}`);
  assert.equal(TradeSchema.safeParse(trades[0]).success, true);
  await saveSimTradesToJournal([closed], scope);
  assert.equal(saves, 1);
  await assert.rejects(saveSimTradesToJournal([{ ...closed, contractId: 'UNKNOWN' }], scope), /not supported/);
  const previousRequests = requests;
  setEdgeAccount('another-simulation-owner');
  await saveSimTradesToJournal([closed], scope);
  assert.equal(requests, previousRequests);
});
