// Plano de viagem dentro do link (ADR-042): quem abre o link — no e-mail, WhatsApp ou calendário —
// vê a mesma viagem recalculada com a previsão MAIS NOVA. O "atualizar" é o próprio link.
// Tudo o que vem do endereço é validado: números dentro do mundo, nomes curtos, veículo conhecido.

import { t } from '../i18n/index.js?v=6.4.1';
import { cleanText, parseCoord } from './text.js?v=6.4.1';

const VEH = ['car', 'moto', 'large'];
const cut = (s, n = 80) => cleanText(s, n);

function readPoint(q, key) {
  const parts = (q.get(key) || '').split(',');
  if (parts.length !== 2) return null;
  const la = parseCoord(parts[0], 90), lo = parseCoord(parts[1], 180);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  return { lat: la, lon: lo, name: cut(q.get(`${key}n`)) || t('plan.place'), region: cut(q.get(`${key}r`)), country: cut(q.get(`${key}c`)) };
}

export function planFromUrl(search) {
  const q = new URLSearchParams(search);
  if (q.get('viagem') !== '1') return null;
  const from = readPoint(q, 'de'), to = readPoint(q, 'para');
  if (!from || !to) return null;
  const saida = /^\d{1,9}$/.test(q.get('saida') || '') ? Number(q.get('saida')) : NaN;
  const vehicle = VEH.includes(q.get('veiculo')) ? q.get('veiculo') : 'car';
  return { from, to, departMs: Number.isFinite(saida) && saida > 0 ? saida * 60000 : null, vehicle };
}

export function planToUrl(plan, baseHref) {
  const u = new URL(baseHref);
  const keep = new URLSearchParams();
  const put = (k, p) => {
    keep.set(k, `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`);
    keep.set(`${k}n`, cut(p.name));
    if (p.region) keep.set(`${k}r`, cut(p.region));
    if (p.country) keep.set(`${k}c`, cut(p.country));
  };
  keep.set('viagem', '1');
  put('de', plan.from);
  put('para', plan.to);
  keep.set('saida', String(Math.round(plan.departMs / 60000)));
  keep.set('veiculo', plan.vehicle);
  u.search = keep.toString();
  u.hash = '';
  return u.toString();
}

/** Arquivo de calendário (.ics) com alertas 48 h e 2 h antes e o link para atualizar (pedido do Dalmo, 4.1). */
export function planToIcs(plan, url, summaryText) {
  const z = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  // \r sozinho também vira quebra de linha no .ics (L-03); outros controles saem
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\r\n|\r|\n|\u2028|\u2029/g, '\\n')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ');
  const end = plan.departMs + (plan.durationS || 3600) * 1000;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Weather Forecast//Viagem//PT', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${Math.round(plan.departMs / 1000)}-${Math.random().toString(36).slice(2)}@weather-forecast`,
    `DTSTAMP:${z(Date.now())}`, `DTSTART:${z(plan.departMs)}`, `DTEND:${z(end)}`,
    `SUMMARY:${esc(t('plan.title', { from: plan.from.name, to: plan.to.name }))}`,
    `DESCRIPTION:${esc(`${summaryText}\n\n${t('plan.update')} ${url}`)}`,
    `URL:${url}`,
    'BEGIN:VALARM', 'TRIGGER:-P2D', 'ACTION:DISPLAY', `DESCRIPTION:${esc(t('plan.alarm2d'))}`, 'END:VALARM',
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(t('plan.alarm2h'))}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

/** Link do Google Agenda já preenchido (a pessoa só toca em "Salvar"). Alertas seguem o padrão da agenda dela. */
export function googleCalendarUrl(plan, url, summaryText) {
  const z = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = plan.departMs + (plan.durationS || 3600) * 1000;
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: t('plan.title', { from: plan.from.name, to: plan.to.name }),
    dates: `${z(plan.departMs)}/${z(end)}`,
    details: `${summaryText}\n\n${t('plan.update')} ${url}`,
    location: plan.to.name,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
