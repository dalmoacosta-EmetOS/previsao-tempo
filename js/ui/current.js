import { el, fill } from './dom.js?v=6.0';
import { icon } from './icons.js?v=6.0';
import { describe } from '../domain/weather-codes.js?v=6.0';
import { temp, speed, percent, windDirection, rain } from '../domain/units.js?v=6.0';
import { hourLabel } from '../domain/time.js?v=6.0';
import { nowSummary } from '../domain/summary.js?v=6.0';
import { resolveWeatherNow, nowcastText } from '../domain/scene.js?v=6.0';
import { t } from '../i18n/index.js?v=6.0';

export function renderCurrent(root, { place, data, unit }, actions = {}) {
  const c = data.current;
  const today = data.daily[0];
  const now = resolveWeatherNow(data);
  const info = { ...describe(c.code) };
  // Se o modelo mede chuva mas o código diz "nublado", mostramos a chuva (ADR-011).
  if (now.byMeasure) {
    info.label = now.label;
    info.icon = now.scene === 'snow' ? 'snow'
      : now.intensity === 'heavy' ? 'heavy-rain' : now.kind === 'drizzle' ? 'drizzle' : 'rain';
  }
  const nowcast = nowcastText(data);
  const where = [place.region, place.country].filter(Boolean).join(', ');
  const sum = nowSummary(data, unit, info.label, now.wet);
  const next = data.hourly[1] || data.hourly[0];

  fill(root,
    el('div', { class: 'hero__place' }, [
      el('div', { class: 'hero__title' }, [
        el('h1', { class: 'hero__city', text: place.name }),
        actions.onFav && el('button', {
          class: 'hero__act', type: 'button', 'aria-pressed': String(!!actions.isFav),
          'aria-label': t(actions.isFav ? 'fav.remove' : 'fav.add'),
          title: t(actions.isFav ? 'fav.remove' : 'fav.add'),
          text: actions.isFav ? '★' : '☆', onclick: actions.onFav,
        }),
        actions.onShare && el('button', {
          class: 'hero__act', type: 'button', 'aria-label': t('hero.share'), title: t('hero.share'),
          html: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6h14v-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          onclick: actions.onShare,
        }),
      ]),
      where && el('p', { class: 'hero__region', text: where }),
      el('p', { class: 'hero__updated', text: t('hero.updated', { h: hourLabel(c.time), tz: data.timezoneAbbr || data.timezone }) }),
    ]),
    // Bloco principal no estilo do Weather Channel (ADR-027): temperatura grande à esquerda,
    // ícone e condição à direita; abaixo, sensação/máx/mín e a chuva da próxima hora.
    el('div', { class: 'hero__main' }, [
      el('div', { class: 'hero__temp', text: temp(c.temp, unit) }),
      el('div', { class: 'hero__cond' }, [
        el('div', { class: 'hero__icon', html: icon(info.icon, c.isDay) }),
        el('div', { class: 'hero__label', text: info.label }),
      ]),
    ]),
    el('p', { class: 'hero__line' }, [
      t('hero.feels', { t: temp(c.feels, unit) }), sep(), t('hero.max', { t: temp(today.max, unit) }), sep(), t('hero.min', { t: temp(today.min, unit) }),
    ]),
    next && el('p', { class: 'hero__line hero__line--rain' }, [
      t('hero.rainNextHour', { p: percent(next.pop) }), sep(), rain(next.precip),
    ]),
    // 6.0: chamada para o planejador de viagem já na primeira tela (o diferencial do site)
    actions.onTrip && el('button', { type: 'button', class: 'hero__trip', id: 'hero-trip', onclick: actions.onTrip }, [
      el('span', { 'aria-hidden': 'true', text: '🛣️' }), el('span', { text: t('hero.tripCta') }), el('span', { class: 'hero__trip-chev', 'aria-hidden': 'true', text: '›' }),
    ]),
    nowcast && el('div', { class: 'hero__nowcast', text: nowcast }),
    rainChart(data, now),
    // Resumo em tempo real ao lado da cidade (ADR-021)
    el('aside', { class: 'hero__now', 'aria-label': t('hero.nowAria') }, [
      el('p', { class: 'hero__now-title', text: t('time.now') }),
      el('p', { class: 'hero__now-main', text: sum.now }),
      el('p', { class: 'hero__now-outlook', text: sum.outlook }),
      sum.rest && el('p', { class: 'hero__now-rest' }, [el('strong', { text: t('hero.restOfToday') + ' ' }), sum.rest]),
      el('small', { text: t('hero.autoNote') }),
    ]),
    el('dl', { class: 'hero__facts' }, [
      fact(t('w.humidity'), percent(c.humidity)),
      fact(t('w.wind'), `${windDirection(c.windDir)} ${speed(c.wind)}`.trim()),
    ]),
  );
}

// Gráfico da chuva nas próximas 2 h, de 15 em 15 min (ADR-033). Só aparece se houver chuva/neve.
// Cores iguais às do radar: verde-claro → verde → verde-escuro → vermelho; neve em azul.
const RAIN_STEPS = [[15, '#e1322a', 'veryHeavy'], [7.6, '#0f5f23', 'heavy'], [2.5, '#239632', 'moderate'], [0, '#6ed75a', 'light']];
function rainChart(data, now) {
  const slots = data.nowcast.slice(0, 8);
  const wetSlot = (s) => s.precip >= 0.1 || s.snow > 0;
  if (slots.length < 4 || (!slots.some(wetSlot) && !now.wet)) return null;
  const bars = slots.map((s, i) => {
    const rate = s.precip * 4;                          // mm em 15 min → mm/h
    const [, color, label] = RAIN_STEPS.find(([min]) => rate >= min);
    const snow = s.snow > 0;
    const h = wetSlot(s) ? Math.max(10, Math.min(100, 12 + Math.log2(1 + rate) * 22)) : 3;
    const when = i === 0 ? t('chart.now') : t('chart.inMin', { min: i * 15 });
    const txt = wetSlot(s) ? t(snow ? 'chart.snowAt' : 'chart.rainAt', { level: t(`chart.${label}`), when }) : t('chart.dryAt', { when });
    return el('span', { class: 'rainchart__bar', style: `height:${h}%;background:${wetSlot(s) ? (snow ? '#5aa9ec' : color) : 'rgba(255,255,255,.35)'}`, title: txt, 'aria-label': txt, role: 'img' });
  });
  return el('figure', { class: 'rainchart', 'aria-label': t('chart.title') }, [
    el('figcaption', { text: t('chart.title') }),
    el('div', { class: 'rainchart__plot' }, [
      el('div', { class: 'rainchart__y', 'aria-hidden': 'true' }, [el('span', { text: t('chart.yHeavy') }), el('span', { text: t('chart.yLight') })]),
      el('div', { class: 'rainchart__bars' }, bars),
    ]),
    el('div', { class: 'rainchart__x', 'aria-hidden': 'true' }, [t('time.now'), '30 min', '1 h', '1h30', '2 h'].map((x) => el('span', { text: x }))),
  ]);
}

const sep = () => el('span', { class: 'hero__sep', 'aria-hidden': 'true', text: '|' });

function fact(label, value) {
  return el('div', { class: 'fact' }, [el('dt', { text: label }), el('dd', { text: value })]);
}

export function renderHeroSkeleton(root) {
  fill(root,
    el('div', { class: 'skeleton skeleton--title' }),
    el('div', { class: 'skeleton skeleton--line' }),
    el('div', { class: 'skeleton skeleton--big' }),
    el('div', { class: 'skeleton skeleton--line' }),
  );
}
