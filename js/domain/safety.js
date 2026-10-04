// Níveis de atenção para o "Hoje em detalhe" + recomendações (ADR-022).
// Limites baseados em referências públicas (escala Beaufort, OMS para UV, faixas de
// avisos de chuva do INMET). NÃO são alertas oficiais.
import { speed, rain, snow } from './units.js?v=6.4.0';
import { t } from '../i18n/index.js?v=6.4.0';
import { isWetHour } from './summary.js?v=6.4.0';
import { roadIceRisk } from './road-ice.js?v=6.4.0';
import { aqiLevel } from '../api/air-quality.js?v=6.4.0';

// Textos traduzidos (ADR-045): cada cuidado é uma chave adv.<tipo>.<nível>.<campo> nos dicionários.
const KINDS = { night: ['warn'], official: ['danger', 'warn'], fog: ['warn', 'danger'], gust: ['warn', 'danger'],
  wind: ['warn', 'danger'], uv: ['warn', 'danger'], rain: ['warn', 'danger'], snow: ['warn', 'danger'],
  ice: ['warn', 'danger'], air: ['warn', 'danger'], storm: ['warn', 'danger'] };

export const SOURCES = () => t('adv.sources');
export const hasAdvice = (key) => !!KINDS[key];

/** Cuidados { title, walk, drive, home } de um tipo e nível ('warn' | 'danger'). */
export function advice(key, level) {
  const lv = KINDS[key]?.includes(level) ? level : KINDS[key]?.[0];
  if (!lv) return null;
  const f = (x) => t(`adv.${key}.${lv}.${x}`);
  return { title: f('title'), walk: f('walk'), drive: f('drive'), home: f('home') };
}

const kmh = (v) => v ?? 0;

/** Avalia o dia de hoje; devolve { chave: { level, title, reason, walk, drive, home } }. */
export function evaluateToday(data, stormRisk, unit = 'C', air = null) {
  const sp = (v) => speed(v);
  const mm = (v) => rain(v, 0);
  const d = data.daily[0];
  const today = data.hours.filter((h) => h.time.startsWith(d.date));
  const rainMm = today.reduce((a, h) => a + (h.precip ?? 0), 0);
  const maxRate = Math.max(0, ...today.filter(isWetHour).map((h) => h.precip ?? 0));
  const out = {};
  const put = (key, level, reason) => { if (level) out[key] = { level, reason, ...advice(key, level) }; };

  const g = kmh(d.gustMax);
  put('gust', g >= 62 ? 'danger' : g >= 40 ? 'warn' : null, t('why.gust', { v: sp(g), a: sp(40), b: sp(62) }));
  const w = kmh(d.windMax);
  put('wind', w >= 62 ? 'danger' : w >= 39 ? 'warn' : null, t('why.wind', { v: sp(w), a: sp(39) }));
  const uv = d.uv ?? 0;
  put('uv', uv >= 8 ? 'danger' : uv >= 6 ? 'warn' : null, t('why.uv', { v: Math.round(uv) }));
  put('rain', rainMm >= 50 || maxRate >= 30 ? 'danger' : rainMm >= 30 || maxRate >= 20 ? 'warn' : null,
    t('why.rain', { v: mm(rainMm), a: mm(30), b: mm(50) }));
  const sn = d.snow ?? 0;
  put('snow', sn >= 10 ? 'danger' : sn > 0 ? 'warn' : null, t('why.snow', { v: snow(sn) }));
  put('storm', stormRisk === 'alto' ? 'danger' : stormRisk === 'moderado' ? 'warn' : null, t('why.storm', { v: t(`risk.${{ alto: 'high', moderado: 'moderate', baixo: 'low' }[stormRisk]}`).toLowerCase() }));
  const ice = roadIceRisk(data.hourly);
  put('ice', ice.level, ice.reason);
  if (air) put('air', air.aqi > 150 ? 'danger' : air.aqi > 100 ? 'warn' : null, t('why.air', { v: air.aqi, level: aqiLevel(air.aqi) }));
  return { levels: out, rainMm, ice };
}
