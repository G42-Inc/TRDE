import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { handleUserCreated, handleUserUpdated } from '../src/lib/webhooks/clerk-handlers';

/** Use real Supabase request serialization; model Postgres conflict behavior. */
function database() {
  const tables = new Map<string, Map<string, any>>();
  const writes: { table: string; resolution: string }[] = [];
  const client = createClient('https://database.invalid', 'test-only-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, options) => {
      assert.equal(options?.method, 'POST');
      const url = new URL(String(input));
      const table = url.pathname.split('/').at(-1)!;
      assert.equal(url.searchParams.get('on_conflict'), 'user_id');
      const row = JSON.parse(String(options?.body));
      const headers = new Headers(options?.headers);
      const resolution = headers.get('prefer') ?? '';
      const rows = tables.get(table) ?? new Map();
      tables.set(table, rows);
      const existing = rows.get(row.user_id);
      writes.push({ table, resolution });
      if (!existing || !resolution.includes('resolution=ignore-duplicates')) {
        rows.set(row.user_id, { ...existing, ...structuredClone(row) });
      }
      return new Response(null, { status: 201 });
    } },
  });
  return { client, tables, writes };
}
const created = { type: 'user.created', data: { id: 'user_replay_test', first_name: 'Initial', last_name: 'Name', primary_email_address_id: 'email-test', email_addresses: [{ id: 'email-test', email_address: 'initial+clerk_test@example.com' }] } };

test('initial Clerk creation fills missing records; replay preserves paid access, preferences and XP', async () => {
  const db = database();
  await handleUserCreated(created, db.client);
  assert.equal(db.tables.get('profiles')?.get(created.data.id).first_name, 'Initial');
  assert.equal(db.tables.get('entitlements')?.get(created.data.id).status, 'demo');
  assert.equal(db.tables.get('user_engagement_stats')?.get(created.data.id).total_xp, 0);
  assert.equal(db.tables.get('notification_preferences')?.get(created.data.id).push_enabled, false);

  const entitlement = db.tables.get('entitlements')!.get(created.data.id);
  Object.assign(entitlement, { plan: 'pro', status: 'active', source: 'stripe', current_period_end: '2027-01-01T00:00:00Z' });
  Object.assign(db.tables.get('user_engagement_stats')!.get(created.data.id), { total_xp: 3200, current_level: 8, current_streak: 12 });
  Object.assign(db.tables.get('notification_preferences')!.get(created.data.id), { push_enabled: true, weekly_summary: false, streak_reminders: false });
  Object.assign(db.tables.get('profiles')!.get(created.data.id), { first_name: 'Updated', email: 'updated+clerk_test@example.com' });
  const beforeReplay = structuredClone(db.tables);
  await handleUserCreated(created, db.client);
  assert.deepEqual(db.tables, beforeReplay);
  assert.ok(db.writes.every(write => write.resolution.includes('resolution=ignore-duplicates')));
});

test('partial initialization replay fills only missing rows and user.updated still refreshes profile', async () => {
  const db = database();
  await handleUserCreated(created, db.client);
  const entitlement = db.tables.get('entitlements')!.get(created.data.id);
  Object.assign(entitlement, { plan: 'edge', status: 'comped' });
  db.tables.get('notification_preferences')!.delete(created.data.id);
  await handleUserCreated(created, db.client);
  assert.equal(db.tables.get('notification_preferences')!.get(created.data.id).push_enabled, false);
  assert.equal(entitlement.status, 'comped');
  await handleUserUpdated({ type: 'user.updated', data: { ...created.data, first_name: 'Updated' } }, db.client);
  assert.equal(db.tables.get('profiles')!.get(created.data.id).first_name, 'Updated');
  assert.equal(db.tables.get('entitlements')!.get(created.data.id).status, 'comped');
  assert.ok(db.writes.at(-1)!.resolution.includes('resolution=merge-duplicates'));
});
