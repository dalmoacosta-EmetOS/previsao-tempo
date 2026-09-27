import { getJSON } from './http.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const CURRENT = 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day';
const HOURLY = 'temperature_2m,precipitation_probability,weather_code,is_day,cape';
const DAILY = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum,uv_index_max,sunrise,sunset,wind_speed_10m_max,wind_gusts_10m_max';

/**
 * Uma única chamada: 16 dias, unidades métricas, horário local da cidade (ADR-004).
 * Devolve os dados já normalizados para a interface.
 */
export async function getForecast(lat, lon) {
  const url = `${FORECAST_URL}?latitude=${lat}&longitude=${lon}&timezone=auto&forecast_days=16`
    + `&current=${CURRENT}&hourly=${HOURLY}&daily=${DAILY}`;
  const raw = await getJSON(url);
  return normalize(raw);
}

export function normalize(raw) {
  const c = raw.current;
  const h = raw.hourly;
  const d = raw.daily;

  const current = {
    time: c.time,
    temp: c.temperature_2m,
    feels: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    code: c.weather_code,
    wind: c.wind_speed_10m,
    windDir: c.wind_direction_10m,
    isDay: c.is_day === 1,
  };

  // Próximas 24h a partir da hora atual (horários já no fuso da cidade).
  const nowHour = c.time.slice(0, 13) + ':00';
  let start = h.time.findIndex((t) => t >= nowHour);
  if (start < 0) start = 0;
  const hourly = [];
  for (let i = start; i < Math.min(start + 24, h.time.length); i++) {
    hourly.push({
      time: h.time[i],
      temp: h.temperature_2m[i],
      pop: h.precipitation_probability?.[i] ?? null,
      code: h.weather_code[i],
      isDay: h.is_day[i] === 1,
      cape: h.cape?.[i] ?? null,
    });
  }

  const daily = d.time.map((date, i) => ({
    date,
    code: d.weather_code[i],
    max: d.temperature_2m_max[i],
    min: d.temperature_2m_min[i],
    pop: d.precipitation_probability_max?.[i] ?? null,
    snow: d.snowfall_sum?.[i] ?? 0,
    uv: d.uv_index_max?.[i] ?? null,
    sunrise: d.sunrise?.[i] ?? null,
    sunset: d.sunset?.[i] ?? null,
    windMax: d.wind_speed_10m_max?.[i] ?? null,
    gustMax: d.wind_gusts_10m_max?.[i] ?? null,
  }));

  return {
    timezone: raw.timezone,
    timezoneAbbr: raw.timezone_abbreviation,
    current,
    hourly,
    daily,
  };
}
