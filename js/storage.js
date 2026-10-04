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

// Quem quer saber quando algo foi salvo (a conta sincroniza Casa, favoritas e viagens — ADR-051)
const listeners = new Set();
export function onSave(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function save(key, value, { silent = false } = {}) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* sem armazenamento: segue sem lembrar */
  }
  if (!silent) listeners.forEach((fn) => { try { fn(key, value); } catch { /* um ouvinte com erro não atrapalha os outros */ } });
}
