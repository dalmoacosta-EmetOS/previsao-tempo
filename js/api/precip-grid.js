import { getJSON } from './http.js?v=1.9';

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
    + `&hourly=precipitation,snowfall&forecast_hours=${HOURS + 1}&timeformat=unixtime&timezone=GMT`;
  const raw = await getJSON(url, { timeout: 15000 });
  const list = Array.isArray(raw) ? raw : [raw];
  if (list.length !== rows * cols) throw new Error('grade incompleta');

  const times = list[0].hourly.time.map((t) => t * 1000);
  // values[t][r][c] em mm/h; snow[t][r][c] em cm/h
  const values = times.map((_, t) => Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => list[r * cols + c].hourly.precipitation[t] ?? 0)));
  const snow = times.map((_, t) => Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => list[r * cols + c].hourly.snowfall?.[t] ?? 0)));

  return { bounds: [[south, west], [north, east]], rows, cols, times, values, snow };
}
