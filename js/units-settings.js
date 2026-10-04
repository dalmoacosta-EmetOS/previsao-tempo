// Unidades por medida (ADR-045). Automático = costume do PAÍS configurado no aparelho
// (EUA: °F, milhas, polegadas · Reino Unido: °C, milhas, mm · resto do mundo: °C, km, mm).
// Independente do idioma: um brasileiro nos EUA pode ler em português com milhas na estrada.
import { load, save } from './storage.js?v=6.4.2';

export const SYSTEMS = {
  metric: { temp: 'C', dist: 'km', precip: 'mm' },
  us: { temp: 'F', dist: 'mi', precip: 'in' },
  uk: { temp: 'C', dist: 'mi', precip: 'mm' },
};
// Países que usam o sistema dos EUA no dia a dia (inclui Libéria, Mianmar e territórios dos EUA)
const US_LIKE = ['US', 'LR', 'MM', 'PR', 'GU', 'VI', 'AS', 'MP', 'UM'];
const UK_LIKE = ['GB', 'IM', 'JE', 'GG'];

function deviceRegion() {
  try {
    const list = navigator.languages?.length ? navigator.languages : [navigator.language || ''];
    for (const l of list) {
      const m = String(l).match(/[-_]([A-Za-z]{2})\b/);
      if (m) return m[1].toUpperCase();
    }
  } catch { /* sem acesso */ }
  return '';
}

export function autoSystem(region = deviceRegion()) {
  if (US_LIKE.includes(region)) return 'us';
  if (UK_LIKE.includes(region)) return 'uk';
  return 'metric';
}

/** Configuração salva: { mode: 'auto'|'metric'|'us'|'uk'|'custom', custom: {temp,dist,precip} } */
function stored() {
  const s = load('units');
  if (s && typeof s === 'object' && (Object.hasOwn(SYSTEMS, s.mode) || s.mode === 'auto' || s.mode === 'custom')) return s;
  // Quem já tinha escolhido °C/°F antes da 5.0 (chave antiga 'unit') mantém a escolha
  const old = load('unit');
  if (old === 'C' || old === 'F') return { mode: 'custom', custom: { ...SYSTEMS[autoSystem()], temp: old } };
  return { mode: 'auto' };
}

export function getUnits() {
  const s = stored();
  if (s.mode === 'custom' && s.custom) {
    const c = s.custom; // valida o que veio do armazenamento
    return {
      temp: c.temp === 'F' ? 'F' : 'C',
      dist: c.dist === 'mi' ? 'mi' : 'km',
      precip: c.precip === 'in' ? 'in' : 'mm',
    };
  }
  return { ...SYSTEMS[s.mode === 'auto' ? autoSystem() : s.mode] || SYSTEMS.metric };
}
export const getUnitsMode = () => stored().mode;

export function setUnitsMode(mode, custom) {
  if (mode === 'custom') save('units', { mode, custom: { ...getUnits(), ...custom } });
  else save('units', { mode });
}

/** Troca só uma medida (ex.: botão °C/°F do topo) mantendo as outras. */
export function setOneUnit(kind, value) {
  save('units', { mode: 'custom', custom: { ...getUnits(), [kind]: value } });
}
