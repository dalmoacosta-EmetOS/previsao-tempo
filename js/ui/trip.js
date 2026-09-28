// "Tempo na viagem" (ADR-039): de A até B, a previsão de cada trecho na hora em que você passa.
import { el, fill } from './dom.js?v=3.6';
import { icon } from './icons.js?v=3.6';
import { setupSearch } from './search.js?v=3.6';
import { temp, percent } from '../domain/units.js?v=3.6';
import { getRoute } from '../api/route.js?v=3.6';
import { getPointsForecast } from '../api/route-forecast.js?v=3.6';
import { reverseGeocode } from '../api/geocoding.js?v=3.6';
import { samplePoints, classify, tripSummary } from '../domain/route-weather.js?v=3.6';
import { loadLeaflet, BASE_TILES } from './radar.js?v=3.6';
import { addExpandControl } from './map-expand.js?v=3.6';
import { ADVICE, SOURCES } from '../domain/safety.js?v=3.6';

let root, from = null, to = null, fromInput, toInput, departSel, goBtn, out, getCurrent, getUnit;
let map = null, layer = null, lastResult = null;

const LEVEL_COLOR = { danger: '#e1322a', warn: '#ffb238', info: '#6ed75a', ok: '#7cc4ff' };
const fmtTime = (ms) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtDur = (s) => { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`; };

function departMs(v) {
  const now = Date.now();
  if (v.startsWith('amanha-')) {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(Number(v.split('-')[1]), 0, 0, 0);
    return d.getTime();
  }
  return now + Number(v) * 60000;
}

function searchBox(id, label, placeholder, onPick) {
  const input = el('input', { onfocus: (e) => e.target.select(), id, type: 'search', autocomplete: 'off', spellcheck: 'false', placeholder, 'aria-label': label,
    role: 'combobox', 'aria-expanded': 'false', 'aria-controls': `${id}-list`, 'aria-autocomplete': 'list' });
  const list = el('ul', { class: 'search__list', id: `${id}-list`, role: 'listbox', hidden: true });
  setupSearch({ input, list, onSelect: onPick });
  return { input, box: el('div', { class: 'search trip__search' }, [input, list]) };
}

export function mountTrip(container, { currentPlace, unit }) {
  root = container; getCurrent = currentPlace; getUnit = unit;
  const f = searchBox('trip-from', 'Saída', 'De onde você sai?', (p) => { from = p; syncLabels(); });
  const t = searchBox('trip-to', 'Destino', 'Para onde você vai?', (p) => { to = p; syncLabels(); });
  fromInput = f.input; toInput = t.input;
  // "Minha localização" dentro do campo de saída (3.5)
  const locBtn = el('button', {
    type: 'button', class: 'trip__locate', 'aria-label': 'Usar minha localização como saída', title: 'Usar minha localização',
    html: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    onclick: () => useMyLocation(locBtn),
  });
  f.box.classList.add('trip__search--loc');
  f.box.append(locBtn);
  departSel = el('select', { id: 'trip-when', 'aria-label': 'Horário de saída', class: 'trip__select' },
    [['0', 'Saindo agora'], ['60', 'Em 1 hora'], ['120', 'Em 2 horas'], ['180', 'Em 3 horas'], ['360', 'Em 6 horas'],
      ['amanha-6', 'Amanhã às 6h'], ['amanha-8', 'Amanhã às 8h'], ['amanha-14', 'Amanhã às 14h']]
      .map(([v, l]) => el('option', { value: v, text: l })));
  goBtn = el('button', { type: 'button', class: 'btn trip__go', text: 'Ver o tempo no caminho', onclick: run });
  out = el('div', { class: 'trip__out', 'aria-live': 'polite' });
  // Fechado por padrão (pedido do Dalmo): um botão convida; o formulário só aparece ao tocar.
  const body = el('div', { class: 'trip__body', id: 'trip-body', hidden: true }, [
    el('p', { class: 'card__hint card__hint--line', text: 'Viagem por estrada (carro ou ônibus): a previsão de cada trecho na hora em que você vai passar por lá.' }),
    el('div', { class: 'trip__form' }, [
      el('label', { class: 'trip__label', for: 'trip-from' }, [el('span', { text: 'De' })]), f.box,
      el('label', { class: 'trip__label', for: 'trip-to' }, [el('span', { text: 'Para' })]), t.box,
      el('label', { class: 'trip__label', for: 'trip-when' }, [el('span', { text: 'Horário de saída' })]), departSel,
      goBtn,
    ]),
    out,
  ]);
  const toggle = el('button', {
    type: 'button', class: 'trip__toggle', 'aria-expanded': 'false', 'aria-controls': 'trip-body',
    onclick: () => {
      const open = body.hidden;
      body.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) setTimeout(() => toInput.focus({ preventScroll: true }), 50);
    },
  }, [
    el('span', { class: 'trip__toggle-icon', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 19c4 0 4-6 8-6s4 6 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="4" cy="19" r="2" fill="currentColor"/><path d="M20 5c-1.7 0-3 1.3-3 3 0 2.2 3 5 3 5s3-2.8 3-5c0-1.7-1.3-3-3-3z" fill="currentColor"/></svg>' }),
    el('span', { class: 'trip__toggle-text' }, [
      el('strong', { text: 'Planeje seu passeio ou viagem' }),
      el('small', { text: 'Veja o tempo em cada trecho do caminho' }),
    ]),
    el('span', { class: 'trip__chev', 'aria-hidden': 'true', text: '›' }),
  ]);
  fill(root, toggle, body);
  syncLabels();
}

/** Chamado a cada renderização: a saída padrão acompanha a cidade da página. */
export function updateTrip() { if (root) syncLabels(); }

function useMyLocation(btn) {
  if (!('geolocation' in navigator)) { fill(out, el('p', { class: 'trip__msg trip__msg--error', text: 'Seu navegador não oferece localização.' })); return; }
  btn.classList.add('is-busy');
  fromInput.value = 'Buscando sua localização…';
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude: lat, longitude: lon } = pos.coords;
    const named = await reverseGeocode(lat, lon);
    from = { name: named?.name || 'Minha localização', region: named?.region || '', country: named?.country || '', lat, lon };
    btn.classList.remove('is-busy');
    syncLabels();
  }, () => {
    btn.classList.remove('is-busy');
    syncLabels();
    fill(out, el('p', { class: 'trip__msg trip__msg--error', text: 'Localização não permitida. Digite a cidade de saída.' }));
  }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 });
}

// A cidade escolhida aparece DENTRO do próprio campo (pedido do Dalmo, 3.4)
const placeText = (p) => [p.name, p.region].filter(Boolean).join(', ');
function syncLabels() {
  const origin = from || getCurrent();
  if (document.activeElement !== fromInput) fromInput.value = origin ? placeText(origin) : '';
  if (document.activeElement !== toInput) toInput.value = to ? placeText(to) : '';
}

async function run() {
  const origin = from || getCurrent();
  if (!origin || !to) { fill(out, el('p', { class: 'trip__msg', text: 'Escolha o destino na caixa "Para onde você vai?".' })); toInput.focus(); return; }
  goBtn.disabled = true; goBtn.textContent = 'Calculando…';
  fill(out, el('p', { class: 'trip__msg', text: 'Calculando a rota e a previsão de cada trecho…' }));
  try {
    const start = departMs(departSel.value);
    const route = await getRoute(origin, to);
    if (start + route.duration * 1000 > Date.now() + 60 * 3600e3) {
      fill(out, el('p', { class: 'trip__msg', text: 'Viagem longa demais: a previsão por trecho vai até cerca de 2 dias e meio à frente.' }));
      return;
    }
    const points = samplePoints(route, start);
    const [weather, names] = await Promise.all([
      getPointsForecast(points),
      Promise.all(points.map((p, i) => (i === 0 ? { name: origin.name } : i === points.length - 1 ? { name: to.name } : reverseGeocode(p.lat, p.lon)))),
    ]);
    const stops = points.map((p, i) => ({ ...p, w: weather[i], cond: classify(weather[i]), name: names[i]?.name || `km ${p.km}` }));
    lastResult = { origin, to, route, stops, start };
    renderResult(lastResult);
  } catch (e) {
    const msg = e.kind === 'noroute' ? 'Não encontrei rota de carro entre essas cidades.'
      : e.kind === 'offline' ? 'Sem internet no momento.' : 'O serviço de rotas não respondeu. Tente de novo em instantes.';
    fill(out, el('p', { class: 'trip__msg trip__msg--error', text: msg }));
  } finally {
    goBtn.disabled = false; goBtn.textContent = 'Ver o tempo no caminho';
  }
}

function renderResult({ origin, to: dest, route, stops, start }) {
  const unit = getUnit();
  const sum = tripSummary(stops, fmtTime);
  const mapBox = el('div', { class: 'trip__map', role: 'region', 'aria-label': 'Mapa da rota' });
  fill(out,
    el('p', { class: `trip__summary trip__summary--${sum.level}`, text: sum.text }),
    el('p', { class: 'trip__stats', text: `${origin.name} → ${dest.name} · ${fmtDur(route.duration)} · ${Math.round(route.distance / 1000)} km · saída ${fmtTime(start)} · chegada ~${fmtTime(start + route.duration * 1000)}` }),
    mapBox,
    el('ol', { class: 'trip__stops' }, stops.map((s, i) => stopItem(s, i, unit))),
    el('small', { class: 'trip__note', text: 'Tempo de viagem estimado sem trânsito. Rota: OSRM / © OpenStreetMap. Previsão: Open-Meteo. Estimativa do site — em alerta oficial, siga as autoridades.' }),
  );
  drawMap(mapBox, route, stops).catch(() => { mapBox.hidden = true; });
}

// Trecho com alerta: toque abre os cuidados, no mesmo padrão do "Hoje em detalhe" (ADR-039, 3.4)
function stopItem(s, i, unit) {
  const alerts = s.cond.flags.filter((f) => f.level !== 'info');
  const kids = [
    el('span', { class: 'trip__time', text: fmtTime(s.etaMs) }),
    el('span', { class: 'trip__icon', html: icon(s.cond.icon, s.w.isDay) }),
    el('div', { class: 'trip__where' }, [
      el('strong', { text: s.name }),
      el('span', { text: `${temp(s.w.temp, unit)} · ${s.cond.label}${s.w.pop != null ? ` · chuva ${percent(s.w.pop)}` : ''}` }),
      alerts.length > 0 && el('span', { class: 'trip__flags' }, [
        el('span', { class: 'tile__flag', 'aria-hidden': 'true', text: '!' }), alerts.map((f) => f.text).join(' · '),
        el('small', { class: 'trip__tap', text: ' · toque para ver cuidados' }),
      ]),
    ]),
  ];
  const li = el('li', { class: `trip__stop trip__stop--${s.cond.level || 'ok'}${alerts.length ? ' trip__stop--action' : ''}` }, kids);
  if (!alerts.length) return li;
  const panelId = `trip-care-${i}`;
  const hit = el('button', {
    type: 'button', class: 'hit', 'aria-expanded': 'false', 'aria-controls': panelId,
    'aria-label': `${fmtTime(s.etaMs)}, ${s.name}: ${alerts.map((f) => f.text).join(', ')}. Ver cuidados`,
    onclick: () => {
      const openNow = hit.getAttribute('aria-expanded') !== 'true';
      hit.setAttribute('aria-expanded', String(openNow));
      li.classList.toggle('is-open', openNow);
      const old = li.nextElementSibling?.id === panelId ? li.nextElementSibling : null;
      if (old) old.remove();
      if (openNow) li.after(carePanel(s, alerts, panelId, () => hit.click()));
    },
  });
  li.append(hit);
  return li;
}

function carePanel(s, alerts, id, onClose) {
  const seen = new Set();
  const items = alerts.filter((f) => f.key && ADVICE[f.key] && !seen.has(f.key) && seen.add(f.key)).map((f) => ADVICE[f.key][f.level === 'danger' ? 'danger' : 'warn']);
  return el('li', { class: `care care--${s.cond.level} trip__care`, id, 'aria-live': 'polite' }, [
    el('header', { class: 'care__head' }, [
      el('strong', { text: `${fmtTime(s.etaMs)} · ${s.name}` }),
      el('button', { type: 'button', class: 'detail__close', 'aria-label': 'Fechar', text: '×', onclick: onClose }),
    ]),
    ...items.map((a) => el('div', { class: 'trip__care-item' }, [
      el('p', { class: 'care__reason' }, [el('strong', { text: a.title })]),
      el('ul', { class: 'care__list' }, [
        el('li', {}, [el('strong', { text: '🚗 Dirigindo: ' }), a.drive]),
        el('li', {}, [el('strong', { text: '🚶 Nas paradas: ' }), a.walk]),
      ]),
    ])),
    el('small', { text: SOURCES }),
  ]);
}

// Nome de cidade vem de serviço externo: entra como TEXTO, nunca como HTML (ADR-040)
const tipText = (t) => { const span = document.createElement('span'); span.textContent = t; return span; };

async function drawMap(box, route, stops) {
  const L = await loadLeaflet();
  if (map) { map.remove(); map = null; }
  map = L.map(box, { attributionControl: false, scrollWheelZoom: false });
  L.tileLayer(BASE_TILES, { maxZoom: 19, className: 'base-tiles' }).addTo(map);
  layer = L.layerGroup().addTo(map);
  addExpandControl(L, map, box);
  L.polyline(route.coords, { color: '#1a4c8c', weight: 5, opacity: 0.85 }).addTo(layer);
  stops.forEach((s) => L.circleMarker([s.lat, s.lon], {
    radius: 8, weight: 2, color: '#fff', fillColor: LEVEL_COLOR[s.cond.level || 'ok'], fillOpacity: 1,
  }).bindTooltip(tipText(`${fmtTime(s.etaMs)} · ${s.name} · ${s.cond.label}`)).addTo(layer));
  // O mapa só mede o tamanho depois de entrar na tela: ajusta de novo em seguida (senão fica preso na saída)
  const fit = () => { map.invalidateSize(); map.fitBounds(L.latLngBounds(route.coords), { padding: [20, 20] }); };
  fit();
  requestAnimationFrame(() => setTimeout(fit, 60));
}
