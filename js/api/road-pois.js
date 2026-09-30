// Postos de combustível e balanças de pesagem ao longo da rota (ADR-044).
// Fonte: OpenStreetMap via Overpass API (grátis, sem chave, dados colaborativos).
// Limites honestos: o mapa é feito por voluntários — pode faltar posto ou balança, e não
// sabemos se a balança está aberta agora (isso só serviços pagos, como PrePass/Drivewyze nos EUA).
import { t } from '../i18n/index.js?v=5.4';

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const R = 6371;
const rad = (d) => (d * Math.PI) / 180;
const dist = (a, b) => {
  const x = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

/** Reduz a rota a no máximo ~80 pontos (a consulta fica leve; o Overpass trata os pontos como uma linha). */
function simplify(coords, max = 80) {
  if (coords.length <= max) return coords;
  const step = (coords.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => coords[Math.round(i * step)]);
}

/** Posição (km desde a saída) do ponto da rota mais próximo de cada lugar encontrado. */
function kmAlong(coords, cum, p) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const d = dist(coords[i], p);
    if (d < bestD) { bestD = d; best = i; }
  }
  return { km: cum[best], offKm: bestD };
}

const clean = (s) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').slice(0, 60);

export async function getRoadPois(route, { trucks = false } = {}) {
  const line = simplify(route.coords);
  const ll = line.map(([la, lo]) => `${la.toFixed(4)},${lo.toFixed(4)}`).join(',');
  const q = `[out:json][timeout:25];(`
    + `node(around:1500,${ll})[amenity=fuel];way(around:1500,${ll})[amenity=fuel];`
    + (trucks ? `node(around:1500,${ll})[amenity=weighbridge];way(around:1500,${ll})[amenity=weighbridge];`
      + `node(around:1500,${ll})[highway=weigh_station];` : '')
    + ');out center 600;';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let data;
  try {
    const res = await fetch(OVERPASS, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(q)}`,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } finally {
    clearTimeout(timer);
  }
  // distância acumulada da rota completa
  const cum = [0];
  for (let i = 1; i < route.coords.length; i++) cum.push(cum[i - 1] + dist(route.coords[i - 1], route.coords[i]));
  const fuel = [], weigh = [];
  for (const e of data.elements || []) {
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const tags = e.tags || {};
    const { km, offKm } = kmAlong(route.coords, cum, [lat, lon]);
    if (offKm > 2) continue;
    const item = { lat, lon, km: Math.round(km), name: clean(tags.name || tags.brand || tags.operator), truck: tags.hgv === 'yes' || /truck|caminh/i.test(tags.name || '') };
    if (tags.amenity === 'fuel') fuel.push({ ...item, name: item.name || t('poi.fuel'), diesel: tags['fuel:diesel'] === 'yes' });
    else weigh.push({ ...item, name: item.name || t('poi.weigh') });
  }
  const byKm = (a, b) => a.km - b.km;
  // tira duplicados muito próximos (mesmo posto como ponto e como área)
  const dedupe = (arr) => arr.sort(byKm).filter((x, i, a) => !a.slice(0, i).some((y) => Math.abs(y.km - x.km) < 0.3 && y.name === x.name));
  return { fuel: dedupe(fuel), weigh: dedupe(weigh), totalKm: cum[cum.length - 1] };
}

/** Posto mais próximo (à frente ou até 5 km atrás) de um ponto da viagem. */
export function nearestFuel(fuel, km, ahead = 25) {
  return fuel.filter((f) => f.km >= km - 5 && f.km <= km + ahead).sort((a, b) => Math.abs(a.km - km) - Math.abs(b.km - km))[0] || null;
}

/** Trechos longos sem posto (para avisar "abasteça antes"). */
export function fuelGaps(fuel, totalKm, minGap = 80) {
  const marks = [0, ...fuel.map((f) => f.km), totalKm];
  const gaps = [];
  for (let i = 1; i < marks.length; i++) if (marks[i] - marks[i - 1] >= minGap) gaps.push({ fromKm: Math.round(marks[i - 1]), toKm: Math.round(marks[i]) });
  return gaps;
}
