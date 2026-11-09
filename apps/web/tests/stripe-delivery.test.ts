import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/billing/webhook/route';
import { handleStripeWebhookRetry } from '../src/lib/webhooks/stripe-retry';

test('signed Stripe redeliveries recover failed updates and successful deliveries deduplicate', async () => {
  await withBillingFixture(async (fixture) => {
    fixture.failEntitlements = true;
    const first = await POST(signedRequest('evt_redelivery'));
    assert.equal(first.status, 500);
    assert.ok(fixture.events.get('evt_redelivery')?.error);

    fixture.failEntitlements = false;
    const recovered = await POST(signedRequest('evt_redelivery'));
    assert.equal(recovered.status, 200);
    assert.equal(fixture.events.get('evt_redelivery')?.error, null);
    const writesAfterSuccess = fixture.entitlementWrites;

    const duplicate = await POST(signedRequest('evt_redelivery'));
    assert.equal(duplicate.status, 200);
    assert.equal((await duplicate.json()).idempotent, true);
    assert.equal(fixture.entitlementWrites, writesAfterSuccess);
  });
});

test('queued retries accept legacy wrappers and current Stripe resources, then deduplicate', async () => {
  await withBillingFixture(async (fixture) => {
    for (const legacy of [true, false]) {
      const id = `evt_queue_${legacy}`;
      fixture.events.set(id, { id, error: 'previous failure' });
      const webhook = {
        webhook_event_id: id,
        event_type: 'customer.subscription.deleted',
        event_data: legacy ? { object: subscription } : subscription,
      };
      assert.equal(await handleStripeWebhookRetry(webhook), true);
      assert.equal(fixture.events.get(id)?.error, null);
      const writesAfterSuccess = fixture.entitlementWrites;
      assert.equal(await handleStripeWebhookRetry(webhook), true);
      assert.equal(fixture.entitlementWrites, writesAfterSuccess);
    }
  });
});

test('transient webhook failures queue the Stripe resource and keep native retries enabled', async () => {
  await withBillingFixture(async (fixture) => {
    fixture.failEntitlements = true;
    fixture.failureMessage = 'network timeout';
    const response = await POST(signedRequest('evt_transient'));
    assert.equal(response.status, 500);
    assert.equal(fixture.queued.length, 1);
    assert.deepEqual(fixture.queued[0].event_data, subscription);
  });
});

const subscription = { id: 'sub_fixture', object: 'subscription', metadata: { userId: 'user_fixture' } };

function signedRequest(id: string) {
  const body = JSON.stringify({ id, type: 'customer.subscription.deleted', created: Math.floor(Date.now() / 1000), data: { object: subscription } });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', 'whsec_fixture_only').update(`${timestamp}.${body}`).digest('hex');
  return new NextRequest('http://localhost/api/billing/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': `t=${timestamp},v1=${signature}` },
    body,
  });
}

type Fixture = {
  failEntitlements: boolean;
  failureMessage: string;
  entitlementWrites: number;
  events: Map<string, { id?: string; error: string | null; [key: string]: unknown }>;
  queued: Array<{ event_data: unknown }>;
};

async function withBillingFixture(run: (fixture: Fixture) => Promise<void>) {
  const config = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'fixture_service_key',
    STRIPE_SECRET_KEY: 'sk_test_fixture_only',
    STRIPE_WEBHOOK_SECRET: 'whsec_fixture_only',
  };
  const previous = Object.fromEntries(Object.keys(config).map(name => [name, process.env[name]]));
  const previousFetch = globalThis.fetch;
  const previousLog = console.log;
  const previousError = console.error;
  const fixture: Fixture = { failEntitlements: false, failureMessage: 'database busy', entitlementWrites: 0, events: new Map(), queued: [] };
  Object.assign(process.env, config);
  console.log = () => {};
  console.error = () => {};
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    assert.equal(url.hostname, 'fixture.supabase.co');
    const table = url.pathname.split('/').at(-1);
    if (table === 'stripe_webhook_events') {
      if (request.method === 'GET') {
        const id = url.searchParams.get('stripe_event_id')?.replace(/^eq\./, '');
        return Response.json(id && fixture.events.has(id) ? [fixture.events.get(id)] : []);
      }
      assert.equal(request.method, 'POST');
      assert.equal(url.searchParams.get('on_conflict'), 'stripe_event_id');
      const record = await request.json();
      fixture.events.set(record.stripe_event_id, record);
      return new Response(null, { status: 201 });
    }
    if (table === 'entitlements') {
      assert.equal(request.method, 'PATCH');
      assert.equal(url.searchParams.get('user_id'), 'eq.user_fixture');
      fixture.entitlementWrites += 1;
      if (fixture.failEntitlements) return Response.json({ message: fixture.failureMessage, code: 'XX000' }, { status: 503 });
      return Response.json([{ user_id: 'user_fixture', ...(await request.json()) }]);
    }
    if (table === 'webhook_retry_queue') {
      if (request.method === 'GET') return Response.json([]);
      assert.equal(request.method, 'POST');
      fixture.queued.push(await request.json());
      return new Response(null, { status: 201 });
    }
    throw new Error(`Unexpected fixture request to ${table}`);
  };
  try {
    await run(fixture);
  } finally {
    globalThis.fetch = previousFetch;
    console.log = previousLog;
    console.error = previousError;
    for (const name of Object.keys(config)) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
}
