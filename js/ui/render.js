// Desenha cada bloco da tela a partir do estado. Nenhuma chamada à API aqui.
// Textos vindos de fora entram sempre por textContent (nunca como HTML).
import { describe } from '../domain/weather-codes.js?v=1.7.1';
import { computeAlerts, stormRisk } from '../domain/alerts.js?v=1.7.1';
import * as U from '../domain/units.js?v=1.7.1';
import { iconSvg, DROP } from './icons.js?v=1.7.1';

const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/** Índice da hora atual na lista horária (comparação por texto, no fuso da cidade). */
function currentHourIndex(data) {
  const now = data.current.time.slice(0, 13);
  const i = data.hourly.findIndex((h) => h.time.slice(0, 13) >= now);
  return i < 0 ? 0 : i;
}

export function renderCurrent(state) {
  const { data, place, unit } = state;
  const c = data.current;
  const today = data.daily[0];
  const d = describe(c.code);

  $('place-name').textContent = place.name;
  const where = [place.region, place.country].filter(Boolean).join(', ');
  $('place-meta').textContent = `${where ? where + ' · ' : ''}${U.longStamp(c.time)} (hora local)`;
  $('cur-icon').innerHTML = iconSvg(d.icon, c.isDay, d.label);
  $('cur-temp').textContent = U.temp(c.temp, unit);
  $('cur-desc').textContent = d.label;
  $('cur-hilo').textContent = `Máx ${U.temp(today.tmax, unit)} · Mín ${U.temp(today.tmin, unit)}`;
  $('cur-feels').textContent = U.temp(c.feels, unit);
  $('cur-hum').textContent = `${Math.round(c.humidity)}%`;
  $('cur-wind').textContent = `${U.wind(c.windSpeed, unit)} ${U.windDir(c.windDir)}`.trim();
  $('cur-pop').textContent = today.pop == null ? '–' : `${today.pop}%`;
}

export function renderHourly(state) {
  const { data, unit } = state;
  const start = currentHourIndex(data);
  const list = $('hourly-list');
  list.replaceChildren();
  data.hourly.slice(start, start + 24).forEach((h, i) => {
    const d = describe(h.code);
    const li = el('li', 'hourly__item');
    li.append(el('span', 'hourly__time', i === 0 ? 'Agora' : U.hourLabel(h.time)));
    const ic = el('span', 'hourly__icon');
    ic.innerHTML = iconSvg(d.icon, h.isDay, d.label);
    li.append(ic, el('span', 'hourly__temp', U.temp(h.temp, unit)));
    const pop = el('span', 'hourly__pop' + ((h.pop ?? 0) >= 50 ? ' is-high' : ''));
    pop.innerHTML = DROP;
    pop.append(document.createTextNode(h.pop == null ? '–' : `${h.pop}%`));
    li.append(pop);
    list.append(li);
  });
}

export function renderDaily(state) {
  const { data, unit, days } = state;
  const rows = data.daily.slice(0, days);
  const lo = Math.min(...rows.map((r) => r.tmin));
  const hi = Math.max(...rows.map((r) => r.tmax));
  const span = Math.max(hi - lo, 1);
  const list = $('daily-list');
  list.replaceChildren();

  rows.forEach((day, i) => {
    const d = describe(day.code);
    const trend = i >= 7;
    const li = el('li', 'daily__row' + (trend ? ' is-trend' : ''));

    const label = el('div', 'daily__day');
    label.append(el('span', 'daily__name', U.dayLabel(day.date, i)));
    label.append(el('span', 'daily__date', trend ? 'tendência' : U.dayShort(day.date)));
    if (trend) label.lastChild.classList.add('badge');

    const ic = el('span', 'daily__icon');
    ic.innerHTML = iconSvg(d.icon, true, d.label);

    const pop = el('span', 'daily__pop' + ((day.pop ?? 0) >= 50 ? ' is-high' : ''));
    pop.innerHTML = DROP;
    pop.append(document.createTextNode(day.pop == null ? '–' : `${day.pop}%`));

    const range = el('div', 'daily__range');
    range.append(el('span', 'daily__min', U.temp(day.tmin, unit)));
    const bar = el('span', 'bar');
    const fill = el('span', 'bar__fill');
    fill.style.left = `${((day.tmin - lo) / span) * 100}%`;
    fill.style.right = `${100 - ((day.tmax - lo) / span) * 100}%`;
    bar.append(fill);
    range.append(bar, el('span', 'daily__max', U.temp(day.tmax, unit)));

    li.title = d.label;
    li.append(label, ic, pop, range);
    list.append(li);
  });

  $('daily-note').hidden = days <= 7;
  document.querySelectorAll('[data-days]').forEach((b) =>
    b.setAttribute('aria-pressed', String(Number(b.dataset.days) === days)));
}

export function renderDetails(state) {
  const { data, unit } = state;
  const today = data.daily[0];
  const risk = stormRisk(today, data.hourly);
  const items = [
    ['Nascer do sol', U.clock(today.sunrise)],
    ['Pôr do sol', U.clock(today.sunset)],
    ['Índice UV máx', today.uv == null ? '–' : `${Math.round(today.uv)} · ${U.uvLevel(today.uv)}`],
    ['Chance de chuva', today.pop == null ? '–' : `${today.pop}%`],
    ['Neve prevista', today.snow > 0 ? U.snow(today.snow, unit) : 'Nenhuma'],
    ['Rajadas máx', U.wind(today.gustMax, unit)],
    ['Risco de tempestade', risk, `risk risk--${risk}`],
  ];
  const dl = $('details-list');
  dl.replaceChildren();
  items.forEach(([k, v, cls]) => {
    const box = el('div', 'details__item');
    box.append(el('dt', null, k), el('dd', cls || null, v));
    dl.append(box);
  });
}

export function renderAlerts(state) {
  const box = $('alerts');
  const alerts = computeAlerts(state.data.daily, state.data.hourly);
  box.replaceChildren();
  box.hidden = alerts.length === 0;
  alerts.forEach((a) => {
    const item = el('div', `alert alert--${a.level}`);
    item.append(el('span', 'alert__when', a.when), el('span', 'alert__text', a.text), el('span', 'alert__tag', 'aviso automático · não oficial'));
    box.append(item);
  });
}

export function renderUnit(unit) {
  document.querySelectorAll('[data-unit]').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.unit === unit)));
}

export function renderAll(state) {
  renderUnit(state.unit);
  if (!state.data) return;
  renderCurrent(state);
  renderAlerts(state);
  renderHourly(state);
  renderDaily(state);
  renderDetails(state);
  ['current', 'hourly', 'daily', 'details'].forEach((id) => { $(id).hidden = false; });
}
