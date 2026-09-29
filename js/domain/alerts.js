// Regras derivadas (ADR-005). Estimativas do site — NÃO são alertas oficiais.
import { STORM_CODES } from './weather-codes.js?v=5.1';
import { temp, speed } from './units.js?v=5.1';
import { t } from '../i18n/index.js?v=5.1';

/** Risco de tempestade: 'alto' | 'moderado' | 'baixo' (arquitetura, seção 6.1). */
export function stormRisk({ code, cape, pop }) {
  if (STORM_CODES.includes(code)) return 'alto';
  if ((cape ?? 0) >= 1000 && (pop ?? 0) >= 40) return 'moderado';
  return 'baixo';
}

/** Risco de tempestade de hoje, olhando o dia e as próximas 24h. */
export function todayStormRisk(data) {
  const day = data.daily[0];
  const hours = data.hourly;
  const maxCape = Math.max(0, ...hours.map((h) => h.cape ?? 0));
  const stormHour = hours.some((h) => STORM_CODES.includes(h.code));
  return stormRisk({ code: stormHour ? 95 : day.code, cape: maxCape, pop: day.pop });
}

/** Avisos automáticos (arquitetura, seção 6.2). */
export function computeAlerts(data, unit) {
  const day = data.daily[0];
  const list = [];

  if (todayStormRisk(data) === 'alto') {
    list.push({ level: 'danger', title: t('auto.storm.title'), text: t('auto.storm.text') });
  }
  if ((day.max ?? -99) >= 35) {
    list.push({ level: 'warning', title: t('auto.heat.title'), text: t('auto.heat.text', { t: temp(day.max, unit) }) });
  }
  if ((day.min ?? 99) <= 0) {
    list.push({ level: 'warning', title: t('auto.cold.title'), text: t('auto.cold.text', { t: temp(day.min, unit) }) });
  }
  if ((day.gustMax ?? 0) >= 60) {
    list.push({ level: 'warning', title: t('auto.wind.title'), text: t('auto.wind.text', { v: speed(day.gustMax) }) });
  }
  if ((day.uv ?? 0) >= 8) {
    list.push({ level: 'info', title: t('auto.uv.title'), text: t('auto.uv.text') });
  }
  if ((day.snow ?? 0) > 0) {
    list.push({ level: 'info', title: t('auto.snow.title'), text: t('auto.snow.text') });
  }
  return list;
}
