import { el, fill } from './dom.js?v=6.2.1';
import { speed, percent, snow, uvLevel, rain as rainTxt } from '../domain/units.js?v=6.2.1';
import { hourLabel } from '../domain/time.js?v=6.2.1';
import { todayStormRisk } from '../domain/alerts.js?v=6.2.1';
import { evaluateToday, SOURCES } from '../domain/safety.js?v=6.2.1';
import { aqiLevel } from '../api/air-quality.js?v=6.2.1';
import { t } from '../i18n/index.js?v=6.2.1';

const RISK = { alto: 'risk.high', moderado: 'risk.moderate', baixo: 'risk.low' };
const aqiClass = (v) => (v <= 50 ? 'good' : v <= 100 ? 'moderate' : v <= 150 ? 'sensitive' : 'bad');
const canHover = () => window.matchMedia?.('(hover: hover)').matches;

/**
 * "Hoje em detalhe" com níveis de atenção (ADR-022): quadros em amarelo/vermelho
 * quando passam do limite; tocar (ou passar o mouse) mostra recomendações.
 */
export function renderDetails(root, { data, unit, tileSel, air }, onSelect = () => {}) {
  const d = data.daily[0];
  const risk = todayStormRisk(data);
  const { levels, rainMm, ice } = evaluateToday(data, risk, unit, air);
  const rain = rainTxt(rainMm, 0);

  const tile = (label, value, key, extraCls = '', note = '') => {
    const lv = key && levels[key];
    const cls = 'tile' + (lv ? ` tile--${lv.level} tile--action` : '') + (lv && tileSel === key ? ' is-open' : '');
    const kids = [
      el('dt', {}, [lv && el('span', { class: 'tile__flag', 'aria-hidden': 'true', text: '!' }), label]),
      el('dd', { class: extraCls }, [
        el('span', { text: value }),
        note && el('small', { text: note }),
        lv && el('small', { class: 'tile__hint', text: t(tileSel === key ? 'care.tapClose' : 'care.tapOpen') }),
      ]),
    ];
    if (!lv) return el('div', { class: cls }, kids);
    // Botão invisível por cima do quadro: a lista de definições continua válida (ADR-035)
    return el('div', {
      class: cls,
      onmouseenter: () => { if (canHover() && tileSel !== key) onSelect(key); },
    }, [...kids, el('button', {
      type: 'button', class: 'hit',
      'aria-expanded': String(tileSel === key),
      'aria-controls': 'care-panel',
      'aria-label': `${label}: ${value}. ${t(tileSel === key ? 'care.close' : 'care.open')}`,
      onclick: () => onSelect(tileSel === key ? null : key),
    })]);
  };

  const open = tileSel && levels[tileSel];
  const count = Object.keys(levels).length;

  fill(root,
    el('header', { class: 'card__head' }, [
      el('h2', { text: t('det.title') }),
      count > 0 && el('span', { class: 'card__badge', text: t(count > 1 ? 'det.points' : 'det.point', { n: count }) }),
    ]),
    el('dl', { class: 'tiles' }, [
      tile(t('det.sunrise'), d.sunrise ? hourLabel(d.sunrise) : '--'),
      tile(t('det.sunset'), d.sunset ? hourLabel(d.sunset) : '--'),
      tile(t('det.uvMax'), d.uv != null ? `${Math.round(d.uv)} · ${uvLevel(d.uv)}` : '--', 'uv'),
      tile(t('det.rainToday'), `${percent(d.pop)} · ${rain}`, 'rain'),
      tile(t('det.gusts'), speed(d.gustMax), 'gust'),
      tile(t('det.snow'), snow(d.snow), 'snow'),
      tile(t('det.windMax'), speed(d.windMax), 'wind'),
      tile(t('det.storm'), t(RISK[risk]), 'storm', `risk risk--${risk}`, t('det.siteEstimate')),
      tile(t('det.air'), air ? `${air.aqi} · ${aqiLevel(air.aqi)}` : '--', 'air', air ? `aqi aqi--${aqiClass(air.aqi)}` : '', t('det.airNote')),
      tile(t('det.ice'), ice.label, 'ice', '', t('det.iceNote')),
    ]),
    open && el('section', { class: `care care--${open.level}`, id: 'care-panel', 'aria-live': 'polite' }, [
      el('header', { class: 'care__head' }, [
        el('strong', { text: open.title }),
        el('button', { type: 'button', class: 'detail__close', 'aria-label': t('common.close'), text: '×', onclick: () => onSelect(null) }),
      ]),
      el('p', { class: 'care__reason', text: open.reason }),
      el('ul', { class: 'care__list' }, [
        el('li', {}, [el('strong', { text: `🚶 ${t('care.walk')} ` }), open.walk]),
        el('li', {}, [el('strong', { text: `🚗 ${t('care.drive')} ` }), open.drive]),
        el('li', {}, [el('strong', { text: `🏠 ${t('care.home')} ` }), open.home]),
      ]),
      el('small', { text: SOURCES() }),
    ]),
    !open && count > 0 && el('p', { class: 'card__hint card__hint--tip', text: t('det.tip') }),
  );
}
