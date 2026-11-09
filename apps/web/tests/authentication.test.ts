import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateKeyPairSync, sign } from 'node:crypto';
import { Webhook } from 'svix';
import { verifyToken } from '@clerk/nextjs/server';
import { hasAdminMetadata, hasRetryAuthorization } from '../src/lib/auth/policy';

// Verify against the real Clerk verifier, with an ephemeral test key. No live credentials.
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwtKey = publicKey.export({ type: 'spki', format: 'pem' }).toString();
function sessionToken(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'test' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign('RSA-SHA256', Buffer.from(`${header}.${body}`), privateKey).toString('base64url');
  return `${header}.${body}.${signature}`;
}
const now = Math.floor(Date.now() / 1000);
const validClaims = { sub: 'user_test', sid: 'sess_test', iat: now, nbf: now - 1, exp: now + 60, iss: 'https://test.clerk.accounts.dev' };

test('Clerk verifies a signed session token and rejects unsigned or modified identity', async () => {
  const token = sessionToken(validClaims);
  assert.equal((await verifyToken(token, { jwtKey })).sub, 'user_test');
  const [header, , signature] = token.split('.');
  const altered = Buffer.from(JSON.stringify({ ...validClaims, sub: 'user_victim' })).toString('base64url');
  await assert.rejects(() => verifyToken(`${header}.${altered}.${signature}`, { jwtKey }));
  await assert.rejects(() => verifyToken(`${header}.${altered}.`, { jwtKey }));
});

test('expired sessions are rejected', async () => {
  await assert.rejects(() => verifyToken(sessionToken({ ...validClaims, iat: now - 300, exp: now - 120 }), { jwtKey }));
});

test('administrator role requires explicit server-controlled metadata', () => {
  assert.equal(hasAdminMetadata(undefined), false);
  assert.equal(hasAdminMetadata({}), false);
  assert.equal(hasAdminMetadata({ role: 'user', admin: 'true', isAdmin: 'true' }), false);
  assert.equal(hasAdminMetadata({ role: 'admin' }), true);
  assert.equal(hasAdminMetadata({ isAdmin: true }), true);
  assert.equal(hasAdminMetadata({ admin: true }), true);
});

test('public retry endpoint rejects missing configuration and incorrect credentials', () => {
  assert.equal(hasRetryAuthorization(undefined, null), false);
  assert.equal(hasRetryAuthorization('', ''), false);
  assert.equal(hasRetryAuthorization('test-secret', null), false);
  assert.equal(hasRetryAuthorization('test-secret', 'incorrect'), false);
  assert.equal(hasRetryAuthorization('test-secret', 'test-secret'), true);
});

test('Clerk webhook signatures verify original body and reject mutation', () => {
  const webhook = new Webhook(`whsec_${Buffer.from('unit-test-signing-secret').toString('base64')}`);
  const body = '{ "type": "user.created", "data": {"id": "user_test"} }';
  const timestamp = new Date();
  const headers = {
    'svix-id': 'msg_test',
    'svix-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
    'svix-signature': webhook.sign('msg_test', timestamp, body),
  };
  assert.deepEqual(webhook.verify(body, headers), JSON.parse(body));
  assert.throws(() => webhook.verify(JSON.stringify(JSON.parse(body)), headers));
  assert.throws(() => webhook.verify(body.replace('user_test', 'user_other'), headers));
});
