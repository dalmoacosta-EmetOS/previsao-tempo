import { getJSON } from './http.js?v=1.8';

// Radar de precipitação da RainViewer (grátis, sem chave, com atribuição obrigatória).
// Entrega os quadros das últimas ~2 horas, de 10 em 10 min (ADR-012).
// Se o serviço também oferecer "nowcast" (próximos ~30 min), usamos junto.
const MAPS_URL = 'https://api.rainviewer.com/public/weather-maps.json';
const COLOR_SCHEME = 2; // "Universal Blue"
const OPTIONS = '1_1';  // suavizado + neve em cor diferente

export async function getRadarFrames() {
  const d = await getJSON(MAPS_URL, { timeout: 8000 });
  const toFrame = (f, nowcast) => ({
    time: f.time * 1000,
    nowcast,
    url: `${d.host}${f.path}/256/{z}/{x}/{y}/${COLOR_SCHEME}/${OPTIONS}.png`,
  });
  return [
    ...(d.radar?.past || []).map((f) => toFrame(f, false)),
    ...(d.radar?.nowcast || []).map((f) => toFrame(f, true)),
  ];
}
