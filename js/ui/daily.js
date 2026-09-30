import { el, fill } from './dom.js?v=6.0';
import { icon } from './icons.js?v=6.0';
import { describe } from '../domain/weather-codes.js?v=6.0';
import { temp, percent } from '../domain/units.js?v=6.0';
import { dayLabel, dayMonth, longDay } from '../domain/time.js?v=6.0';
import { periodSummary, splitDayNight } from '../domain/summary.js?v=6.0';
import { tempTabs, pick } from './temp-tabs.js?v=6.0';
import { t } from '../i18n/index.js?v=6.0';

const TREND_FROM = 7; // índice 7 = 8º dia (ADR-006)

export function renderDaily(root, { data, unit, days, tempMode, daySel, dayPart }, onDaysChange, onTempMode, onSelectDay, onDayPart) {
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
      rows.push(el('li', { class: 'day-note', text: t('day.trendNote') }));
    }
    const info = describe(d.code);
    const left = ((d.min - lo) / span) * 100;
    const width = Math.max(((d.max - d.min) / span) * 100, 4);
    const open = daySel === i;
    rows.push(
      el('li', {
        class: 'day' + (i >= TREND_FROM ? ' is-trend' : '') + (open ? ' is-open' : ''),
        title: t('day.open'),
      }, [
        // Botão invisível por cima da linha inteira: a lista continua lista para o leitor de tela (ADR-035)
        el('button', {
          type: 'button', class: 'hit',
          'aria-expanded': String(open),
          'aria-label': t('day.aria', { day: dayLabel(d.date, i), date: dayMonth(d.date), label: info.label, min: temp(d.min, unit), max: temp(d.max, unit), action: t(open ? 'day.close' : 'day.open') }),
          onclick: () => onSelectDay(open ? null : i),
        }),
        el('div', { class: 'day__name' }, [
          el('strong', { text: dayLabel(d.date, i) }),
          el('span', { text: dayMonth(d.date) }),
        ]),
        el('span', { class: 'day__icon', html: icon(info.icon, true), title: info.label }),
        el('span', { class: 'day__pop' + ((d.pop ?? 0) >= 30 ? ' is-wet' : ''), text: percent(d.pop), title: t('w.pop') }),
        el('span', { class: 'day__min', text: temp(d.min, unit) }),
        el('span', { class: 'range', 'aria-hidden': 'true' }, [
          el('span', { class: 'range__bar', style: `left:${left}%;width:${width}%` }),
        ]),
        el('span', { class: 'day__max', text: temp(d.max, unit) }),
        i >= TREND_FROM && el('span', { class: 'badge', text: t('day.trend') }),
      ]),
    );
    if (open) rows.push(dayPanel(data, d, i, unit, dayPart, onDayPart));
  });

  const toggle = el('div', { class: 'segmented segmented--small', role: 'group', 'aria-label': t('day.period') },
    [7, 15].map((n) => el('button', {
      type: 'button',
      'aria-pressed': String(days === n),
      text: t('day.nDays', { n }),
      onclick: () => onDaysChange(n),
    })),
  );

  fill(root,
    el('header', { class: 'card__head' }, [el('h2', { text: t('day.title', { n: days }) }), toggle]),
    el('div', { class: 'card__subhead' }, [tempTabs(tempMode, onTempMode)]),
    el('ol', { class: 'days' }, rows),
    daySel == null && el('p', { class: 'card__hint card__hint--tip', text: t('day.tip') }),
  );
}

// Resumo Dia | Noite (ADR-019)
function dayPanel(data, d, i, unit, part, onDayPart) {
  const { day, night } = splitDayNight(data.hours, d.date);
  const periods = { day: periodSummary(day, 'day', unit), night: periodSummary(night, 'night', unit) };
  const active = periods[part] ? part : (periods.day ? 'day' : 'night');
  const sum = periods[active];
  const full = longDay(d.date);
  return el('li', { class: 'day-panel' }, [
    el('div', { class: 'segmented segmented--small', role: 'tablist', 'aria-label': t('day.period') },
      [['day', t('day.day')], ['night', t('day.night')]].map(([k, label]) => el('button', {
        type: 'button', role: 'tab',
        'aria-selected': String(active === k), 'aria-pressed': String(active === k),
        disabled: !periods[k],
        text: label,
        onclick: (e) => { e.stopPropagation(); onDayPart(k); },
      }))),
    sum
      ? el('p', { class: 'day-panel__text' }, [
        el('span', { class: 'day-panel__icon', html: icon(sum.icon, active === 'day') }),
        el('strong', { text: full + '. ' }),
        sum.text,
      ])
      : el('p', { class: 'day-panel__text', text: t('day.noData') }),
    el('small', { text: t(i >= TREND_FROM ? 'day.autoTrend' : 'day.auto') }),
  ]);
}
