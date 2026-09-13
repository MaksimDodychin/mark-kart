// service worker (версия по содержимому: a51b5267a8)
// страница игры — network-first (всегда свежая при интернете), офлайн — из кэша.
const CACHE = 'mark-kart-a51b5267a8';
const ASSETS = ['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-512-maskable.png','./apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, {cache:'reload'})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k.startsWith('mark-kart-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    // 🔄 ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ СТАРЫХ КОПИЙ.
    // Даже если на телефоне лежит старая страница без нового обновлятора, браузер всё равно
    // скачивает свежий sw.js при заходе. Новый воркер сам перезагружает открытые окна
    // на свежий адрес — и застрявшая версия обновляется без всяких кнопок (Марк, 23.08).
    try {
      const окна = await self.clients.matchAll({ type: 'window' });
      for (const w of окна) {
        if (!w.url.startsWith(self.registration.scope)) continue;
        const адрес = new URL(w.url);
        if (адрес.searchParams.get('v') === 'a51b5267a8') continue;
        адрес.searchParams.set('v','a51b5267a8');
        w.navigate(адрес.href).catch(() => {});
      }
    } catch (_) {}
  })());
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isDoc = e.request.mode === 'navigate' || e.request.destination === 'document';
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    if (isDoc) {
      try {
        const r = await fetch(new Request(e.request, {cache:'no-cache'}));
        if (!r.ok) throw new Error('Game download failed');
        await c.put('./index.html', r.clone());
        return r;
      } catch (_) { return (await c.match('./index.html')) || Response.error(); }
    }
    const hit = await c.match(e.request);
    if (hit) return hit;
    const r = await fetch(e.request);
    if (r.ok) await c.put(e.request, r.clone());
    return r;
  })());
});
