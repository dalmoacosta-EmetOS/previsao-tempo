// Céu animado que acompanha o clima (RF-09) + modo demonstração (RF-10, ADR-007).

export const DEMO_SCENES = {
  sol: { scene: 'clear', time: 'day' },
  parcial: { scene: 'partly', time: 'day' },
  nublado: { scene: 'cloudy', time: 'day' },
  neblina: { scene: 'fog', time: 'day' },
  chuva: { scene: 'rain', time: 'day' },
  neve: { scene: 'snow', time: 'day' },
  tempestade: { scene: 'storm', time: 'night' },
  noite: { scene: 'clear', time: 'night' },
};

let lastKey = '';

export function applyScene({ scene, time }) {
  const key = scene + time;
  if (key === lastKey) return;
  lastKey = key;

  document.body.dataset.scene = scene;
  document.body.dataset.time = time;

  const precip = document.getElementById('precip');
  precip.replaceChildren();
  const kind = scene === 'snow' ? 'flake' : (scene === 'rain' || scene === 'storm') ? 'drop' : null;
  if (!kind) return;

  const count = kind === 'drop' ? (scene === 'storm' ? 110 : 80) : 60;
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
