// Decide o que o céu mostra AGORA (ADR-011).
// O código de tempo sozinho às vezes diz "nublado" enquanto já chove.
// Por isso o cenário também olha a chuva medida pelo modelo nos últimos 15 min
// e a prevista para os próximos 30 min.
import { describe, STORM_CODES } from './weather-codes.js?v=4.1';

const RAIN_ICONS = ['drizzle', 'rain', 'heavy-rain', 'showers', 'sleet'];
const WET_MM = 0.1; // a partir de 0,1 mm em 15 min consideramos chuva

export function resolveWeatherNow(data) {
  const c = data.current;
  const icon = describe(c.code).icon;
  const next30 = data.nowcast.slice(0, 2);
  const precipNow = Math.max(c.precip, next30[0]?.precip ?? 0);
  const snowNow = c.snowfall > 0 || next30.some((n) => n.snow > 0);
  const rainSoon = next30.some((n) => n.precip >= WET_MM);
  // 4º sinal: a previsão da HORA atual diz chuva com alta chance (caso real de 27/09 em Malden:
  // código atual "nublado", hora atual "garoa" com 95%).
  const hourNow = data.hourly[0] || {};
  const hourIcon = describe(hourNow.code).icon;
  const hourSnow = hourIcon === 'snow' && (hourNow.pop ?? 0) >= 50;
  const hourRain = RAIN_ICONS.includes(hourIcon) && (hourNow.pop ?? 0) >= 50;
  const mmPerHour = Math.max(precipNow * 4, hourNow.precip ?? 0);
  const time = c.isDay ? 'day' : 'night';

  if (STORM_CODES.includes(c.code)) return { scene: 'storm', time, intensity: 'heavy', wet: true };
  if (icon === 'snow' || snowNow || hourSnow) return { scene: 'snow', time, intensity: mmPerHour > 4 ? 'heavy' : 'normal', wet: true, byMeasure: icon !== 'snow', label: icon !== 'snow' ? 'Neve' : null };
  if (RAIN_ICONS.includes(icon) || precipNow >= WET_MM || rainSoon || hourRain) {
    // mm/h aproximado → intensidade
    const heavy = mmPerHour >= 6 || icon === 'heavy-rain' || hourIcon === 'heavy-rain';
    const normal = mmPerHour >= 1.5 || ['rain', 'showers'].includes(icon) || ['rain', 'showers'].includes(hourIcon);
    const intensity = heavy ? 'heavy' : normal ? 'normal' : 'light';
    const byMeasure = !RAIN_ICONS.includes(icon);
    const label = !byMeasure ? null
      : intensity === 'heavy' ? 'Chuva forte' : intensity === 'normal' ? 'Chuva'
      : hourIcon === 'drizzle' ? 'Garoa' : 'Chuva fraca';
    return { scene: 'rain', time, intensity, wet: true, byMeasure, label };
  }
  const scene = { clear: 'clear', 'mostly-clear': 'clear', partly: 'partly', cloudy: 'cloudy', fog: 'fog' }[icon] || 'cloudy';
  return { scene, time, intensity: 'normal', wet: false };
}

/** Frase curta estilo "chuva para em ~45 min" / "chuva começa em ~30 min". */
// A frase obedece à MESMA decisão do céu (resolveWeatherNow). Se o céu diz que está
// chovendo, a frase nunca diz "começa". Se os sinais divergem (céu molhado pela previsão
// da hora, mas a série de 15 em 15 min seca agora), a frase fica em silêncio — melhor
// não dizer nada do que contradizer a tela (caso real de 28/09 em Malden, v2.3.1).
export function nowcastText(data) {
  const n = data.nowcast;
  if (!n.length) return '';
  const wet = (x) => x.precip >= WET_MM || x.snow > 0;
  const kind = n.some((x) => x.snow > 0) ? 'Neve' : 'Chuva';
  const sceneWet = resolveWeatherNow(data).wet;

  if (sceneWet) {
    const nowWet = wet(n[0]) || data.current.precip >= WET_MM;
    if (!nowWet) return ''; // sinais divergem → silêncio
    const stop = n.findIndex((x, i) => i > 0 && !wet(x));
    return stop < 0 ? `${kind} deve continuar pelas próximas 2 horas` : `${kind} deve parar em ~${stop * 15} min`;
  }
  const start = n.findIndex((x, i) => i > 0 && wet(x));
  return start < 0 ? '' : `${kind} deve começar em ~${start * 15} min`;
}
