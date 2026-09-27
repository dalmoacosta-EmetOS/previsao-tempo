// Preferências no navegador. Pode falhar (modo privado): nunca quebra o site.
const PREFIX = 'previsao-tempo:';

export function load(key) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* sem armazenamento: segue sem lembrar */
  }
}
