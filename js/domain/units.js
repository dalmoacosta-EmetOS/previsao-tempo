// Conversão e formatação de unidades. A API sempre entrega °C, km/h, mm e cm (ADR-004).
// Qual unidade mostrar vem das preferências (ADR-045): cada medida pode ser escolhida à parte.
import { getUnits } from '../units-settings.js?v=6.4.0';
import { t, locale } from '../i18n/index.js?v=6.4.0';

const toF = (c) => (c * 9) / 5 + 32;
const isNum = (v) => typeof v === 'number' && !Number.isNaN(v);
export const KM_PER_MI = 1.609344;
const nf = (v, d = 0) => new Intl.NumberFormat(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);

/** Temperatura. `unit` ('C'/'F') vem do estado; sem ele, usa a preferência salva. */
export function temp(celsius, unit = getUnits().temp) {
  if (!isNum(celsius)) return '--';
  return `${Math.round(unit === 'F' ? toF(celsius) : celsius)}°`;
}

export function speed(kmh) {
  if (!isNum(kmh)) return '--';
  return getUnits().dist === 'mi' ? `${Math.round(kmh / KM_PER_MI)} mph` : `${Math.round(kmh)} km/h`;
}
/** Só o número da velocidade na unidade escolhida (para limites em frases). */
export const speedUnit = () => (getUnits().dist === 'mi' ? 'mph' : 'km/h');

/** Distância de estrada: "123 km" ou "76 mi". */
export function dist(km, decimals = 0) {
  if (!isNum(km)) return '--';
  return getUnits().dist === 'mi' ? `${nf(km / KM_PER_MI, decimals)} mi` : `${nf(km, decimals)} km`;
}
/** Marco de estrada: "km 120" / "mi 75". */
export function milestone(km) {
  return getUnits().dist === 'mi' ? `mi ${Math.round(km / KM_PER_MI)}` : `km ${Math.round(km)}`;
}
/** Visibilidade curta (metros → "200 m" / "0,1 mi"). */
export function shortDist(m) {
  if (getUnits().dist === 'mi') return m >= 1000 ? `${nf(m / 1609.344, 1)} mi` : `${Math.round(m * 3.28084 / 10) * 10} ft`;
  return m >= 1000 ? `${nf(m / 1000, 0)} km` : `${Math.round(m)} m`;
}

export function snow(cm) {
  if (!isNum(cm) || cm <= 0) return t('units.none');
  return getUnits().precip === 'in' ? `${nf(cm / 2.54, 1)} in` : `${nf(cm, 1)} cm`;
}

/** Quantidade de chuva: mm ou polegadas. */
export function rain(mm, decimals) {
  if (!isNum(mm)) return '--';
  return getUnits().precip === 'in' ? `${nf(mm / 25.4, decimals ?? 2)} in` : `${nf(mm, decimals ?? 1)} mm`;
}

export function percent(v) {
  return isNum(v) ? `${Math.round(v)}%` : '--';
}

export function windDirection(deg) {
  if (!isNum(deg)) return '';
  return t('units.dirs').split(' ')[Math.round(deg / 45) % 8];
}

export function uvLevel(uv) {
  if (!isNum(uv)) return '';
  if (uv < 3) return t('uv.low');
  if (uv < 6) return t('uv.moderate');
  if (uv < 8) return t('uv.high');
  if (uv < 11) return t('uv.veryHigh');
  return t('uv.extreme');
}
