import assert from 'node:assert/strict';
import test from 'node:test';
import { getTrades, saveTrades, saveDailyBiases, saveQuickJournals, saveVersions, saveSavedFilters, saveWeeklyReviews, saveTodos } from '../src/lib/storage.db';

test('trade reads distinguish failed requests from an empty journal', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ error: 'Unavailable' }), { status: 503 }));
  await assert.rejects(getTrades(), /Unavailable/);
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ trades: [] }), { status: 200 }));
  assert.deepEqual(await getTrades(), []);
});

test('failed primary trade save is surfaced before auxiliary risk requests', async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    calls.push(url);
    return new Response(JSON.stringify({ error: 'Validation error: missing entry time' }), { status: 400 });
  });
  await assert.rejects(saveTrades([]), /missing entry time/);
  assert.deepEqual(calls, ['/api/data/trades']);
});

test('storage sends explicit API payload keys for journals and related data', async (t) => {
  const bodies: Record<string, unknown>[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    bodies.push(JSON.parse(options.body as string));
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  });
  await saveDailyBiases([]);
  await saveQuickJournals([]);
  await saveVersions([]);
  await saveSavedFilters([]);
  await saveWeeklyReviews([]);
  assert.deepEqual(bodies, [{ biases: [] }, { journals: [] }, { versions: [] }, { savedFilters: [] }, { weeklyReviews: [] }]);
});

test('trade removal identifies only explicitly deleted records', async (t) => {
  const bodies: Record<string, unknown>[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, options?: RequestInit) => {
    if (options?.method === 'POST') bodies.push(JSON.parse(options.body as string));
    return new Response(JSON.stringify(url.endsWith('rule-violations') ? { ruleViolations: [] } : { success: true }), { status: 200 });
  });
  await saveTrades([], ['trade-123']);
  assert.deepEqual(bodies[0], { trades: [], deletedIds: ['trade-123'] });
  assert.equal('clearAll' in bodies[0], false);
});

test('task removal sends explicit IDs and an empty cache never implies delete all', async (t) => {
  const bodies: unknown[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    bodies.push(JSON.parse(options.body as string));
    return new Response(JSON.stringify({ success: true }));
  });
  await saveTodos([], ['completed-task']);
  await saveTodos([]);
  assert.deepEqual(bodies, [{ todos: [], deletedIds: ['completed-task'] }, { todos: [], deletedIds: [] }]);
});
