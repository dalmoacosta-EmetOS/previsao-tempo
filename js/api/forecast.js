import { getJSON } from './http.js?v=6.1.1';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const CURRENT = 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day,precipitation,rain,showers,snowfall';
const MINUTELY = 'precipitation,snowfall';
const HOURLY = 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,snowfall,weather_code,is_day,cape,'
  + 'relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,uv_index,visibility';
const DAILY = 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,snowfall_sum,uv_index_max,sunrise,sunset,wind_speed_10m_max,wind_gusts_10m_max';

/**
 * Uma única chamada: 16 dias, unidades métricas, horário local da cidade (ADR-004).
 * Devolve os dados já normalizados para a interface.
 */
export async function getForecast(lat, lon) {
  const url = `${FORECAST_URL}?latitude=${lat}&longitude=${lon}&timezone=auto&forecast_days=16`
    + `&current=${CURRENT}&hourly=${HOURLY}&daily=${DAILY}`
    + `&minutely_15=${MINUTELY}&forecast_minutely_15=8`; // próximas 2h, de 15 em 15 min (ADR-011)
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
    precip: c.precipitation ?? 0,   // mm nos últimos 15 min
    snowfall: c.snowfall ?? 0,
  };

  // Próximas 2h em blocos de 15 min (chuva agora / para em X min).
  const m = raw.minutely_15;
  const nowcast = m ? m.time.map((t, i) => ({
    time: t,
    precip: m.precipitation?.[i] ?? 0,
    snow: m.snowfall?.[i] ?? 0,
  })) : [];

  // Próximas 24h a partir da hora atual (horários já no fuso da cidade).
  const nowHour = c.time.slice(0, 13) + ':00';
  let start = h.time.findIndex((t) => t >= nowHour);
  if (start < 0) start = 0;
  // Todas as horas dos 16 dias (usadas nos resumos Dia/Noite — ADR-019)…
  const hours = h.time.map((time, i) => ({
    time,
    temp: h.temperature_2m[i],
    feels: h.apparent_temperature?.[i] ?? null,
    pop: h.precipitation_probability?.[i] ?? null,
    precip: h.precipitation?.[i] ?? 0,
    snow: h.snowfall?.[i] ?? 0,
    code: h.weather_code[i],
    isDay: h.is_day[i] === 1,
    cape: h.cape?.[i] ?? null,
    humidity: h.relative_humidity_2m?.[i] ?? null,
    wind: h.wind_speed_10m?.[i] ?? null,
    windDir: h.wind_direction_10m?.[i] ?? null,
    gust: h.wind_gusts_10m?.[i] ?? null,
    cloud: h.cloud_cover?.[i] ?? null,
    uv: h.uv_index?.[i] ?? null,
    visibility: h.visibility?.[i] ?? null,
  }));
  // …e as próximas 24 h a partir de agora.
  const hourly = hours.slice(start, start + 24);

  const daily = d.time.map((date, i) => ({
    date,
    code: d.weather_code[i],
    max: d.temperature_2m_max[i],
    min: d.temperature_2m_min[i],
    feelsMax: d.apparent_temperature_max?.[i] ?? null,
    feelsMin: d.apparent_temperature_min?.[i] ?? null,
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
    nowcast,
    hours,
    hourly,
    daily,
  };
}
