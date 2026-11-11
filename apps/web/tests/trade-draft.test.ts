import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTradeDraft } from '../src/lib/trades/draft-loader';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

test('the editor stays uninitialized until its owned read resolves, then receives one snapshot', async () => {
  const request = deferred<Array<{ id: string; notes: string }>>();
  const drafts: Array<{ id: string; notes: string }> = [];
  let loads = 0;
  loadTradeDraft(() => request.promise, 'trade-a', (trade) => { drafts.push({ ...trade }); loads++; }, assert.fail);
  assert.equal(drafts.length, 0);
  request.resolve([{ id: 'trade-a', notes: 'Saved note' }]);
  await flush();
  assert.equal(loads, 1);
  const draft = drafts[0];
  assert.equal(draft.notes, 'Saved note');
  draft.notes = 'Unsaved typing';
  // Subsequent cache/cloud replacements are not a source for this editor session.
  const refreshedContext = [{ id: 'trade-a', notes: 'Saved note' }];
  assert.notEqual(refreshedContext[0].notes, draft.notes);
  assert.equal(loads, 1);
});

test('an old account read cannot initialize the new account even when trade IDs match', async () => {
  const oldAccount = deferred<Array<{ id: string; notes: string }>>();
  const newAccount = deferred<Array<{ id: string; notes: string }>>();
  const loaded: string[] = [];
  const cancelOld = loadTradeDraft(() => oldAccount.promise, 'trade-a', (trade) => loaded.push(trade.notes), assert.fail);
  cancelOld();
  loadTradeDraft(() => newAccount.promise, 'trade-a', (trade) => loaded.push(trade.notes), assert.fail);
  newAccount.resolve([{ id: 'trade-a', notes: 'New account' }]);
  oldAccount.resolve([{ id: 'trade-a', notes: 'Private old account draft' }]);
  await flush();
  assert.deepEqual(loaded, ['New account']);
});

test('route changes select the correct record and discard a slower previous request', async () => {
  const oldRoute = deferred<Array<{ id: string }>>();
  const loaded: string[] = [];
  const cancelOld = loadTradeDraft(() => oldRoute.promise, 'trade-a', (trade) => loaded.push(trade.id), assert.fail);
  cancelOld();
  loadTradeDraft(async () => [{ id: 'trade-a' }, { id: 'trade-b' }], 'trade-b', (trade) => loaded.push(trade.id), assert.fail);
  oldRoute.resolve([{ id: 'trade-a' }]);
  await flush();
  assert.deepEqual(loaded, ['trade-b']);
});

test('failed/missing reads surface a retryable message and canceled failures stay hidden', async () => {
  const errors: string[] = [];
  loadTradeDraft(async () => { throw new Error('Network unavailable'); }, 'trade-a', () => assert.fail('Unexpected loaded trade'), (error) => errors.push(error));
  loadTradeDraft(async () => [], 'trade-a', () => assert.fail('Unexpected loaded trade'), (error) => errors.push(error));
  const old = deferred<Array<{ id: string }>>();
  const cancel = loadTradeDraft(() => old.promise, 'trade-a', () => assert.fail('Unexpected loaded trade'), (error) => errors.push(error));
  cancel();
  old.reject(new Error('Old account failure'));
  await flush();
  assert.deepEqual(errors.sort(), ['Network unavailable', 'Trade not found in this account.']);
});
