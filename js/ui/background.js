// Céu animado que acompanha o clima (RF-09) + modo demonstração (RF-10, ADR-007).

export const DEMO_SCENES = {
  sol: { scene: 'clear', time: 'day' },
  parcial: { scene: 'partly', time: 'day' },
  nublado: { scene: 'cloudy', time: 'day' },
  neblina: { scene: 'fog', time: 'day' },
  chuva: { scene: 'rain', time: 'day', intensity: 'normal' },
  garoa: { scene: 'rain', time: 'day', intensity: 'light' },
  temporal: { scene: 'rain', time: 'day', intensity: 'heavy' },
  neve: { scene: 'snow', time: 'day' },
  tempestade: { scene: 'storm', time: 'night', intensity: 'heavy' },
  noite: { scene: 'clear', time: 'night' },
};

let lastKey = '';

export function applyScene({ scene, time, intensity = 'normal' }) {
  const key = scene + time + intensity;
  if (key === lastKey) return;
  lastKey = key;

  document.body.dataset.scene = scene;
  document.body.dataset.time = time;
  document.body.dataset.intensity = intensity;

  const precip = document.getElementById('precip');
  precip.replaceChildren();
  const kind = scene === 'snow' ? 'flake' : (scene === 'rain' || scene === 'storm') ? 'drop' : null;
  if (!kind) return;

  const factor = { light: 0.7, normal: 1.1, heavy: 1.8 }[intensity] || 1;
  const count = Math.round((kind === 'drop' ? (scene === 'storm' ? 110 : 80) : 60) * factor);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = kind;
    s.style.left = `${Math.random() * 100}%`;
    s.style.animationDelay = `${-Math.random() * 5}s`;
    s.style.animationDuration = kind === 'drop'
      ? `${0.5 + Math.random() * 0.5}s`
      : `${5 + Math.random() * 6}s`;
    if (kind === 'flake') {
      const size = 3 + Math.random() * 5;
      s.style.width = s.style.height = `${size}px`;
    }
    frag.append(s);
  }
  precip.append(frag);
}
