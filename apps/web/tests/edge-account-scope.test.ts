import assert from 'node:assert/strict';
import test from 'node:test';
import { setEdgeAccount, getEdgeAccountScope, writeEdgeStorage, readEdgeStorage } from '../src/lib/edge/store/accountScope';
import { getTrades, saveTrades, clearEdgeData } from '../src/lib/edge/store/edgeStore';
import { saveSimSession, loadSimSessionByContract, clearAllSimSessions } from '../src/lib/edge/chart/sim/persistence';

function withStorage(run: (storage: Storage) => void) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values: Record<string, string> = {};
  const storage = {
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => { values[key] = value; },
    removeItem: (key: string) => { delete values[key]; },
  };
  const proxy = new Proxy(storage, {
    ownKeys: () => Object.keys(values),
    getOwnPropertyDescriptor: (_target, key) => typeof key === 'string' && key in values
      ? { enumerable: true, configurable: true, value: values[key] } : undefined,
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: proxy });
  try { run(proxy as unknown as Storage); }
  finally {
    setEdgeAccount(null);
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow); else delete (globalThis as any).window;
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage); else delete (globalThis as any).localStorage;
  }
}

test('EDGE histories are account-scoped and legacy data is never claimed or overwritten', () => withStorage((storage) => {
  storage.setItem('edge:trades', '[{"tradeId":"legacy-private"}]');
  setEdgeAccount('owner-a');
  assert.deepEqual(getTrades(), []);
  saveTrades([{ tradeId: 'a-trade' }] as any);
  setEdgeAccount('owner-b');
  assert.deepEqual(getTrades(), []);
  saveTrades([{ tradeId: 'b-trade' }] as any);
  setEdgeAccount('owner-a');
  assert.equal(getTrades()[0].tradeId, 'a-trade');
  clearEdgeData();
  assert.deepEqual(getTrades(), []);
  setEdgeAccount('owner-b');
  assert.equal(getTrades()[0].tradeId, 'b-trade');
  assert.equal(storage.getItem('edge:trades'), '[{"tradeId":"legacy-private"}]');
}));

test('late writes from a previous account or session cannot contaminate the active account', () => withStorage(() => {
  setEdgeAccount('owner-a');
  const stale = getEdgeAccountScope();
  setEdgeAccount('owner-b');
  saveTrades([{ tradeId: 'late-a' }] as any, stale);
  assert.deepEqual(getTrades(), []);
  assert.equal(writeEdgeStorage('edge:importTrade', 'late', stale), false);
  setEdgeAccount('owner-a');
  assert.equal(writeEdgeStorage('edge:importTrade', 'late', stale), false);
  setEdgeAccount(null);
  assert.equal(writeEdgeStorage('edge:importTrade', 'signed-out'), false);
  assert.equal(readEdgeStorage('edge:importTrade'), null);
}));

test('malformed and wrong-shaped EDGE JSON fail closed without a page crash', () => withStorage(() => {
  setEdgeAccount('owner-a');
  writeEdgeStorage('edge:trades', '{broken');
  assert.deepEqual(getTrades(), []);
  writeEdgeStorage('edge:trades', '{}');
  assert.deepEqual(getTrades(), []);
  writeEdgeStorage('edge:sim:session:contract:ES', 'broken-session');
  writeEdgeStorage('edge:sim:session:broken-session', '{broken');
  assert.equal(loadSimSessionByContract('ES'), null);
}));

test('simulation lookup and clearing remain within one account and preserve legacy sessions', () => withStorage((storage) => {
  storage.setItem('edge:sim:session:legacy', 'legacy-private');
  setEdgeAccount('owner-a');
  saveSimSession({ sessionId: 'a-session', contractId: 'ES' } as any);
  setEdgeAccount('owner-b');
  assert.equal(loadSimSessionByContract('ES'), null);
  saveSimSession({ sessionId: 'b-session', contractId: 'ES' } as any);
  clearAllSimSessions();
  assert.equal(loadSimSessionByContract('ES'), null);
  setEdgeAccount('owner-a');
  assert.equal(loadSimSessionByContract('ES')?.sessionId, 'a-session');
  assert.equal(storage.getItem('edge:sim:session:legacy'), 'legacy-private');
}));
