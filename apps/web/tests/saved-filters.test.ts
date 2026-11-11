import assert from 'node:assert/strict';
import test from 'node:test';
import { AssetClass, Outcome, type SavedFilter, type Trade } from '@trde/core';
import { filterTrades } from '@trde/mock-db';

const trades = [
  { id: 'normal-loss', assetClass: AssetClass.FUTURES, outcome: Outcome.LOSS, notes: '', collections: ['review'] },
  { id: 'edge-note-loss', assetClass: AssetClass.FUTURES, outcome: Outcome.LOSS, notes: '[EDGE Simulation] ES', collections: ['review'] },
  { id: 'edge-collection-loss', assetClass: AssetClass.FUTURES, outcome: Outcome.LOSS, notes: '', collections: ['edge', 'review'] },
  { id: 'edge-win', assetClass: AssetClass.FUTURES, outcome: Outcome.WIN, notes: '[EDGE] ES', collections: ['review'] },
  { id: 'other-loss', assetClass: AssetClass.OPTIONS, outcome: Outcome.LOSS, notes: '', collections: [] },
] as unknown as Trade[];

test('saved EDGE filters restore type, outcome and collection together after JSON persistence', () => {
  const saved: SavedFilter = { id: 'saved-edge', name: 'EDGE losses for review', createdAt: 1794236400123,
    filters: { edgeOnly: true, assetClass: [AssetClass.FUTURES], outcome: [Outcome.LOSS], collections: ['review'] } };
  const restored: SavedFilter = JSON.parse(JSON.stringify(saved));
  assert.deepEqual(filterTrades(trades, restored.filters, 'edge').map(trade => trade.id), ['edge-note-loss', 'edge-collection-loss']);
  assert.deepEqual(filterTrades(trades, restored.filters).map(trade => trade.id), ['edge-note-loss']);
  assert.equal(trades.length, 5);
});

test('omitted or false EDGE flag leaves regular trades available; clearing filters restores all trades', () => {
  assert.deepEqual(filterTrades(trades, { edgeOnly: false, outcome: [Outcome.LOSS] }, 'edge').map(trade => trade.id), ['normal-loss', 'edge-note-loss', 'edge-collection-loss', 'other-loss']);
  assert.equal(filterTrades(trades, {}).length, trades.length);
});
