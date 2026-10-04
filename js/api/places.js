// Busca de ENDEREÇOS e lugares para a viagem (6.1). Pedido do Dalmo: de cidade a cidade o tempo
// de viagem errava muito (Malden → Worcester: 46 mi de centro a centro; de casa até o destino real
// o Waze deu 55–69 mi). Agora a viagem aceita rua e número, lugar (aeroporto, hotel) ou cidade.
// Fonte: Photon (komoot, dados do OpenStreetMap) — grátis, sem chave, feito para "busca enquanto digita".
// Se falhar, cai para a busca de cidades de sempre.
import { getJSON } from './http.js?v=6.4.2';
import { searchCities } from './geocoding.js?v=6.4.2';
import { getLang } from '../i18n/index.js?v=6.4.2';
import { cleanText as clean } from '../domain/text.js?v=6.4.2';

const URL = 'https://photon.komoot.io/api/';

export function fromPhoton(f) {
  const p = f?.properties || {};
  const [lon, lat] = f?.geometry?.coordinates || [];
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const city = p.city || p.town || p.village || p.district || p.county || '';
  const isCity = ['city', 'town', 'village'].includes(p.type) || (!street && p.name === city);
  const name = clean(isCity ? p.name : (p.name && p.name !== p.street ? p.name : street) || p.name || street);
  const region = clean(isCity ? p.state : [p.name && p.name !== p.street && street, city, p.state].filter(Boolean).join(', '));
  return name ? { name, region, country: clean(p.country), lat, lon, address: !isCity } : null;
}

export async function searchPlaces(query, near) {
  const lang = { en: 'en', de: 'de', fr: 'fr' }[getLang()] || 'default';
  const bias = near && Number.isFinite(near.lat) ? `&lat=${near.lat.toFixed(3)}&lon=${near.lon.toFixed(3)}` : '';
  try {
    const d = await getJSON(`${URL}?q=${encodeURIComponent(query)}&limit=6&lang=${lang}${bias}`, { timeout: 6000 });
    const seen = new Set();
    const list = (d.features || []).map(fromPhoton).filter((x) => {
      if (!x) return false;
      const k = `${x.name}|${x.region}`;
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
    if (list.length) return list.slice(0, 5);
  } catch { /* cai para a busca de cidades */ }
  return searchCities(query);
}
