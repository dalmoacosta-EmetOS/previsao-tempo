// Chamada HTTP com tempo-limite e erros classificados.
// kind: 'offline' | 'timeout' | 'server' | 'network'

export class HttpError extends Error {
  constructor(kind, message = kind) {
    super(message);
    this.kind = kind;
  }
}

export async function getJSON(url, { timeout = 10000 } = {}) {
  if (navigator.onLine === false) throw new HttpError('offline');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new HttpError('server', `HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err.name === 'AbortError') throw new HttpError('timeout');
    throw new HttpError(navigator.onLine === false ? 'offline' : 'network', err.message);
  } finally {
    clearTimeout(timer);
  }
}
