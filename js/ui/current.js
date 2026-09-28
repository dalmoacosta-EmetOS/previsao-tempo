import { el, fill } from './dom.js?v=2.7';
import { icon } from './icons.js?v=2.7';
import { describe } from '../domain/weather-codes.js?v=2.7';
import { temp, speed, percent, windDirection, rain } from '../domain/units.js?v=2.7';
import { hourLabel } from '../domain/time.js?v=2.7';
import { nowSummary } from '../domain/summary.js?v=2.7';
import { resolveWeatherNow, nowcastText } from '../domain/scene.js?v=2.7';

export function renderCurrent(root, { place, data, unit }) {
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
      el('h1', { class: 'hero__city', text: place.name }),
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
