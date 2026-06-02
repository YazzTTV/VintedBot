const CACHE_NAME = 'vinted-manager-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => {
      console.warn('[PWA SW] Erreur lors de la mise en cache initiale:', err);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Mode network-first pour éviter les dysfonctionnements avec les API dynamiques de Next.js.
  // Permet de satisfaire les critères d'audit PWA de Chrome sans casser les données réelles.
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
