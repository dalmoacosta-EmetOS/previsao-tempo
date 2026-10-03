// Link por cidade (ADR-030): ?cidade=Malden&lat=42.43&lon=-71.07&regiao=...&pais=...
// Quem abre o link vê a MESMA cidade, e não a própria localização.

import { t } from '../i18n/index.js?v=6.3.0';
import { cleanText, parseCoord } from './text.js?v=6.3.0';

const round = (v) => Number(v).toFixed(3);

export function placeFromUrl(search) {
  const q = new URLSearchParams(search);
  const lat = parseCoord(q.get('lat'), 90), lon = parseCoord(q.get('lon'), 180);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    name: cleanText(q.get('cidade')) || t('place.shared'),
    region: cleanText(q.get('regiao')),
    country: cleanText(q.get('pais')),
    lat, lon,
  };
}

/** Endereço da página para a cidade, mantendo outros parâmetros (ex.: ?debug). */
export function urlForPlace(place, currentHref) {
  const u = new URL(currentHref);
  const q = u.searchParams;
  ['cidade', 'regiao', 'pais', 'lat', 'lon'].forEach((k) => q.delete(k));
  q.set('cidade', place.name);
  if (place.region) q.set('regiao', place.region);
  if (place.country) q.set('pais', place.country);
  q.set('lat', round(place.lat));
  q.set('lon', round(place.lon));
  return u.toString();
}

export const placeKey = (p) => `${round(p.lat)},${round(p.lon)}`;
