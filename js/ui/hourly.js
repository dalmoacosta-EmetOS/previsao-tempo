import { el, fill } from './dom.js?v=5.4';
import { icon } from './icons.js?v=5.4';
import { describe } from '../domain/weather-codes.js?v=5.4';
import { temp, percent, speed, windDirection, uvLevel, rain as rainTxt, shortDist } from '../domain/units.js?v=5.4';
import { hourLabel } from '../domain/time.js?v=5.4';
import { resolveWeatherNow } from '../domain/scene.js?v=5.4';
import { tempTabs, pick } from './temp-tabs.js?v=5.4';
import { t } from '../i18n/index.js?v=5.4';

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
      title: t('hour.details'),
      onclick: () => onSelect(hourSel === i ? null : i),
    }, [
      el('span', { class: 'hour__time', text: i === 0 ? t('time.now') : hourLabel(h.time) }),
      el('span', { class: 'hour__icon', html: icon(iconFor(h, i), h.isDay), title: describe(h.code).label }),
      el('span', { class: 'hour__temp', text: temp(pick(h.temp, h.feels, tempMode), unit) }),
      el('span', { class: 'hour__pop' + ((h.pop ?? 0) >= 30 ? ' is-wet' : ''), text: percent(h.pop), title: t('w.pop') }),
    ])]),
  );

  fill(root,
    el('header', { class: 'card__head' }, [
      el('h2', { text: t('hour.title') }),
      tempTabs(tempMode, onTempMode),
    ]),
    el('p', { class: 'card__hint card__hint--line', text: t(tempMode === 'feels' ? 'hour.hintFeels' : 'hour.hintAir') }),
    el('ol', { class: 'hours', 'aria-label': t('hour.listAria') }, items),
    hourSel != null && data.hourly[hourSel] && hourDetail(data.hourly[hourSel], hourSel, unit, iconFor(data.hourly[hourSel], hourSel), () => onSelect(null)),
    hourSel == null && el('p', { class: 'card__hint card__hint--tip', text: t('hour.tip') }),
  );
}

// Detalhe da hora escolhida (ADR-019)
function hourDetail(h, i, unit, iconName, onClose) {
  const info = describe(h.code);
  const vis = h.visibility == null ? '--' : shortDist(h.visibility);
  const rain = rainTxt(h.precip ?? 0);
  const toward = ((h.windDir ?? 0) + 180) % 360;
  return el('section', { class: 'detail', id: 'hour-detail', 'aria-live': 'polite' }, [
    el('header', { class: 'detail__head' }, [
      el('span', { class: 'detail__icon', html: icon(iconName, h.isDay) }),
      el('div', {}, [
        el('strong', { text: `${i === 0 ? t('time.now') : hourLabel(h.time)} · ${info.label}` }),
        el('span', { text: `${temp(h.temp, unit)} · ${t('hero.feels', { t: temp(h.feels, unit) }).toLowerCase()}` }),
      ]),
      el('button', { type: 'button', class: 'detail__close', 'aria-label': t('hour.close'), text: '×', onclick: onClose }),
    ]),
    el('dl', { class: 'tiles tiles--4' }, [
      tile(t('w.pop'), percent(h.pop)),
      tile(t('w.rainAmount'), rain),
      tile(t('w.wind'), `${windDirection(h.windDir)} ${speed(h.wind)}`, toward),
      tile(t('w.gusts'), speed(h.gust)),
      tile(t('w.humidity'), percent(h.humidity)),
      tile(t('w.clouds'), percent(h.cloud)),
      tile(t('w.uv'), h.uv == null ? '--' : `${Math.round(h.uv)} · ${uvLevel(h.uv)}`),
      tile(t('w.visibility'), vis),
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
