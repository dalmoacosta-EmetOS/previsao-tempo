// Regras derivadas (ADR-005). Estimativas do site — NÃO são alertas oficiais.
import { STORM_CODES } from './weather-codes.js?v=2.10';
import { temp, speed } from './units.js?v=2.10';

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
    list.push({ level: 'danger', title: 'Tempestade prevista', text: 'Evite áreas abertas e fique atento a raios e rajadas.' });
  }
  if ((day.max ?? -99) >= 35) {
    list.push({ level: 'warning', title: 'Calor intenso', text: `Máxima de ${temp(day.max, unit)}. Hidrate-se e evite sol forte.` });
  }
  if ((day.min ?? 99) <= 0) {
    list.push({ level: 'warning', title: 'Frio intenso', text: `Mínima de ${temp(day.min, unit)}. Risco de gelo nas pistas.` });
  }
  if ((day.gustMax ?? 0) >= 60) {
    list.push({ level: 'warning', title: 'Vento forte', text: `Rajadas de até ${speed(day.gustMax, unit)}.` });
  }
  if ((day.uv ?? 0) >= 8) {
    list.push({ level: 'info', title: 'Índice UV muito alto', text: 'Use protetor solar e evite o sol entre 10h e 16h.' });
  }
  if ((day.snow ?? 0) > 0) {
    list.push({ level: 'info', title: 'Neve prevista', text: 'Planeje deslocamentos com antecedência.' });
  }
  return list;
}
