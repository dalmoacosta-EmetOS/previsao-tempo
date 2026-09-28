// Radar + "radar futuro" (ADR-012 e ADR-013).
// Linha do tempo única: últimas ~2 h do RADAR real (RainViewer) → próximas 24 h
// PREVISTAS pelo modelo (Open-Meteo, grade de pontos desenhada no mapa).
// Módulo isolado: se uma fonte falhar, a outra continua; se as duas falharem,
// só este cartão mostra aviso. A biblioteca de mapa só é baixada quando o cartão aparece.
import { el, fill } from './dom.js?v=3.2.1';
import { getRadarFrames } from '../api/radar.js?v=3.2.1';
import { getPrecipGrid } from '../api/precip-grid.js?v=3.2.1';
import { speed, windDirection } from '../domain/units.js?v=3.2.1';
import { showToast } from './status.js?v=3.2.1';
import { load, save } from '../storage.js?v=3.2.1';

const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
// OpenStreetMap: grátis, sem chave (atribuição obrigatória). Claro por padrão; "Escuro" aplica filtro CSS.
// Obs.: o CARTO passou a exigir chave — descoberto no teste real de 27/09 (ADR-012).
const BASE_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const RADAR_MAX_ZOOM = 7;   // limite do serviço gratuito
const STEP_MS = 350;      // mais rápido (pedido do Dalmo)
const HOLD_NOW_MS = 900;
const RADAR_TTL = 10 * 60 * 1000;
const MODEL_TTL = 60 * 60 * 1000; // o modelo atualiza de hora em hora; poupa a cota gratuita
const START_ZOOM = 7;             // casa com o zoom máximo do radar e com a área da previsão

// Cores no padrão do Weather Channel (ADR-024/025): CHUVA verde-claro → verde → verde-escuro → vermelho,
// NEVE azul, GELO roxo, MISTURA rosa, NÉVOA amarelo-claro (por isso a chuva não usa amarelo). Valem para o player inteiro: a previsão nós pintamos direto; a imagem do radar
// (que a RainViewer só entrega em azul no plano gratuito) é REPINTADA no aparelho com estas cores.
// Limites em mm/h: Fraca < 2,5 · Moderada 2,5–7,6 · Forte 7,6–15 · Muito forte > 15.
export const LEGEND = [
  { label: 'Fraca', from: 0.1, rgb: [110, 215, 90] },
  { label: 'Moderada', from: 2.5, rgb: [35, 150, 50] },
  { label: 'Forte', from: 7.6, rgb: [15, 95, 35] },
  { label: 'Muito forte', from: 15, rgb: [225, 50, 40] },
];
const SNOW_LIGHT = [120, 195, 245], SNOW_DARK = [25, 95, 185]; // neve: azul-claro → azul (como no Weather Channel)
const SNOW_RGB = [60, 150, 225];                                 // amostra da legenda
const ICE_RGB = [125, 85, 215];   // gelo (garoa/chuva congelante): roxo
const MIX_RGB = [225, 95, 190];   // mistura chuva + neve: rosa
const FOG_RGB = [235, 222, 125];  // névoa/neblina: amarelo-claro
export const EXTRA_LEGEND = [
  { label: 'Neve', rgb: SNOW_RGB }, { label: 'Gelo', rgb: ICE_RGB },
  { label: 'Mistura', rgb: MIX_RGB }, { label: 'Névoa', rgb: FOG_RGB },
];
// Se o aparelho não conseguir repintar o radar, ele aparece nas cores originais (azul) e a legenda avisa.
export const RADAR_LEGEND = [
  { label: 'Fraca', rgb: [136, 221, 238] },
  { label: 'Moderada', rgb: [0, 119, 187] },
  { label: 'Forte', rgb: [255, 221, 0] },
  { label: 'Muito forte', rgb: [255, 68, 0] },
];
let recolorFailed = false;
let legendRadar, legendModel;
const STOPS = LEGEND.map((l) => [l.from, l.rgb]);
const DEBUG_GRID = new URLSearchParams(location.search).get('debug') === 'grade';
let debugLayer = null;

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
  mapBox = el('div', { class: `radar__map radar__map--${mapStyle}`, role: 'region', 'aria-label': 'Mapa do radar de chuva' });
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

  fill(root,
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
      // Uma legenda para o player inteiro (ADR-024). A outra só aparece se o radar não puder ser repintado.
      legendRadar = el('ul', { class: 'radar__legend', 'aria-label': 'Legenda do radar (cores originais)', hidden: true }, [
        el('li', { class: 'radar__legend-title', text: 'Radar · chuva:' }),
        ...RADAR_LEGEND.map((l) => el('li', {}, [
          el('b', { style: `background: rgb(${l.rgb.join(',')})`, 'aria-hidden': 'true' }), l.label,
        ])),
      ]),
      legendModel = el('ul', { class: 'radar__legend', 'aria-label': 'Legenda de chuva e neve' }, [
        el('li', { class: 'radar__legend-title', text: 'Legenda:' }),
        ...LEGEND.map((l) => el('li', {}, [
          el('b', { style: `background: rgb(${l.rgb.join(',')})`, 'aria-hidden': 'true' }), l.label,
        ])),
        ...EXTRA_LEGEND.map((l) => el('li', {}, [
          el('b', { style: `background: rgb(${l.rgb.join(',')})`, 'aria-hidden': 'true' }), l.label,
        ])),
      ]),
      windEl,
    ]),
    el('p', { class: 'radar__note' }, [
      'Aperte ▶ para ver para onde a chuva deve ir nas próximas 24 h. Neve, gelo, mistura e névoa vêm da previsão do modelo (radar não distingue o tipo nem enxerga névoa). Agora: ',
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
  // Seta aponta para ONDE o vento vai (a API informa de onde ele vem).
  const toward = ((c.windDir ?? 0) + 180) % 360;
  windEl.replaceChildren(
    el('span', { class: 'wind-arrow', style: `transform: rotate(${toward}deg)`, 'aria-hidden': 'true', text: '↑' }),
    ` Vento ${windDirection(c.windDir)} ${speed(c.wind, unit)}`,
  );
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
        layer: new (recolorLayerClass())(f.url, { opacity: 0, maxNativeZoom: RADAR_MAX_ZOOM, maxZoom: 10, zIndex: 10 }).addTo(map),
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
      drawDebug(f.t);
      modelOverlay.setOpacity(0.8);
    } else if (grid) {
      // quadro "agora": sobre o radar, só neve/gelo/mistura/névoa da hora atual do modelo
      const h = nearestHour(f.time);
      modelOverlay.setUrl(frameUrl(h, 'extras'));
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
  const original = f.kind === 'radar' && recolorFailed;
  legendRadar.hidden = !original;
  legendModel.hidden = original;
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

// mode 'all' = previsão completa · 'extras' = só neve, gelo, mistura e névoa (sobre o radar "agora",
// porque o radar enxerga gotas, não o tipo delas, e não enxerga névoa — ADR-025).
function frameUrl(t, mode = 'all') {
  const key = `${mode}:${t}`;
  if (gridUrls[key]) return gridUrls[key];
  const { rows, cols, values, snow, kind, fog } = grid;
  const W = 220, H = 220;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(W, H);
  const v = values[t], s = snow[t], k = kind?.[t], fg = fog?.[t];
  for (let y = 0; y < H; y++) {
    const gy = (y / (H - 1)) * (rows - 1);
    const r0 = Math.floor(gy), r1 = Math.min(r0 + 1, rows - 1), fy = gy - r0;
    for (let x = 0; x < W; x++) {
      const gx = (x / (W - 1)) * (cols - 1);
      const c0 = Math.floor(gx), c1 = Math.min(c0 + 1, cols - 1), fx = gx - c0;
      const edge = Math.min(1, Math.min(x, y, W - 1 - x, H - 1 - y) / (W * 0.12)); // bordas esfumaçadas
      const mm = bilinear(v, r0, r1, c0, c1, fx, fy);
      let rgb = null, a = 0;
      if (mm >= 0.1) {
        const type = k ? k[Math.round(gy)][Math.round(gx)] : 0;   // tipo = ponto da grade mais próximo
        const cm = bilinear(s, r0, r1, c0, c1, fx, fy);
        if (type === 3) rgb = ICE_RGB;
        else if (type === 2) rgb = MIX_RGB;
        else if (type === 1 || cm > 0.05) rgb = lerp(SNOW_LIGHT, SNOW_DARK, clamp01(cm / 2));
        else if (mode === 'all') rgb = colorFor(mm);
        a = Math.min(215, 165 + mm * 8);
      }
      if (!rgb && fg && bilinear(fg, r0, r1, c0, c1, fx, fy) >= 0.5) { rgb = FOG_RGB; a = 150; }
      if (!rgb) continue;
      const p = (y * W + x) * 4;
      img.data[p] = rgb[0]; img.data[p + 1] = rgb[1]; img.data[p + 2] = rgb[2]; img.data[p + 3] = a * edge;
    }
  }
  ctx.putImageData(img, 0, 0);
  gridUrls[key] = cv.toDataURL('image/png');
  return gridUrls[key];
}

function nearestHour(time) {
  let best = 0;
  grid.times.forEach((t, i) => { if (Math.abs(t - time) < Math.abs(grid.times[best] - time)) best = i; });
  return best;
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

// ---------- radar repintado (ADR-024) ----------
// A RainViewer gratuita entrega o radar em azul → amarelo → vermelho. Cada ladrilho é desenhado
// num canvas e cada pixel troca para a cor equivalente do padrão Weather Channel (verde...).
// Se o navegador não permitir ler o ladrilho, ele aparece como veio e a legenda original é mostrada.
let RecolorLayer = null;
function recolorLayerClass() {
  if (RecolorLayer) return RecolorLayer;
  RecolorLayer = L.TileLayer.extend({
    createTile(coords, done) {
      const tile = document.createElement('canvas');
      tile.width = tile.height = 256;
      const url = this.getTileUrl(coords);
      const draw = (img, repaint) => {
        const ctx = tile.getContext('2d');
        ctx.drawImage(img, 0, 0, 256, 256);
        if (repaint) {
          try {
            const d = ctx.getImageData(0, 0, 256, 256);
            recolorPixels(d.data);
            ctx.putImageData(d, 0, 0);
          } catch { markRecolorFailed(); }
        }
        done(null, tile);
      };
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => draw(img, true);
      img.onerror = () => {                 // sem permissão de leitura: mostra o original
        const plain = new Image();
        plain.onload = () => { markRecolorFailed(); draw(plain, false); };
        plain.onerror = (e) => done(e, tile);
        plain.src = url;
      };
      img.src = url;
      return tile;
    },
  });
  return RecolorLayer;
}

function markRecolorFailed() {
  if (recolorFailed) return;
  recolorFailed = true;
  if (timeline.length) show(idx);
}

const lerp = (a, b, k) => a.map((c, j) => Math.round(c + (b[j] - c) * k));
const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** Troca as cores "Universal Blue" da RainViewer pelas do padrão Weather Channel.
 *  Regra conservadora (ADR-037): só vira "muito forte" o que é claramente laranja/vermelho/rosa
 *  intenso na origem; cinzas, brancos e bordas suavizadas (eco fraco) viram "fraca" — nunca exagera. */
export function recolorPixels(px) {
  const [fraca, moderada, forte, muitoForte] = LEGEND.map((l) => l.rgb);
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    let out;
    if (sat < 0.3) {
      out = fraca;                                            // cinza/branco/borda: eco fraco
    } else if (b >= r && b + 10 >= g) {
      out = lerp(fraca, moderada, clamp01((225 - g) / 110));  // azul-claro → azul-escuro
    } else if (r > 180 && g > 160 && b < 140) {
      out = forte;                                            // amarelo
    } else if (r > 180 && g < 0.75 * r && (b < 120 || b > 150)) {
      out = muitoForte;                                       // laranja, vermelho, rosa/magenta intensos
    } else {
      out = fraca;                                            // qualquer cor ambígua: não exagera
    }
    px[i] = out[0]; px[i + 1] = out[1]; px[i + 2] = out[2];
  }
  return px;
}

// ?debug=grade — mostra o valor previsto (mm/h) em cada ponto da grade, para conferência.
function drawDebug(t) {
  if (!DEBUG_GRID || !grid) return;
  if (debugLayer) map.removeLayer(debugLayer);
  debugLayer = L.layerGroup().addTo(map);
  const [[s, w], [n, e]] = grid.bounds;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const lat = n - (r * (n - s)) / (grid.rows - 1);
      const lon = w + (c * (e - w)) / (grid.cols - 1);
      const v = grid.values[t][r][c];
      L.marker([lat, lon], { interactive: false, icon: L.divIcon({ className: 'debug-val', html: v.toFixed(1), iconSize: [34, 16] }) }).addTo(debugLayer);
    }
  }
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
  const { place } = pending;
  const ll = [place.lat, place.lon];
  const key = placeKey(place);
  if (key !== centeredKey) {           // cidade nova → centraliza; senão respeita onde o usuário navegou
    centeredKey = key;
    map.setView(ll, START_ZOOM, { animate: false });
  }

  // Marcador discreto da cidade (a seta do vento parecia um botão "play" — foi para a legenda).
  const icon = L.divIcon({ className: '', html: '<div class="city-pin"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
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
