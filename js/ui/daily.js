import { el, fill } from './dom.js?v=3.5';
import { icon } from './icons.js?v=3.5';
import { describe } from '../domain/weather-codes.js?v=3.5';
import { temp, percent } from '../domain/units.js?v=3.5';
import { dayLabel, dayMonth } from '../domain/time.js?v=3.5';
import { periodSummary, splitDayNight } from '../domain/summary.js?v=3.5';
import { tempTabs, pick } from './temp-tabs.js?v=3.5';

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
      rows.push(el('li', { class: 'day-note', text: 'A partir do 8º dia: tendência — a precisão cai bastante.' }));
    }
    const info = describe(d.code);
    const left = ((d.min - lo) / span) * 100;
    const width = Math.max(((d.max - d.min) / span) * 100, 4);
    const open = daySel === i;
    rows.push(
      el('li', {
        class: 'day' + (i >= TREND_FROM ? ' is-trend' : '') + (open ? ' is-open' : ''),
        title: 'Ver resumo do dia e da noite',
      }, [
        // Botão invisível por cima da linha inteira: a lista continua lista para o leitor de tela (ADR-035)
        el('button', {
          type: 'button', class: 'hit',
          'aria-expanded': String(open),
          'aria-label': `${dayLabel(d.date, i)}, ${dayMonth(d.date)}: ${info.label}, mínima ${temp(d.min, unit)}, máxima ${temp(d.max, unit)}. ${open ? 'Fechar' : 'Ver'} resumo do dia e da noite`,
          onclick: () => onSelectDay(open ? null : i),
        }),
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
    if (open) rows.push(dayPanel(data, d, i, unit, dayPart, onDayPart));
  });

  const toggle = el('div', { class: 'segmented segmented--small', role: 'group', 'aria-label': 'Período' },
    [7, 15].map((n) => el('button', {
      type: 'button',
      'aria-pressed': String(days === n),
      text: `${n} dias`,
      onclick: () => onDaysChange(n),
    })),
  );

  fill(root,
    el('header', { class: 'card__head' }, [el('h2', { text: `Próximos ${days} dias` }), toggle]),
    el('div', { class: 'card__subhead' }, [tempTabs(tempMode, onTempMode)]),
    el('ol', { class: 'days' }, rows),
    daySel == null && el('p', { class: 'card__hint card__hint--tip', text: 'Toque num dia para ver o resumo do dia e da noite.' }),
  );
}

// Resumo Dia | Noite (ADR-019)
function dayPanel(data, d, i, unit, part, onDayPart) {
  const { day, night } = splitDayNight(data.hours, d.date);
  const periods = { day: periodSummary(day, 'day', unit), night: periodSummary(night, 'night', unit) };
  const active = periods[part] ? part : (periods.day ? 'day' : 'night');
  const sum = periods[active];
  const full = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(`${d.date}T12:00:00Z`));
  return el('li', { class: 'day-panel' }, [
    el('div', { class: 'segmented segmented--small', role: 'tablist', 'aria-label': 'Período' },
      [['day', 'Dia'], ['night', 'Noite']].map(([k, label]) => el('button', {
        type: 'button', role: 'tab',
        'aria-selected': String(active === k), 'aria-pressed': String(active === k),
        disabled: !periods[k],
        text: label,
        onclick: (e) => { e.stopPropagation(); onDayPart(k); },
      }))),
    sum
      ? el('p', { class: 'day-panel__text' }, [
        el('span', { class: 'day-panel__icon', html: icon(sum.icon, active === 'day') }),
        el('strong', { text: full.charAt(0).toUpperCase() + full.slice(1) + '. ' }),
        sum.text,
      ])
      : el('p', { class: 'day-panel__text', text: 'Sem dados para este período.' }),
    el('small', { text: 'Resumo gerado automaticamente a partir da previsão' + (i >= TREND_FROM ? ' · tendência, baixa precisão' : '') + '.' }),
  ]);
}
