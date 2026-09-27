import { el } from './dom.js?v=1.9';
import { icon } from './icons.js?v=1.9';
import { describe } from '../domain/weather-codes.js?v=1.9';
import { temp, percent } from '../domain/units.js?v=1.9';
import { dayLabel, dayMonth } from '../domain/time.js?v=1.9';
import { tempTabs, pick } from './temp-tabs.js?v=1.9';

const TREND_FROM = 7; // índice 7 = 8º dia (ADR-006)

export function renderDaily(root, { data, unit, days, tempMode }, onDaysChange, onTempMode) {
  // Na aba "Sensação", máx/mín usam a sensação térmica do dia.
  const list = data.daily.slice(0, days).map((d) => ({
    ...d, min: pick(d.min, d.feelsMin, tempMode), max: pick(d.max, d.feelsMax, tempMode),
  }));
  const lo = Math.min(...list.map((d) => d.min));
  const hi = Math.max(...list.map((d) => d.max));
  const span = Math.max(hi - lo, 1);

  const rows = [];
  list.forEach((d, i) => {
    if (i === TREND_FROM) {
      rows.push(el('li', { class: 'day-note', text: 'A partir do 8º dia: tendência — a precisão cai bastante.' }));
    }
    const info = describe(d.code);
    const left = ((d.min - lo) / span) * 100;
    const width = Math.max(((d.max - d.min) / span) * 100, 4);
    rows.push(
      el('li', { class: 'day' + (i >= TREND_FROM ? ' is-trend' : '') }, [
        el('div', { class: 'day__name' }, [
          el('strong', { text: dayLabel(d.date, i) }),
          el('span', { text: dayMonth(d.date) }),
        ]),
        el('span', { class: 'day__icon', html: icon(info.icon, true), title: info.label }),
        el('span', { class: 'day__pop' + ((d.pop ?? 0) >= 30 ? ' is-wet' : ''), text: percent(d.pop), title: 'Chance de chuva' }),
        el('span', { class: 'day__min', text: temp(d.min, unit) }),
        el('span', { class: 'range', 'aria-hidden': 'true' }, [
          el('span', { class: 'range__bar', style: `left:${left}%;width:${width}%` }),
        ]),
        el('span', { class: 'day__max', text: temp(d.max, unit) }),
        i >= TREND_FROM && el('span', { class: 'badge', text: 'tendência' }),
      ]),
    );
  });

  const toggle = el('div', { class: 'segmented segmented--small', role: 'group', 'aria-label': 'Período' },
    [7, 15].map((n) => el('button', {
      type: 'button',
      'aria-pressed': String(days === n),
      text: `${n} dias`,
      onclick: () => onDaysChange(n),
    })),
  );

  root.replaceChildren(
    el('header', { class: 'card__head' }, [el('h2', { text: `Próximos ${days} dias` }), toggle]),
    el('div', { class: 'card__subhead' }, [tempTabs(tempMode, onTempMode)]),
    el('ol', { class: 'days' }, rows),
  );
}
