const CACHE_NAME = 'vinted-manager-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png'
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

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    console.warn('[PWA SW] Impossible de parser les données push:', err);
  }

  const title = data.title || 'Vinted Manager';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    tag: data.tag || 'vinted-manager-default',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// base64url -> Uint8Array (clé VAPID), nécessaire pour pushManager.subscribe.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Auto-réabonnement : iOS (et parfois Chrome) invalide les abonnements push tout
// seul (maj OS, PWA inactive, redémarrage…). Cet événement permet de re-créer un
// abonnement sans intervention de l'utilisateur, puis de le réenregistrer côté serveur.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Désenregistrer l'ancien abonnement côté serveur s'il est connu.
        const oldEndpoint = event.oldSubscription && event.oldSubscription.endpoint;
        if (oldEndpoint) {
          try {
            await fetch('/api/push/subscribe', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: oldEndpoint }),
            });
          } catch (e) {
            console.warn('[PWA SW] Suppression ancien abonnement échouée:', e);
          }
        }

        // Récupérer la clé VAPID publique (le SW n'a pas accès à process.env).
        const res = await fetch('/api/push/vapid');
        if (!res.ok) throw new Error('VAPID HTTP ' + res.status);
        const { publicKey } = await res.json();
        if (!publicKey) throw new Error('publicKey absente');

        // Re-créer un abonnement et le réenregistrer côté serveur.
        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        const sub = subscription.toJSON();

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          }),
        });
        console.log('[PWA SW] Réabonnement push automatique réussi.');
      } catch (err) {
        console.error('[PWA SW] Échec du réabonnement automatique:', err);
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
