import { el, fill } from './dom.js?v=2.5';
import { speed, percent, snow, uvLevel } from '../domain/units.js?v=2.5';
import { hourLabel } from '../domain/time.js?v=2.5';
import { todayStormRisk } from '../domain/alerts.js?v=2.5';
import { evaluateToday, SOURCES } from '../domain/safety.js?v=2.5';

const RISK_TEXT = { alto: 'Alto', moderado: 'Moderado', baixo: 'Baixo' };
const canHover = () => window.matchMedia?.('(hover: hover)').matches;

/**
 * "Hoje em detalhe" com níveis de atenção (ADR-022): quadros em amarelo/vermelho
 * quando passam do limite; tocar (ou passar o mouse) mostra recomendações.
 */
export function renderDetails(root, { data, unit, tileSel }, onSelect = () => {}) {
  const d = data.daily[0];
  const risk = todayStormRisk(data);
  const { levels, rainMm } = evaluateToday(data, risk, unit);
  const rain = unit === 'F' ? `${(rainMm / 25.4).toFixed(1).replace('.', ',')} pol` : `${Math.round(rainMm)} mm`;

  const tile = (label, value, key, extraCls = '', note = '') => {
    const lv = key && levels[key];
    const cls = 'tile' + (lv ? ` tile--${lv.level} tile--action` : '') + (lv && tileSel === key ? ' is-open' : '');
    const kids = [
      el('dt', {}, [lv && el('span', { class: 'tile__flag', 'aria-hidden': 'true', text: '!' }), label]),
      el('dd', { class: extraCls, text: value }),
      note && el('small', { text: note }),
      lv && el('small', { class: 'tile__hint', text: tileSel === key ? 'Toque para fechar' : 'Toque para ver cuidados' }),
    ];
    if (!lv) return el('div', { class: cls }, kids);
    return el('div', {
      class: cls,
      role: 'button',
      tabindex: '0',
      'aria-expanded': String(tileSel === key),
      'aria-controls': 'care-panel',
      onclick: () => onSelect(tileSel === key ? null : key),
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(tileSel === key ? null : key); } },
      onmouseenter: () => { if (canHover() && tileSel !== key) onSelect(key); },
    }, kids);
  };

  const open = tileSel && levels[tileSel];
  const count = Object.keys(levels).length;

  fill(root,
    el('header', { class: 'card__head' }, [
      el('h2', { text: 'Hoje em detalhe' }),
      count > 0 && el('span', { class: 'card__badge', text: `${count} ponto${count > 1 ? 's' : ''} de atenção` }),
    ]),
    el('dl', { class: 'tiles' }, [
      tile('Nascer do sol', d.sunrise ? hourLabel(d.sunrise) : '--'),
      tile('Pôr do sol', d.sunset ? hourLabel(d.sunset) : '--'),
      tile('Índice UV máx.', d.uv != null ? `${Math.round(d.uv)} · ${uvLevel(d.uv)}` : '--', 'uv'),
      tile('Chuva hoje', `${percent(d.pop)} · ${rain}`, 'rain'),
      tile('Rajadas de vento', speed(d.gustMax, unit), 'gust'),
      tile('Neve prevista', snow(d.snow, unit), 'snow'),
      tile('Vento máx.', speed(d.windMax, unit), 'wind'),
      tile('Risco de tempestade', RISK_TEXT[risk], 'storm', `risk risk--${risk}`, 'Estimativa do site'),
    ]),
    open && el('section', { class: `care care--${open.level}`, id: 'care-panel', 'aria-live': 'polite' }, [
      el('header', { class: 'care__head' }, [
        el('strong', { text: open.title }),
        el('button', { type: 'button', class: 'detail__close', 'aria-label': 'Fechar', text: '×', onclick: () => onSelect(null) }),
      ]),
      el('p', { class: 'care__reason', text: open.reason }),
      el('ul', { class: 'care__list' }, [
        el('li', {}, [el('strong', { text: '🚶 Caminhando: ' }), open.walk]),
        el('li', {}, [el('strong', { text: '🚗 Dirigindo: ' }), open.drive]),
        el('li', {}, [el('strong', { text: '🏠 Em casa: ' }), open.home]),
      ]),
      el('small', { text: SOURCES }),
    ]),
    !open && count > 0 && el('p', { class: 'card__hint card__hint--tip', text: 'Quadros em amarelo ou vermelho pedem atenção — toque para ver os cuidados.' }),
  );
}
