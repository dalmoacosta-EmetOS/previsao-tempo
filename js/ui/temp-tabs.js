import { el } from './dom.js?v=4.0';

// Abas "Temperatura | Sensação térmica" — o mesmo estado vale para as 24 h e para os dias.
export function tempTabs(mode, onChange) {
  return el('div', { class: 'segmented segmented--small', role: 'tablist', 'aria-label': 'Tipo de temperatura' },
    [['real', 'Temperatura'], ['feels', 'Sensação']].map(([key, label]) => el('button', {
      type: 'button',
      role: 'tab',
      'aria-selected': String(mode === key),
      title: key === 'feels' ? 'Sensação térmica: como o corpo sente, somando vento e umidade' : 'Temperatura do ar',
      text: label,
      onclick: () => onChange(key),
    })));
}

/** Valor a mostrar conforme a aba (cai para a temperatura real se faltar o dado). */
export const pick = (real, feels, mode) => (mode === 'feels' && feels != null ? feels : real);
