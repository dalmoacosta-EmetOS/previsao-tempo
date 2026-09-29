import { getJSON } from './http.js?v=5.3';
import { tMaybe } from '../i18n/index.js?v=5.3';

// Alertas OFICIAIS do Serviço Nacional de Meteorologia dos EUA (NWS) — ADR-020.
// Grátis, sem chave. Só cobre os EUA; fora deles, nem chamamos.
const URL = 'https://api.weather.gov/alerts/active';

// Título traduzido para os alertas mais comuns (chaves nws.<evento> nos dicionários; o texto completo
// fica no original, em inglês). Em inglês, o próprio nome do evento.
const SEVERITY = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 };

/** Aproximação dos EUA (continente, Alasca, Havaí, Porto Rico). */
export function inUSA(lat, lon) {
  return (lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66)
    || (lat >= 51 && lat <= 72 && lon >= -180 && lon <= -129)
    || (lat >= 18 && lat <= 23 && lon >= -161 && lon <= -154)
    || (lat >= 17.8 && lat <= 18.6 && lon >= -67.4 && lon <= -65.2);
}

export async function getOfficialAlerts(lat, lon) {
  if (!inUSA(lat, lon)) return [];
  const d = await getJSON(`${URL}?point=${lat.toFixed(4)},${lon.toFixed(4)}`, { timeout: 8000 });
  return (d.features || [])
    .map(({ properties: p }) => ({
      event: p.event,
      title: tMaybe(`nws.${p.event}`) || p.event,
      level: /Warning/.test(p.event) ? 'danger' : /Watch/.test(p.event) ? 'warning' : 'info',
      severity: SEVERITY[p.severity] ?? 4,
      starts: p.onset || p.effective,
      ends: p.ends || p.expires,
      headline: p.headline || '',
      description: p.description || '',
      instruction: p.instruction || '',
      area: p.areaDesc || '',
      sender: p.senderName || 'National Weather Service',
    }))
    .sort((a, b) => a.severity - b.severity || (a.level === 'danger' ? -1 : 1));
}
