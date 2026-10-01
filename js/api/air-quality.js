import { getJSON } from './http.js?v=6.2.2';
import { t } from '../i18n/index.js?v=6.2.2';

// Qualidade do ar — índice AQI dos EUA (escala EPA 0–500), grátis e sem chave (ADR-031).
// Fonte: Open-Meteo Air Quality (modelos CAMS). Pólen fica de fora: só existe para a Europa.
const URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export async function getAirQuality(lat, lon) {
  const raw = await getJSON(`${URL}?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5&timezone=auto`, { timeout: 8000 });
  const aqi = raw?.current?.us_aqi;
  if (typeof aqi !== 'number') throw Object.assign(new Error('sem índice'), { kind: 'server' });
  return { aqi: Math.round(aqi), pm25: raw.current.pm2_5 ?? null };
}

/** Faixas oficiais da EPA. */
export function aqiLevel(aqi) {
  if (aqi <= 50) return t('aqi.good');
  if (aqi <= 100) return t('aqi.moderate');
  if (aqi <= 150) return t('aqi.sensitive');
  if (aqi <= 200) return t('aqi.unhealthy');
  if (aqi <= 300) return t('aqi.veryUnhealthy');
  return t('aqi.hazardous');
}
