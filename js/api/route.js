import { getJSON } from './http.js?v=5.3.1';

// Rota de carro de A até B (ADR-039). OSRM público: grátis, sem chave, dados do OpenStreetMap.
// Limite honesto: é um servidor de demonstração — sem garantia de disponibilidade.
const OSRM = 'https://router.project-osrm.org/route/v1/driving';

export async function getRoute(a, b) {
  const url = `${OSRM}/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson`;
  let d;
  try {
    d = await getJSON(url, { timeout: 15000 });
  } catch (e) {
    if (e.kind === 'server') throw Object.assign(new Error('sem rota'), { kind: 'noroute' });
    throw e;
  }
  if (d.code !== 'Ok' || !d.routes?.length) throw Object.assign(new Error('sem rota'), { kind: 'noroute' });
  const r = d.routes[0];
  return { duration: r.duration, distance: r.distance, coords: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]) };
}
