const CACHE_NAME = 'reeve-shell-v3';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  // Never intercept same-origin API requests (e.g. /api/geo). Let the browser
  // see the real response/failure — the caller's own try/catch handles it.
  // Prevents wrapping a failed API fetch in a synthetic 504 "Offline".
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // F1-B6c: only cache successful basic responses. Skip cache writes for
        // 4xx/5xx and opaque cross-origin responses to avoid caching errors.
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        // On network miss, prefer cache; for navigations fall back to the app
        // shell. Never reject respondWith() — a rejected promise spams the
        // DevTools console with "FetchEvent … Network request failed". Always
        // resolve with a Response so the browser handles failure naturally.
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          const shell = (await caches.match('/')) || (await caches.match('/index.html'));
          if (shell) return shell;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title><p>You appear to be offline.</p>',
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          );
        }
        return new Response('', { status: 504, statusText: 'Offline' });
      })
  );
});
