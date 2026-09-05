// service worker (версия по содержимому: a6c56dda4b)
// страница игры — network-first (всегда свежая при интернете), офлайн — из кэша.
const CACHE = 'mark-kart-a6c56dda4b';
const ASSETS = ['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-512-maskable.png','./apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    // 🔄 ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ СТАРЫХ КОПИЙ.
    // Даже если на телефоне лежит старая страница без нового обновлятора, браузер всё равно
    // скачивает свежий sw.js при заходе. Новый воркер сам перезагружает открытые окна
    // на свежий адрес — и застрявшая версия обновляется без всяких кнопок (Марк, 23.08).
    try {
      const окна = await self.clients.matchAll({ type: 'window' });
      for (const w of окна) {
        const базовый = w.url.split('?')[0];
        await w.navigate(базовый + '?v=' + Date.now());
      }
    } catch (_) {}
  })());
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isDoc = e.request.mode === 'navigate' || e.request.destination === 'document';
  if (isDoc) {
    e.respondWith(fetch(e.request).then(resp => {
      const cp = resp.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return resp;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      const cp = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return resp;
    })));
  }
});
