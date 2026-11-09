import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getStripeClient, verifyStripeWebhook } from '../src/lib/stripe/client';
import { encrypt, decrypt } from '../src/lib/security/crypto.server';
import { env, isAlphaVantageConfigured } from '../src/lib/env.server';
import { sanitizeText } from '../src/lib/security/sanitize';
import { authenticateWithApiKey } from '../src/lib/edge/projectx/client.server';

test('optional configuration is evaluated at use time and fails closed', () => {
  const previous = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  try {
    assert.equal(typeof isAlphaVantageConfigured(), 'boolean');
    assert.throws(() => env.STRIPE_SECRET_KEY, /STRIPE_SECRET_KEY/);
    assert.throws(() => getStripeClient(), /STRIPE_SECRET_KEY/);
    process.env.STRIPE_SECRET_KEY = 'sk_test_runtime_unit_test';
    assert.equal(env.STRIPE_SECRET_KEY, 'sk_test_runtime_unit_test');
  } finally {
    if (previous === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previous;
  }
});

test('Stripe uses fetch and asynchronously rejects forged or stale webhooks', async () => {
  const previous = process.env.STRIPE_SECRET_KEY;
  const previousFetch = globalThis.fetch;
  process.env.STRIPE_SECRET_KEY = 'sk_test_runtime_unit_test';
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return Response.json({ object: 'balance', available: [], pending: [] });
  };
  try {
    const balance = await getStripeClient().balance.retrieve();
    assert.equal(balance.object, 'balance');
    assert.equal(requests, 1);

    const secret = 'whsec_unit_test_only';
    const body = JSON.stringify({ id: 'evt_test', type: 'customer.created', data: { object: {} } });
    const now = Math.floor(Date.now() / 1000);
    const signature = (timestamp: number) => `t=${timestamp},v1=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
    assert.equal((await verifyStripeWebhook(body, signature(now), secret)).id, 'evt_test');
    await assert.rejects(verifyStripeWebhook(`${body} `, signature(now), secret));
    await assert.rejects(verifyStripeWebhook(body, signature(now - 600), secret));
  } finally {
    globalThis.fetch = previousFetch;
    if (previous === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previous;
  }
});

test('token vault resolves its key lazily and authenticates ciphertext', () => {
  const previous = process.env.ENCRYPTION_KEY;
  delete process.env.ENCRYPTION_KEY;
  try {
    assert.throws(() => encrypt('fixture'), /ENCRYPTION_KEY/);
    process.env.ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');
    const ciphertext = encrypt('private fixture');
    assert.equal(decrypt(ciphertext), 'private fixture');
    process.env.ENCRYPTION_KEY = Buffer.alloc(32, 2).toString('base64');
    assert.throws(() => decrypt(ciphertext));
  } finally {
    if (previous === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = previous;
  }
});

test('user notes remain plain text and cannot create HTML in React', () => {
  const text = '<img src=x onerror="alert(1)"> & notes';
  const markup = renderToStaticMarkup(createElement('p', null, sanitizeText(text)));
  assert.ok(markup.includes('&lt;img'));
  assert.ok(markup.includes('&amp; notes'));
  assert.ok(!markup.includes('<img'));
  assert.ok(!markup.includes('&amp;lt;'));
});

test('ProjectX credentials and response tokens are never logged or echoed in errors', async () => {
  const previousFetch = globalThis.fetch;
  const previousLog = console.log;
  const previousError = console.error;
  const output: unknown[][] = [];
  console.log = (...args) => { output.push(args); };
  console.error = (...args) => { output.push(args); };
  try {
    globalThis.fetch = async () => Response.json({ token: 'private-fixture-token', errorCode: 0 });
    const result = await authenticateWithApiKey('fixture-user', 'private-fixture-api-key');
    assert.equal(result.token, 'private-fixture-token');
    globalThis.fetch = async () => Response.json({ errorCode: 1, errorMessage: 'private-fixture-api-key' });
    await assert.rejects(authenticateWithApiKey('fixture-user', 'private-fixture-api-key'), error => {
      assert.ok(error instanceof Error);
      assert.ok(!error.message.includes('private-fixture'));
      return true;
    });
    assert.deepEqual(output, []);
  } finally {
    globalThis.fetch = previousFetch;
    console.log = previousLog;
    console.error = previousError;
  }
});
