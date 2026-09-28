import { el, fill } from './dom.js?v=3.5.2';
import { icon } from './icons.js?v=3.5.2';
import { describe } from '../domain/weather-codes.js?v=3.5.2';
import { temp, speed, percent, windDirection, rain } from '../domain/units.js?v=3.5.2';
import { hourLabel } from '../domain/time.js?v=3.5.2';
import { nowSummary } from '../domain/summary.js?v=3.5.2';
import { resolveWeatherNow, nowcastText } from '../domain/scene.js?v=3.5.2';

export function renderCurrent(root, { place, data, unit }, actions = {}) {
  const c = data.current;
  const today = data.daily[0];
  const now = resolveWeatherNow(data);
  const info = { ...describe(c.code) };
  // Se o modelo mede chuva mas o código diz "nublado", mostramos a chuva (ADR-011).
  if (now.byMeasure) {
    info.label = now.label;
    info.icon = now.scene === 'snow' ? 'snow'
      : now.intensity === 'heavy' ? 'heavy-rain' : now.label === 'Garoa' ? 'drizzle' : 'rain';
  }
  const nowcast = nowcastText(data);
  const where = [place.region, place.country].filter(Boolean).join(', ');
  const sum = nowSummary(data, unit, info.label);
  const next = data.hourly[1] || data.hourly[0];

  fill(root,
    el('div', { class: 'hero__place' }, [
      el('div', { class: 'hero__title' }, [
        el('h1', { class: 'hero__city', text: place.name }),
        actions.onFav && el('button', {
          class: 'hero__act', type: 'button', 'aria-pressed': String(!!actions.isFav),
          'aria-label': actions.isFav ? 'Tirar dos favoritos' : 'Salvar nos favoritos',
          title: actions.isFav ? 'Tirar dos favoritos' : 'Salvar nos favoritos',
          text: actions.isFav ? '★' : '☆', onclick: actions.onFav,
        }),
        actions.onShare && el('button', {
          class: 'hero__act', type: 'button', 'aria-label': 'Compartilhar link desta cidade', title: 'Compartilhar link desta cidade',
          html: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6h14v-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          onclick: actions.onShare,
        }),
      ]),
      where && el('p', { class: 'hero__region', text: where }),
      el('p', { class: 'hero__updated', text: `Atualizado às ${hourLabel(c.time)} · horário local (${data.timezoneAbbr || data.timezone})` }),
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
      `Sensação ${temp(c.feels, unit)}`, sep(), `Máx ${temp(today.max, unit)}`, sep(), `Mín ${temp(today.min, unit)}`,
    ]),
    next && el('p', { class: 'hero__line hero__line--rain' }, [
      `Chuva na próxima hora ${percent(next.pop)}`, sep(), rain(next.precip, unit),
    ]),
    nowcast && el('div', { class: 'hero__nowcast', text: nowcast }),
    rainChart(data, now),
    // Resumo em tempo real ao lado da cidade (ADR-021)
    el('aside', { class: 'hero__now', 'aria-label': 'Resumo do tempo agora' }, [
      el('p', { class: 'hero__now-title', text: 'Agora' }),
      el('p', { class: 'hero__now-main', text: sum.now }),
      el('p', { class: 'hero__now-outlook', text: sum.outlook }),
      sum.rest && el('p', { class: 'hero__now-rest' }, [el('strong', { text: 'Restante de hoje: ' }), sum.rest]),
      el('small', { text: 'Resumo automático · atualiza a cada 10 min' }),
    ]),
    el('dl', { class: 'hero__facts' }, [
      fact('Umidade', percent(c.humidity)),
      fact('Vento', `${windDirection(c.windDir)} ${speed(c.wind, unit)}`.trim()),
    ]),
  );
}

// Gráfico da chuva nas próximas 2 h, de 15 em 15 min (ADR-033). Só aparece se houver chuva/neve.
// Cores iguais às do radar: verde-claro → verde → verde-escuro → vermelho; neve em azul.
const RAIN_STEPS = [[15, '#e1322a', 'Muito forte'], [7.6, '#0f5f23', 'Forte'], [2.5, '#239632', 'Moderada'], [0, '#6ed75a', 'Fraca']];
function rainChart(data, now) {
  const slots = data.nowcast.slice(0, 8);
  const wetSlot = (s) => s.precip >= 0.1 || s.snow > 0;
  if (slots.length < 4 || (!slots.some(wetSlot) && !now.wet)) return null;
  const bars = slots.map((s, i) => {
    const rate = s.precip * 4;                          // mm em 15 min → mm/h
    const [, color, label] = RAIN_STEPS.find(([min]) => rate >= min);
    const snow = s.snow > 0;
    const h = wetSlot(s) ? Math.max(10, Math.min(100, 12 + Math.log2(1 + rate) * 22)) : 3;
    const when = i === 0 ? 'agora' : `em ${i * 15} min`;
    const txt = wetSlot(s) ? `${snow ? 'neve' : `chuva ${label.toLowerCase()}`} ${when}` : `sem chuva ${when}`;
    return el('span', { class: 'rainchart__bar', style: `height:${h}%;background:${wetSlot(s) ? (snow ? '#5aa9ec' : color) : 'rgba(255,255,255,.35)'}`, title: txt, 'aria-label': txt, role: 'img' });
  });
  return el('figure', { class: 'rainchart', 'aria-label': 'Chuva nas próximas 2 horas' }, [
    el('figcaption', { text: 'Chuva nas próximas 2 horas' }),
    el('div', { class: 'rainchart__plot' }, [
      el('div', { class: 'rainchart__y', 'aria-hidden': 'true' }, [el('span', { text: 'Forte' }), el('span', { text: 'Fraca' })]),
      el('div', { class: 'rainchart__bars' }, bars),
    ]),
    el('div', { class: 'rainchart__x', 'aria-hidden': 'true' }, ['Agora', '30 min', '1 h', '1h30', '2 h'].map((t) => el('span', { text: t }))),
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
