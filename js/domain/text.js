// Texto que vem de fora (serviços de mapa, links compartilhados) — pen test OSSTMM 2026-10-03, L-03.
// Mesmo exibido só como texto, um nome de cidade com caractere de controle (ex.: \r sozinho) podia
// "quebrar linha" dentro do arquivo de calendário (.ics) e do e-mail e acrescentar campos falsos.
// Aqui saem: controles C0/C1 e DEL, separadores de linha Unicode, marcas de direção (bidi, usadas
// para disfarçar texto) e < >. O tamanho é limitado.
const BAD = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u200e\u200f\u202a-\u202e\u2066-\u2069<>]/g;

export function cleanText(s, max = 80) {
  return String(s ?? '').replace(BAD, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max);
}

// Coordenada só em número decimal simples ("-42.4251"). Recusa vazio, hexadecimal ("0x1f"),
// notação científica e espaços — L-06.
const DEC = /^-?\d{1,3}(\.\d{1,8})?$/;
export function parseCoord(v, limit) {
  const s = String(v ?? '').trim();
  if (!DEC.test(s)) return NaN;
  const n = Number(s);
  return Math.abs(n) <= limit ? n : NaN;
}
