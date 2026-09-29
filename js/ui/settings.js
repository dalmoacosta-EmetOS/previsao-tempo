// Idioma e unidades (ADR-045). Botão 🌐 no topo abre um painel simples:
//  • Idioma: automático (o do aparelho) ou escolhido à mão — pensado para o imigrante.
//  • Unidades: automático (costume do país do aparelho), Métrico, EUA, Reino Unido ou
//    Personalizado (temperatura, distância/velocidade e chuva escolhidas uma a uma).
// Trocar recarrega a página: todos os textos e números são refeitos no novo padrão.
import { el, fill } from './dom.js?v=5.1.1';
import { t, LANGS, getLang, isManualLang, setLang, clearLang } from '../i18n/index.js?v=5.1.1';
import { getUnits, getUnitsMode, setUnitsMode } from '../units-settings.js?v=5.1.1';

const GLOBE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

export function mountSettings(button, panel, reload = () => location.reload()) {
  button.innerHTML = `${GLOBE}<span class="lang-btn__code">${getLang().toUpperCase()}</span>`;
  button.setAttribute('aria-label', t('set.open'));
  button.title = t('set.open');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', panel.id);

  const close = () => { panel.hidden = true; button.setAttribute('aria-expanded', 'false'); };
  button.addEventListener('click', () => {
    if (!panel.hidden) { close(); return; }
    render();
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    panel.querySelector('select')?.focus();
  });
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); button.focus(); } });

  function render() {
    const units = getUnits();
    const mode = getUnitsMode();
    const langSel = el('select', { id: 'set-lang', class: 'settings__select' }, [
      el('option', { value: 'auto', text: t('set.langAuto') }),
      ...LANGS.map((l) => el('option', { value: l.code, text: l.label, lang: l.locale })),
    ]);
    langSel.value = isManualLang() ? getLang() : 'auto';

    const unitSel = el('select', { id: 'set-units', class: 'settings__select' },
      ['auto', 'metric', 'us', 'uk', 'custom'].map((m) => el('option', { value: m, text: t(`set.units.${m}`) })));
    unitSel.value = mode;

    const one = (id, kind, opts) => {
      const s = el('select', { id, class: 'settings__select settings__select--small' },
        opts.map(([v, label]) => el('option', { value: v, text: label })));
      s.value = units[kind];
      return s;
    };
    const tempSel = one('set-temp', 'temp', [['C', '°C'], ['F', '°F']]);
    const distSel = one('set-dist', 'dist', [['km', `km · km/h`], ['mi', `mi · mph`]]);
    const precipSel = one('set-precip', 'precip', [['mm', 'mm'], ['in', t('set.inches')]]);
    const custom = el('div', { class: 'settings__custom', hidden: mode !== 'custom' }, [
      label('set-temp', t('set.temp'), tempSel),
      label('set-dist', t('set.dist'), distSel),
      label('set-precip', t('set.precip'), precipSel),
    ]);
    unitSel.addEventListener('change', () => { custom.hidden = unitSel.value !== 'custom'; });

    const apply = () => {
      if (langSel.value === 'auto') clearLang(); else setLang(langSel.value);
      if (unitSel.value === 'custom') setUnitsMode('custom', { temp: tempSel.value, dist: distSel.value, precip: precipSel.value });
      else setUnitsMode(unitSel.value);
      reload();
    };

    fill(panel,
      el('h2', { class: 'settings__title', text: t('set.title') }),
      label('set-lang', `🌐 ${t('set.lang')}`, langSel),
      el('p', { class: 'settings__hint', text: t('set.langHint') }),
      label('set-units', `📏 ${t('set.units')}`, unitSel),
      custom,
      el('p', { class: 'settings__hint', text: t('set.unitsHint') }),
      el('div', { class: 'settings__actions' }, [
        el('button', { type: 'button', class: 'btn', id: 'set-apply', text: t('set.apply'), onclick: apply }),
        el('button', { type: 'button', class: 'btn btn--ghost', text: t('common.close'), onclick: () => { close(); button.focus(); } }),
      ]),
    );
  }
}

function label(forId, text, control) {
  return el('div', { class: 'settings__row' }, [el('label', { for: forId, text }), control]);
}
