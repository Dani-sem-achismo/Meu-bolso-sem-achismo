const CACHE_NAME = 'meu-bolso-v9';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/storage.js',
  './js/calc.js',
  './js/app.js',
  './manifest.json',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
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

// Clique numa notificação (com ou sem botão de ação): se o app já está aberto numa
// aba, manda uma mensagem pra ela agir (ex: marcar conta como paga) e foca nela.
// Se não tem aba aberta, abre uma nova já com os dados na URL, pra agir assim que
// o app carregar (ver handleNotificationLaunchParams em app.js).
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const data = notification.data || {};
  const action = event.action || '';
  notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'notification-action', action, kind: data.kind, id: data.id });
          return client.focus();
        }
      }
      const params = new URLSearchParams({ ntf: '1', action, kind: data.kind || '', id: data.id || '' });
      return self.clients.openWindow(`./?${params.toString()}`);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});
