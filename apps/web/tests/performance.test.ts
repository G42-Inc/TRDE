import assert from 'node:assert/strict';
import test from 'node:test';
import { Outcome, calculateDayOfWeekPerformance, calculateMaxDrawdownR, calculateMaxDrawdownUsd, calculateRollingExpectancy, type Trade } from '@trde/core';
import { calculateHourlyPerformance, calculateStreaks, filterPerformanceTrades } from '../src/lib/trades/performance';

test('breakeven trades interrupt streaks without becoming losses', () => {
  const result = calculateStreaks([Outcome.WIN, Outcome.WIN, Outcome.BREAKEVEN, Outcome.LOSS, Outcome.BREAKEVEN, Outcome.LOSS].map(outcome => ({ outcome })));
  assert.equal(result.maxWinStreak, 2);
  assert.equal(result.maxLossStreak, 1);
  assert.equal(result.avgConsecutiveLosses, 1);
  assert.deepEqual(result.streakHistory[2], { trade: 3, winStreak: 0, lossStreak: 0 });
  assert.equal(calculateStreaks([{ outcome: Outcome.BREAKEVEN }]).maxLossStreak, 0);
});

test('performance period uses execution time and EDGE toggle actually filters', () => {
  const now = Date.now();
  const trades = [
    { id: 'historical-import', entryTime: now - 100 * 86_400_000, createdAt: now, collections: [], notes: '' },
    { id: 'normal', entryTime: now, collections: [], notes: '' },
    { id: 'edge-notes', entryTime: now, collections: [], notes: '[EDGE Simulation]' },
    { id: 'edge-collection', entryTime: now, collections: ['edge'], notes: '' },
  ] as unknown as Trade[];
  assert.deepEqual(filterPerformanceTrades(trades, 30, false, 'edge', now).map(t => t.id), ['normal', 'edge-notes', 'edge-collection']);
  assert.deepEqual(filterPerformanceTrades(trades, null, true, 'edge', now).map(t => t.id), ['edge-notes', 'edge-collection']);
  assert.equal(trades.length, 4);
});

test('same-day analytics use execution order without mutating shared journal records', () => {
  const trade = (hour: number, result: number) => ({
    entryTime: new Date(2026, 10, 9, hour).getTime(), tradeDate: '2026-11-09', resultUsd: result * 100, resultR: result,
  }) as Trade;
  const trades = Object.freeze([trade(11, -2), trade(9, 3), trade(10, -1)]) as unknown as Trade[];
  assert.equal(calculateMaxDrawdownUsd(trades), 300);
  assert.equal(calculateMaxDrawdownR(trades), 3);
  assert.deepEqual(calculateRollingExpectancy(trades, 1), [3, -1, -2]);
  assert.deepEqual(trades.map(t => t.resultR), [-2, 3, -1]);
});

test('hourly results use execution time and calendar weekdays retain the named trading date', () => {
  const trade = (hour: number, outcome: Outcome, resultR: number) => ({
    entryTime: new Date(2026, 10, 9, hour).getTime(), tradeDate: '2026-11-09', resultUsd: resultR * 100, resultR, outcome,
  }) as Trade;
  const trades = [trade(9, Outcome.WIN, 2), trade(9, Outcome.BREAKEVEN, 0), trade(14, Outcome.LOSS, -1)];
  assert.deepEqual(calculateHourlyPerformance(trades).map(h => ({ hour: h.hour, pnl: h.pnl, r: h.r, count: h.count, winRate: h.winRate })), [
    { hour: '09:00', pnl: 200, r: 2, count: 2, winRate: 50 },
    { hour: '14:00', pnl: -100, r: -1, count: 1, winRate: 0 },
  ]);
  assert.deepEqual(calculateDayOfWeekPerformance(trades).Monday, { count: 3, pnl: 100, r: 1 });
  assert.equal(calculateDayOfWeekPerformance(trades).Sunday.count, 0);
});
