import { getJSON } from './http.js?v=6.1.1';
import { getLang } from '../i18n/index.js?v=6.1.1';

const SEARCH_URL = 'https://geocoding-api.open-meteo.com/v1/search';
// O BigDataCloud passou a redirecionar api.bigdatacloud.net → api-bdc.io (ADR-040, 3.5.2): chamamos o endereço novo direto
const REVERSE_URL = 'https://api-bdc.io/data/reverse-geocode-client';

/** Busca cidades pelo nome. Retorna até 5 resultados normalizados. */
export async function searchCities(query) {
  const url = `${SEARCH_URL}?name=${encodeURIComponent(query)}&count=5&language=${getLang()}&format=json`;
  const data = await getJSON(url, { timeout: 8000 });
  return (data.results || []).map((r) => ({
    name: r.name,
    region: r.admin1 || '',
    country: r.country || '',
    lat: r.latitude,
    lon: r.longitude,
  }));
}

/**
 * Descobre o nome da cidade a partir das coordenadas (para "Sua localização").
 * Opcional: se falhar, devolve null e o site segue com "Sua localização".
 */
export async function reverseGeocode(lat, lon, { timeout = 5000 } = {}) {
  try {
    const url = `${REVERSE_URL}?latitude=${lat}&longitude=${lon}&localityLanguage=${getLang()}`;
    const d = await getJSON(url, { timeout });
    const name = d.city || d.locality;
    if (!name) return null;
    return { name, region: d.principalSubdivision || '', country: d.countryName || '' };
  } catch {
    return null;
  }
}
