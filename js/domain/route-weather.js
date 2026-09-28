// Tempo ao longo da viagem (ADR-039): pontos a cada X minutos de estrada e, para cada um,
// a previsão NA HORA EM QUE VOCÊ PASSA por ali (não a de agora).
import { describe } from './weather-codes.js?v=3.4';

const R = 6371;
const rad = (d) => (d * Math.PI) / 180;
export function haversine([la1, lo1], [la2, lo2]) {
  const a = Math.sin(rad(la2 - la1) / 2) ** 2 + Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(rad(lo2 - lo1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Intervalo entre pontos conforme a duração: viagens curtas mais detalhadas. */
export function stepMinutes(durationS) {
  const h = durationS / 3600;
  return h <= 3 ? 30 : h <= 8 ? 60 : 120;
}

/** Pontos ao longo da rota, supondo velocidade média constante. */
export function samplePoints(route, departMs) {
  const { coords, duration } = route;
  const cum = [0];
  for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + haversine(coords[i - 1], coords[i]));
  const total = cum[cum.length - 1] || 1;
  const step = stepMinutes(duration) * 60;
  const times = [];
  for (let t = 0; t < duration; t += step) times.push(t);
  times.push(duration);
  return times.map((t) => {
    const target = (t / duration || 0) * total;
    let i = cum.findIndex((c) => c >= target);
    if (i <= 0) i = Math.max(1, i);
    const seg = cum[i] - cum[i - 1] || 1;
    const f = Math.min(1, Math.max(0, (target - cum[i - 1]) / seg));
    const [a, b] = [coords[i - 1] || coords[0], coords[i] || coords[0]];
    return { lat: a[0] + (b[0] - a[0]) * f, lon: a[1] + (b[1] - a[1]) * f, etaMs: departMs + t * 1000, km: Math.round(target) };
  });
}

const ICE = [56, 57, 66, 67];
const STORM = [95, 96, 99];

/** Condição de um trecho + nível de atenção: null | 'info' | 'warn' | 'danger'. */
export function classify(h) {
  const info = describe(h.code);
  const flags = [];
  const add = (level, text, key) => flags.push({ level, text, key });
  if (STORM.includes(h.code)) add('danger', 'Tempestade', 'storm');
  if (ICE.includes(h.code)) add('danger', 'Gelo na pista (chuva congelante)', 'ice');
  if ((h.snow ?? 0) >= 1) add('danger', 'Neve forte', 'snow');
  else if ((h.snow ?? 0) > 0.05) add('warn', 'Neve', 'snow');
  const mm = h.precip ?? 0;
  if (mm >= 7.6) add('danger', 'Chuva forte', 'rain');
  else if (mm >= 2.5) add('warn', 'Chuva moderada', 'rain');
  else if (mm >= 0.2) add('info', 'Chuva fraca', 'rain');
  if ((h.visibility ?? 99999) < 200) add('danger', 'Névoa densa (visibilidade < 200 m)', 'fog');
  else if ((h.visibility ?? 99999) < 1000) add('warn', 'Névoa (visibilidade < 1 km)', 'fog');
  if ((h.gust ?? 0) >= 62) add('danger', 'Ventania', 'gust');
  else if ((h.gust ?? 0) >= 40) add('warn', 'Rajadas fortes', 'gust');
  const order = { danger: 3, warn: 2, info: 1 };
  const level = flags.reduce((best, f) => (order[f.level] > (order[best] || 0) ? f.level : best), null);
  return { label: info.label, icon: info.icon, level, flags };
}

/** Resumo em uma frase para o topo do resultado. */
export function tripSummary(stops, fmtTime) {
  const bad = stops.filter((s) => s.cond.level === 'danger' || s.cond.level === 'warn');
  if (!bad.length) {
    const wet = stops.some((s) => s.cond.level === 'info');
    return { level: wet ? 'info' : 'ok', text: wet ? 'Viagem tranquila: no máximo chuva fraca em alguns trechos.' : 'Viagem tranquila: sem chuva, névoa ou vento forte previstos no caminho.' };
  }
  const worst = bad.find((s) => s.cond.level === 'danger') || bad[0];
  const what = worst.cond.flags.filter((f) => f.level === worst.cond.level).map((f) => f.text.toLowerCase()).join(' e ');
  return {
    level: worst.cond.level,
    text: `Atenção: ${what} perto de ${worst.name} por volta das ${fmtTime(worst.etaMs)}.${bad.length > 1 ? ` ${bad.length} trechos pedem cuidado.` : ''}`,
  };
}
