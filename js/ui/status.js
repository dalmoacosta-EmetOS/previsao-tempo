import { el, fill } from './dom.js?v=3.0';

const MESSAGES = {
  offline: ['Sem conexão', 'Verifique sua internet e tente de novo.'],
  timeout: ['O serviço demorou para responder', 'Tente de novo em alguns segundos.'],
  server: ['Serviço de clima indisponível', 'A fonte de dados está fora do ar no momento.'],
  network: ['Não foi possível carregar a previsão', 'Verifique sua conexão e tente de novo.'],
};

export function renderError(root, error) {
  if (!error) {
    root.replaceChildren();
    return;
  }
  const [title, text] = MESSAGES[error.kind] || MESSAGES.network;
  fill(root,
    el('div', { class: 'card error', role: 'alert' }, [
      el('strong', { text: title }),
      el('p', { text }),
      error.retry && el('button', { class: 'btn', type: 'button', text: 'Tentar de novo', onclick: error.retry }),
    ]),
  );
}

let toastTimer;
export function showToast(message, ms = 5000) {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
