import { el } from './dom.js';
import { icon } from './icons.js';
import { describe } from '../domain/weather-codes.js';
import { temp, percent } from '../domain/units.js';
import { hourLabel } from '../domain/time.js';
import { resolveWeatherNow } from '../domain/scene.js';
import { tempTabs, pick } from './temp-tabs.js';

export function renderHourly(root, { data, unit, tempMode }, onTempMode) {
  const now = resolveWeatherNow(data);
  const iconFor = (h, i) => {
    // "Agora" segue o céu atual quando há chuva medida (ADR-011)
    if (i === 0 && now.byMeasure && !['drizzle','rain','heavy-rain','showers','sleet','snow'].includes(describe(h.code).icon)) return now.scene === 'snow' ? 'snow' : now.intensity === 'heavy' ? 'heavy-rain' : 'rain';
    return describe(h.code).icon;
  };
  const items = data.hourly.map((h, i) =>
    el('li', { class: 'hour' }, [
      el('span', { class: 'hour__time', text: i === 0 ? 'Agora' : hourLabel(h.time) }),
      el('span', { class: 'hour__icon', html: icon(iconFor(h, i), h.isDay), title: describe(h.code).label }),
      el('span', { class: 'hour__temp', text: temp(pick(h.temp, h.feels, tempMode), unit) }),
      el('span', { class: 'hour__pop' + ((h.pop ?? 0) >= 30 ? ' is-wet' : ''), text: percent(h.pop), title: 'Chance de chuva' }),
    ]),
  );

  root.replaceChildren(
    el('header', { class: 'card__head' }, [
      el('h2', { text: 'Próximas 24 horas' }),
      tempTabs(tempMode, onTempMode),
    ]),
    el('p', { class: 'card__hint card__hint--line', text: tempMode === 'feels'
      ? 'Mostrando a sensação térmica (vento e umidade incluídos) · 💧 chance de chuva'
      : 'Mostrando a temperatura do ar · 💧 chance de chuva' }),
    el('ol', { class: 'hours', tabindex: '0', 'aria-label': 'Lista de horas, role para o lado' }, items),
  );
}
