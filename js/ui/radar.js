// Radar + "radar futuro" (ADR-012 e ADR-013).
// Linha do tempo única: últimas ~2 h do RADAR real (RainViewer) → próximas 24 h
// PREVISTAS pelo modelo (Open-Meteo, grade de pontos desenhada no mapa).
// Módulo isolado: se uma fonte falhar, a outra continua; se as duas falharem,
// só este cartão mostra aviso. A biblioteca de mapa só é baixada quando o cartão aparece.
import { el } from './dom.js?v=1.8';
import { getRadarFrames } from '../api/radar.js?v=1.8';
import { getPrecipGrid } from '../api/precip-grid.js?v=1.8';
import { speed, windDirection } from '../domain/units.js?v=1.8';
import { showToast } from './status.js?v=1.8';
import { load, save } from '../storage.js?v=1.8';

const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
// OpenStreetMap: grátis, sem chave (atribuição obrigatória). Claro por padrão; "Escuro" aplica filtro CSS.
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

let mapStyle = load('mapStyle') || 'light'; // 'light' | 'dark' (ADR-015)
let styleBox;
let root, mapBox, statusEl, timeEl, kindEl, slider, playBtn, windEl, modelNote;
let L, map, marker, meMarker, modelOverlay;
let centeredKey = ''; // só recentraliza quando a CIDADE muda (não a cada atualização da tela)
let timeline = [];          // [{ kind: 'radar'|'model', time, layer?, t? }]
let radarLayers = [], radarAt = 0;
let grid = null, gridKey = '', gridAt = 0, gridUrls = [];
let idx = 0, nowIdx = 0, timer = null, playing = false;
let started = false, radarFailed = false, modelFailed = false;
let pending = null;

export function mountRadar(container) {
  root = container;
  mapBox = el('div', { class: `radar__map radar__map--${mapStyle}`, role: 'img', 'aria-label': 'Mapa do radar de chuva' });
  styleBox = el('div', { class: 'segmented segmented--small', role: 'group', 'aria-label': 'Estilo do mapa' },
    [['light', 'Claro'], ['dark', 'Escuro']].map(([key, text]) => el('button', {
      type: 'button', 'aria-pressed': String(mapStyle === key), text,
      onclick: () => setMapStyle(key),
    })));
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
      styleBox,
    ]),
    el('p', { class: 'card__hint card__hint--line', text: 'Agora → próximas 24 h' }),
    el('div', { class: 'radar__wrap' }, [mapBox, kindEl, statusEl]),
    el('div', { class: 'radar__controls' }, [playBtn, slider, timeEl]),
    el('div', { class: 'radar__marks', 'aria-hidden': 'true' }, [
      el('span', { class: 'radar__marks-now', text: 'agora (radar)' }), el('span', { text: 'previsão +24 h →' }),
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
      'Aperte ▶ para ver para onde a chuva deve ir nas próximas 24 h. Agora: ',
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
    // Navegação livre pelo mundo (plano): arrastar, pinça/+−, do planeta inteiro (zoom 2) até a cidade (zoom 11).
    // Os nomes de países, estados e cidades vêm do próprio mapa e aparecem conforme o zoom.
    map = L.map(mapBox, {
      zoomControl: true, attributionControl: false,
      minZoom: 2, maxZoom: 11, worldCopyJump: true, scrollWheelZoom: false,
    });
    L.tileLayer(BASE_TILES, { maxZoom: 19, className: 'base-tiles' }).addTo(map);
    addHomeControls();
    // No computador, a roda do mouse só dá zoom depois de clicar no mapa (não atrapalha rolar a página)
    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());
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
      // Foco no que vem (pedido do Dalmo): do passado, só o quadro observado mais recente = "agora".
      const observed = frames.filter((f) => !f.nowcast);
      const wanted = [observed[observed.length - 1], ...frames.filter((f) => f.nowcast)].filter(Boolean);
      radarLayers.forEach((l) => map.removeLayer(l.layer));
      radarLayers = wanted.map((f) => ({
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
  radarLayers.forEach((r) => r.layer.setOpacity(f.kind === 'radar' && r.layer === f.layer ? 0.65 : 0));
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
  if (idx >= timeline.length - 1) show(0); // recomeça do agora
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
  const key = placeKey(place);
  if (key !== centeredKey) {           // cidade nova → centraliza; senão respeita onde o usuário navegou
    centeredKey = key;
    map.setView(ll, START_ZOOM, { animate: false });
  }

  // Seta do vento: aponta para ONDE o vento vai (a API informa de onde ele vem).
  const toward = ((data.current.windDir ?? 0) + 180) % 360;
  const html = `<div class="wind-pin"><span class="wind-pin__rot" style="transform: rotate(${toward}deg)"><b>▲</b></span><span class="wind-pin__dot"></span></div>`;
  const icon = L.divIcon({ className: '', html, iconSize: [64, 64], iconAnchor: [32, 32] });
  if (marker) marker.setLatLng(ll).setIcon(icon);
  else marker = L.marker(ll, { icon, keyboard: false, interactive: false }).addTo(map);
}

function setMapStyle(key) {
  mapStyle = key;
  save('mapStyle', key);
  mapBox.classList.toggle('radar__map--dark', key === 'dark');
  mapBox.classList.toggle('radar__map--light', key === 'light');
  styleBox.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(['light', 'dark'][i] === key)));
}

// Botões "voltar para a cidade" e "minha localização", abaixo do + / −.
function addHomeControls() {
  const Home = L.Control.extend({
    options: { position: 'topleft' },
    onAdd() {
      const box = L.DomUtil.create('div', 'leaflet-bar radar-home');
      const cityBtn = L.DomUtil.create('a', 'radar-home__btn', box);
      cityBtn.href = '#';
      cityBtn.title = 'Voltar para a cidade selecionada';
      cityBtn.setAttribute('role', 'button');
      cityBtn.setAttribute('aria-label', 'Voltar para a cidade selecionada');
      cityBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="currentColor"/></svg>';
      const meBtn = L.DomUtil.create('a', 'radar-home__btn', box);
      meBtn.href = '#';
      meBtn.title = 'Ir para a minha localização';
      meBtn.setAttribute('role', 'button');
      meBtn.setAttribute('aria-label', 'Ir para a minha localização');
      meBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
      L.DomEvent.disableClickPropagation(box);
      L.DomEvent.on(cityBtn, 'click', (e) => { L.DomEvent.preventDefault(e); goToCity(); });
      L.DomEvent.on(meBtn, 'click', (e) => { L.DomEvent.preventDefault(e); goToMe(meBtn); });
      return box;
    },
  });
  map.addControl(new Home());
}

function goToCity() {
  if (!pending) return;
  map.flyTo([pending.place.lat, pending.place.lon], START_ZOOM, { duration: 0.8 });
}

function goToMe(btn) {
  if (!('geolocation' in navigator)) { showToast('Seu navegador não oferece localização.'); return; }
  btn.classList.add('is-busy');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      btn.classList.remove('is-busy');
      const ll = [pos.coords.latitude, pos.coords.longitude];
      const icon = L.divIcon({ className: '', html: '<div class="me-pin" title="Você está aqui"></div>', iconSize: [20, 20], iconAnchor: [10, 10] });
      if (meMarker) meMarker.setLatLng(ll);
      else meMarker = L.marker(ll, { icon, keyboard: false, interactive: false }).addTo(map);
      map.flyTo(ll, 8, { duration: 0.8 });
    },
    (err) => {
      btn.classList.remove('is-busy');
      showToast(err.code === err.PERMISSION_DENIED ? 'Localização não permitida.' : 'Não foi possível obter sua localização.');
    },
    { timeout: 8000, maximumAge: 5 * 60 * 1000 },
  );
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
