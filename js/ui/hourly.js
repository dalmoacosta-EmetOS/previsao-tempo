import { el } from './dom.js';
import { icon } from './icons.js';
import { describe } from '../domain/weather-codes.js';
import { temp, percent } from '../domain/units.js';
import { hourLabel } from '../domain/time.js';

export function renderHourly(root, { data, unit }) {
  const items = data.hourly.map((h, i) =>
    el('li', { class: 'hour' }, [
      el('span', { class: 'hour__time', text: i === 0 ? 'Agora' : hourLabel(h.time) }),
      el('span', { class: 'hour__icon', html: icon(describe(h.code).icon, h.isDay), title: describe(h.code).label }),
      el('span', { class: 'hour__temp', text: temp(h.temp, unit) }),
      el('span', { class: 'hour__pop' + ((h.pop ?? 0) >= 30 ? ' is-wet' : ''), text: percent(h.pop), title: 'Chance de chuva' }),
    ]),
  );

  root.replaceChildren(
    el('header', { class: 'card__head' }, [
      el('h2', { text: 'Próximas 24 horas' }),
      el('span', { class: 'card__hint', text: '💧 chance de chuva' }),
    ]),
    el('ol', { class: 'hours', tabindex: '0', 'aria-label': 'Lista de horas, role para o lado' }, items),
  );
}
