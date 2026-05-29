// Guide de Poche — Service Worker
const CACHE = 'gdp-v3';
const SHELL = [
  '/guide-de-poche/',
  '/guide-de-poche/index.html',
  '/guide-de-poche/data.json',
  '/guide-de-poche/manifest.json',
  '/guide-de-poche/icon-192.png',
  '/guide-de-poche/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match('/guide-de-poche/index.html'));
    })
  );
});
