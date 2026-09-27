import { el } from './dom.js?v=1.9';
import { speed, percent, snow, uvLevel } from '../domain/units.js?v=1.9';
import { hourLabel } from '../domain/time.js?v=1.9';
import { todayStormRisk } from '../domain/alerts.js?v=1.9';

const RISK_TEXT = { alto: 'Alto', moderado: 'Moderado', baixo: 'Baixo' };

export function renderDetails(root, { data, unit }) {
  const d = data.daily[0];
  const risk = todayStormRisk(data);

  root.replaceChildren(
    el('header', { class: 'card__head' }, [el('h2', { text: 'Hoje em detalhe' })]),
    el('dl', { class: 'tiles' }, [
      tile('Nascer do sol', d.sunrise ? hourLabel(d.sunrise) : '--'),
      tile('Pôr do sol', d.sunset ? hourLabel(d.sunset) : '--'),
      tile('Índice UV máx.', d.uv != null ? `${Math.round(d.uv)} · ${uvLevel(d.uv)}` : '--'),
      tile('Chance de chuva', percent(d.pop)),
      tile('Rajadas de vento', speed(d.gustMax, unit)),
      tile('Neve prevista', snow(d.snow, unit)),
      tile('Vento máx.', speed(d.windMax, unit)),
      tile('Risco de tempestade', RISK_TEXT[risk], `risk risk--${risk}`, 'Estimativa do site'),
    ]),
  );
}

function tile(label, value, cls = '', note = '') {
  return el('div', { class: 'tile' }, [
    el('dt', { text: label }),
    el('dd', { class: cls, text: value }),
    note && el('small', { text: note }),
  ]);
}
