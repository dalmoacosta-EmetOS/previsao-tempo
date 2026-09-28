// Controlador: liga eventos → serviços → estado → interface.
import { getState, setState, subscribe } from './state.js?v=2.3.1';
import { load, save } from './storage.js?v=2.3.1';
import { getOfficialAlerts } from './api/official-alerts.js?v=2.3.1';
import { getForecast } from './api/forecast.js?v=2.3.1';
import { reverseGeocode } from './api/geocoding.js?v=2.3.1';
import { resolveWeatherNow } from './domain/scene.js?v=2.3.1';
import { applyScene, DEMO_SCENES } from './ui/background.js?v=2.3.1';
import { renderCurrent, renderHeroSkeleton } from './ui/current.js?v=2.3.1';
import { renderHourly } from './ui/hourly.js?v=2.3.1';
import { renderDaily } from './ui/daily.js?v=2.3.1';
import { renderDetails } from './ui/details.js?v=2.3.1';
import { renderAlerts } from './ui/alerts.js?v=2.3.1';
import { renderError, showToast } from './ui/status.js?v=2.3.1';
import { setupSearch } from './ui/search.js?v=2.3.1';
import { renderCityBar, setupScrollHelpers } from './ui/navigation.js?v=2.3.1';
import { mountRadar, updateRadar } from './ui/radar.js?v=2.3.1';

export const VERSION = '2.3.1';

// Cidade reserva quando a localização não está disponível (ADR-008).
const FALLBACK_PLACE = { name: 'Boston', region: 'Massachusetts', country: 'Estados Unidos', lat: 42.3601, lon: -71.0589 };

const $ = (id) => document.getElementById(id);
const sections = {
  current: $('current'), status: $('status'), alerts: $('alerts'),
  hourly: $('hourly'), daily: $('daily'), details: $('details'),
};

// ---------- Renderização ----------
function render(state) {
  document.body.classList.toggle('is-loading', state.status === 'loading');
  document.body.classList.toggle('has-data', !!state.data);
  document.body.classList.remove('is-booting');

  document.querySelectorAll('.topbar [data-unit]').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.unit === state.unit)));

  renderError(sections.status, state.status === 'error' ? state.error : null);

  if (!state.data) {
    if (state.status === 'loading') renderHeroSkeleton(sections.current);
    else sections.current.replaceChildren();
    return;
  }

  applyScene(state.demo || resolveWeatherNow(state.data));
  renderCurrent(sections.current, state);
  renderCityBar(state);
  renderAlerts(sections.alerts, state);
  const onTempMode = (tempMode) => { save('tempMode', tempMode); setState({ tempMode }); };
  renderHourly(sections.hourly, state, onTempMode, (hourSel) => setState({ hourSel }));
  renderDaily(sections.daily, state, (days) => setState({ days }), onTempMode,
    (daySel) => setState({ daySel, dayPart: 'day' }), (dayPart) => setState({ dayPart }));
  renderDetails(sections.details, state, (tileSel) => setState({ tileSel }));
  updateRadar(state);
}

// ?debug=grade — mostra diagnósticos no rodapé (ADR-018/021)
function debugNote(msg) {
  if (new URLSearchParams(location.search).get('debug') !== 'grade') return;
  let box = document.getElementById('debug-box');
  if (!box) {
    box = document.createElement('pre');
    box.id = 'debug-box';
    box.className = 'debug-box';
    document.querySelector('.footer').prepend(box);
  }
  box.textContent = `${new Date().toLocaleTimeString()} · ${msg}\n` + box.textContent;
}

// ---------- Ações ----------
async function loadPlace(place, { remember = true } = {}) {
  setState({ status: 'loading', error: null, place: getState().data ? getState().place : place });
  try {
    const data = await getForecast(place.lat, place.lon);
    const samePlace = getState().place && getState().place.lat === place.lat && getState().place.lon === place.lon;
    setState({ place, data, status: 'ok', ...(samePlace ? {} : { hourSel: null, daySel: null, tileSel: null, official: [] }) });
    // Alertas oficiais em paralelo; se falharem, o site segue (ADR-020)
    getOfficialAlerts(place.lat, place.lon)
      .then((official) => {
        debugNote(`Alertas oficiais (NWS): ${official.length} ativo(s) para este ponto`);
        if (getState().place === place || getState().place?.lat === place.lat) setState({ official });
      })
      .catch((err) => debugNote(`Alertas oficiais (NWS): FALHOU — ${err.kind || ''} ${err.message || ''}`));
    if (remember && !place.isGeo) save('place', place);
    document.title = `${place.name} · Previsão do Tempo`;
  } catch (err) {
    setState({ status: 'error', error: { kind: err.kind || 'network', retry: () => loadPlace(place, { remember }) } });
  }
}

function locate({ auto = false } = {}) {
  const fail = (msg) => {
    if (auto) {
      showToast(`${msg} Mostrando Boston — busque sua cidade acima.`);
      loadPlace(FALLBACK_PLACE, { remember: false });
    } else {
      showToast(msg);
    }
  };

  if (!('geolocation' in navigator)) return fail('Seu navegador não oferece localização.');

  $('locate-btn').classList.add('is-busy');
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      $('locate-btn').classList.remove('is-busy');
      const { latitude: lat, longitude: lon } = pos.coords;
      const place = { name: 'Sua localização', region: '', country: '', lat, lon, isGeo: true };
      const [named] = await Promise.all([reverseGeocode(lat, lon), loadPlace(place)]);
      if (named && getState().place === place) {
        const updated = { ...place, ...named };
        setState({ place: updated });
        document.title = `${updated.name} · Previsão do Tempo`;
      }
    },
    (err) => {
      $('locate-btn').classList.remove('is-busy');
      fail(err.code === err.PERMISSION_DENIED
        ? 'Localização não permitida.'
        : 'Não foi possível obter sua localização.');
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
  );
}

// ---------- Início ----------
function init() {
  subscribe(render);
  mountRadar(document.getElementById('radar'));
  setupScrollHelpers();
  $('version').textContent = `versão ${VERSION}`;

  // Modo demonstração: ?demo=chuva | neve | tempestade | noite | sol | nublado | neblina | parcial
  const demoKey = new URLSearchParams(location.search).get('demo');
  if (demoKey && DEMO_SCENES[demoKey]) {
    setState({ demo: DEMO_SCENES[demoKey] });
    $('demo-badge').hidden = false;
    $('demo-badge').textContent = `DEMO · ${demoKey}`;
  }

  setupSearch({
    input: $('search-input'),
    list: $('search-list'),
    onSelect: (place) => loadPlace(place),
  });

  $('locate-btn').addEventListener('click', () => locate());

  document.querySelectorAll('.topbar [data-unit]').forEach((btn) =>
    btn.addEventListener('click', () => {
      save('unit', btn.dataset.unit);
      setState({ unit: btn.dataset.unit });
    }));

  window.addEventListener('online', () => {
    const { status, error } = getState();
    if (status === 'error' && error?.retry) error.retry();
  });

  // Atualiza sozinho a cada 10 min (o clima muda; a aba pode ficar aberta).
  setInterval(() => {
    const { place, status } = getState();
    if (place && status === 'ok' && !document.hidden) loadPlace(place, { remember: !place.isGeo });
  }, 10 * 60 * 1000);

  // Ordem de abertura: última cidade pesquisada → localização → Boston.
  const saved = load('place');
  if (saved) loadPlace(saved);
  else locate({ auto: true });

  render(getState());
}

init();
