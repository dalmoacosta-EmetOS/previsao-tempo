import { getJSON } from './http.js?v=6.2.2';

// Previsão hora a hora para vários pontos numa única chamada (Open-Meteo, grátis).
// Devolve a SÉRIE inteira de cada ponto: assim dá para testar outros horários de saída
// sem nova chamada (ADR-042 — "melhor horário para sair").
const URL = 'https://api.open-meteo.com/v1/forecast';

export async function getPointsSeries(points, days = 3) {
  const lat = points.map((p) => p.lat.toFixed(3)).join(',');
  const lon = points.map((p) => p.lon.toFixed(3)).join(',');
  const d = Math.max(1, Math.min(16, Math.ceil(days)));
  const raw = await getJSON(`${URL}?latitude=${lat}&longitude=${lon}`
    + '&hourly=temperature_2m,precipitation,precipitation_probability,weather_code,visibility,wind_gusts_10m,snowfall,is_day'
    + `&forecast_days=${d}&timeformat=unixtime&timezone=GMT`, { timeout: 15000 });
  const list = Array.isArray(raw) ? raw : [raw];
  if (list.length !== points.length) throw Object.assign(new Error('previsão incompleta'), { kind: 'server' });
  return list.map((x) => x.hourly);
}

/** Condição de um ponto na hora mais próxima de etaMs; null se fora da série. */
export function pickAt(h, etaMs) {
  const target = etaMs / 1000;
  if (!h?.time?.length || target < h.time[0] - 3600 || target > h.time[h.time.length - 1] + 3600) return null;
  let k = 0;
  h.time.forEach((t, j) => { if (Math.abs(t - target) < Math.abs(h.time[k] - target)) k = j; });
  return {
    temp: h.temperature_2m[k], precip: h.precipitation?.[k] ?? 0, pop: h.precipitation_probability?.[k] ?? null,
    code: h.weather_code[k], visibility: h.visibility?.[k] ?? null, gust: h.wind_gusts_10m?.[k] ?? null,
    snow: h.snowfall?.[k] ?? 0, isDay: h.is_day?.[k] === 1,
  };
}

/** Compatibilidade: condição de cada ponto na hora em que o carro passa. */
export async function getPointsForecast(points) {
  const series = await getPointsSeries(points, 3);
  return points.map((p, i) => pickAt(series[i], p.etaMs));
}
