// Funciona sem internet (ADR-034). Estratégia "rede primeiro": com internet, SEMPRE busca
// a versão nova (não repete o problema de cache do ADR-016); sem internet, mostra a última
// cópia guardada — inclusive a última previsão consultada.
const VERSION = '6.4.2';
const CACHE = `previsao-tempo-${VERSION}`;
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'img/icon-192.png'];
// Dados que vale guardar para usar sem internet (mapas e radar ficam de fora: são pesados).
// A busca de cidades NÃO é guardada: o que a pessoa digitou não fica no aparelho (pen test, L-10).
const DATA_HOSTS = ['api.open-meteo.com', 'air-quality-api.open-meteo.com'];
const MAX_DATA = 30; // previsões guardadas no máximo (as mais antigas saem)

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
    // Página: uma cópia só, sem o "?…" — links com endereço de viagem não ficam guardados (L-10)
    const key = req.mode === 'navigate' ? 'index.html' : req;
    try {
      const res = await fetch(req);
      if (res.ok) {
        await cache.put(key, res.clone());
        if (!same) await trim(cache);
      }
      return res;
    } catch (err) {
      const hit = await cache.match(key) || (req.mode === 'navigate' && await cache.match('index.html', { ignoreSearch: true }))
        || (req.mode === 'navigate' && await cache.match('./'));
      if (hit) return hit;
      throw err;
    }
  })());
});

/** Mantém só as MAX_DATA previsões mais recentes (o cache guarda na ordem em que entrou). */
async function trim(cache) {
  const data = (await cache.keys()).filter((r) => new URL(r.url).origin !== self.location.origin);
  await Promise.all(data.slice(0, Math.max(0, data.length - MAX_DATA)).map((r) => cache.delete(r)));
}
