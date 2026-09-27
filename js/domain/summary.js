// Resumo escrito do período (Dia 06–18 h / Noite 18–06 h), no estilo dos apps de clima (ADR-019).
// Gerado AUTOMATICAMENTE a partir dos números da previsão — não é texto de meteorologista.
import { describe, STORM_CODES } from './weather-codes.js?v=2.0';
import { temp, windDirection } from './units.js?v=2.0';

// Do mais severo para o mais brando: o período é descrito pelo fenômeno mais importante.
const RANK = ['storm', 'snow', 'sleet', 'heavy-rain', 'rain', 'showers', 'drizzle', 'fog', 'cloudy', 'partly', 'mostly-clear', 'clear'];
const WET = ['storm', 'snow', 'sleet', 'heavy-rain', 'rain', 'showers', 'drizzle'];

const PHRASE = {
  storm: 'Tempestades', snow: 'Neve', sleet: 'Chuva congelante', 'heavy-rain': 'Chuva forte',
  rain: 'Chuva', showers: 'Pancadas de chuva', drizzle: 'Garoa', fog: 'Neblina',
  cloudy: 'Nublado', partly: 'Parcialmente nublado',
  'mostly-clear': { day: 'Predomínio de sol', night: 'Poucas nuvens' },
  clear: { day: 'Ensolarado', night: 'Céu limpo' },
};

const phrase = (icon, part) => {
  const p = PHRASE[icon] || 'Nublado';
  return typeof p === 'string' ? p : p[part];
};

function dominant(hours) {
  let best = 'clear';
  for (const h of hours) {
    const icon = STORM_CODES.includes(h.code) ? 'storm' : describe(h.code).icon;
    // chuva só conta se o modelo realmente a leva a sério
    if (WET.includes(icon) && (h.pop ?? 100) < 35 && (h.precip ?? 0) < 0.2) continue;
    if (RANK.indexOf(icon) < RANK.indexOf(best)) best = icon;
  }
  // "Nublado" só se a maior parte do período for nublada
  if (best === 'cloudy' || best === 'partly') {
    const avg = hours.reduce((a, h) => a + (h.cloud ?? 50), 0) / hours.length;
    best = avg >= 75 ? 'cloudy' : avg >= 35 ? 'partly' : 'mostly-clear';
  }
  return best;
}

/** Direção média do vento (média de vetores, não de ângulos). */
function meanDirection(hours) {
  let x = 0, y = 0;
  for (const h of hours) {
    if (h.windDir == null) continue;
    const r = (h.windDir * Math.PI) / 180;
    const w = h.wind ?? 1;
    x += Math.sin(r) * w; y += Math.cos(r) * w;
  }
  return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
}

const round5 = (v) => Math.max(5, Math.round(v / 5) * 5);

function windText(hours, unit) {
  const speeds = hours.map((h) => h.wind).filter((v) => v != null);
  if (!speeds.length) return '';
  const k = unit === 'F' ? 0.621371 : 1;
  const u = unit === 'F' ? 'mph' : 'km/h';
  const lo = round5(Math.min(...speeds) * k), hi = round5(Math.max(...speeds) * k);
  if (hi <= 10) return 'Ventos fracos.';
  const dir = windDirection(meanDirection(hours));
  const gust = Math.max(...hours.map((h) => h.gust ?? 0));
  const gustTxt = gust >= 60 ? ` Rajadas de até ${Math.round(gust * k)} ${u}.` : '';
  return `Ventos ${dir} de ${lo === hi ? hi : `${lo} a ${hi}`} ${u}.${gustTxt}`;
}

function amountText(mm, cm, unit) {
  const out = [];
  if (mm >= 1) {
    out.push(unit === 'F'
      ? `Acumulado de chuva perto de ${(mm / 25.4).toFixed(1).replace('.', ',')} pol.`
      : `Acumulado de chuva perto de ${Math.round(mm)} mm.`);
  }
  if (cm >= 0.5) {
    out.push(unit === 'F' ? `Neve: cerca de ${(cm / 2.54).toFixed(1).replace('.', ',')} pol.` : `Neve: cerca de ${Math.round(cm)} cm.`);
  }
  return out.join(' ');
}

/**
 * @param hours  horas do período (já filtradas)
 * @param part   'day' | 'night'
 */
export function periodSummary(hours, part, unit) {
  if (!hours.length) return null;
  const half = Math.ceil(hours.length / 2);
  const first = dominant(hours.slice(0, half));
  const second = dominant(hours.slice(half));
  const all = dominant(hours);

  // Mudança ao longo do período: "Chuva no início, depois nublado" / "… chuva mais tarde"
  let sky;
  if (WET.includes(first) && !WET.includes(second)) {
    sky = `${phrase(first, part)} no início, depois ${phrase(second, part).toLowerCase()}.`;
  } else if (!WET.includes(first) && WET.includes(second)) {
    sky = `${phrase(first, part)}, com ${phrase(second, part).toLowerCase()} mais tarde.`;
  } else {
    sky = `${phrase(all, part)}.`;
  }

  const temps = hours.map((h) => h.temp);
  const tempTxt = part === 'day'
    ? `Máxima de ${temp(Math.max(...temps), unit)}.`
    : `Mínima de ${temp(Math.min(...temps), unit)}.`;

  const pop = Math.max(...hours.map((h) => h.pop ?? 0));
  const popTxt = pop >= 20 ? `Chance de chuva de ${Math.round(pop / 10) * 10}%.` : '';

  const mm = hours.reduce((a, h) => a + (h.precip ?? 0), 0);
  const cm = hours.reduce((a, h) => a + (h.snow ?? 0), 0);

  return {
    icon: all,
    text: [sky, tempTxt, windText(hours, unit), popTxt, amountText(mm, cm, unit)].filter(Boolean).join(' '),
  };
}

/** Horas do Dia (06:00–17:59 da data) e da Noite (18:00 da data – 05:59 do dia seguinte). */
export function splitDayNight(allHours, date) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextDate = next.toISOString().slice(0, 10);
  const hh = (t) => Number(t.slice(11, 13));
  return {
    day: allHours.filter((h) => h.time.startsWith(date) && hh(h.time) >= 6 && hh(h.time) < 18),
    night: allHours.filter((h) => (h.time.startsWith(date) && hh(h.time) >= 18) || (h.time.startsWith(nextDate) && hh(h.time) < 6)),
  };
}
