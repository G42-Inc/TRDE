import assert from 'node:assert/strict';
import test from 'node:test';
import { Outcome, type Trade } from '@trde/core';
import { calculateStreaks, filterPerformanceTrades } from '../src/lib/trades/performance';

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
