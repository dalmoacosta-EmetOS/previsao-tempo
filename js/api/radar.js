import { getJSON } from './http.js?v=6.4.0';

// Radar de precipitação da RainViewer (grátis, sem chave, com atribuição obrigatória).
// Entrega os quadros das últimas ~2 horas, de 10 em 10 min (ADR-012).
// Se o serviço também oferecer "nowcast" (próximos ~30 min), usamos junto.
const MAPS_URL = 'https://api.rainviewer.com/public/weather-maps.json';
const COLOR_SCHEME = 2; // "Universal Blue": chuva em azul→amarelo→vermelho. O esquema 4 (verde) foi recusado pelo serviço gratuito (ADR-023)
const OPTIONS = '1_0';  // suavizado; neve na mesma escala (a cor própria de neve não é documentada no plano gratuito)

// Só aceitamos ladrilhos da própria RainViewer, em HTTPS, com caminho simples (L-05):
// se a resposta viesse adulterada, o site não carregaria imagens de outro endereço.
const HOST_OK = /^https:\/\/([a-z0-9-]+\.)*rainviewer\.com$/;
const PATH_OK = /^\/[A-Za-z0-9_/-]{1,80}$/;

export async function getRadarFrames() {
  const d = await getJSON(MAPS_URL, { timeout: 8000 });
  if (typeof d?.host !== 'string' || !HOST_OK.test(d.host)) return [];
  const ok = (f) => Number.isFinite(f?.time) && typeof f.path === 'string' && PATH_OK.test(f.path) && !f.path.includes('//');
  const toFrame = (f, nowcast) => ({
    time: f.time * 1000,
    nowcast,
    url: `${d.host}${f.path}/256/{z}/{x}/{y}/${COLOR_SCHEME}/${OPTIONS}.png`,
  });
  return [
    ...(d.radar?.past || []).filter(ok).map((f) => toFrame(f, false)),
    ...(d.radar?.nowcast || []).filter(ok).map((f) => toFrame(f, true)),
  ];
}
