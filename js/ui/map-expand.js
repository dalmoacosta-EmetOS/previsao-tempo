// Botão "ampliar mapa" (ADR-041): o mapa (ou o cartão inteiro, no radar) ocupa a tela toda.
// Tocar no mapa continua servindo para arrastar; ampliar é pelo botão ⤢ no canto. Esc ou ✕ fecha.
const EXPAND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

export function addExpandControl(L, map, target, position = 'bottomright') {
  let btn;
  const spot = document.createComment('mapa'); // marca o lugar original do mapa na página
  const set = (open) => {
    // Vai para o <body> enquanto ampliado: efeitos de vidro dos cartões "prendem" elementos fixos
    if (open && target.parentNode !== document.body) { target.replaceWith(spot); document.body.append(target); }
    if (!open && spot.parentNode) spot.replaceWith(target);
    target.classList.toggle('is-expanded', open);
    document.body.classList.toggle('map-open', open);
    btn.innerHTML = open ? CLOSE : EXPAND;
    btn.title = open ? 'Fechar mapa ampliado' : 'Ampliar mapa';
    btn.setAttribute('aria-label', btn.title);
    btn.setAttribute('aria-pressed', String(open));
    if (!map._loaded) return; // na montagem o mapa ainda não tem centro
    const center = map.getCenter(), zoom = map.getZoom();
    setTimeout(() => { map.invalidateSize(); map.setView(center, zoom, { animate: false }); }, 60);
  };
  const Ctl = L.Control.extend({
    options: { position },
    onAdd() {
      const box = L.DomUtil.create('div', 'leaflet-bar map-expand');
      btn = L.DomUtil.create('a', 'map-expand__btn', box);
      btn.href = '#';
      btn.setAttribute('role', 'button');
      L.DomEvent.disableClickPropagation(box);
      L.DomEvent.on(btn, 'click', (e) => { L.DomEvent.preventDefault(e); set(!target.classList.contains('is-expanded')); });
      return box;
    },
  });
  map.addControl(new Ctl());
  set(false);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && target.classList.contains('is-expanded')) set(false); });
}
