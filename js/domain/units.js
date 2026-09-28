// Conversão e formatação de unidades. A API sempre entrega °C, km/h e cm (ADR-004).

const toF = (c) => (c * 9) / 5 + 32;
const isNum = (v) => typeof v === 'number' && !Number.isNaN(v);

export function temp(celsius, unit) {
  if (!isNum(celsius)) return '--';
  return `${Math.round(unit === 'F' ? toF(celsius) : celsius)}°`;
}

export function speed(kmh, unit) {
  if (!isNum(kmh)) return '--';
  return unit === 'F' ? `${Math.round(kmh * 0.621371)} mph` : `${Math.round(kmh)} km/h`;
}

export function snow(cm, unit) {
  if (!isNum(cm) || cm <= 0) return 'Nenhuma';
  return unit === 'F' ? `${(cm / 2.54).toFixed(1)} in` : `${cm.toFixed(1)} cm`;
}

/** Quantidade de chuva: mm (°C) ou polegadas (°F), com vírgula. */
export function rain(mm, unit) {
  if (!isNum(mm)) return '--';
  return unit === 'F' ? `${(mm / 25.4).toFixed(2).replace('.', ',')} pol` : `${mm.toFixed(1).replace('.', ',')} mm`;
}

export function percent(v) {
  return isNum(v) ? `${Math.round(v)}%` : '--';
}

const DIRS = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
export function windDirection(deg) {
  if (!isNum(deg)) return '';
  return DIRS[Math.round(deg / 45) % 8];
}

export function uvLevel(uv) {
  if (!isNum(uv)) return '';
  if (uv < 3) return 'Baixo';
  if (uv < 6) return 'Moderado';
  if (uv < 8) return 'Alto';
  if (uv < 11) return 'Muito alto';
  return 'Extremo';
}
