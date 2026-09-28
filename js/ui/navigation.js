// Boas-vindas, barra fixa da cidade e "voltar ao topo" (ADR-017).
import { icon } from './icons.js?v=2.9';
import { describe } from '../domain/weather-codes.js?v=2.9';
import { temp } from '../domain/units.js?v=2.9';
import { resolveWeatherNow } from '../domain/scene.js?v=2.9';

const $ = (id) => document.getElementById(id);
const toTop = () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });

/** Saudação pelo horário de quem está usando o site. */
function greeting() {
  const h = new Date().getHours();
  const part = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  return `${part}! Seja bem-vindo.`;
}

export function setupScrollHelpers() {
  $('greeting').textContent = greeting();
  $('to-top').addEventListener('click', toTop);
  $('citybar').addEventListener('click', toTop);

  // A barra da cidade aparece quando o bloco principal (cidade + temperatura) sai da tela.
  const io = new IntersectionObserver(([entry]) => {
    const show = !entry.isIntersecting && document.body.classList.contains('has-data');
    document.body.classList.toggle('show-citybar', show);
    $('citybar').tabIndex = show ? 0 : -1;
  }, { rootMargin: '-60px 0px 0px 0px' });
  io.observe($('current'));
}

export function renderCityBar({ place, data, unit }) {
  const bar = $('citybar');
  if (!place || !data) return;
  const now = resolveWeatherNow(data);
  const info = describe(data.current.code);
  const label = now.byMeasure ? now.label : info.label;
  const iconName = now.byMeasure ? (now.scene === 'snow' ? 'snow' : 'rain') : info.icon;
  bar.innerHTML = `<span class="citybar__icon">${icon(iconName, data.current.isDay)}</span>`;
  const name = document.createElement('strong');
  name.textContent = place.name;
  const t = document.createElement('span');
  t.className = 'citybar__temp';
  t.textContent = temp(data.current.temp, unit);
  const l = document.createElement('span');
  l.className = 'citybar__label';
  l.textContent = label;
  const up = document.createElement('span');
  up.className = 'citybar__up';
  up.textContent = '↑';
  bar.append(name, t, l, up);
  bar.setAttribute('aria-label', `${place.name}, ${t.textContent}, ${label}. Voltar ao topo`);
}
