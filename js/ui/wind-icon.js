// Ícone de vento (linhas onduladas, traço único), no lugar do emoji da "nuvenzinha" — que no Brasil virou piada de "pum" (pedido do Dalmo, 6.5.1)
import { el } from './dom.js?v=6.5.2';
export const WIND_SVG = '<svg class="wind-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h10.5a2.5 2.5 0 1 0-2.5-2.5M3 12h15a3 3 0 1 1-3 3M3 16h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
export const windIcon = () => el('span', { class: 'wind-ico-wrap', html: WIND_SVG });
