import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const origin = 'https://trde.example';
const currentCache = 'trde-static-v2';

function request(path: string, options: Record<string, unknown> = {}) {
  return { url: new URL(path, origin).href, method: 'GET', mode: 'cors', destination: '',
    headers: new Headers(), ...options };
}

function worker(options: { fetch?: (request: any) => Promise<Response>; cacheFailure?: string } = {}) {
  const handlers = new Map<string, (event: any) => void>();
  const entries = new Map<string, Response>();
  const names = new Set([currentCache, 'trde-cache-v1', 'trde-static-v1', 'other-app-cache']);
  const deleted: string[] = [];
  const fetched: string[] = [];
  let claimed = false;
  let skipped = false;
  const cache = {
    async match(req: any) {
      if (options.cacheFailure === 'read') throw new Error('Cache read blocked');
      return entries.get(req.url)?.clone();
    },
    async put(req: any, response: Response) {
      if (options.cacheFailure === 'write') throw new Error('Quota exceeded');
      entries.set(req.url, response);
    },
    async keys() { return Array.from(entries.keys(), (url) => ({ url })); },
    async delete(req: any) { return entries.delete(req.url); },
  };
  runInNewContext(source, {
    URL, console,
    self: {
      location: { origin },
      addEventListener: (type: string, handler: (event: any) => void) => handlers.set(type, handler),
      clients: { async claim() { claimed = true; } },
      async skipWaiting() { skipped = true; },
    },
    caches: {
      async keys() { return [...names]; },
      async delete(name: string) { deleted.push(name); return names.delete(name); },
      async open() {
        if (options.cacheFailure === 'open') throw new Error('Cache storage blocked');
        return cache;
      },
    },
    fetch: async (req: any) => {
      fetched.push(req.url);
      return options.fetch ? options.fetch(req) : new Response('fresh', {
        headers: { 'content-type': 'image/webp' },
      });
    },
  });

  function dispatch(type: string, req?: ReturnType<typeof request>) {
    const pending: Promise<unknown>[] = [];
    let response: Promise<Response> | undefined;
    handlers.get(type)?.({ request: req,
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
      respondWith: (promise: Promise<Response>) => { response = promise; },
    });
    return { response, settled: () => Promise.all(pending) };
  }
  return { dispatch, entries, deleted, fetched, claimed: () => claimed, skipped: () => skipped };
}

test('service worker leaves all navigations, RSC, APIs, auth and private assets to the network', () => {
  const w = worker();
  const bypass = [
    request('/'), request('/app'), request('/trades/123'), request('/api/data/trades'),
    request('/api/attachment.png'), request('/sign-in'), request('/auth-redirect'),
    request('/uploads/trade.png'), request('/journal/attachment.webp'), request('/_next/image?url=private.png'),
    request('https://other.example/logos/logo.png'), request('/logos/logo.png', { method: 'POST' }),
    request('/logos/logo.png', { mode: 'navigate' }),
    request('/logos/logo.png', { destination: 'document' }),
    request('/logos/logo.png', { headers: new Headers({ Accept: 'text/html' }) }),
    request('/logos/logo.png', { headers: new Headers({ Accept: 'text/x-component' }) }),
    request('/logos/logo.png', { headers: new Headers({ RSC: '1' }) }),
    request('/logos/logo.png?_rsc=sample'),
    request('/logos/logo.png?token=test'),
    request('/logos/logo.png', { headers: new Headers({ Authorization: 'Bearer test' }) }),
    request('/logos/logo.png', { headers: new Headers({ Range: 'bytes=0-20' }) }),
  ];
  for (const req of bypass) assert.equal(w.dispatch('fetch', req).response, undefined, req.url);
  assert.equal(w.fetched.length, 0);
  assert.equal(w.entries.size, 0);
});

test('public static allowlist caches assets while preferring fresh network branding', async () => {
  const w = worker();
  const paths = ['/logos/wordmark.webp', '/favicons/favicon.ico', '/fonts/inter/font.woff2',
    '/_next/static/chunks/build.js', '/_next/static/css/build.css', '/manifest.json'];
  for (const path of paths) {
    const req = request(path);
    w.entries.set(req.url, new Response('stale'));
    const event = w.dispatch('fetch', req);
    assert.equal(await (await event.response)?.text(), 'fresh');
    await event.settled();
    assert.equal(await w.entries.get(req.url)?.clone().text(), 'fresh');
  }
  assert.equal(w.fetched.length, paths.length);
});

test('blocked cache storage and write failures never break successful static responses', async () => {
  for (const cacheFailure of ['open', 'write']) {
    const w = worker({ cacheFailure });
    const event = w.dispatch('fetch', request('/logos/logo.webp'));
    assert.equal(await (await event.response)?.text(), 'fresh');
    await event.settled();
  }
});

test('offline fallback serves only an explicitly allowed static cache entry', async () => {
  const offline = new Error('offline');
  const w = worker({ fetch: async () => { throw offline; } });
  const req = request('/logos/logo.webp');
  w.entries.set(req.url, new Response('offline logo'));
  const cached = w.dispatch('fetch', req);
  assert.equal(await (await cached.response)?.text(), 'offline logo');
  await cached.settled();
  const missing = w.dispatch('fetch', request('/logos/missing.webp'));
  await assert.rejects(missing.response!, (error) => error === offline);
  await missing.settled();

  const blocked = worker({ cacheFailure: 'read', fetch: async () => { throw offline; } });
  const event = blocked.dispatch('fetch', req);
  await assert.rejects(event.response!, (error) => error === offline);
  await event.settled();
});

test('HTML, RSC, redirects, private/no-store responses and errors never enter the static cache', async () => {
  const responses = [
    new Response('page', { headers: { 'content-type': 'text/html' } }),
    new Response('rsc', { headers: { 'content-type': 'text/x-component' } }),
    new Response('private', { headers: { 'cache-control': 'private, max-age=60' } }),
    new Response('uncached', { headers: { 'cache-control': 'no-store' } }),
    new Response('missing', { status: 404 }),
    Object.defineProperty(new Response('redirected'), 'redirected', { value: true }),
  ];
  for (const response of responses) {
    const w = worker({ fetch: async () => response });
    const event = w.dispatch('fetch', request('/logos/logo.webp'));
    assert.equal(await event.response, response);
    await event.settled();
    assert.equal(w.entries.size, 0);
  }
});

test('static cache is bounded and activation deletes only old TRDE caches', async () => {
  const w = worker();
  for (let index = 0; index < 85; index++) {
    const event = w.dispatch('fetch', request(`/logos/logo-${index}.webp`));
    await event.response;
    await event.settled();
  }
  assert.equal(w.entries.size, 80);
  assert.equal(w.entries.has(request('/logos/logo-0.webp').url), false);
  await w.dispatch('activate').settled();
  assert.deepEqual(w.deleted.sort(), ['trde-cache-v1', 'trde-static-v1']);
  assert.equal(w.claimed(), true);
  await w.dispatch('install').settled();
  assert.equal(w.skipped(), true);
  assert.equal(w.fetched.length, 85);
});
