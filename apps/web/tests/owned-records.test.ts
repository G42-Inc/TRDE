import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { saveOwnedRecords, requireOwnedReferences, RecordConflictError, InvalidRecordError } from '../src/lib/db/owned-records';

type Row = { id: string; user_id: string; [key: string]: unknown };
/** Exercise the real Supabase REST client against an in-memory constraint/ownership model. */
function database(seed: Row[] = []) {
  const rows = new Map(seed.map(row => [row.id, structuredClone(row)]));
  let beforeInsert: (() => void) | undefined;
  let beforeUpdate: (() => void) | undefined;
  const requests: { method: string; url: URL; body: any }[] = [];
  const client = createClient('https://database.invalid', 'test-only-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, options) => {
      const url = new URL(String(input));
      const method = options?.method ?? 'GET';
      const body = options?.body ? JSON.parse(String(options.body)) : null;
      requests.push({ method, url, body });
      const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
      const matching = () => [...rows.values()].filter(row => {
        const owner = url.searchParams.get('user_id');
        if (owner && owner !== `eq.${row.user_id}`) return false;
        const id = url.searchParams.get('id');
        if (id?.startsWith('eq.') && id.slice(3) !== row.id) return false;
        if (id?.startsWith('in.(') && !id.slice(4, -1).split(',').map(value => value.replaceAll('"', '')).includes(row.id)) return false;
        return true;
      });
      if (method === 'GET') return json(matching());
      if (method === 'POST') {
        beforeInsert?.();
        if (body.some((row: Row) => rows.has(row.id))) return json({ code: '23505', message: 'Unique constraint' }, 409);
        for (const row of body) rows.set(row.id, structuredClone(row));
        return json(body, 201);
      }
      if (method === 'PATCH') {
        beforeUpdate?.();
        const selected = matching();
        for (const row of selected) rows.set(row.id, { ...row, ...body });
        return json(selected.map(row => ({ id: row.id })));
      }
      throw new Error(`Unexpected ${method}`);
    } },
  });
  return { client, rows, requests, onInsert: (fn: () => void) => { beforeInsert = fn; }, onUpdate: (fn: () => void) => { beforeUpdate = fn; } };
}

test('owned records save, read, and edit without changing owner or creation time', async () => {
  const db = database();
  await saveOwnedRecords(db.client, 'todos', 'user_a', [{ id: 'todo-1', user_id: 'user_a', title: 'Before', created_at: 1 }]);
  const { data } = await db.client.from('todos').select('*').eq('user_id', 'user_a');
  assert.equal(data?.[0].title, 'Before');
  await saveOwnedRecords(db.client, 'todos', 'user_a', [{ id: 'todo-1', user_id: 'user_a', title: 'After', created_at: 2 }]);
  assert.equal(db.rows.get('todo-1')?.title, 'After');
  assert.equal(db.rows.get('todo-1')?.created_at, 1);
  const edit = db.requests.find(request => request.method === 'PATCH')!;
  assert.equal(edit.url.searchParams.get('user_id'), 'eq.user_a');
  assert.equal('user_id' in edit.body, false);
});

test('foreign identifiers cannot overwrite another owner', async () => {
  const victim = { id: 'known-id', user_id: 'user_b', title: 'Private' };
  const db = database([victim]);
  await assert.rejects(() => saveOwnedRecords(db.client, 'todos', 'user_a', [{ id: 'known-id', user_id: 'user_a', title: 'Attack' }]), RecordConflictError);
  assert.deepEqual(db.rows.get('known-id'), victim);
});

test('concurrent inserts and owner changes cannot transfer ownership', async () => {
  const db = database();
  db.onInsert(() => db.rows.set('race', { id: 'race', user_id: 'user_b' }));
  await assert.rejects(() => saveOwnedRecords(db.client, 'todos', 'user_a', [{ id: 'race', user_id: 'user_a' }]), RecordConflictError);
  assert.equal(db.rows.get('race')?.user_id, 'user_b');
  const edits = database([{ id: 'race', user_id: 'user_a', title: 'Original' }]);
  edits.onUpdate(() => edits.rows.set('race', { id: 'race', user_id: 'user_b', title: 'New owner' }));
  await assert.rejects(() => saveOwnedRecords(edits.client, 'todos', 'user_a', [{ id: 'race', user_id: 'user_a', title: 'Attack' }]), RecordConflictError);
  assert.equal(edits.rows.get('race')?.title, 'New owner');
});

test('related journals/versions require owned references and valid identifiers', async () => {
  const db = database([{ id: 'trade-a', user_id: 'user_a' }, { id: 'trade-b', user_id: 'user_b' }]);
  await requireOwnedReferences(db.client, 'trades', 'user_a', ['trade-a', 'trade-a']);
  await assert.rejects(() => requireOwnedReferences(db.client, 'trades', 'user_a', ['trade-b']), InvalidRecordError);
  await assert.rejects(() => saveOwnedRecords(db.client, 'todos', 'user_a', [{ id: '', user_id: 'user_a' }]), InvalidRecordError);
  await assert.rejects(() => saveOwnedRecords(db.client, 'todos', 'user_a', [{ id: 'forged', user_id: 'user_b' }]), InvalidRecordError);
});
