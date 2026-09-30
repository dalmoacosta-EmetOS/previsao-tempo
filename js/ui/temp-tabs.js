import { el } from './dom.js?v=6.1.1';
import { t } from '../i18n/index.js?v=6.1.1';

// Abas "Temperatura | Sensação térmica" — o mesmo estado vale para as 24 h e para os dias.
export function tempTabs(mode, onChange) {
  return el('div', { class: 'segmented segmented--small', role: 'tablist', 'aria-label': t('tabs.aria') },
    [['real', t('tabs.real')], ['feels', t('tabs.feels')]].map(([key, label]) => el('button', {
      type: 'button',
      role: 'tab',
      'aria-selected': String(mode === key),
      title: t(key === 'feels' ? 'tabs.feelsTitle' : 'tabs.realTitle'),
      text: label,
      onclick: () => onChange(key),
    })));
}

/** Valor a mostrar conforme a aba (cai para a temperatura real se faltar o dado). */
export const pick = (real, feels, mode) => (mode === 'feels' && feels != null ? feels : real);
