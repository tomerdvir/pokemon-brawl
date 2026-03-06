// Minimal service worker for offline PWA support
const CACHE_NAME = 'pokebrawl-v1';
const APP_BASE_PATH = new URL('./', self.location.href).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([APP_BASE_PATH]))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
