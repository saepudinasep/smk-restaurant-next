/* Service worker SMK Restaurant: hanya menangani web push (tanpa cache offline). */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Pesan push dari server: { title, body, url, requireInteraction }
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'SMK Restaurant', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: { url: data.url || '/notifications' },
      requireInteraction: data.requireInteraction === true, // tetap tampil sampai ditutup (order baru untuk Chef)
      vibrate: [200, 100, 200],
    }),
  );
});

// Klik notifikasi: fokuskan tab yang sudah terbuka dan arahkan ke halaman terkait; bila tidak ada, buka tab baru.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) await client.navigate(target).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
