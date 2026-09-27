// Radar + "radar futuro" (ADR-012 e ADR-013).
// Linha do tempo única: últimas ~2 h do RADAR real (RainViewer) → próximas 24 h
// PREVISTAS pelo modelo (Open-Meteo, grade de pontos desenhada no mapa).
// Módulo isolado: se uma fonte falhar, a outra continua; se as duas falharem,
// só este cartão mostra aviso. A biblioteca de mapa só é baixada quando o cartão aparece.
import { el } from './dom.js';
import { getRadarFrames } from '../api/radar.js';
import { getPrecipGrid } from '../api/precip-grid.js';
import { speed, windDirection } from '../domain/units.js';

const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
// OpenStreetMap: grátis, sem chave (atribuição obrigatória). Escurecido por CSS (.base-tiles).
// Obs.: o CARTO passou a exigir chave — descoberto no teste real de 27/09 (ADR-012).
const BASE_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const RADAR_MAX_ZOOM = 7;   // limite do serviço gratuito
const STEP_MS = 650;
const HOLD_NOW_MS = 1500;
const RADAR_TTL = 10 * 60 * 1000;
const MODEL_TTL = 60 * 60 * 1000; // o modelo atualiza de hora em hora; poupa a cota gratuita
const START_ZOOM = 7;             // casa com o zoom máximo do radar e com a área da previsão

// Mesma escala de cores para radar e previsão (mm/h).
const STOPS = [
  [0.1, [155, 225, 255]], [0.5, [51, 168, 255]], [1.5, [0, 99, 209]],
  [4, [255, 225, 77]], [8, [255, 154, 31]], [16, [255, 59, 48]],
];

let root, mapBox, statusEl, timeEl, kindEl, slider, playBtn, windEl, modelNote;
let L, map, marker, modelOverlay;
let timeline = [];          // [{ kind: 'radar'|'model', time, layer?, t? }]
let radarLayers = [], radarAt = 0;
let grid = null, gridKey = '', gridAt = 0, gridUrls = [];
let idx = 0, nowIdx = 0, timer = null, playing = false;
let started = false, radarFailed = false, modelFailed = false;
let pending = null;

export function mountRadar(container) {
  root = container;
  mapBox = el('div', { class: 'radar__map', role: 'img', 'aria-label': 'Mapa do radar de chuva' });
  statusEl = el('div', { class: 'radar__status', text: 'Carregando radar…' });
  kindEl = el('span', { class: 'radar__kind' });
  playBtn = el('button', { class: 'radar__play', type: 'button', 'aria-label': 'Reproduzir animação', text: '▶', onclick: togglePlay });
  slider = el('input', { class: 'radar__slider', type: 'range', min: '0', max: '0', value: '0', 'aria-label': 'Momento do radar', oninput: () => { stop(); show(Number(slider.value)); } });
  timeEl = el('span', { class: 'radar__time', text: '--' });
  windEl = el('span', { class: 'radar__wind' });
  modelNote = el('p', { class: 'radar__warn', hidden: true, text: 'Previsão do modelo: áreas aproximadas (cada quadradinho ≈ 30–50 km). Não é radar.' });

  root.replaceChildren(
    el('header', { class: 'card__head' }, [
      el('h2', { text: 'Radar de chuva' }),
      el('span', { class: 'card__hint', text: '2 h atrás → 24 h à frente' }),
    ]),
    el('div', { class: 'radar__wrap' }, [mapBox, kindEl, statusEl]),
    el('div', { class: 'radar__controls' }, [playBtn, slider, timeEl]),
    el('div', { class: 'radar__marks', 'aria-hidden': 'true' }, [
      el('span', { text: '← radar' }), el('span', { class: 'radar__marks-now', text: 'agora' }), el('span', { text: 'previsão →' }),
    ]),
    modelNote,
    el('div', { class: 'radar__foot' }, [
      el('div', { class: 'radar__legend' }, [
        el('span', { text: 'Fraca' }), el('i', { 'aria-hidden': 'true' }), el('span', { text: 'Forte' }),
        el('b', { class: 'radar__snow', title: 'Neve prevista' }), el('span', { text: 'Neve' }),
      ]),
      windEl,
    ]),
    el('p', { class: 'radar__note' }, [
      'Aperte ▶ para ver de onde a chuva veio e para onde deve ir. Radar: ',
      el('a', { href: 'https://www.rainviewer.com/', target: '_blank', rel: 'noopener', text: 'Weather data by RainViewer' }),
      ' · Previsão: Open-Meteo · Mapa: ',
      el('a', { href: 'https://www.openstreetmap.org/copyright', target: '_blank', rel: 'noopener', text: '© OpenStreetMap' }),
    ]),
  );

  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); start(); }
  }, { rootMargin: '200px' });
  io.observe(root);
}

/** Chamado a cada renderização do site. */
export function updateRadar({ place, data, unit }) {
  if (!root || !place || !data) return;
  const c = data.current;
  windEl.textContent = `Vento ${windDirection(c.windDir)} ${speed(c.wind, unit)}`;
  pending = { place, data, unit };
  if (!map) return;
  applyPlace();
  const key = placeKey(place);
  const stale = Date.now() - radarAt > RADAR_TTL || key !== gridKey || Date.now() - gridAt > MODEL_TTL;
  if (stale) refresh();
}

// ---------- interno ----------

const placeKey = (p) => `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;

async function start() {
  if (started) return;
  started = true;
  try {
    L = await loadLeaflet();
    map = L.map(mapBox, { zoomControl: true, attributionControl: false, minZoom: 3, maxZoom: 10, scrollWheelZoom: false });
    L.tileLayer(BASE_TILES, { maxZoom: 19, className: 'base-tiles' }).addTo(map);
    map.setView(pending ? [pending.place.lat, pending.place.lon] : [42.36, -71.06], START_ZOOM);
    applyPlace();
    await refresh();
  } catch {
    radarFailed = modelFailed = true;
    showStatus();
  }
}

async function refresh() {
  const place = pending?.place;
  const tasks = [];

  if (Date.now() - radarAt > RADAR_TTL) {
    tasks.push(getRadarFrames().then((frames) => {
      if (!frames.length) throw new Error('sem quadros');
      radarLayers.forEach((l) => map.removeLayer(l.layer));
      radarLayers = frames.map((f) => ({
        ...f,
        layer: L.tileLayer(f.url, { opacity: 0, maxNativeZoom: RADAR_MAX_ZOOM, maxZoom: 10, zIndex: 10 }).addTo(map),
      }));
      radarAt = Date.now();
      radarFailed = false;
    }).catch(() => { radarFailed = true; }));
  }

  if (place && (placeKey(place) !== gridKey || Date.now() - gridAt > MODEL_TTL)) {
    const key = placeKey(place);
    tasks.push(getPrecipGrid(place.lat, place.lon).then((g) => {
      grid = g;
      gridKey = key;
      gridAt = Date.now();
      gridUrls = [];
      if (modelOverlay) map.removeLayer(modelOverlay);
      modelOverlay = L.imageOverlay(blankPng(), g.bounds, { opacity: 0, zIndex: 11, interactive: false }).addTo(map);
      modelFailed = false;
    }).catch(() => { modelFailed = true; }));
  }

  await Promise.all(tasks);
  buildTimeline();
}

function buildTimeline() {
  const now = Date.now();
  const radar = radarLayers.filter((f) => !f.nowcast || f.time > now - 5 * 60000);
  const lastRadar = radar.length ? radar[radar.length - 1].time : now;
  const model = grid
    ? grid.times.map((time, t) => ({ kind: 'model', time, t })).filter((m) => m.time > lastRadar + 20 * 60000)
    : [];

  timeline = [...radar.map((f) => ({ kind: 'radar', time: f.time, layer: f.layer, nowcast: f.nowcast })), ...model];
  if (!timeline.length) { showStatus(); return; }

  // "Agora" = último quadro de radar observado (ou o primeiro da previsão)
  const observed = timeline.map((f, i) => (f.kind === 'radar' && !f.nowcast ? i : -1)).filter((i) => i >= 0);
  nowIdx = observed.length ? observed[observed.length - 1] : 0;
  slider.max = String(timeline.length - 1);
  root.style.setProperty('--now', `${(nowIdx / Math.max(timeline.length - 1, 1)) * 100}%`);
  showStatus();
  show(nowIdx);
}

function show(i) {
  if (!timeline.length) return;
  const f = timeline[i];
  radarLayers.forEach((r) => r.layer.setOpacity(f.kind === 'radar' && r.layer === f.layer ? 0.75 : 0));
  if (modelOverlay) {
    if (f.kind === 'model') {
      modelOverlay.setUrl(frameUrl(f.t));
      modelOverlay.setOpacity(0.8);
    } else {
      modelOverlay.setOpacity(0);
    }
  }
  idx = i;
  slider.value = String(i);
  timeEl.textContent = label(f, i);
  kindEl.textContent = f.kind === 'radar' ? (f.nowcast ? 'RADAR · projeção curta' : 'RADAR') : 'PREVISÃO DO MODELO';
  kindEl.className = `radar__kind radar__kind--${f.kind}`;
  modelNote.hidden = f.kind !== 'model';
}

function label(f, i) {
  const diffMin = Math.round((f.time - Date.now()) / 60000);
  const tz = pending?.data?.timezone;
  let clock = '';
  try {
    clock = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date(f.time));
  } catch { /* fuso desconhecido */ }
  if (i === nowIdx) return `Agora · ${clock}`;
  if (diffMin < 0) return `há ${Math.abs(diffMin)} min · ${clock}`;
  const h = Math.round(diffMin / 60);
  return h >= 1 ? `+${h} h · ${clock}` : `+${diffMin} min · ${clock}`;
}

// ---------- desenho da previsão (canvas com interpolação suave) ----------

function frameUrl(t) {
  if (gridUrls[t]) return gridUrls[t];
  const { rows, cols, values, snow } = grid;
  const W = 220, H = 220;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(W, H);
  const v = values[t], s = snow[t];
  for (let y = 0; y < H; y++) {
    const gy = (y / (H - 1)) * (rows - 1);
    const r0 = Math.floor(gy), r1 = Math.min(r0 + 1, rows - 1), fy = gy - r0;
    for (let x = 0; x < W; x++) {
      const gx = (x / (W - 1)) * (cols - 1);
      const c0 = Math.floor(gx), c1 = Math.min(c0 + 1, cols - 1), fx = gx - c0;
      const mm = bilinear(v, r0, r1, c0, c1, fx, fy);
      if (mm < 0.1) continue;
      const cm = bilinear(s, r0, r1, c0, c1, fx, fy);
      const [R, G, B] = cm > 0.05 ? [232, 214, 255] : colorFor(mm);
      // bordas esfumaçadas: evita o "quadrado" no limite da área calculada
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y) / (W * 0.12);
      const a = Math.min(200, 90 + mm * 25) * Math.min(1, edge);
      const p = (y * W + x) * 4;
      img.data[p] = R; img.data[p + 1] = G; img.data[p + 2] = B; img.data[p + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  gridUrls[t] = cv.toDataURL('image/png');
  return gridUrls[t];
}

function bilinear(m, r0, r1, c0, c1, fx, fy) {
  const top = m[r0][c0] * (1 - fx) + m[r0][c1] * fx;
  const bot = m[r1][c0] * (1 - fx) + m[r1][c1] * fx;
  return top * (1 - fy) + bot * fy;
}

function colorFor(mm) {
  for (let i = STOPS.length - 1; i >= 0; i--) {
    if (mm >= STOPS[i][0]) {
      const next = STOPS[i + 1];
      if (!next) return STOPS[i][1];
      const k = (mm - STOPS[i][0]) / (next[0] - STOPS[i][0]);
      return STOPS[i][1].map((c, j) => Math.round(c + (next[1][j] - c) * k));
    }
  }
  return STOPS[0][1];
}

function blankPng() {
  return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
}

// ---------- controles ----------

function togglePlay() {
  if (playing) stop(); else play();
}

function play() {
  if (!timeline.length) return;
  playing = true;
  playBtn.textContent = '❚❚';
  playBtn.setAttribute('aria-label', 'Pausar animação');
  if (idx >= timeline.length - 1 || idx === nowIdx) show(0); // conta a história inteira: passado → previsão
  const tick = () => {
    const next = idx + 1 >= timeline.length ? 0 : idx + 1;
    show(next);
    timer = setTimeout(tick, next === nowIdx || next === timeline.length - 1 ? HOLD_NOW_MS : STEP_MS);
  };
  timer = setTimeout(tick, STEP_MS);
}

function stop() {
  playing = false;
  clearTimeout(timer);
  playBtn.textContent = '▶';
  playBtn.setAttribute('aria-label', 'Reproduzir animação');
}

function showStatus() {
  const bothFailed = radarFailed && modelFailed;
  statusEl.hidden = !bothFailed && timeline.length > 0;
  if (bothFailed || !timeline.length) {
    statusEl.textContent = 'Radar indisponível no momento. O restante da previsão segue normal.';
    playBtn.disabled = true;
    slider.disabled = true;
  } else {
    playBtn.disabled = false;
    slider.disabled = false;
  }
}

function applyPlace() {
  if (!pending || !map) return;
  const { place, data } = pending;
  const ll = [place.lat, place.lon];
  const zoomNow = map.getZoom();
  map.setView(ll, zoomNow >= 5 ? zoomNow : START_ZOOM, { animate: false });

  // Seta do vento: aponta para ONDE o vento vai (a API informa de onde ele vem).
  const toward = ((data.current.windDir ?? 0) + 180) % 360;
  const html = `<div class="wind-pin"><span class="wind-pin__rot" style="transform: rotate(${toward}deg)"><b>▲</b></span><span class="wind-pin__dot"></span></div>`;
  const icon = L.divIcon({ className: '', html, iconSize: [64, 64], iconAnchor: [32, 32] });
  if (marker) marker.setLatLng(ll).setIcon(icon);
  else marker = L.marker(ll, { icon, keyboard: false, interactive: false }).addTo(map);
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = LEAFLET_CSS;
    document.head.append(css);
    const s = document.createElement('script');
    s.src = LEAFLET_JS;
    s.onload = () => (window.L ? resolve(window.L) : reject(new Error('Leaflet')));
    s.onerror = () => reject(new Error('Leaflet'));
    document.head.append(s);
    setTimeout(() => reject(new Error('timeout')), 12000);
  });
}
