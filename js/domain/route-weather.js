// Tempo ao longo da viagem (ADR-039): pontos a cada X minutos de estrada e, para cada um,
// a previsão NA HORA EM QUE VOCÊ PASSA por ali (não a de agora).
import { describe } from './weather-codes.js?v=5.3';
import { shortDist } from './units.js?v=5.3';
import { t } from '../i18n/index.js?v=5.3';

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

// Limites por veículo (ADR-042): moto e veículos altos sentem muito mais chuva e vento lateral.
export const VEHICLES = {
  car: { rainWarn: 2.5, rainDanger: 7.6, gustWarn: 40, gustDanger: 62, nightLevel: 'info' },
  moto: { rainWarn: 0.2, rainDanger: 2.5, gustWarn: 30, gustDanger: 50, nightLevel: 'warn' },
  large: { rainWarn: 2.5, rainDanger: 7.6, gustWarn: 30, gustDanger: 50, nightLevel: 'info' },
};

// Nomes traduzidos (veh.<tipo> e veh.<tipo>.short nos dicionários)
for (const [k, v] of Object.entries(VEHICLES)) {
  Object.defineProperty(v, 'label', { get: () => t(`veh.${k}`), enumerable: true });
  Object.defineProperty(v, 'short', { get: () => t(`veh.${k}.short`), enumerable: true });
}

/** Condição de um trecho + nível de atenção: null | 'info' | 'warn' | 'danger'. */
export function classify(h, vehicle = 'car') {
  const v = VEHICLES[vehicle] || VEHICLES.car;
  const info = describe(h.code);
  const flags = [];
  const add = (level, text, key) => flags.push({ level, text, key });
  if (STORM.includes(h.code)) add('danger', t('flag.storm'), 'storm');
  if (ICE.includes(h.code)) add('danger', t('flag.ice'), 'ice');
  if ((h.snow ?? 0) >= 1) add('danger', t('flag.heavySnow'), 'snow');
  else if ((h.snow ?? 0) > 0.05) add('warn', t('flag.snow'), 'snow');
  const mm = h.precip ?? 0;
  if (mm >= v.rainDanger) add('danger', t(vehicle === 'moto' ? 'flag.rainMotoDanger' : 'flag.heavyRain'), 'rain');
  else if (mm >= v.rainWarn) add('warn', t(vehicle === 'moto' ? 'flag.rainMotoWarn' : 'flag.moderateRain'), 'rain');
  else if (mm >= 0.2) add('info', t('flag.lightRain'), 'rain');
  if ((h.visibility ?? 99999) < 200) add('danger', t('flag.denseFog', { v: shortDist(200) }), 'fog');
  else if ((h.visibility ?? 99999) < 1000) add('warn', t('flag.fog', { v: shortDist(1000) }), 'fog');
  const lateral = vehicle === 'car' ? '' : ` ${t('flag.crosswind')}`;
  if ((h.gust ?? 0) >= v.gustDanger) add('danger', `${t('flag.damagingWind')}${lateral}`, 'gust');
  else if ((h.gust ?? 0) >= v.gustWarn) add('warn', `${t('flag.gusts')}${lateral}`, 'gust');
  if (h.isDay === false) add(v.nightLevel, t('flag.night'), 'night');
  const order = { danger: 3, warn: 2, info: 1 };
  const level = flags.reduce((best, f) => (order[f.level] > (order[best] || 0) ? f.level : best), null);
  return { label: info.label, icon: info.icon, level, flags };
}

/** Pontuação de risco de uma viagem (menor = melhor). Usada para sugerir o melhor horário. */
export function tripScore(conds) {
  const w = { danger: 10, warn: 4, info: 1 };
  return conds.reduce((sum, c) => sum + c.flags.reduce((a, f) => a + (w[f.level] || 0), 0), 0);
}

/** Paradas sugeridas: o ponto mais próximo de cada 2 h de estrada (cansaço ao volante). */
export function suggestedStops(points, departMs, everyH = 2) {
  const marks = new Set();
  const last = points[points.length - 1]?.etaMs ?? departMs;
  for (let t = departMs + everyH * 3600e3; t < last - 30 * 60e3; t += everyH * 3600e3) {
    let best = -1;
    points.forEach((p, i) => { if (i > 0 && i < points.length - 1 && (best < 0 || Math.abs(p.etaMs - t) < Math.abs(points[best].etaMs - t))) best = i; });
    if (best > 0) marks.add(best);
  }
  return marks;
}

const inUS = (p) => p && p.lat > 18 && p.lat < 72 && p.lon > -170 && p.lon < -60 && /estados unidos|united states|eua|usa/i.test(p.country || 'Estados Unidos');
const inBR = (p) => p && /brasil|brazil/i.test(p.country || '');

/** Aviso de confiabilidade conforme a antecedência e o país (ADR-042). */
export function horizonNote(departMs, origin, dest, nowMs = Date.now()) {
  const days = (departMs - nowMs) / 86400e3;
  const level = days <= 3 ? 'ok' : 'trend';
  const head = level === 'ok' ? t('hz.ok') : t('hz.trend', { n: Math.round(days) });
  if (inUS(origin) && inUS(dest)) {
    return { level, head, text: t('hz.noaa'), source: 'NOAA', href: 'https://scijinks.gov/forecast-reliability/' };
  }
  if (inBR(origin) || inBR(dest)) {
    return { level, head, text: t('hz.inmet'), source: 'INMET', href: 'https://alertas2.inmet.gov.br/' };
  }
  return { level, head, text: t('hz.other'), source: '', href: '' };
}

/** Resumo em uma frase para o topo do resultado. */
export function tripSummary(stops, fmtTime) {
  const weatherFlags = (s) => s.cond.flags.filter((f) => f.key !== 'night' && f.key !== 'official');
  const lvl = (s) => (weatherFlags(s).some((f) => f.level === 'danger') ? 'danger' : weatherFlags(s).some((f) => f.level === 'warn') ? 'warn' : null);
  const bad = stops.filter((s) => lvl(s));
  if (!bad.length) {
    const wet = stops.some((s) => weatherFlags(s).some((f) => f.level === 'info'));
    return { level: wet ? 'info' : 'ok', text: t(wet ? 'ts.calmWet' : 'ts.calm') };
  }
  const worst = bad.find((s) => lvl(s) === 'danger') || bad[0];
  const wl = lvl(worst);
  const what = weatherFlags(worst).filter((f) => f.level === wl).map((f) => f.text.toLowerCase()).join(t('ts.and'));
  return {
    level: wl,
    text: t('ts.attention', { what, place: worst.name, h: fmtTime(worst.etaMs) }) + (bad.length > 1 ? ` ${t('ts.more', { n: bad.length })}` : ''),
  };
}
