// Botão "ampliar mapa" (ADR-041, rev. 3.6.1): o mapa CRESCE NO PRÓPRIO LUGAR até quase a altura
// da tela e a página rola até ele. Sem tirar o mapa do lugar nem "flutuar" por cima da página —
// a 1ª versão (flutuante) falhou no Safari do iPhone. Tocar no mapa continua servindo para arrastar.
import { t } from '../i18n/index.js?v=6.3.0';

const EXPAND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SHRINK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function addExpandControl(L, map, mapBox, position = 'bottomright') {
  let btn;
  const set = (open) => {
    mapBox.classList.toggle('is-tall', open);
    btn.innerHTML = open ? SHRINK : EXPAND;
    btn.title = t(open ? 'map.shrink' : 'map.expand');
    btn.setAttribute('aria-label', btn.title);
    btn.setAttribute('aria-pressed', String(open));
    if (!map._loaded) return; // na montagem o mapa ainda não tem centro
    const center = map.getCenter();
    setTimeout(() => {
      map.invalidateSize();
      map.setView(center, map.getZoom(), { animate: false });
      if (open) mapBox.scrollIntoView({ behavior: 'smooth', block: 'center' }); // centralizado: sobra página visível acima e abaixo
    }, 80);
  };
  const Ctl = L.Control.extend({
    options: { position },
    onAdd() {
      const box = L.DomUtil.create('div', 'leaflet-bar map-expand');
      btn = L.DomUtil.create('a', 'map-expand__btn', box);
      btn.href = '#';
      btn.setAttribute('role', 'button');
      L.DomEvent.disableClickPropagation(box);
      L.DomEvent.on(btn, 'click', (e) => { L.DomEvent.preventDefault(e); set(!mapBox.classList.contains('is-tall')); });
      return box;
    },
  });
  map.addControl(new Ctl());
  set(false);
}
