// Painel "Sua conta" (ADR-051): botão 👤 no topo, ao lado do 🌐.
// Sem conta: explica para que serve (opcional) e oferece link por e-mail ou Google.
// Com conta: plano, aparelhos conectados (com "desconectar"), sair e apagar tudo.
import { el, fill } from './dom.js?v=6.4.2';
import { t, locale } from '../i18n/index.js?v=6.4.2';
import { onAccount, signInEmail, signInGoogle, signOut, revokeDevice, deleteAccount } from '../account.js?v=6.4.2';

const PERSON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

export function mountAccount(button, panel) {
  let s = null;
  let confirmDelete = false;
  button.setAttribute('aria-controls', panel.id);
  button.setAttribute('aria-expanded', 'false');

  const close = () => { panel.hidden = true; button.setAttribute('aria-expanded', 'false'); confirmDelete = false; };
  button.addEventListener('click', () => {
    if (!panel.hidden) { close(); return; }
    render();
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    panel.querySelector('input, button')?.focus();
  });
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); button.focus(); } });

  onAccount((next) => {
    const wasKicked = s?.kicked;
    s = next;
    paintButton();
    if (!panel.hidden) render();
    // aparelho desconectado pelo limite do plano: avisa mesmo com o painel fechado
    if (s.kicked && !wasKicked) { render(); panel.hidden = false; button.setAttribute('aria-expanded', 'true'); }
  });

  function paintButton() {
    const label = s.status === 'in' ? t('acc.openIn', { email: s.email }) : t('acc.open');
    button.innerHTML = PERSON;
    button.classList.toggle('is-in', s.status === 'in');
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  const msg = (key, kind = 'info') => key && el('p', { class: `account__msg account__msg--${kind}`, role: kind === 'error' ? 'alert' : 'status', text: t(key, { email: s.sent }) });

  function render() {
    if (!s) return;
    if (s.status === 'loading') { fill(panel, title(), el('p', { class: 'settings__hint', text: t('acc.loading') })); return; }
    if (s.status !== 'in') { renderOut(); return; }
    renderIn();
  }

  const title = () => el('h2', { class: 'settings__title', id: 'acc-title', text: t('acc.title') });
  const closeBtn = () => el('button', { type: 'button', class: 'btn btn--ghost', text: t('common.close'), onclick: () => { close(); button.focus(); } });

  function renderOut() {
    const input = el('input', { id: 'acc-email', class: 'account__input', type: 'email', autocomplete: 'email', inputmode: 'email', maxlength: '254', placeholder: t('acc.emailPh') });
    const send = el('button', { type: 'submit', class: 'btn', id: 'acc-send', text: t('acc.send') });
    const form = el('form', { class: 'account__form', novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      send.disabled = true;
      await signInEmail(input.value);
      send.disabled = false;
    } }, [el('label', { for: 'acc-email', class: 'account__label', text: t('acc.email') }), el('div', { class: 'account__row' }, [input, send])]);
    fill(panel,
      title(),
      s.kicked && msg('acc.kicked', 'warn'),
      s.deleted && msg('acc.deleted', 'info'),
      el('p', { class: 'settings__hint', text: t('acc.why') }),
      s.sent ? msg('acc.sent') : form,
      s.error && msg(`acc.err.${s.error}`, 'error'),
      el('div', { class: 'account__or', text: t('acc.or') }),
      el('button', { type: 'button', class: 'btn btn--ghost account__google', id: 'acc-google', text: t('acc.google'), onclick: () => signInGoogle() }),
      el('p', { class: 'settings__hint account__privacy', text: t('acc.privacy') }),
      el('div', { class: 'settings__actions' }, [closeBtn()]),
    );
  }

  function renderIn() {
    const p = s.plan;
    const when = (ms) => (ms ? new Intl.DateTimeFormat(locale(), { dateStyle: 'short', timeStyle: 'short' }).format(ms) : '');
    const devices = el('ul', { class: 'account__devices', id: 'acc-devices' }, s.devices.map((d) => el('li', { class: 'account__device' }, [
      el('span', { class: 'account__dev-name', text: d.label }),
      el('small', { text: d.current ? t('acc.thisDevice') : when(d.lastSeen) }),
      !d.current && el('button', { type: 'button', class: 'trip__chip', text: t('acc.disconnect'), onclick: () => revokeDevice(d.id) }),
    ])));
    const del = el('button', { type: 'button', class: `btn btn--ghost account__delete${confirmDelete ? ' is-armed' : ''}`, id: 'acc-delete',
      text: confirmDelete ? t('acc.deleteConfirm') : t('acc.delete'),
      onclick: async () => {
        if (!confirmDelete) { confirmDelete = true; render(); return; } // 2º toque confirma (sem janelas do navegador)
        confirmDelete = false;
        await deleteAccount();
      } });
    fill(panel,
      title(),
      el('p', { class: 'account__who', id: 'acc-who', text: t('acc.signedAs', { email: s.email }) }),
      p && el('p', { class: 'settings__hint', id: 'acc-plan', text: t(p.id === 'pro' ? 'acc.planPro' : 'acc.planFree', { devices: p.devices, favorites: p.favorites }) }),
      el('p', { class: 'settings__hint', id: 'acc-sync', text: t(`acc.sync.${s.sync || 'ok'}`) }),
      s.devices.length > 0 && el('h3', { class: 'account__sub', text: t('acc.devices', { n: s.devices.length, max: p?.devices || 2 }) }),
      s.devices.length > 0 && devices,
      s.error && msg(`acc.err.${s.error}`, 'error'),
      el('div', { class: 'settings__actions' }, [
        el('button', { type: 'button', class: 'btn', id: 'acc-signout', text: t('acc.signOut'), onclick: () => signOut() }),
        closeBtn(),
      ]),
      del,
    );
  }
}
