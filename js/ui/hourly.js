import { el, fill } from './dom.js?v=2.10';
import { icon } from './icons.js?v=2.10';
import { describe } from '../domain/weather-codes.js?v=2.10';
import { temp, percent, speed, windDirection, uvLevel } from '../domain/units.js?v=2.10';
import { hourLabel } from '../domain/time.js?v=2.10';
import { resolveWeatherNow } from '../domain/scene.js?v=2.10';
import { tempTabs, pick } from './temp-tabs.js?v=2.10';

export function renderHourly(root, { data, unit, tempMode, hourSel }, onTempMode, onSelect) {
  const now = resolveWeatherNow(data);
  const iconFor = (h, i) => {
    // "Agora" segue o céu atual quando há chuva medida (ADR-011)
    if (i === 0 && now.byMeasure && !['drizzle','rain','heavy-rain','showers','sleet','snow'].includes(describe(h.code).icon)) return now.scene === 'snow' ? 'snow' : now.intensity === 'heavy' ? 'heavy-rain' : 'rain';
    return describe(h.code).icon;
  };
  const items = data.hourly.map((h, i) =>
    el('li', { class: 'hour' + (hourSel === i ? ' is-open' : '') }, [el('button', {
      type: 'button',
      class: 'hour__btn',
      'aria-expanded': String(hourSel === i),
      'aria-controls': 'hour-detail',
      title: 'Ver detalhes desta hora',
      onclick: () => onSelect(hourSel === i ? null : i),
    }, [
      el('span', { class: 'hour__time', text: i === 0 ? 'Agora' : hourLabel(h.time) }),
      el('span', { class: 'hour__icon', html: icon(iconFor(h, i), h.isDay), title: describe(h.code).label }),
      el('span', { class: 'hour__temp', text: temp(pick(h.temp, h.feels, tempMode), unit) }),
      el('span', { class: 'hour__pop' + ((h.pop ?? 0) >= 30 ? ' is-wet' : ''), text: percent(h.pop), title: 'Chance de chuva' }),
    ])]),
  );

  fill(root,
    el('header', { class: 'card__head' }, [
      el('h2', { text: 'Próximas 24 horas' }),
      tempTabs(tempMode, onTempMode),
    ]),
    el('p', { class: 'card__hint card__hint--line', text: tempMode === 'feels'
      ? 'Mostrando a sensação térmica (vento e umidade incluídos) · 💧 chance de chuva'
      : 'Mostrando a temperatura do ar · 💧 chance de chuva' }),
    el('ol', { class: 'hours', 'aria-label': 'Lista de horas, role para o lado. Toque numa hora para ver detalhes' }, items),
    hourSel != null && data.hourly[hourSel] && hourDetail(data.hourly[hourSel], hourSel, unit, iconFor(data.hourly[hourSel], hourSel), () => onSelect(null)),
    hourSel == null && el('p', { class: 'card__hint card__hint--tip', text: 'Toque numa hora para ver os detalhes.' }),
  );
}

// Detalhe da hora escolhida (ADR-019)
function hourDetail(h, i, unit, iconName, onClose) {
  const info = describe(h.code);
  const vis = h.visibility == null ? '--'
    : unit === 'F' ? `${(h.visibility / 1609).toFixed(1).replace('.', ',')} mi` : `${(h.visibility / 1000).toFixed(1).replace('.', ',')} km`;
  const rain = unit === 'F' ? `${((h.precip ?? 0) / 25.4).toFixed(2).replace('.', ',')} pol` : `${(h.precip ?? 0).toFixed(1).replace('.', ',')} mm`;
  const toward = ((h.windDir ?? 0) + 180) % 360;
  return el('section', { class: 'detail', id: 'hour-detail', 'aria-live': 'polite' }, [
    el('header', { class: 'detail__head' }, [
      el('span', { class: 'detail__icon', html: icon(iconName, h.isDay) }),
      el('div', {}, [
        el('strong', { text: `${i === 0 ? 'Agora' : hourLabel(h.time)} · ${info.label}` }),
        el('span', { text: `${temp(h.temp, unit)} · sensação ${temp(h.feels, unit)}` }),
      ]),
      el('button', { type: 'button', class: 'detail__close', 'aria-label': 'Fechar detalhes', text: '×', onclick: onClose }),
    ]),
    el('dl', { class: 'tiles tiles--4' }, [
      tile('Chance de chuva', percent(h.pop)),
      tile('Chuva prevista', rain),
      tile('Vento', `${windDirection(h.windDir)} ${speed(h.wind, unit)}`, toward),
      tile('Rajadas', speed(h.gust, unit)),
      tile('Umidade', percent(h.humidity)),
      tile('Nuvens', percent(h.cloud)),
      tile('Índice UV', h.uv == null ? '--' : `${Math.round(h.uv)} · ${uvLevel(h.uv)}`),
      tile('Visibilidade', vis),
    ]),
  ]);
}

function tile(label, value, arrowDeg) {
  return el('div', { class: 'tile' }, [
    el('dt', { text: label }),
    el('dd', {}, [
      arrowDeg != null && el('span', { class: 'wind-arrow', style: `transform: rotate(${arrowDeg}deg)`, 'aria-hidden': 'true', text: '↑' }),
      arrowDeg != null ? ' ' : '',
      value,
    ]),
  ]);
}
