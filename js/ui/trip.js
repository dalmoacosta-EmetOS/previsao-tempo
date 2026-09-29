// "Tempo na viagem" (ADR-039): de A até B, a previsão de cada trecho na hora em que você passa.
import { el, fill } from './dom.js?v=4.0';
import { icon } from './icons.js?v=4.0';
import { setupSearch } from './search.js?v=4.0';
import { temp, percent } from '../domain/units.js?v=4.0';
import { getRoute } from '../api/route.js?v=4.0';
import { getPointsSeries, pickAt } from '../api/route-forecast.js?v=4.0';
import { getOfficialAlerts } from '../api/official-alerts.js?v=4.0';
import { planFromUrl, planToUrl, planToIcs } from '../domain/trip-plan.js?v=4.0';
import { reverseGeocode } from '../api/geocoding.js?v=4.0';
import { samplePoints, classify, tripSummary, tripScore, suggestedStops, horizonNote, VEHICLES } from '../domain/route-weather.js?v=4.0';
import { loadLeaflet, BASE_TILES } from './radar.js?v=4.0';
import { addExpandControl } from './map-expand.js?v=4.0';
import { ADVICE, SOURCES } from '../domain/safety.js?v=4.0';

let root, from = null, to = null, fromInput, toInput, dateInput, timeInput, vehicle = 'car', vehBox, goBtn, out, getCurrent, getUnit, body, toggle;
let cache = null; // rota + série do último cálculo (para testar outros horários sem nova chamada)
const MAX_DAYS = 7;
let map = null, layer = null, lastResult = null;

const LEVEL_COLOR = { danger: '#e1322a', warn: '#ffb238', info: '#6ed75a', ok: '#7cc4ff' };
const fmtTime = (ms) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtDur = (s) => { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`; };

// Data e hora de saída escolhidas pelo usuário (até 7 dias à frente — ADR-042)
const pad = (n) => String(n).padStart(2, '0');
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
function readDepart() {
  const [y, m, d] = (dateInput.value || '').split('-').map(Number);
  const [hh, mm] = (timeInput.value || '').split(':').map(Number);
  if (!y || !m || !d || !Number.isFinite(hh)) return Date.now();
  return new Date(y, m - 1, d, hh, mm || 0, 0, 0).getTime();
}
function setDepart(ms) {
  const d = new Date(ms);
  dateInput.value = localDate(d);
  timeInput.value = localTime(d);
}
function setDateLimits() {
  const now = new Date();
  dateInput.min = localDate(now);
  dateInput.max = localDate(new Date(now.getTime() + MAX_DAYS * 86400e3));
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
  dateInput = el('input', { id: 'trip-date', type: 'date', class: 'trip__select trip__date', 'aria-label': 'Data da viagem' });
  timeInput = el('input', { id: 'trip-time', type: 'time', class: 'trip__select trip__date', 'aria-label': 'Hora de saída', step: '900' });
  setDateLimits();
  { const next = new Date(); next.setMinutes(0, 0, 0); next.setHours(next.getHours() + 1); setDepart(next.getTime()); }
  // Veículo (ADR-042): moto e veículos altos têm limites mais rígidos de chuva e vento
  vehBox = el('div', { class: 'segmented segmented--small trip__veh', role: 'group', 'aria-label': 'Veículo' },
    Object.entries(VEHICLES).map(([key, v]) => el('button', {
      type: 'button', 'data-veh': key, 'aria-pressed': String(key === vehicle), text: v.short, title: v.label, 'aria-label': v.label,
      onclick: () => { vehicle = key; vehBox.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.veh === key))); },
    })));
  goBtn = el('button', { type: 'button', class: 'btn trip__go', text: 'Ver o tempo no caminho', onclick: run });
  out = el('div', { class: 'trip__out', 'aria-live': 'polite' });
  // Fechado por padrão (pedido do Dalmo): um botão convida; o formulário só aparece ao tocar.
  body = el('div', { class: 'trip__body', id: 'trip-body', hidden: true }, [
    el('p', { class: 'card__hint card__hint--line', text: 'Viagem por estrada: a previsão de cada trecho na hora em que você vai passar por lá.' }),
    el('div', { class: 'trip__form' }, [
      el('label', { class: 'trip__label', for: 'trip-from' }, [el('span', { text: 'De' })]), f.box,
      el('label', { class: 'trip__label', for: 'trip-to' }, [el('span', { text: 'Para' })]), t.box,
      el('div', { class: 'trip__label' }, [el('span', { text: 'Data e hora de saída' }), el('small', { class: 'trip__limit', text: 'até 7 dias à frente' })]),
      el('div', { class: 'trip__when' }, [dateInput, timeInput]),
      el('div', { class: 'trip__label' }, [el('span', { text: 'Veículo' })]), vehBox,
      goBtn,
    ]),
    out,
  ]);
  toggle = el('button', {
    type: 'button', class: 'trip__toggle', 'aria-expanded': 'false', 'aria-controls': 'trip-body',
    onclick: () => {
      const open = body.hidden;
      openBody(open);
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
  // Link de plano recebido (e-mail, WhatsApp, calendário): abre e recalcula com a previsão mais nova
  const plan = planFromUrl(location.search);
  if (plan) {
    from = plan.from; to = plan.to; vehicle = plan.vehicle;
    vehBox.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.veh === vehicle)));
    const passed = !!plan.departMs && plan.departMs < Date.now();
    setDepart(plan.departMs && !passed ? Math.min(plan.departMs, Date.now() + MAX_DAYS * 86400e3) : Date.now());
    syncLabels();
    openBody(true);
    setTimeout(() => { root.scrollIntoView({ behavior: 'smooth', block: 'start' }); run({ fromLink: true, passed }); }, 300);
  }
}

function openBody(open) {
  body.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
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

async function run(opts = {}) {
  const origin = from || getCurrent();
  if (!origin || !to) { fill(out, el('p', { class: 'trip__msg', text: 'Escolha o destino na caixa "Para onde você vai?".' })); toInput.focus(); return; }
  const start = Math.max(readDepart(), Date.now() - 5 * 60e3);
  if (start > Date.now() + MAX_DAYS * 86400e3 + 60e3) {
    fill(out, el('p', { class: 'trip__msg trip__msg--error', text: 'Escolha uma saída em até 7 dias: depois disso a previsão por trecho não é confiável.' }));
    return;
  }
  goBtn.disabled = true; goBtn.textContent = 'Calculando…';
  fill(out, el('p', { class: 'trip__msg', text: 'Calculando a rota e a previsão de cada trecho…' }));
  try {
    const key = `${origin.lat},${origin.lon}>${to.lat},${to.lon}`;
    const stale = !cache || cache.key !== key || cache.fetchedAt < Date.now() - 15 * 60e3;
    if (stale || start - cache.baseStart > 12 * 3600e3 || start + cache.route.duration * 1000 + 7 * 3600e3 > cache.seriesEnd) {
      const route = stale ? await getRoute(origin, to) : cache.route;
      const probe = samplePoints(route, start);
      const days = (start + route.duration * 1000 + 8 * 3600e3 - Date.now()) / 86400e3 + 1;
      const [series, names, official] = await Promise.all([
        getPointsSeries(probe, days),
        Promise.all(probe.map((p, i) => (i === 0 ? { name: origin.name } : i === probe.length - 1 ? { name: to.name } : reverseGeocode(p.lat, p.lon)))),
        officialAlongRoute(probe),
      ]);
      const seriesEnd = Math.min(...series.map((h) => (h.time[h.time.length - 1] || 0) * 1000));
      cache = { key, route, series, names: names.map((n, i) => n?.name || `km ${probe[i].km}`), official, seriesEnd, baseStart: start, fetchedAt: Date.now() };
    }
    const result = evaluate(start);
    if (!result) { fill(out, el('p', { class: 'trip__msg trip__msg--error', text: 'Não há previsão para esse horário. Escolha uma saída mais próxima.' })); return; }
    renderResult({ ...result, origin, dest: to, passed: opts.passed, fromLink: opts.fromLink });
  } catch (e) {
    const msg = e.kind === 'noroute' ? 'Não encontrei rota de carro entre essas cidades.'
      : e.kind === 'offline' ? 'Sem internet no momento.' : 'O serviço de rotas não respondeu. Tente de novo em instantes.';
    fill(out, el('p', { class: 'trip__msg trip__msg--error', text: msg }));
  } finally {
    goBtn.disabled = false; goBtn.textContent = 'Ver o tempo no caminho';
  }
}

// Alertas OFICIAIS (NWS, só EUA) nos pontos da rota — uma consulta por região de ~10 km, no máximo 12 (ADR-042)
async function officialAlongRoute(points) {
  const k = (p) => `${p.lat.toFixed(1)},${p.lon.toFixed(1)}`;
  const seen = new Map();
  points.forEach((p) => { if (!seen.has(k(p)) && seen.size < 12) seen.set(k(p), p); });
  const res = await Promise.all([...seen.values()].map((p) => getOfficialAlerts(p.lat, p.lon).catch(() => [])));
  const byKey = new Map([...seen.keys()].map((key, i) => [key, res[i]]));
  return points.map((p) => byKey.get(k(p)) || []);
}

const activeAt = (a, ms) => (!a.starts || Date.parse(a.starts) <= ms + 3600e3) && (!a.ends || Date.parse(a.ends) >= ms);

/** Calcula a viagem para um horário de saída usando a rota e a série já baixadas. */
function evaluate(start) {
  const { route, series, names, official } = cache;
  const points = samplePoints(route, start);
  if (points.length !== series.length) return null;
  const stops = [];
  for (let i = 0; i < points.length; i++) {
    const w = pickAt(series[i], points[i].etaMs);
    if (!w) return null;
    const cond = classify(w, vehicle);
    (official[i] || []).filter((a) => activeAt(a, points[i].etaMs)).forEach((a) => {
      const lv = a.level === 'danger' ? 'danger' : 'warn';
      cond.flags.push({ level: lv, text: `Alerta oficial: ${a.title}`, key: 'official' });
      if (lv === 'danger' || cond.level !== 'danger') cond.level = lv === 'danger' ? 'danger' : (cond.level === 'danger' ? 'danger' : 'warn');
    });
    stops.push({ ...points[i], w, cond, name: names[i] });
  }
  return { route, stops, start, score: tripScore(stops.map((s) => s.cond)) };
}

/** Procura um horário de saída melhor: de 3 h antes a 6 h depois, de hora em hora. */
function bestAlternative(current) {
  let best = null;
  for (let k = -3; k <= 6; k++) {
    if (!k) continue;
    const t = current.start + k * 3600e3;
    if (t < Date.now() - 5 * 60e3 || t > Date.now() + MAX_DAYS * 86400e3) continue;
    const r = evaluate(t);
    if (r && (!best || r.score < best.score)) best = r;
  }
  return best && best.score <= current.score - 4 ? best : null;
}

const countAttention = (stops) => stops.filter((s) => s.cond.flags.some((f) => f.key !== 'night' && (f.level === 'danger' || f.level === 'warn'))).length;
const fmtDay = (ms) => new Date(ms).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

function renderResult({ origin, dest, route, stops, start, score, passed, fromLink }) {
  const unit = getUnit();
  const sum = tripSummary(stops, fmtTime);
  const note = horizonNote(start, origin, dest);
  const night = stops.filter((s) => s.w.isDay === false).length;
  const officialTitles = [...new Set(stops.flatMap((s) => s.cond.flags.filter((f) => f.key === 'official').map((f) => f.text.replace('Alerta oficial: ', ''))))];
  const pauses = suggestedStops(stops, start);
  const alt = bestAlternative({ start, score });
  const plan = { from: origin, to: dest, departMs: start, vehicle, durationS: route.duration };
  const link = planToUrl(plan, location.href);
  const head = `Viagem ${origin.name} → ${dest.name}, saída ${fmtDay(start)} às ${fmtTime(start)}.`;
  const mapBox = el('div', { class: 'trip__map', role: 'region', 'aria-label': 'Mapa da rota' });
  fill(out,
    fromLink && el('p', { class: 'trip__msg trip__msg--link', text: passed ? 'Plano aberto pelo link. O horário salvo já passou: recalculei saindo agora, com a previsão mais nova.' : 'Plano aberto pelo link: recalculado agora com a previsão mais nova.' }),
    el('p', { class: `trip__summary trip__summary--${sum.level}`, text: sum.text }),
    officialTitles.length > 0 && el('p', { class: 'trip__official' }, [el('strong', { text: '⚠️ Alerta oficial no caminho: ' }), officialTitles.join(' · ')]),
    el('p', { class: 'trip__stats', text: `${origin.name} → ${dest.name} · ${fmtDur(route.duration)} · ${Math.round(route.distance / 1000)} km · saída ${fmtDay(start)} ${fmtTime(start)} · chegada ~${fmtDay(start + route.duration * 1000)} ${fmtTime(start + route.duration * 1000)} · ${VEHICLES[vehicle].label}` }),
    el('div', { class: `trip__horizon trip__horizon--${note.level}` }, [
      el('strong', { text: note.head }), ' ', note.text, ' ',
      note.href && el('a', { href: note.href, target: '_blank', rel: 'noopener', text: `Fonte: ${note.source}` }),
    ]),
    night > 0 && el('p', { class: 'trip__night', text: `🌙 ${night} ${night > 1 ? 'pontos' : 'ponto'} da viagem à noite${vehicle === 'moto' ? ' — de moto, atenção redobrada' : ''}.` }),
    alt && el('div', { class: 'trip__alt' }, [
      el('p', {}, [el('strong', { text: `💡 Melhor horário: saindo ${fmtDay(alt.start)} às ${fmtTime(alt.start)}` }),
        ` você teria ${countAttention(alt.stops)} trecho(s) de atenção em vez de ${countAttention(stops)}.`]),
      el('button', { type: 'button', class: 'btn trip__alt-btn', text: 'Usar este horário', onclick: () => { setDepart(alt.start); run(); } }),
    ]),
    mapBox,
    el('ol', { class: 'trip__stops' }, stops.map((s, i) => stopItem(s, i, unit, pauses.has(i)))),
    el('div', { class: 'trip__share' }, [
      el('p', { class: 'trip__share-title', text: 'Leve o plano com você — o link sempre abre com a previsão atualizada:' }),
      el('div', { class: 'trip__share-btns' }, [
        el('a', { class: 'btn trip__share-btn', href: `mailto:?subject=${encodeURIComponent(`Viagem ${origin.name} → ${dest.name}`)}&body=${encodeURIComponent(`${head}\n${sum.text}\n\nToque para ATUALIZAR a previsão do caminho:\n${link}`)}`, text: '✉️ E-mail' }),
        el('a', { class: 'btn trip__share-btn', href: `https://wa.me/?text=${encodeURIComponent(`${head}\n${sum.text}\nAtualize a previsão: ${link}`)}`, target: '_blank', rel: 'noopener', text: '💬 WhatsApp' }),
        el('a', { class: 'btn trip__share-btn', href: `data:text/calendar;charset=utf-8,${encodeURIComponent(planToIcs(plan, link, sum.text))}`, download: 'viagem.ics', text: '📅 Calendário' }),
        el('button', { type: 'button', class: 'btn trip__share-btn', text: '🔗 Copiar link', onclick: async (e) => {
          try { await navigator.clipboard.writeText(link); e.target.textContent = '✓ Link copiado'; } catch { e.target.textContent = 'Copie da barra de endereço'; }
        } }),
      ]),
    ]),
    el('small', { class: 'trip__note', text: 'Tempo de viagem estimado sem trânsito e sem paradas. Rota: OSRM / © OpenStreetMap. Previsão: Open-Meteo. Alertas oficiais: NWS (EUA). Estimativa do site — em alerta oficial, siga as autoridades.' }),
  );
  drawMap(mapBox, route, stops).catch(() => { mapBox.hidden = true; });
}

// Trecho com alerta: toque abre os cuidados, no mesmo padrão do "Hoje em detalhe" (ADR-039, 3.4)
function stopItem(s, i, unit, pause = false) {
  const alerts = s.cond.flags.filter((f) => f.level !== 'info');
  const kids = [
    el('span', { class: 'trip__time', text: fmtTime(s.etaMs) }),
    el('span', { class: 'trip__icon', html: icon(s.cond.icon, s.w.isDay) }),
    el('div', { class: 'trip__where' }, [
      el('strong', { text: s.name }),
      pause && el('span', { class: 'trip__pause', text: '☕ Parada sugerida (cerca de 2 h ao volante)' }),
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
