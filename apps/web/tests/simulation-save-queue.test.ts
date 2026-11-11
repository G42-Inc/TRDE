import assert from 'node:assert/strict';
import test from 'node:test';
import { createJournalSaveQueue } from '../src/lib/edge/chart/sim/save-queue';

test('simulation save waits for persistence before reporting success', async () => {
  let finish!: (count: number) => void;
  const saved: number[] = [];
  const pending: boolean[] = [];
  const queue = createJournalSaveQueue({
    persist: () => new Promise<number>((resolve) => { finish = resolve; }),
    isCurrentAccount: () => true, onPending: (value) => pending.push(value),
    onSaved: (count) => saved.push(count), onError: () => assert.fail('Unexpected error'),
  });
  const result = queue.save([{ id: 'sim-1' }]);
  await Promise.resolve();
  assert.deepEqual(saved, []);
  assert.equal(pending.at(-1), true);
  finish(1);
  assert.equal(await result, true);
  assert.deepEqual(saved, [1]);
  assert.equal(pending.at(-1), false);
});

test('failed simulated trades are retained for retry and never report false success', async () => {
  const attempted: string[][] = [];
  const errors: string[] = [];
  const saved: number[] = [];
  const queue = createJournalSaveQueue<{ id: string }>({
    persist: async (trades) => {
      attempted.push(trades.map((trade) => trade.id));
      if (attempted.length === 1) throw new Error('Offline');
      return trades.length;
    },
    isCurrentAccount: () => true, onPending: () => {},
    onSaved: (count, failures) => { saved.push(count); assert.equal(failures, 0); },
    onError: (error) => errors.push(error.message),
  });
  const closedTrades = [{ id: 'sim-1' }];
  assert.equal(await queue.save(closedTrades), false);
  closedTrades.length = 0; // A chart reset must not discard the failed save.
  assert.deepEqual(saved, []);
  assert.deepEqual(errors, ['Offline']);
  assert.equal(await queue.retry(), true);
  assert.deepEqual(attempted, [['sim-1'], ['sim-1']]);
  assert.deepEqual(saved, [1]);
  assert.equal(await queue.retry(), false);
});

test('automatic and manual saves serialize instead of racing duplicate insertion', async () => {
  let finish!: () => void;
  const started: string[] = [];
  const queue = createJournalSaveQueue<{ id: string }>({
    persist: async (trades) => {
      started.push(trades[0].id);
      if (started.length === 1) await new Promise<void>((resolve) => { finish = resolve; });
      return 1;
    },
    isCurrentAccount: () => true, onPending: () => {}, onSaved: () => {}, onError: () => assert.fail('Unexpected error'),
  });
  const first = queue.save([{ id: 'auto' }]);
  const second = queue.save([{ id: 'manual' }]);
  await Promise.resolve();
  assert.deepEqual(started, ['auto']);
  finish();
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.deepEqual(started, ['auto', 'manual']);
});

test('account switches discard queued saves and prevent stale success callbacks', async () => {
  let current = true;
  let finish!: (count: number) => void;
  let calls = 0;
  const queue = createJournalSaveQueue<{ id: string }>({
    persist: () => { calls++; return new Promise<number>((resolve) => { finish = resolve; }); },
    isCurrentAccount: () => current, onPending: () => {},
    onSaved: () => assert.fail('Old account cannot show success'), onError: () => assert.fail('Old account cannot show errors'),
  });
  const running = queue.save([{ id: 'running' }]);
  const queued = queue.save([{ id: 'queued' }]);
  await Promise.resolve();
  current = false;
  finish(1);
  assert.deepEqual(await Promise.all([running, queued]), [false, false]);
  assert.equal(calls, 1);
});
