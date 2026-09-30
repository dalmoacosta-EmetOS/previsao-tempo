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

// Céu estrelado (5.4): três camadas de estrelas (pequenas, médias, grandes) espalhadas ao acaso.
// Cada camada é um único ponto com várias "sombras" — leve para o celular.
function drawStars() {
  const box = document.querySelector('.sky__stars');
  if (!box || box.childElementCount) return;
  const layer = (n, alpha) => {
    const i = document.createElement('i');
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a = (alpha * (0.55 + Math.random() * 0.45)).toFixed(2);
      pts.push(`${(Math.random() * 100).toFixed(1)}vw ${(Math.random() * 65).toFixed(1)}vh rgba(255,255,255,${a})`);
    }
    i.style.boxShadow = pts.join(',');
    return i;
  };
  box.append(layer(90, 0.8), layer(45, 0.9), layer(14, 1));
  // 5.5: estrelas que cintilam (cada uma no seu ritmo) + uma estrela cadente de vez em quando
  for (let k = 0; k < 16; k++) {
    const b = document.createElement('b');
    b.style.left = `${(Math.random() * 96).toFixed(1)}%`;
    b.style.top = `${(Math.random() * 60).toFixed(1)}%`;
    b.style.animationDuration = `${(2.5 + Math.random() * 3.5).toFixed(1)}s`;
    b.style.animationDelay = `${(-Math.random() * 6).toFixed(1)}s`;
    box.append(b);
  }
  const meteor = document.createElement('u');
  const place = () => {
    meteor.style.left = `${(45 + Math.random() * 50).toFixed(0)}%`;
    meteor.style.top = `${(4 + Math.random() * 30).toFixed(0)}%`;
    meteor.style.animationDuration = `${(10 + Math.random() * 9).toFixed(1)}s`;
  };
  place();
  meteor.addEventListener('animationiteration', place); // cada passagem num lugar diferente
  box.append(meteor);
}


export function applyScene({ scene, time, intensity = 'normal' }) {
  drawStars();
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
