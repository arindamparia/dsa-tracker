const CACHE_NAME = 'dsa-tracker-v3';

// Skip the waiting phase. When I push an update, I want it live immediately.
// We handle the actual page reload manually in index.html so users don't get stuck. Peak desi engineering.
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

  // Ignore anything that isn't a simple GET request for our own files.
  // DO NOT cache API calls or Clerk auth, it will break everything bhai.
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/.netlify/')) return;
  if (url.pathname.startsWith('/cdn-cgi/')) return;
  if (url.hostname.includes('clerk')) return;
  if (url.origin !== self.location.origin) return; // let browser handle cross-origin (Cloudinary, fonts) directly

  // Always try the network first so users get the latest deploy. 
  // If they are offline, fallback to the cache so the PWA still works.
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

  // Same deal for static assets. Try network, fallback to cache.
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
