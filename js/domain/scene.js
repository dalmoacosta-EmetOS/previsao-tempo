// Decide o que o céu mostra AGORA (ADR-011).
// O código de tempo sozinho às vezes diz "nublado" enquanto já chove.
// Por isso o cenário também olha a chuva medida pelo modelo nos últimos 15 min
// e a prevista para os próximos 30 min.
import { describe, STORM_CODES } from './weather-codes.js';

const RAIN_ICONS = ['drizzle', 'rain', 'heavy-rain', 'showers', 'sleet'];
const WET_MM = 0.1; // a partir de 0,1 mm em 15 min consideramos chuva

export function resolveWeatherNow(data) {
  const c = data.current;
  const icon = describe(c.code).icon;
  const next30 = data.nowcast.slice(0, 2);
  const precipNow = Math.max(c.precip, next30[0]?.precip ?? 0);
  const snowNow = c.snowfall > 0 || next30.some((n) => n.snow > 0);
  const rainSoon = next30.some((n) => n.precip >= WET_MM);
  const time = c.isDay ? 'day' : 'night';

  if (STORM_CODES.includes(c.code)) return { scene: 'storm', time, intensity: 'heavy', wet: true };
  if (icon === 'snow' || snowNow) return { scene: 'snow', time, intensity: precipNow > 1 ? 'heavy' : 'normal', wet: true };
  if (RAIN_ICONS.includes(icon) || precipNow >= WET_MM || rainSoon) {
    // mm em 15 min → intensidade aproximada
    const intensity = precipNow >= 1.5 || icon === 'heavy-rain' ? 'heavy'
      : precipNow >= 0.4 || icon === 'rain' || icon === 'showers' ? 'normal' : 'light';
    return { scene: 'rain', time, intensity, wet: true, byMeasure: !RAIN_ICONS.includes(icon) };
  }
  const scene = { clear: 'clear', 'mostly-clear': 'clear', partly: 'partly', cloudy: 'cloudy', fog: 'fog' }[icon] || 'cloudy';
  return { scene, time, intensity: 'normal', wet: false };
}

/** Frase curta estilo "chuva para em ~45 min" / "chuva começa em ~30 min". */
export function nowcastText(data) {
  const n = data.nowcast;
  if (!n.length) return '';
  const wet = (x) => x.precip >= WET_MM || x.snow > 0;
  const nowWet = wet(n[0]) || data.current.precip >= WET_MM;
  const idx = n.findIndex((x, i) => i > 0 && wet(x) !== nowWet);
  const kind = n.some((x) => x.snow > 0) ? 'Neve' : 'Chuva';
  if (nowWet) {
    return idx < 0 ? `${kind} deve continuar pelas próximas 2 horas` : `${kind} deve parar em ~${idx * 15} min`;
  }
  return idx < 0 ? '' : `${kind} deve começar em ~${idx * 15} min`;
}
