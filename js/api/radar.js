import { getJSON } from './http.js';

// Radar de precipitação da RainViewer (grátis, sem chave, com atribuição obrigatória).
// Entrega os quadros das últimas ~2 horas, de 10 em 10 min (ADR-012).
const MAPS_URL = 'https://api.rainviewer.com/public/weather-maps.json';
const COLOR_SCHEME = 2; // "Universal Blue"
const OPTIONS = '1_1';  // suavizado + neve em cor diferente

export async function getRadarFrames() {
  const d = await getJSON(MAPS_URL, { timeout: 8000 });
  return (d.radar?.past || []).map((f) => ({
    time: f.time * 1000,
    url: `${d.host}${f.path}/256/{z}/{x}/{y}/${COLOR_SCHEME}/${OPTIONS}.png`,
  }));
}
