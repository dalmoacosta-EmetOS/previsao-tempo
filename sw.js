// Funciona sem internet (ADR-034). Estratégia "rede primeiro": com internet, SEMPRE busca
// a versão nova (não repete o problema de cache do ADR-016); sem internet, mostra a última
// cópia guardada — inclusive a última previsão consultada.
const VERSION = '5.2';
const CACHE = `previsao-tempo-${VERSION}`;
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'img/icon-192.png'];
// Dados que vale guardar para usar sem internet (mapas e radar ficam de fora: são pesados).
const DATA_HOSTS = ['api.open-meteo.com', 'air-quality-api.open-meteo.com', 'geocoding-api.open-meteo.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (!same && !DATA_HOSTS.includes(url.hostname)) return; // o resto segue direto para a rede
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req) || (req.mode === 'navigate' && await cache.match('index.html', { ignoreSearch: true }))
        || (req.mode === 'navigate' && await cache.match('./'));
      if (hit) return hit;
      throw err;
    }
  })());
});
