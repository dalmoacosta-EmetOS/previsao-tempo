// "Tempo na viagem" (ADR-039): de A até B, a previsão de cada trecho na hora em que você passa.
import { el, fill } from './dom.js?v=6.1.1';
import { icon } from './icons.js?v=6.1.1';
import { setupSearch } from './search.js?v=6.1.1';
import { temp, percent, dist, milestone } from '../domain/units.js?v=6.1.1';
import { clock, shortDate } from '../domain/time.js?v=6.1.1';
import { t, getLang } from '../i18n/index.js?v=6.1.1';
import { load, save } from '../storage.js?v=6.1.1';
import { getRoute } from '../api/route.js?v=6.1.1';
import { getPointsSeries, pickAt } from '../api/route-forecast.js?v=6.1.1';
import { getOfficialAlerts } from '../api/official-alerts.js?v=6.1.1';
import { planFromUrl, planToUrl, planToIcs, googleCalendarUrl } from '../domain/trip-plan.js?v=6.1.1';
import { getRoadPois, nearestFuel, fuelGaps } from '../api/road-pois.js?v=6.1.1';
import { reverseGeocode } from '../api/geocoding.js?v=6.1.1';
import { searchPlaces } from '../api/places.js?v=6.1.1';
import { samplePoints, classify, tripSummary, tripScore, suggestedStops, horizonNote, VEHICLES, trafficFactor } from '../domain/route-weather.js?v=6.1.1';
import { loadLeaflet, BASE_TILES } from './radar.js?v=6.1.1';
import { addExpandControl } from './map-expand.js?v=6.1.1';
import { advice, hasAdvice, SOURCES } from '../domain/safety.js?v=6.1.1';

let root, from = null, to = null, fromInput, toInput, dateInput, timeInput, vehicle = 'car', vehBox, goBtn, out, getCurrent, getUnit, body, toggle, quick;
let cache = null; // rota + série do último cálculo (para testar outros horários sem nova chamada)
const MAX_DAYS = 7;
let map = null, layer = null, lastResult = null;
let lastRender = {};
let poisArrived = null; // { route, pois } — resposta do mapa colaborativo, que chega por fora // o que está na tela, para completar com postos e balanças quando chegarem

const LEVEL_COLOR = { danger: '#e1322a', warn: '#ffb238', info: '#6ed75a', ok: '#7cc4ff' };
const fmtTime = clock;
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
  const input = el('input', { onfocus: (e) => e.target.select(), id, type: 'search', autocomplete: 'off', spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off', placeholder, 'aria-label': label,
    role: 'combobox', 'aria-expanded': 'false', 'aria-controls': `${id}-list`, 'aria-autocomplete': 'list' });
  const list = el('ul', { class: 'search__list', id: `${id}-list`, role: 'listbox', hidden: true });
  // Viagem aceita endereço, lugar ou cidade (6.1); a busca prefere resultados perto de onde a pessoa está
  setupSearch({ input, list, onSelect: onPick, search: (q) => searchPlaces(q, getCurrent?.()) });
  return { input, box: el('div', { class: 'search trip__search' }, [input, list]) };
}

export function mountTrip(container, { currentPlace, unit }) {
  root = container; getCurrent = currentPlace; getUnit = unit;
  const f = searchBox('trip-from', t('trip.fromAria'), t('trip.fromPh'), (p) => { from = p; syncLabels(); });
  const d = searchBox('trip-to', t('trip.toAria'), t('trip.toPh'), (p) => { to = p; syncLabels(); });
  fromInput = f.input; toInput = d.input;
  // "Minha localização" dentro do campo de saída (3.5)
  const locBtn = el('button', {
    type: 'button', class: 'trip__locate', 'aria-label': t('trip.locateAria'), title: t('top.locate'),
    html: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    onclick: () => useMyLocation(locBtn),
  });
  f.box.classList.add('trip__search--loc');
  f.box.append(locBtn);
  dateInput = el('input', { id: 'trip-date', type: 'date', class: 'trip__select trip__date', 'aria-label': t('trip.date') });
  timeInput = el('input', { id: 'trip-time', type: 'time', class: 'trip__select trip__date', 'aria-label': t('trip.time'), step: '900' });
  setDateLimits();
  // 6.1 — data/hora é a informação-mãe: mudou à mão com uma viagem na tela, a viagem e a barra acompanham na hora
  [dateInput, timeInput].forEach((i) => i.addEventListener('change', () => { if (lastRender.route && out.querySelector('.trip__stop')) run(); }));
  { const next = new Date(); next.setMinutes(0, 0, 0); next.setHours(next.getHours() + 1); setDepart(next.getTime()); }
  // Veículo (ADR-042): moto e veículos altos têm limites mais rígidos de chuva e vento
  vehBox = el('div', { class: 'segmented segmented--small trip__veh', role: 'group', 'aria-label': t('trip.vehicle') },
    Object.entries(VEHICLES).map(([key, v]) => el('button', {
      type: 'button', 'data-veh': key, 'aria-pressed': String(key === vehicle), text: v.short, title: v.label, 'aria-label': v.label,
      onclick: () => { vehicle = key; vehBox.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.veh === key))); },
    })));
  goBtn = el('button', { type: 'button', class: 'btn trip__go', text: t('trip.go'), onclick: () => run() });
  out = el('div', { class: 'trip__out', 'aria-live': 'polite' });
  // 6.0 — o planejador é o diferencial (pedido do Dalmo): fica ABERTO, logo abaixo da temperatura.
  // Origem e destino sempre visíveis e editáveis: a saída vem sugerida com a cidade atual, mas a pessoa
  // pode digitar outra (ex.: vai de avião e aluga carro lá — o trecho de carro começa no aeroporto).
  // Data, hora e veículo aparecem quando ela começa a preencher.
  body = el('div', { class: 'trip__body', id: 'trip-body', hidden: true }, [
    el('div', { class: 'trip__form' }, [
      el('div', { class: 'trip__label' }, [el('span', { text: t('trip.when') }), el('small', { class: 'trip__limit', text: t('trip.limit') })]),
      el('div', { class: 'trip__when' }, [dateInput, timeInput]),
      el('div', { class: 'trip__label' }, [el('span', { text: t('trip.vehicle') })]), vehBox,
      goBtn,
    ]),
  ]);
  quick = el('div', { class: 'trip__quick' });
  toggle = el('header', { class: 'trip__head' }, [
    el('span', { class: 'trip__head-icon', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 19c4 0 4-6 8-6s4 6 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="4" cy="19" r="2" fill="currentColor"/><path d="M20 5c-1.7 0-3 1.3-3 3 0 2.2 3 5 3 5s3-2.8 3-5c0-1.7-1.3-3-3-3z" fill="currentColor"/></svg>' }),
    el('div', {}, [el('h2', { class: 'trip__title', text: t('trip.toggle') }), el('p', { class: 'trip__sub', text: t('trip.toggleSub') })]),
  ]);
  fill(root,
    toggle,
    el('div', { class: 'trip__form trip__route' }, [
      el('label', { class: 'trip__label', for: 'trip-from' }, [el('span', { text: t('trip.from') }), el('small', { class: 'trip__limit', text: t('trip.originHint') })]), f.box,
      el('label', { class: 'trip__label', for: 'trip-to' }, [el('span', { text: t('trip.to') })]), d.box,
    ]),
    quick,
    body,
    out,
  );
  [fromInput, toInput].forEach((i) => i.addEventListener('focus', () => openBody(true)));
  renderQuick();
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
}

// Viagens recentes (no próprio aparelho) e exemplo pronto para quem nunca usou
const RECENT_KEY = 'trips';
const cleanPlace = (p) => ({ name: p.name, region: p.region || '', country: p.country || '', lat: p.lat, lon: p.lon });
function recentTrips() {
  const list = load(RECENT_KEY);
  return Array.isArray(list) ? list.filter((r) => r?.from && r?.to && Number.isFinite(r.from.lat) && Number.isFinite(r.to.lat)).slice(0, 4) : [];
}
function saveRecent(origin, dest) {
  const k = (r) => `${r.from.lat.toFixed(3)},${r.from.lon.toFixed(3)}>${r.to.lat.toFixed(3)},${r.to.lon.toFixed(3)}`;
  const item = { from: cleanPlace(origin), to: cleanPlace(dest), vehicle };
  save(RECENT_KEY, [item, ...recentTrips().filter((r) => k(r) !== k(item))].slice(0, 4));
  renderQuick();
}
const EXAMPLES = {
  pt: [{ name: 'São Paulo', region: 'São Paulo', country: 'Brasil', lat: -23.5505, lon: -46.6333 }, { name: 'Rio de Janeiro', region: 'Rio de Janeiro', country: 'Brasil', lat: -22.9068, lon: -43.1729 }],
  en: [{ name: 'Boston', region: 'Massachusetts', country: 'United States', lat: 42.3601, lon: -71.0589 }, { name: 'New York', region: 'New York', country: 'United States', lat: 40.7128, lon: -74.006 }],
  es: [{ name: 'Ciudad de México', region: 'CDMX', country: 'México', lat: 19.4326, lon: -99.1332 }, { name: 'Puebla', region: 'Puebla', country: 'México', lat: 19.0414, lon: -98.2063 }],
};
function startTrip(a, b, veh) {
  from = a; to = b;
  if (veh && VEHICLES[veh]) { vehicle = veh; vehBox.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.veh === veh))); }
  syncLabels();
  openBody(true);
  run();
}
function renderQuick() {
  if (!quick) return;
  const recents = recentTrips();
  const [ea, eb] = EXAMPLES[getLang()] || EXAMPLES.en;
  fill(quick,
    recents.length > 0 && el('span', { class: 'trip__quick-label', text: t('trip.recent') }),
    recents.map((r) => el('button', { type: 'button', class: 'trip__chip', text: `${r.from.name} → ${r.to.name}`, onclick: () => startTrip(r.from, r.to, r.vehicle) })),
    recents.length === 0 && el('button', { type: 'button', class: 'trip__chip trip__chip--example', text: `✨ ${t('trip.example', { a: ea.name, b: eb.name })}`, onclick: () => startTrip(ea, eb) }),
  );
}

/** Chamado a cada renderização: a saída padrão acompanha a cidade da página. */
export function updateTrip() { if (root) syncLabels(); }

function useMyLocation(btn) {
  if (!('geolocation' in navigator)) { fill(out, el('p', { class: 'trip__msg trip__msg--error', text: t('geo.unsupported') })); return; }
  btn.classList.add('is-busy');
  fromInput.value = t('trip.locating');
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude: lat, longitude: lon } = pos.coords;
    const named = await reverseGeocode(lat, lon);
    from = { name: named?.name || t('trip.myLocation'), region: named?.region || '', country: named?.country || '', lat, lon };
    btn.classList.remove('is-busy');
    syncLabels();
  }, () => {
    btn.classList.remove('is-busy');
    syncLabels();
    fill(out, el('p', { class: 'trip__msg trip__msg--error', text: t('trip.locDenied') }));
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
  if (!origin || !to) { fill(out, el('p', { class: 'trip__msg', text: t('trip.needDest') })); toInput.focus(); return; }
  const start = Math.max(readDepart(), Date.now() - 5 * 60e3);
  if (start > Date.now() + MAX_DAYS * 86400e3 + 60e3) {
    fill(out, el('p', { class: 'trip__msg trip__msg--error', text: t('trip.tooFar') }));
    return;
  }
  goBtn.disabled = true; goBtn.textContent = t('trip.calculating');
  const step = (key, vars) => fill(out, el('p', { class: 'trip__msg', role: 'status', text: t(key, vars) }));
  step('trip.stepRoute');
  try {
    const key = `${origin.lat},${origin.lon}>${to.lat},${to.lon}`;
    const stale = !cache || cache.key !== key || cache.fetchedAt < Date.now() - 15 * 60e3;
    if (stale || start - cache.baseStart > 12 * 3600e3 || start + cache.route.duration * 1500 + 7 * 3600e3 > cache.seriesEnd) {
      const route = stale ? await getRoute(origin, to) : cache.route;
      const probe = samplePoints(route, start);
      step('trip.stepForecast', { n: probe.length });
      // Postos e balanças NÃO seguram a resposta (5.1): o mapa colaborativo pode levar 20 s numa rota longa.
      // A previsão aparece primeiro; postos e balanças entram no cartão quando chegarem.
      const keepPois = !stale && cache.pois !== undefined ? cache.pois : undefined;
      if (keepPois === undefined) {
        poisArrived = null;
        getRoadPois(route, { trucks: true }).catch(() => null).then((pois) => {
          poisArrived = { route, pois }; // pode chegar antes ou depois da previsão
          if (cache?.route !== route) return;
          cache.pois = pois;
          refreshRoad();
        });
      }
      const days = (start + route.duration * 1500 + 8 * 3600e3 - Date.now()) / 86400e3 + 1;
      // 6.0 — previsão primeiro: nomes das cidades esperam no máximo 1,5 s (sem nome = "km 120") e
      // alertas oficiais no máximo 2,5 s; se chegarem depois, a tela é refeita com eles (segurança primeiro).
      const officialP = officialAlongRoute(probe);
      const [series, names, officialNow] = await Promise.all([
        getPointsSeries(probe, days),
        Promise.all(probe.map((p, i) => (i === 0 ? { name: origin.name } : i === probe.length - 1 ? { name: to.name } : within(reverseGeocode(p.lat, p.lon, { timeout: 3500 }), 1500, null)))),
        within(officialP, 2500, null),
      ]);
      const official = officialNow || probe.map(() => []);
      if (!officialNow) {
        officialP.then((late) => {
          if (cache?.route !== route) return;
          cache.official = late;
          if (late.some((a) => a.length) && lastRender.route === route) redraw();
        }).catch(() => {});
      }
      const seriesEnd = Math.min(...series.map((h) => (h.time[h.time.length - 1] || 0) * 1000));
      const pois = poisArrived?.route === route ? poisArrived.pois : keepPois;
      cache = { key, route, series, names: names.map((n, i) => n?.name || milestone(probe[i].km)), official, pois, seriesEnd, baseStart: start, fetchedAt: Date.now() };
    }
    const result = evaluate(start);
    if (!result) { fill(out, el('p', { class: 'trip__msg trip__msg--error', text: t('trip.noForecast') })); return; }
    renderResult({ ...result, origin, dest: to, passed: opts.passed, fromLink: opts.fromLink });
    saveRecent(origin, to);
  } catch (e) {
    const msg = t(e.kind === 'noroute' ? 'trip.noRoute' : e.kind === 'offline' ? 'trip.offline' : 'trip.routeFail');
    fill(out, el('p', { class: 'trip__msg trip__msg--error', text: msg }));
  } finally {
    goBtn.disabled = false; goBtn.textContent = t('trip.go');
  }
}

const within = (p, ms, fallback) => Promise.race([p.catch(() => fallback), new Promise((ok) => setTimeout(() => ok(fallback), ms))]);

/** Refaz o resultado com os dados que chegaram depois (alertas oficiais), no mesmo horário. */
function redraw() {
  const r = lastRender;
  const result = evaluate(r.start);
  if (result) renderResult({ ...result, origin: r.origin, dest: r.dest });
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
  // Mesmos pontos da rota; horários de passagem esticados pelo trânsito típico (6.1)
  const f = trafficFactor(start, route.duration);
  const points = samplePoints(route, start).map((p) => ({ ...p, etaMs: start + (p.etaMs - start) * f }));
  if (points.length !== series.length) return null;
  const stops = [];
  for (let i = 0; i < points.length; i++) {
    const w = pickAt(series[i], points[i].etaMs);
    if (!w) return null;
    const cond = classify(w, vehicle);
    (official[i] || []).filter((a) => activeAt(a, points[i].etaMs)).forEach((a) => {
      const lv = a.level === 'danger' ? 'danger' : 'warn';
      cond.flags.push({ level: lv, text: t('trip.officialFlag', { title: a.title }), title: a.title, key: 'official' });
      if (lv === 'danger' || cond.level !== 'danger') cond.level = lv === 'danger' ? 'danger' : (cond.level === 'danger' ? 'danger' : 'warn');
    });
    stops.push({ ...points[i], w, cond, name: names[i] });
  }
  return { route, stops, start, typS: route.duration * f, score: tripScore(stops.map((s) => s.cond)) };
}

/** Procura um horário de saída melhor: de 3 h antes a 6 h depois, de hora em hora. */
function bestAlternative(current) {
  let best = null;
  for (let k = -3; k <= 6; k++) {
    if (!k) continue;
    const at = current.start + k * 3600e3;
    if (at < Date.now() - 5 * 60e3 || at > Date.now() + MAX_DAYS * 86400e3) continue;
    const r = evaluate(at);
    if (r && (!best || r.score < best.score)) best = r;
  }
  return best && best.score <= current.score - 4 ? best : null;
}

const countAttention = (stops) => stops.filter((s) => s.cond.flags.some((f) => f.key !== 'night' && (f.level === 'danger' || f.level === 'warn'))).length;
const fmtDay = shortDate;

function renderResult({ origin, dest, route, stops, start, typS, score, passed, fromLink }) {
  const unit = getUnit();
  const sum = tripSummary(stops, fmtTime);
  const note = horizonNote(start, origin, dest);
  const night = stops.filter((s) => s.w.isDay === false).length;
  const officialTitles = [...new Set(stops.flatMap((s) => s.cond.flags.filter((f) => f.key === 'official').map((f) => f.title)))];
  const pauses = suggestedStops(stops, start);
  lastRender = { route, stops, start, unit, pauses, origin, dest, typS };
  const alt = bestAlternative({ start, score });
  const plan = { from: origin, to: dest, departMs: start, vehicle, durationS: typS };
  const link = planToUrl(plan, location.href);
  const head = t('trip.head', { from: origin.name, to: dest.name, day: fmtDay(start), h: fmtTime(start) });
  const title = t('plan.title', { from: origin.name, to: dest.name });
  const mapBox = el('div', { class: 'trip__map', role: 'region', 'aria-label': t('trip.mapAria') });
  fill(out,
    fromLink && el('p', { class: 'trip__msg trip__msg--link', text: t(passed ? 'trip.linkPassed' : 'trip.linkFresh') }),
    el('p', { class: `trip__summary trip__summary--${sum.level}`, text: sum.text }),
    riskStrip(stops),
    riskCounts(stops, night),
    departSlider(start, route),
    officialTitles.length > 0 && el('p', { class: 'trip__official' }, [el('strong', { text: `⚠️ ${t('trip.officialOnRoute')} ` }), officialTitles.join(' · ')]),
    el('p', { class: 'trip__stats', text: `${origin.name} → ${dest.name} · ~${fmtDur(typS)} · ${dist(route.distance / 1000)} · ${t('trip.depart', { when: `${fmtDay(start)} ${fmtTime(start)}` })} · ${t('trip.arrive', { when: `${fmtDay(start + typS * 1000)} ${fmtTime(start + typS * 1000)}` })} · ${VEHICLES[vehicle].label}` }),
    el('p', { class: 'trip__traffic', text: `⏱️ ${t('trip.trafficNote', { typ: fmtDur(typS), free: fmtDur(route.duration) })}` }),
    el('div', { class: `trip__horizon trip__horizon--${note.level}` }, [
      el('strong', { text: note.head }), ' ', note.text, ' ',
      note.href && el('a', { href: note.href, target: '_blank', rel: 'noopener', text: t('trip.source', { s: note.source }) }),
    ]),
    night > 0 && el('p', { class: 'trip__night', text: `🌙 ${t(night > 1 ? 'trip.nightMany' : 'trip.nightOne', { n: night })}${vehicle === 'moto' ? t('trip.nightMoto') : ''}.` }),
    alt && el('div', { class: 'trip__alt' }, [
      el('p', {}, [el('strong', { text: `💡 ${t('trip.better', { day: fmtDay(alt.start), h: fmtTime(alt.start) })}` }),
        ` ${t('trip.betterWhy', { a: countAttention(alt.stops), b: countAttention(stops) })}`]),
      el('button', { type: 'button', class: 'btn trip__alt-btn', text: t('trip.useTime'), onclick: () => { setDepart(alt.start); run(); } }),
    ]),
    lastRender.road = roadBlock(route, start),
    mapBox,
    lastRender.list = stopList(stops, unit, pauses),
    el('div', { class: 'trip__share' }, [
      el('p', { class: 'trip__share-title', text: t('trip.shareTitle') }),
      el('div', { class: 'trip__share-btns' }, [
        // Menu de compartilhar do próprio celular: mostra WhatsApp E WhatsApp Business, Mensagens, Telegram…
        navigator.share
          ? el('button', { type: 'button', class: 'btn trip__share-btn', text: `📤 ${t('trip.share')}`, onclick: () => navigator.share({ title, text: `${head}\n${sum.text}\n${t('trip.updateShort')}`, url: link }).catch(() => {}) })
          : el('a', { class: 'btn trip__share-btn', href: `https://wa.me/?text=${encodeURIComponent(`${head}\n${sum.text}\n${t('trip.updateShort')} ${link}`)}`, target: '_blank', rel: 'noopener', text: '💬 WhatsApp' }),
        el('a', { class: 'btn trip__share-btn', href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${head}\n${sum.text}\n\n${t('trip.updateMail')}\n${link}`)}`, text: `✉️ ${t('trip.email')}` }),
        el('button', { type: 'button', class: 'btn trip__share-btn', 'data-cal': 'ics', text: '📅 iPhone / Outlook', onclick: () => openIcs(planToIcs(plan, link, sum.text)) }),
        el('a', { class: 'btn trip__share-btn', href: googleCalendarUrl(plan, link, sum.text), target: '_blank', rel: 'noopener', text: `📅 ${t('trip.gcal')}` }),
        el('button', { type: 'button', class: 'btn trip__share-btn trip__share-btn--wide', text: `🔗 ${t('trip.copy')}`, onclick: async (e) => {
          try { await navigator.clipboard.writeText(link); e.target.textContent = `✓ ${t('trip.copied')}`; } catch { e.target.textContent = t('trip.copyFail'); }
        } }),
      ]),
      el('small', { class: 'trip__share-note', text: t('trip.calNote') }),
    ]),
    el('small', { class: 'trip__note', text: t('trip.footNote') }),
  );
  drawMap(mapBox, route, stops).catch(() => { mapBox.hidden = true; });
}

// Calendário no iPhone/Outlook (4.1): o arquivo abre no próprio app de calendário, pronto para "Adicionar".
// (No iPhone, link "data:" com download não fazia nada — trocado por arquivo temporário do navegador.)
function openIcs(ics) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) { window.location.assign(url); } else {
    const a = document.createElement('a');
    a.href = url; a.download = `${t('trip.icsName')}.ics`; document.body.append(a); a.click(); a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Faixa colorida: um bloco por trecho, na cor do nível (com ícone — não depende só da cor)
const LEVEL_MARK = { danger: '!', warn: '•', info: '', ok: '' };
function riskStrip(stops) {
  return el('div', { class: 'trip__strip', role: 'img', 'aria-label': t('trip.strip') },
    stops.map((s) => el('span', {
      class: `trip__strip-seg trip__strip-seg--${s.cond.level || 'ok'}`,
      title: `${fmtTime(s.etaMs)} · ${s.name} · ${s.cond.label}`,
      text: LEVEL_MARK[s.cond.level || 'ok'],
    })));
}
function riskCounts(stops, night) {
  const n = (lv) => stops.filter((s) => s.cond.level === lv).length;
  const parts = [
    n('danger') && `🔴 ${t('trip.countDanger', { n: n('danger') })}`,
    n('warn') && `🟡 ${t('trip.countWarn', { n: n('warn') })}`,
    night && `🌙 ${t('trip.countNight', { n: night })}`,
    !n('danger') && !n('warn') && `🟢 ${t('trip.countOk')}`,
  ].filter(Boolean);
  return el('p', { class: 'trip__counts', text: parts.join(' · ') });
}
// Horário de saída no dedo: arrastar mostra o horário; ao soltar, a viagem é refeita SEM nova busca
function departSlider(start, route) {
  const H = 3600e3;
  const now = Math.ceil(Date.now() / H) * H;
  const min = Math.max(now, start - 6 * H);
  const max = Math.min(Date.now() + MAX_DAYS * 86400e3, start + 12 * H, (cache?.seriesEnd || Infinity) - route.duration * 1500 - H);
  if (!(max > min)) return null;
  const label = el('output', { class: 'trip__slider-val', text: `${fmtDay(start)} ${fmtTime(start)}` });
  const input = el('input', {
    type: 'range', class: 'trip__slider', id: 'trip-slider', min: String(min), max: String(max), step: String(H),
    value: String(Math.min(max, Math.max(min, start))), 'aria-label': t('trip.slider'),
    oninput: (e) => { const v = Number(e.target.value); label.textContent = `${fmtDay(v)} ${fmtTime(v)}`; setDepart(v); }, // campos de data/hora acompanham na hora
    onchange: (e) => { setDepart(Number(e.target.value)); run(); },
  });
  return el('div', { class: 'trip__slider-box' }, [
    el('label', { for: 'trip-slider', class: 'trip__slider-label' }, [el('span', { text: `🕒 ${t('trip.slider')}` }), label]),
    input,
    el('small', { text: t('trip.sliderHint') }),
  ]);
}

const stopList = (stops, unit, pauses) => el('ol', { class: 'trip__stops' },
  stops.map((s, i) => stopItem(s, i, unit, pauses.has(i), cache.pois && pauses.has(i) ? nearestFuel(cache.pois.fuel, s.km) : null)));

// Postos e balanças chegaram depois da previsão: troca só o cartão "Na estrada", a lista de paradas e os marcadores.
function refreshRoad() {
  const r = lastRender;
  if (!r.road?.isConnected || r.route !== cache.route) return;
  const road = roadBlock(r.route, r.start);
  r.road.replaceWith(road); r.road = road;
  const list = stopList(r.stops, r.unit, r.pauses);
  r.list.replaceWith(list); r.list = list;
  if (map && layer) addWeighMarkers(window.L);
}

function addWeighMarkers(L) {
  if (vehicle === 'large' && cache?.pois) cache.pois.weigh.forEach((w) => L.circleMarker([w.lat, w.lon], { radius: 6, weight: 2, color: '#fff', fillColor: '#8e44ad', fillOpacity: 1 }).bindTooltip(tipText(`⚖️ ${milestone(w.km)} · ${w.name}`)).addTo(layer));
}

// Na estrada (ADR-044): postos e, para caminhão, balanças de pesagem — OpenStreetMap
function roadBlock(route, start) {
  const pois = cache.pois;
  if (pois === undefined) return el('p', { class: 'trip__road trip__road--muted', role: 'status', text: `⛽ ${t('road.loading')}` });
  const totalKm = route.distance / 1000;
  const eta = (km) => fmtTime(start + (km / (pois?.totalKm || totalKm)) * (lastRender.typS || route.duration) * 1000);
  if (!pois) return el('p', { class: 'trip__road trip__road--muted', text: `⛽ ${t('road.fail')}` });
  const gaps = fuelGaps(pois.fuel, pois.totalKm);
  const kids = [
    el('strong', { class: 'trip__road-title', text: t('road.title') }),
    el('p', {}, [`⛽ ${t(pois.fuel.length === 1 ? 'road.fuelOne' : 'road.fuelMany', { n: pois.fuel.length })}`,
      vehicle === 'large' ? ` ${t('road.diesel', { n: pois.fuel.filter((f) => f.diesel || f.truck).length })}` : '', '.']),
    ...gaps.map((g) => el('p', { class: 'trip__road-warn', text: `⚠️ ${t('road.gap', { d: dist(g.toKm - g.fromKm), a: milestone(g.fromKm), b: milestone(g.toKm) })}` })),
  ];
  if (vehicle === 'large') {
    kids.push(el('p', { class: 'trip__road-sub', text: `⚖️ ${t('road.weigh', { n: pois.weigh.length || t('road.weighNone') })}` }));
    if (pois.weigh.length) kids.push(el('ul', { class: 'trip__weigh' }, pois.weigh.slice(0, 15).map((w) => el('li', { text: `${milestone(w.km)} · ~${eta(w.km)} · ${w.name}` }))));
    kids.push(el('small', { text: t('road.weighNote') }));
  }
  return el('div', { class: 'trip__road' }, kids);
}

// Trecho com alerta: toque abre os cuidados, no mesmo padrão do "Hoje em detalhe" (ADR-039, 3.4)
function stopItem(s, i, unit, pause = false, fuel = null) {
  const alerts = s.cond.flags.filter((f) => f.level !== 'info');
  const kids = [
    el('span', { class: 'trip__time', text: fmtTime(s.etaMs) }),
    el('span', { class: 'trip__icon', html: icon(s.cond.icon, s.w.isDay) }),
    el('div', { class: 'trip__where' }, [
      el('strong', { text: s.name }),
      pause && el('span', { class: 'trip__pause', text: `☕ ${t('trip.pause')}` }),
      pause && fuel && el('span', { class: 'trip__fuel', text: `⛽ ${t('trip.fuelNear', { name: fuel.name, km: milestone(fuel.km) })}` }),
      el('span', { text: `${temp(s.w.temp, unit)} · ${s.cond.label}${s.w.pop != null ? ` · ${t('trip.rainPop', { p: percent(s.w.pop) })}` : ''}` }),
      alerts.length > 0 && el('span', { class: 'trip__flags' }, [
        el('span', { class: 'tile__flag', 'aria-hidden': 'true', text: '!' }), alerts.map((f) => f.text).join(' · '),
        el('small', { class: 'trip__tap', text: ` · ${t('care.tapOpen').toLowerCase()}` }),
      ]),
    ]),
  ];
  const li = el('li', { class: `trip__stop trip__stop--${s.cond.level || 'ok'}${alerts.length ? ' trip__stop--action' : ''}` }, kids);
  if (!alerts.length) return li;
  const panelId = `trip-care-${i}`;
  const hit = el('button', {
    type: 'button', class: 'hit', 'aria-expanded': 'false', 'aria-controls': panelId,
    'aria-label': `${fmtTime(s.etaMs)}, ${s.name}: ${alerts.map((f) => f.text).join(', ')}. ${t('care.open')}`,
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
  const items = alerts.filter((f) => f.key && hasAdvice(f.key) && !seen.has(f.key) && seen.add(f.key)).map((f) => advice(f.key, f.level === 'danger' ? 'danger' : 'warn'));
  return el('li', { class: `care care--${s.cond.level} trip__care`, id, 'aria-live': 'polite' }, [
    el('header', { class: 'care__head' }, [
      el('strong', { text: `${fmtTime(s.etaMs)} · ${s.name}` }),
      el('button', { type: 'button', class: 'detail__close', 'aria-label': t('common.close'), text: '×', onclick: onClose }),
    ]),
    ...items.map((a) => el('div', { class: 'trip__care-item' }, [
      el('p', { class: 'care__reason' }, [el('strong', { text: a.title })]),
      el('ul', { class: 'care__list' }, [
        el('li', {}, [el('strong', { text: `🚗 ${t('care.drive')} ` }), a.drive]),
        el('li', {}, [el('strong', { text: `🚶 ${t('care.atStops')} ` }), a.walk]),
      ]),
    ])),
    el('small', { text: SOURCES() }),
  ]);
}

// Nome de cidade vem de serviço externo: entra como TEXTO, nunca como HTML (ADR-040)
const tipText = (s) => { const span = document.createElement('span'); span.textContent = s; return span; };

async function drawMap(box, route, stops) {
  const L = await loadLeaflet();
  if (map) { map.remove(); map = null; }
  map = L.map(box, { attributionControl: false, scrollWheelZoom: false });
  L.tileLayer(BASE_TILES, { maxZoom: 19, className: 'base-tiles' }).addTo(map);
  layer = L.layerGroup().addTo(map);
  addExpandControl(L, map, box);
  L.polyline(route.coords, { color: '#1a4c8c', weight: 7, opacity: 0.35 }).addTo(layer);
  // 6.0 — rota pintada por trecho, na cor do nível de atenção de cada parte do caminho
  let seg0 = 0;
  stops.forEach((s, i) => {
    if (!i) return;
    let best = seg0, bd = Infinity;
    for (let k = seg0; k < route.coords.length; k++) {
      const [la, lo] = route.coords[k];
      const d2 = (la - s.lat) ** 2 + (lo - s.lon) ** 2;
      if (d2 < bd) { bd = d2; best = k; }
    }
    L.polyline(route.coords.slice(seg0, best + 1), { color: LEVEL_COLOR[s.cond.level || 'ok'], weight: 5, opacity: 0.95 }).addTo(layer);
    seg0 = best;
  });
  addWeighMarkers(L);
  stops.forEach((s) => L.circleMarker([s.lat, s.lon], {
    radius: 8, weight: 2, color: '#fff', fillColor: LEVEL_COLOR[s.cond.level || 'ok'], fillOpacity: 1,
  }).bindTooltip(tipText(`${fmtTime(s.etaMs)} · ${s.name} · ${s.cond.label}`)).addTo(layer));
  // O mapa só mede o tamanho depois de entrar na tela: ajusta de novo em seguida (senão fica preso na saída)
  const fit = () => { map.invalidateSize(); map.fitBounds(L.latLngBounds(route.coords), { padding: [20, 20] }); };
  fit();
  requestAnimationFrame(() => setTimeout(fit, 60));
}
