const CACHE_NAME = 'dsa-tracker-v3';

// Install — activate immediately
self.addEventListener('install', () => self.skipWaiting());

// Activate — clean old caches, claim clients
// The inline controllerchange listener in index.html handles the reload
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET, API calls, Clerk, external auth, and cross-origin assets
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/.netlify/')) return;
  if (url.pathname.startsWith('/cdn-cgi/')) return;
  if (url.hostname.includes('clerk')) return;
  if (url.origin !== self.location.origin) return; // let browser handle cross-origin (Cloudinary, fonts) directly

  // Navigation (HTML) — network-first with cache fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Same-origin static assets (CSS, JS, images) — network-first with cache fallback
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

});
