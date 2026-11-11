import assert from 'node:assert/strict';
import test from 'node:test';
import { getUserEntitlement, requireEntitlement } from '../src/lib/entitlements/check.server';
import type { Entitlement } from '../src/lib/entitlements/types';

const owner = 'user_entitlement_fixture';
const entitlement: Entitlement = {
  user_id: owner,
  plan: 'edge',
  status: 'comped',
  current_period_end: null,
  source: 'manual',
  override_enabled: false,
  override_expires_at: null,
  notes: 'Private fixture note',
  updated_at: '2026-11-09T00:00:00.000Z',
};

const config = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'fixture_service_key',
};
const previousConfig = Object.fromEntries(Object.keys(config).map(name => [name, process.env[name]]));

test.beforeEach(() => {
  Object.assign(process.env, config);
});

test.afterEach(() => {
  for (const [name, value] of Object.entries(previousConfig)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test('entitlement lookup queries only the owner and keeps diagnostics private', async (t) => {
  const log = t.mock.method(console, 'log', () => {});
  const error = t.mock.method(console, 'error', () => {});
  const requests: Request[] = [];
  let response = Response.json([entitlement]);

  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(new Request(input, init));
    return response.clone();
  });

  assert.deepEqual(await getUserEntitlement(owner), entitlement);
  response = Response.json([]);
  assert.equal(await getUserEntitlement(owner), null);
  response = Response.json({ code: 'XX000', message: `Fixture database error for ${owner}` }, { status: 400 });
  assert.equal(await getUserEntitlement(owner), null);

  assert.equal(requests.length, 3);
  for (const request of requests) {
    const url = new URL(request.url);
    assert.equal(request.method, 'GET');
    assert.equal(url.origin, 'https://fixture.supabase.co');
    assert.equal(url.pathname, '/rest/v1/entitlements');
    assert.deepEqual(url.searchParams.getAll('user_id'), [`eq.${owner}`]);
  }
  assert.equal(log.mock.callCount(), 0);
  assert.deepEqual(error.mock.calls.map(call => call.arguments), [['getUserEntitlement: entitlement lookup failed']]);
});

test('ProjectX entitlement gate keeps demo, expiry and plan restrictions', async (t) => {
  let row = entitlement;
  t.mock.method(globalThis, 'fetch', async () => Response.json([row]));

  assert.deepEqual(await requireEntitlement(owner, 'edge'), entitlement);
  await assert.rejects(requireEntitlement(owner, 'pro'), /Pro plan required/i);

  row = { ...entitlement, status: 'demo' };
  await assert.rejects(requireEntitlement(owner, 'edge'), /Edge plan required/i);

  row = { ...entitlement, status: 'active', current_period_end: '2000-01-01T00:00:00Z' };
  await assert.rejects(requireEntitlement(owner, 'edge'), /Edge plan required/i);
});
