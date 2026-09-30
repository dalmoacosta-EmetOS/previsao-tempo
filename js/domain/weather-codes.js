// Códigos WMO (Open-Meteo) → descrição (traduzida — ADR-045), ícone e cenário de fundo.
import { t } from '../i18n/index.js?v=5.5';

const TABLE = {
  0: 'clear',
  1: 'mostly-clear',
  2: 'partly',
  3: 'cloudy',
  45: 'fog',
  48: 'fog',
  51: 'drizzle',
  53: 'drizzle',
  55: 'drizzle',
  56: 'sleet',
  57: 'sleet',
  61: 'rain',
  63: 'rain',
  65: 'heavy-rain',
  66: 'sleet',
  67: 'sleet',
  71: 'snow',
  73: 'snow',
  75: 'snow',
  77: 'snow',
  80: 'showers',
  81: 'showers',
  82: 'heavy-rain',
  85: 'snow',
  86: 'snow',
  95: 'storm',
  96: 'storm',
  97: 'storm',
  99: 'storm',
};

export const STORM_CODES = [95, 96, 97, 99];

export function describe(code) {
  const icon = TABLE[code];
  return { label: icon ? t(`wmo.${code}`) : t('wmo.unknown'), icon: icon || 'cloudy' };
}
