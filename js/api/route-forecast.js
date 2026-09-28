import { getJSON } from './http.js?v=3.5.1';

// Previsão hora a hora para vários pontos numa única chamada (Open-Meteo, grátis).
const URL = 'https://api.open-meteo.com/v1/forecast';

export async function getPointsForecast(points) {
  const lat = points.map((p) => p.lat.toFixed(3)).join(',');
  const lon = points.map((p) => p.lon.toFixed(3)).join(',');
  const raw = await getJSON(`${URL}?latitude=${lat}&longitude=${lon}`
    + '&hourly=temperature_2m,precipitation,precipitation_probability,weather_code,visibility,wind_gusts_10m,snowfall,is_day'
    + '&forecast_days=3&timeformat=unixtime&timezone=GMT', { timeout: 15000 });
  const list = Array.isArray(raw) ? raw : [raw];
  return points.map((p, i) => {
    const h = list[i].hourly;
    const target = p.etaMs / 1000;
    let k = 0;
    h.time.forEach((t, j) => { if (Math.abs(t - target) < Math.abs(h.time[k] - target)) k = j; });
    return {
      temp: h.temperature_2m[k], precip: h.precipitation?.[k] ?? 0, pop: h.precipitation_probability?.[k] ?? null,
      code: h.weather_code[k], visibility: h.visibility?.[k] ?? null, gust: h.wind_gusts_10m?.[k] ?? null,
      snow: h.snowfall?.[k] ?? 0, isDay: h.is_day?.[k] === 1,
    };
  });
}
