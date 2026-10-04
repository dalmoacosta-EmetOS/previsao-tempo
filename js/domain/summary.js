// Resumo escrito do período (Dia 06–18 h / Noite 18–06 h), no estilo dos apps de clima (ADR-019).
// Gerado AUTOMATICAMENTE a partir dos números da previsão — não é texto de meteorologista.
import { describe, STORM_CODES } from './weather-codes.js?v=6.4.1';
import { temp, windDirection, rain, snow, speedUnit, KM_PER_MI } from './units.js?v=6.4.1';
import { hourLabel } from './time.js?v=6.4.1';
import { t } from '../i18n/index.js?v=6.4.1';
import { getUnits } from '../units-settings.js?v=6.4.1';

// Do mais severo para o mais brando: o período é descrito pelo fenômeno mais importante.
const RANK = ['storm', 'snow', 'sleet', 'heavy-rain', 'rain', 'showers', 'drizzle', 'fog', 'cloudy', 'partly', 'mostly-clear', 'clear'];
const WET = ['storm', 'snow', 'sleet', 'heavy-rain', 'rain', 'showers', 'drizzle'];

// Frases por fenômeno (traduzidas — ADR-045); algumas mudam de dia e de noite.
const DAYNIGHT = ['mostly-clear', 'clear'];
/** Regra ÚNICA de "esta hora tem chuva de verdade" — usada em todos os resumos (evita contradição). */
export function isWetHour(h) {
  const icon = STORM_CODES.includes(h.code) ? 'storm' : describe(h.code).icon;
  if ((h.precip ?? 0) >= 0.2) return true;
  return WET.includes(icon) && (h.pop ?? 100) >= 45;
}

const phrase = (icon, part) => t(`sum.sky.${icon}${DAYNIGHT.includes(icon) ? `.${part}` : ''}`);

function dominant(hours) {
  let best = 'clear';
  for (const h of hours) {
    const icon = STORM_CODES.includes(h.code) ? 'storm' : describe(h.code).icon;
    // chuva só conta se o modelo realmente a leva a sério (mesma regra do resumo do agora)
    if (WET.includes(icon) && !isWetHour(h)) continue;
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

function windText(hours) {
  const speeds = hours.map((h) => h.wind).filter((v) => v != null);
  if (!speeds.length) return '';
  const k = getUnits().dist === 'mi' ? 1 / KM_PER_MI : 1;
  const u = speedUnit();
  const lo = round5(Math.min(...speeds) * k), hi = round5(Math.max(...speeds) * k);
  if (hi <= 10) return t('sum.windLight');
  const dir = windDirection(meanDirection(hours));
  const gust = Math.max(...hours.map((h) => h.gust ?? 0));
  const gustTxt = gust >= 60 ? ` ${t('sum.gust', { v: Math.round(gust * k), u })}` : '';
  return `${t('sum.wind', { dir, range: lo === hi ? hi : t('sum.range', { lo, hi }), u })}${gustTxt}`;
}

function amountText(mm, cm) {
  const out = [];
  if (mm >= 1) out.push(t('sum.rainTotal', { v: rain(mm, getUnits().precip === 'in' ? 1 : 0) }));
  if (cm >= 0.5) out.push(t('sum.snowTotal', { v: snow(cm) }));
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
    sky = t('sum.earlyThen', { a: phrase(first, part), b: phrase(second, part).toLowerCase() });
  } else if (!WET.includes(first) && WET.includes(second)) {
    sky = t('sum.laterWith', { a: phrase(first, part), b: phrase(second, part).toLowerCase() });
  } else {
    sky = `${phrase(all, part)}.`;
  }

  const temps = hours.map((h) => h.temp);
  const tempTxt = part === 'day'
    ? t('sum.max', { t: temp(Math.max(...temps), unit) })
    : t('sum.min', { t: temp(Math.min(...temps), unit) });

  const pop = Math.max(...hours.map((h) => h.pop ?? 0));
  const popTxt = pop >= 20 ? t('sum.pop', { p: Math.round(pop / 10) * 10 }) : '';

  const mm = hours.reduce((a, h) => a + (h.precip ?? 0), 0);
  const cm = hours.reduce((a, h) => a + (h.snow ?? 0), 0);

  return {
    icon: all,
    text: [sky, tempTxt, windText(hours), popTxt, amountText(mm, cm)].filter(Boolean).join(' '),
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

/**
 * Resumo do AGORA para o espaço ao lado da cidade (ADR-021):
 * condição atual + quando chove/para nas próximas 12 h + restante do dia.
 */
export function nowSummary(data, unit, nowLabel, wetNow = false) {
  const c = data.current;
  const next = data.hourly.slice(1, 13);
  const wet = isWetHour;
  // (antes comparava o texto 'Chuva|Garoa|Neve' — não funcionaria em outros idiomas; agora usa a decisão do céu)
  const rainingNow = WET.includes(describe(c.code).icon) || (c.precip ?? 0) >= 0.1 || wetNow;

  let outlook;
  if (rainingNow) {
    const dry = next.find((h) => !wet(h));
    outlook = dry ? t('now.rainEnds', { h: hourLabel(dry.time) }) : t('now.rainContinues');
  } else {
    const first = next.find(wet);
    outlook = first ? t('now.rainAt', { h: hourLabel(first.time) }) : t('now.dry12');
  }

  // Restante de hoje (da hora atual até 23:00)
  const today = c.time.slice(0, 10);
  const rest = data.hourly.filter((h) => h.time.startsWith(today));
  const part = c.isDay ? 'day' : 'night';
  const restSum = rest.length >= 2 ? periodSummary(rest, part, unit) : null;

  return {
    now: t('now.line', { label: nowLabel, t: temp(c.temp, unit), f: temp(c.feels, unit) }),
    outlook,
    rest: restSum ? restSum.text : '',
  };
}
