// Radar animado (ADR-012). Módulo isolado: se falhar, só este cartão mostra aviso;
// o resto do site continua funcionando. A biblioteca de mapa só é baixada
// quando o cartão aparece na tela.
import { el } from './dom.js';
import { getRadarFrames } from '../api/radar.js';
import { speed, windDirection } from '../domain/units.js';

const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
const BASE_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const RADAR_MAX_ZOOM = 7;   // limite do serviço gratuito
const STEP_MS = 700;
const HOLD_LAST_MS = 1800;
const FRAMES_TTL = 10 * 60 * 1000;

let root, mapBox, statusEl, timeEl, slider, playBtn, windEl;
let L, map, marker;
let frames = [], layers = [], idx = 0, timer = null, playing = false, framesAt = 0;
let started = false, failed = false;
let pending = null; // { place, data, unit } recebido antes do mapa ficar pronto

export function mountRadar(container) {
  root = container;
  mapBox = el('div', { class: 'radar__map', role: 'img', 'aria-label': 'Mapa do radar de chuva' });
  statusEl = el('div', { class: 'radar__status', text: 'Carregando radar…' });
  playBtn = el('button', { class: 'radar__play', type: 'button', 'aria-label': 'Reproduzir animação', text: '▶', onclick: togglePlay });
  slider = el('input', { class: 'radar__slider', type: 'range', min: '0', max: '0', value: '0', 'aria-label': 'Momento do radar', oninput: () => { stop(); show(Number(slider.value)); } });
  timeEl = el('span', { class: 'radar__time', text: '--' });
  windEl = el('span', { class: 'radar__wind' });

  root.replaceChildren(
    el('header', { class: 'card__head' }, [
      el('h2', { text: 'Radar de chuva' }),
      el('span', { class: 'card__hint', text: 'últimas 2 horas' }),
    ]),
    el('div', { class: 'radar__wrap' }, [mapBox, statusEl]),
    el('div', { class: 'radar__controls' }, [playBtn, slider, timeEl]),
    el('div', { class: 'radar__foot' }, [
      el('div', { class: 'radar__legend' }, [
        el('span', { text: 'Fraca' }), el('i', { 'aria-hidden': 'true' }), el('span', { text: 'Forte' }),
      ]),
      windEl,
    ]),
    el('p', { class: 'radar__note' }, [
      'Veja para onde as áreas de chuva estão indo: aperte ▶. Radar: ',
      el('a', { href: 'https://www.rainviewer.com/', target: '_blank', rel: 'noopener', text: 'Weather data by RainViewer' }),
      ' · Mapa: © OpenStreetMap, © CARTO',
    ]),
  );

  // Só carrega quando o cartão aparece (economiza dados no celular).
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
  if (map) applyPlace();
  if (map && Date.now() - framesAt > FRAMES_TTL) loadFrames();
}

// ---------- interno ----------

async function start() {
  if (started) return;
  started = true;
  try {
    L = await loadLeaflet();
    map = L.map(mapBox, { zoomControl: true, attributionControl: false, minZoom: 3, maxZoom: 10, scrollWheelZoom: false });
    L.tileLayer(BASE_TILES, { subdomains: 'abcd', maxZoom: 19 }).addTo(map);
    map.setView([42.36, -71.06], 6);
    applyPlace();
    await loadFrames();
  } catch (err) {
    fail();
  }
}

function applyPlace() {
  if (!pending || !map) return;
  const { place, data } = pending;
  const ll = [place.lat, place.lon];
  const zoomNow = map.getZoom();
  map.setView(ll, zoomNow >= 5 ? zoomNow : 6, { animate: false });

  // Seta do vento: aponta para ONDE o vento vai (a API informa de onde ele vem).
  const toward = ((data.current.windDir ?? 0) + 180) % 360;
  const html = `<div class="wind-pin"><span class="wind-pin__rot" style="transform: rotate(${toward}deg)"><b>▲</b></span><span class="wind-pin__dot"></span></div>`;
  const icon = L.divIcon({ className: '', html, iconSize: [64, 64], iconAnchor: [32, 32] });
  if (marker) marker.setLatLng(ll).setIcon(icon);
  else marker = L.marker(ll, { icon, keyboard: false, interactive: false }).addTo(map);
}

async function loadFrames() {
  try {
    const list = await getRadarFrames();
    if (!list.length) throw new Error('sem quadros');
    layers.forEach((l) => map.removeLayer(l));
    frames = list;
    layers = frames.map((f) => L.tileLayer(f.url, {
      opacity: 0, maxNativeZoom: RADAR_MAX_ZOOM, maxZoom: 10, zIndex: 10,
    }).addTo(map));
    framesAt = Date.now();
    slider.max = String(frames.length - 1);
    statusEl.hidden = true;
    show(frames.length - 1);
  } catch {
    fail();
  }
}

function show(i) {
  if (!layers.length) return;
  layers.forEach((l, j) => l.setOpacity(j === i ? 0.75 : 0));
  idx = i;
  slider.value = String(i);
  const mins = Math.round((Date.now() - frames[i].time) / 60000);
  timeEl.textContent = i === frames.length - 1 ? `Agora (há ${Math.max(mins, 0)} min)` : `há ${mins} min`;
}

function togglePlay() {
  if (playing) stop(); else play();
}

function play() {
  if (!layers.length) return;
  playing = true;
  playBtn.textContent = '❚❚';
  playBtn.setAttribute('aria-label', 'Pausar animação');
  if (idx >= frames.length - 1) show(0);
  const tick = () => {
    const next = idx + 1 >= frames.length ? 0 : idx + 1;
    show(next);
    timer = setTimeout(tick, next === frames.length - 1 ? HOLD_LAST_MS : STEP_MS);
  };
  timer = setTimeout(tick, STEP_MS);
}

function stop() {
  playing = false;
  clearTimeout(timer);
  playBtn.textContent = '▶';
  playBtn.setAttribute('aria-label', 'Reproduzir animação');
}

function fail() {
  if (failed) return;
  failed = true;
  statusEl.hidden = false;
  statusEl.textContent = 'Radar indisponível no momento. O restante da previsão segue normal.';
  playBtn.disabled = true;
  slider.disabled = true;
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
