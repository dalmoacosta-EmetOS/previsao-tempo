import { getJSON } from './http.js?v=2.3';

// Alertas OFICIAIS do Serviço Nacional de Meteorologia dos EUA (NWS) — ADR-020.
// Grátis, sem chave. Só cobre os EUA; fora deles, nem chamamos.
const URL = 'https://api.weather.gov/alerts/active';

// Título em português para os alertas mais comuns (o texto completo fica no original, em inglês).
const PT = {
  'Flood Warning': 'Alerta de enchente',
  'Flood Watch': 'Vigilância de enchente',
  'Flood Advisory': 'Aviso de alagamento',
  'Flash Flood Warning': 'Alerta de enchente repentina',
  'Flash Flood Watch': 'Vigilância de enchente repentina',
  'Coastal Flood Warning': 'Alerta de inundação costeira',
  'Coastal Flood Watch': 'Vigilância de inundação costeira',
  'Coastal Flood Advisory': 'Aviso de inundação costeira',
  'Coastal Flood Statement': 'Comunicado de inundação costeira',
  'Gale Warning': 'Alerta de ventania no mar',
  'Storm Warning': 'Alerta de tempestade no mar',
  'Wind Advisory': 'Aviso de vento',
  'High Wind Warning': 'Alerta de vento forte',
  'High Wind Watch': 'Vigilância de vento forte',
  'Severe Thunderstorm Warning': 'Alerta de tempestade severa',
  'Severe Thunderstorm Watch': 'Vigilância de tempestade severa',
  'Tornado Warning': 'Alerta de tornado',
  'Tornado Watch': 'Vigilância de tornado',
  'Winter Storm Warning': 'Alerta de tempestade de inverno',
  'Winter Storm Watch': 'Vigilância de tempestade de inverno',
  'Winter Weather Advisory': 'Aviso de tempo invernal',
  'Blizzard Warning': 'Alerta de nevasca',
  'Ice Storm Warning': 'Alerta de chuva congelante',
  'Heat Advisory': 'Aviso de calor',
  'Excessive Heat Warning': 'Alerta de calor extremo',
  'Extreme Heat Warning': 'Alerta de calor extremo',
  'Freeze Warning': 'Alerta de congelamento',
  'Frost Advisory': 'Aviso de geada',
  'Dense Fog Advisory': 'Aviso de neblina densa',
  'Small Craft Advisory': 'Aviso para pequenas embarcações',
  'High Surf Advisory': 'Aviso de ressaca',
  'High Surf Warning': 'Alerta de ressaca',
  'Rip Current Statement': 'Comunicado de correntes de retorno',
  'Special Weather Statement': 'Comunicado especial do tempo',
  'Hurricane Warning': 'Alerta de furacão',
  'Hurricane Watch': 'Vigilância de furacão',
  'Tropical Storm Warning': 'Alerta de tempestade tropical',
  'Tropical Storm Watch': 'Vigilância de tempestade tropical',
  'Storm Surge Warning': 'Alerta de maré de tempestade',
  'Air Quality Alert': 'Alerta de qualidade do ar',
};

const SEVERITY = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 };

/** Aproximação dos EUA (continente, Alasca, Havaí, Porto Rico). */
export function inUSA(lat, lon) {
  return (lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66)
    || (lat >= 51 && lat <= 72 && lon >= -180 && lon <= -129)
    || (lat >= 18 && lat <= 23 && lon >= -161 && lon <= -154)
    || (lat >= 17.8 && lat <= 18.6 && lon >= -67.4 && lon <= -65.2);
}

export async function getOfficialAlerts(lat, lon) {
  if (!inUSA(lat, lon)) return [];
  const d = await getJSON(`${URL}?point=${lat.toFixed(4)},${lon.toFixed(4)}`, { timeout: 8000 });
  return (d.features || [])
    .map(({ properties: p }) => ({
      event: p.event,
      title: PT[p.event] || p.event,
      level: /Warning/.test(p.event) ? 'danger' : /Watch/.test(p.event) ? 'warning' : 'info',
      severity: SEVERITY[p.severity] ?? 4,
      starts: p.onset || p.effective,
      ends: p.ends || p.expires,
      headline: p.headline || '',
      description: p.description || '',
      instruction: p.instruction || '',
      area: p.areaDesc || '',
      sender: p.senderName || 'National Weather Service',
    }))
    .sort((a, b) => a.severity - b.severity || (a.level === 'danger' ? -1 : 1));
}
