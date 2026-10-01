// Estado único da aplicação. A interface sempre se redesenha a partir dele.
import { load } from './storage.js?v=6.2.2';
import { getUnits } from './units-settings.js?v=6.2.2';

const state = {
  place: null,        // { name, region, country, lat, lon, isGeo }
  data: null,         // previsão normalizada
  unit: getUnits().temp, // 'C' | 'F' — as demais medidas vêm de getUnits() (ADR-045)
  days: 7,            // 7 ou 15
  tempMode: load('tempMode') || 'real', // 'real' (temperatura) | 'feels' (sensação térmica)
  hourSel: null,      // hora aberta no detalhe (índice nas 24 h) — ADR-019
  daySel: null,       // dia aberto (índice)
  dayPart: 'day',     // 'day' | 'night'
  official: [],
  air: null,          // qualidade do ar { aqi, pm25 } — ADR-031
  tileSel: null,      // quadro de atenção aberto no "Hoje em detalhe" — ADR-022       // alertas oficiais (NWS) — ADR-020
  status: 'idle',     // 'idle' | 'loading' | 'ok' | 'error'
  error: null,        // { kind, retry }
  demo: null,         // cenário forçado via ?demo=
};

const listeners = new Set();

export const getState = () => state;

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
}
