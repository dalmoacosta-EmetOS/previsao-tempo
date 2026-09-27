// Códigos WMO (Open-Meteo) → descrição em português, ícone e cenário de fundo.

const TABLE = {
  0: ['Céu limpo', 'clear'],
  1: ['Predomínio de sol', 'mostly-clear'],
  2: ['Parcialmente nublado', 'partly'],
  3: ['Nublado', 'cloudy'],
  45: ['Neblina', 'fog'],
  48: ['Neblina com geada', 'fog'],
  51: ['Garoa fraca', 'drizzle'],
  53: ['Garoa', 'drizzle'],
  55: ['Garoa forte', 'drizzle'],
  56: ['Garoa congelante', 'sleet'],
  57: ['Garoa congelante forte', 'sleet'],
  61: ['Chuva fraca', 'rain'],
  63: ['Chuva', 'rain'],
  65: ['Chuva forte', 'heavy-rain'],
  66: ['Chuva congelante', 'sleet'],
  67: ['Chuva congelante forte', 'sleet'],
  71: ['Neve fraca', 'snow'],
  73: ['Neve', 'snow'],
  75: ['Neve forte', 'snow'],
  77: ['Grãos de neve', 'snow'],
  80: ['Pancadas de chuva', 'showers'],
  81: ['Pancadas de chuva', 'showers'],
  82: ['Pancadas fortes de chuva', 'heavy-rain'],
  85: ['Pancadas de neve', 'snow'],
  86: ['Pancadas fortes de neve', 'snow'],
  95: ['Tempestade', 'storm'],
  96: ['Tempestade com granizo', 'storm'],
  97: ['Tempestade forte', 'storm'],
  99: ['Tempestade com granizo', 'storm'],
};

const ICON_TO_SCENE = {
  clear: 'clear',
  'mostly-clear': 'clear',
  partly: 'partly',
  cloudy: 'cloudy',
  fog: 'fog',
  drizzle: 'rain',
  rain: 'rain',
  'heavy-rain': 'rain',
  showers: 'rain',
  sleet: 'snow',
  snow: 'snow',
  storm: 'storm',
};

export const STORM_CODES = [95, 96, 97, 99];

export function describe(code) {
  const entry = TABLE[code] || ['Condição indisponível', 'cloudy'];
  return { label: entry[0], icon: entry[1] };
}

export function sceneFor(code, isDay) {
  return { scene: ICON_TO_SCENE[describe(code).icon] || 'cloudy', time: isDay ? 'day' : 'night' };
}
