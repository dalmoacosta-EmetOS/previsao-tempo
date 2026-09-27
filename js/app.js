// Controlador: liga eventos → serviços → estado → interface.
import { getState, setState, subscribe } from './state.js';
import { load, save } from './storage.js';
import { getForecast } from './api/forecast.js';
import { reverseGeocode } from './api/geocoding.js';
import { resolveWeatherNow } from './domain/scene.js';
import { applyScene, DEMO_SCENES } from './ui/background.js';
import { renderCurrent, renderHeroSkeleton } from './ui/current.js';
import { renderHourly } from './ui/hourly.js';
import { renderDaily } from './ui/daily.js';
import { renderDetails } from './ui/details.js';
import { renderAlerts } from './ui/alerts.js';
import { renderError, showToast } from './ui/status.js';
import { setupSearch } from './ui/search.js';
import { mountRadar, updateRadar } from './ui/radar.js';

export const VERSION = '1.7';

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
  renderAlerts(sections.alerts, state);
  const onTempMode = (tempMode) => { save('tempMode', tempMode); setState({ tempMode }); };
  renderHourly(sections.hourly, state, onTempMode);
  renderDaily(sections.daily, state, (days) => setState({ days }), onTempMode);
  renderDetails(sections.details, state);
  updateRadar(state);
}

// ---------- Ações ----------
async function loadPlace(place, { remember = true } = {}) {
  setState({ status: 'loading', error: null, place: getState().data ? getState().place : place });
  try {
    const data = await getForecast(place.lat, place.lon);
    setState({ place, data, status: 'ok' });
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
