// TRDE Service Worker: cache only public, same-origin static assets.
// v2 retires the old HTML cache and refreshes unversioned branding from the network.
const STATIC_CACHE_NAME = 'trde-static-v2';
const MAX_STATIC_ENTRIES = 80;

function isPublicStaticRequest(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return false;
  if (request.mode === 'navigate' || request.destination === 'document') return false;
  if (request.headers.has('authorization') || request.headers.has('range')) return false;
  // Query strings may carry RSC state, signatures or user-specific tokens.
  if (request.headers.has('rsc') || url.search) return false;
  const accept = request.headers.get('accept') || '';
  if (/text\/(html|x-component)/i.test(accept)) return false;

  // Never infer public access from a file extension alone: uploads, API responses,
  // optimized remote images and journal attachments must bypass this worker.
  return url.pathname === '/manifest.json' ||
    /^\/(logos|favicons)\/[^/]+\.(png|webp|avif|jpg|jpeg|svg|ico)$/i.test(url.pathname) ||
    /^\/fonts\/.+\.(woff2?|ttf|otf)$/i.test(url.pathname) ||
    /^\/_next\/static\/.+\.(js|css|woff2?|ttf|otf|png|webp|avif|jpg|jpeg|svg|ico)$/i.test(url.pathname);
}

function isCacheableResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const cacheControl = response.headers.get('cache-control') || '';
  return response.status === 200 && !response.redirected &&
    !/text\/(html|x-component)/i.test(contentType) &&
    !/\b(no-store|private)\b/i.test(cacheControl);
}

async function storePublicAsset(request, response) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  await cache.put(request, response);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_STATIC_ENTRIES))
    .map((key) => cache.delete(key)));
}

self.addEventListener('install', (event) => {
  // Fill the cache on demand instead of fetching branding before it is needed.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // This origin can have other apps' caches. Remove only TRDE's old caches,
    // including the previous cache that stored signed-in HTML pages.
    await caches.keys().then((names) => Promise.all(names
      .filter((name) => /^(trde-cache-|trde-static-)/.test(name) && name !== STATIC_CACHE_NAME)
      .map((name) => caches.delete(name))))
      .catch(() => {});
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (!isPublicStaticRequest(event.request)) return;

  // Network-first ensures public logos/fonts are refreshed. The browser's HTTP
  // cache still handles immutable Next assets; offline fallback is static only.
  const networkResponse = fetch(event.request);
  event.respondWith(networkResponse.catch(async (networkError) => {
    try {
      const cache = await caches.open(STATIC_CACHE_NAME);
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) return cachedResponse;
    } catch {
      // A blocked/full cache must not replace the original network failure.
    }
    throw networkError;
  }));

  // Keep cache writes alive without delaying or breaking the network response.
  event.waitUntil(networkResponse.then((response) => {
    if (isCacheableResponse(response)) {
      return storePublicAsset(event.request, response.clone());
    }
  }).catch(() => {}));
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================
// PUSH NOTIFICATIONS
// ============================================

// Handle push events
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/logos/TRDE_black_transparent_128x128.png',
      badge: '/favicons/TRDE_favicon_black_32x32.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/app',
        type: data.type || 'general',
        timestamp: Date.now(),
      },
      actions: data.actions || [],
      tag: data.tag || 'trde-notification',
      renotify: data.renotify || false,
      requireInteraction: data.requireInteraction || false,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'TRDE', options)
    );
  } catch (error) {
    console.error('[SW] Push event error:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/app';
  
  // Handle action clicks
  if (event.action) {
    switch (event.action) {
      case 'view':
        // Open the specific URL
        break;
      case 'dismiss':
        // Just close
        return;
      default:
        break;
    }
  }

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  // Track notification dismissals if needed
  console.log('[SW] Notification closed:', event.notification.tag);
});
