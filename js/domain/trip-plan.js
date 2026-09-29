// Plano de viagem dentro do link (ADR-042): quem abre o link — no e-mail, WhatsApp ou calendário —
// vê a mesma viagem recalculada com a previsão MAIS NOVA. O "atualizar" é o próprio link.
// Tudo o que vem do endereço é validado: números dentro do mundo, nomes curtos, veículo conhecido.

const VEH = ['car', 'moto', 'large'];
const cut = (s, n = 80) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').slice(0, n);
const num = (v) => (v === null || v === '' ? NaN : Number(v));

function readPoint(q, key) {
  const [la, lo] = (q.get(key) || '').split(',').map(num);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return null;
  return { lat: la, lon: lo, name: cut(q.get(`${key}n`)) || 'Local', region: cut(q.get(`${key}r`)), country: cut(q.get(`${key}c`)) };
}

export function planFromUrl(search) {
  const q = new URLSearchParams(search);
  if (q.get('viagem') !== '1') return null;
  const from = readPoint(q, 'de'), to = readPoint(q, 'para');
  if (!from || !to) return null;
  const t = num(q.get('saida'));
  const vehicle = VEH.includes(q.get('veiculo')) ? q.get('veiculo') : 'car';
  return { from, to, departMs: Number.isFinite(t) && t > 0 ? t * 60000 : null, vehicle };
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
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\r?\n/g, '\\n');
  const end = plan.departMs + (plan.durationS || 3600) * 1000;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Weather Forecast//Viagem//PT', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${Math.round(plan.departMs / 1000)}-${Math.random().toString(36).slice(2)}@weather-forecast`,
    `DTSTAMP:${z(Date.now())}`, `DTSTART:${z(plan.departMs)}`, `DTEND:${z(end)}`,
    `SUMMARY:${esc(`Viagem ${plan.from.name} → ${plan.to.name}`)}`,
    `DESCRIPTION:${esc(`${summaryText}\n\nAtualize a previsão do caminho: ${url}`)}`,
    `URL:${url}`,
    'BEGIN:VALARM', 'TRIGGER:-P2D', 'ACTION:DISPLAY', `DESCRIPTION:${esc('Sua viagem é daqui a 2 dias: confira o tempo no caminho')}`, 'END:VALARM',
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${esc('Sua viagem sai em 2 horas: atualize a previsão do caminho')}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

/** Link do Google Agenda já preenchido (a pessoa só toca em "Salvar"). Alertas seguem o padrão da agenda dela. */
export function googleCalendarUrl(plan, url, summaryText) {
  const z = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = plan.departMs + (plan.durationS || 3600) * 1000;
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Viagem ${plan.from.name} → ${plan.to.name}`,
    dates: `${z(plan.departMs)}/${z(end)}`,
    details: `${summaryText}\n\nAtualize a previsão do caminho: ${url}`,
    location: plan.to.name,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
