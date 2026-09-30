import { el, fill } from './dom.js?v=5.4.1';
import { t } from '../i18n/index.js?v=5.4.1';

const KINDS = ['offline', 'timeout', 'server', 'network'];

export function renderError(root, error) {
  if (!error) {
    root.replaceChildren();
    return;
  }
  const kind = KINDS.includes(error.kind) ? error.kind : 'network';
  const title = t(`err.${kind}.title`), text = t(`err.${kind}.text`);
  fill(root,
    el('div', { class: 'card error', role: 'alert' }, [
      el('strong', { text: title }),
      el('p', { text }),
      error.retry && el('button', { class: 'btn', type: 'button', text: t('err.retry'), onclick: error.retry }),
    ]),
  );
}

let toastTimer;
export function showToast(message, ms = 5000) {
  const box = document.getElementById('toast');
  box.textContent = message;
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; }, ms);
}
