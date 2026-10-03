import { getJSON } from './http.js?v=6.3.0';

// "Radar futuro" (ADR-013): chuva e neve PREVISTAS pelo modelo, hora a hora,
// numa grade de pontos ao redor da cidade. Uma única chamada multi-ponto à Open-Meteo.
// Não é radar: é o modelo desenhado no mapa — igual à ideia do "Future Radar".
const URL = 'https://api.open-meteo.com/v1/forecast';
export const GRID = { rows: 13, cols: 13, spanLat: 3.2, spanLon: 4.4 }; // ±graus a partir do centro
const HOURS = 24;

export async function getPrecipGrid(lat, lon) {
  const { rows, cols, spanLat, spanLon } = GRID;
  const north = lat + spanLat, south = lat - spanLat;
  const west = lon - spanLon, east = lon + spanLon;
  const lats = [], lons = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      lats.push((north - (r * (north - south)) / (rows - 1)).toFixed(3));
      lons.push((west + (c * (east - west)) / (cols - 1)).toFixed(3));
    }
  }
  const url = `${URL}?latitude=${lats.join(',')}&longitude=${lons.join(',')}`
    + `&hourly=precipitation,rain,snowfall,weather_code,visibility&forecast_hours=${HOURS + 1}&timeformat=unixtime&timezone=GMT`;
  const raw = await getJSON(url, { timeout: 15000 });
  const list = Array.isArray(raw) ? raw : [raw];
  if (list.length !== rows * cols) throw new Error('grade incompleta');

  const times = list[0].hourly.time.map((t) => t * 1000);
  const field = (fn) => times.map((_, t) => Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => fn(list[r * cols + c].hourly, t))));
  // values: mm/h · snow: cm/h · kind: tipo do que cai (ADR-025) · fog: 1 = névoa/neblina
  const values = field((h, t) => h.precipitation[t] ?? 0);
  const snow = field((h, t) => h.snowfall?.[t] ?? 0);
  const kind = field((h, t) => precipKind(h.weather_code?.[t], h.rain?.[t] ?? 0, h.snowfall?.[t] ?? 0));
  const fog = field((h, t) => (FOG_CODES.includes(h.weather_code?.[t]) || (h.visibility?.[t] ?? 99999) < 1000 ? 1 : 0));

  return { bounds: [[south, west], [north, east]], rows, cols, times, values, snow, kind, fog };
}

// Tipos do que cai, como na legenda do Weather Channel: chuva, neve, mistura, gelo.
export const KIND = { RAIN: 0, SNOW: 1, MIX: 2, ICE: 3 };
const ICE_CODES = [56, 57, 66, 67];   // garoa/chuva congelante → gelo na pista
const FOG_CODES = [45, 48];           // neblina / neblina com geada
function precipKind(code, rainMm, snowCm) {
  if (ICE_CODES.includes(code)) return KIND.ICE;
  if (snowCm > 0.05 && rainMm > 0.1) return KIND.MIX;
  if (snowCm > 0.05) return KIND.SNOW;
  return KIND.RAIN;
}
