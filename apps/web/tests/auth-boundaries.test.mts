import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

let identity: string | null = null;
let metadata: Record<string, unknown> = {};
let failVerification = false;
mock.module('@clerk/nextjs/server', {
  namedExports: {
    createRouteMatcher,
    clerkMiddleware: (handler: (auth: () => Promise<{ userId: string | null }>, request: NextRequest) => Promise<Response>) => (request: NextRequest) => handler(async () => ({ userId: identity }), request),
    auth: async () => {
      if (failVerification) throw new Error('Invalid session');
      return { userId: identity };
    },
    currentUser: async () => identity ? { id: identity, publicMetadata: metadata } : null,
    clerkClient: async () => ({ users: { getUser: async (id: string) => ({ id, publicMetadata: metadata }) } }),
  },
});
const { getClerkUserId, requireAuth, isAdmin } = await import('../src/lib/auth/clerk.ts');
const { checkIsAdmin, requireAdmin } = await import('../src/lib/auth/admin.server.ts');
const { default: middleware } = await import('../src/middleware.ts');

test('signed-out and invalid sessions fail closed; a verified session can access its identity', async () => {
  identity = null;
  assert.equal(await getClerkUserId(), null);
  await assert.rejects(requireAuth, /Unauthorized/);
  identity = 'user_verified';
  assert.equal(await getClerkUserId(), 'user_verified');
  assert.equal(await requireAuth(), 'user_verified');
  failVerification = true;
  assert.equal(await getClerkUserId(), null);
  failVerification = false;
});

test('admin checks cannot be spoofed by caller identity, headers, or unsigned cookies', async () => {
  identity = 'user_verified';
  metadata = {};
  const forgedRequest = { headers: new Headers({ 'x-clerk-user-id': 'user_admin', cookie: 'admin_session_dev=admin_forged; admin_session=user_verified' }) };
  assert.equal(await checkIsAdmin('user_admin', forgedRequest), false);
  assert.equal(await checkIsAdmin(undefined, forgedRequest), false);
  assert.equal(await isAdmin(), false);
  await assert.rejects(() => requireAdmin(undefined, forgedRequest), /Admin access required/);
  metadata = { role: 'admin' };
  assert.equal(await checkIsAdmin('user_admin', forgedRequest), false);
  assert.equal(await checkIsAdmin('user_verified'), true);
  assert.deepEqual(await requireAdmin(), { userId: 'user_verified' });
});


test('middleware rejects signed-out protected APIs and redirects protected pages', async () => {
  identity = null;
  for (const path of ['/api/data/trades', '/api/billing/portal', '/api/admin/search', '/api/preferences', '/api/new-private-endpoint']) {
    const response = await middleware(new NextRequest(`https://trde.example${path}`, { headers: { 'x-clerk-user-id': 'user_victim' } }));
    assert.equal(response.status, 401, path);
    assert.equal((await response.json()).error, 'Unauthorized: Authentication required');
  }
  const response = await middleware(new NextRequest('https://trde.example/app'));
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get('location')!).pathname, '/sign-in');
});

test('signed public webhooks reach their own verifiers; legacy identity is stripped', async () => {
  identity = null;
  for (const path of ['/api/clerk/webhook', '/api/billing/webhook', '/api/webhooks/retry']) {
    const response = await middleware(new NextRequest(`https://trde.example${path}`, { headers: { 'x-clerk-user-id': 'user_victim' } }));
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('x-middleware-request-x-clerk-user-id'), null);
  }
  identity = 'user_verified';
  const response = await middleware(new NextRequest('https://trde.example/api/data/trades', { headers: { 'x-clerk-user-id': 'user_victim' } }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-middleware-request-x-clerk-user-id'), null);
});
