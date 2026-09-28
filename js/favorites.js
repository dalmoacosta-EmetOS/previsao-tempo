// Cidades favoritas (ADR-030): guardadas só neste aparelho, no máximo 8.
import { load, save } from './storage.js?v=2.9';
import { placeKey } from './domain/place-url.js?v=2.9';

const MAX = 8;
const clean = ({ name, region, country, lat, lon }) => ({ name, region: region || '', country: country || '', lat, lon });

export function getFavorites() {
  const list = load('favorites');
  return Array.isArray(list) ? list.filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lon)) : [];
}

export const isFavorite = (place) => !!place && getFavorites().some((f) => placeKey(f) === placeKey(place));

/** Liga/desliga a cidade nos favoritos. Devolve a lista nova. */
export function toggleFavorite(place) {
  const list = getFavorites();
  const key = placeKey(place);
  const next = list.some((f) => placeKey(f) === key)
    ? list.filter((f) => placeKey(f) !== key)
    : [...list, clean(place)].slice(-MAX);
  save('favorites', next);
  return next;
}
