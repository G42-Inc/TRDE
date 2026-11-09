// TRDE Service Worker
const CACHE_NAME = 'trde-cache-v1';
const STATIC_CACHE_NAME = 'trde-static-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/logos/TRDE_black_transparent_64x64.png',
  '/logos/TRDE_black_transparent_128x128.png',
  '/logos/TRDE_black_transparent_256x256.png',
  '/logos/TRDE_black_transparent_512x512.png',
  '/logos/TRDE_white_transparent_512x512.png',
  '/favicons/TRDE_favicon_black_16x16.png',
  '/favicons/TRDE_favicon_black_32x32.png',
  '/favicons/TRDE_favicon_black_64x64.png',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

// Fetch event - network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (Clerk, Stripe, Supabase)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip API routes - always network
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip auth-related routes
  if (url.pathname.startsWith('/sign-in') || 
      url.pathname.startsWith('/sign-up') ||
      url.pathname.startsWith('/auth')) {
    return;
  }

  // Static assets (images, fonts, logos) - cache-first
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
    );
    return;
  }

  // HTML pages - network-first with cache fallback
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // Other requests - network-first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
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
