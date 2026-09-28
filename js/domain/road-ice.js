// Gelo na pista / "black ice" (ADR-032). Não cai do céu: forma-se no asfalto quando a
// água da chuva congela. Regra do site (estimativa, não alerta oficial), próximas 24 h:
//  • PROVÁVEL: previsão de garoa/chuva congelante, ou chuva caindo com temperatura ≤ 0 °C;
//  • POSSÍVEL: choveu/neva e, em até 6 h depois, a temperatura chega a ≤ 0 °C.
import { hourLabel } from './time.js?v=3.3';

const FREEZING = [56, 57, 66, 67];
const wet = (h) => (h.precip ?? 0) >= 0.1 || (h.snow ?? 0) > 0;

export function roadIceRisk(hourly) {
  const next = hourly.slice(0, 24);
  const frz = next.find((h) => FREEZING.includes(h.code) || (wet(h) && (h.snow ?? 0) === 0 && h.temp <= 0));
  if (frz) return { level: 'danger', label: 'Provável', reason: `Chuva ou garoa congelando por volta das ${hourLabel(frz.time)}: o gelo fica quase invisível no asfalto.` };
  for (let i = 0; i < next.length; i++) {
    if (!wet(next[i])) continue;
    const freeze = next.slice(i, i + 7).find((h) => h.temp <= 0);
    if (freeze) return { level: 'warn', label: 'Possível', reason: `Pista molhada e temperatura chegando a 0 °C por volta das ${hourLabel(freeze.time)}: a água pode congelar.` };
  }
  return { level: null, label: 'Sem risco', reason: '' };
}
