// Idiomas (ADR-045). O site abre no idioma do aparelho; se não tivermos esse idioma, em INGLÊS.
// A pessoa pode trocar à mão (🌐) — pensado para o imigrante: um brasileiro nos EUA escolhe português.
// A escolha manual fica salva no aparelho e vale mais que a detecção automática.
import { load, save } from '../storage.js?v=6.1.1';
import pt from './pt.js?v=6.1.1';
import en from './en.js?v=6.1.1';
import es from './es.js?v=6.1.1';

export const DICTS = { pt, en, es };
export const LANGS = [
  { code: 'pt', label: 'Português', locale: 'pt-BR' },
  { code: 'en', label: 'English', locale: 'en-US' },
  { code: 'es', label: 'Español', locale: 'es' },
];
const FALLBACK = 'en';

function deviceLanguages() {
  try { return navigator.languages?.length ? navigator.languages : [navigator.language || '']; } catch { return []; }
}

/** Idioma do aparelho que temos (ou inglês). */
export function detectLang(list = deviceLanguages()) {
  for (const l of list) {
    const base = String(l || '').slice(0, 2).toLowerCase();
    if (DICTS[base]) return base;
  }
  return FALLBACK;
}

let lang = DICTS[load('lang')] ? load('lang') : detectLang();

export const getLang = () => lang;
export const isManualLang = () => !!DICTS[load('lang')];

/** Formato de datas e números: o do aparelho, se for do mesmo idioma (en-GB mantém dia/mês); senão o padrão do idioma. */
export function locale() {
  const dev = deviceLanguages().find((l) => String(l).slice(0, 2).toLowerCase() === lang);
  return dev || LANGS.find((l) => l.code === lang).locale;
}

export function setLang(code) {
  if (!DICTS[code]) return;
  lang = code;
  save('lang', code);
}

/** Volta ao automático (idioma do aparelho). */
export function clearLang() {
  save('lang', null);
  lang = detectLang();
}

/** Tradução: t('chave', { variavel }) — o texto pode ter {variavel} ou ser uma função (plural, gramática). */
export function t(key, vars = {}) {
  const v = DICTS[lang][key] ?? DICTS[FALLBACK][key] ?? DICTS.pt[key];
  if (v === undefined) return key;
  if (typeof v === 'function') return v(vars);
  return v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

/** Tradução só se o idioma ATUAL tiver a chave (sem cair para outro idioma). */
export function tMaybe(key) {
  const v = DICTS[lang][key];
  return typeof v === 'string' ? v : undefined;
}

/** Aplica traduções no HTML fixo: data-i18n (texto), data-i18n-attr="attr:chave;attr2:chave2". */
export function applyStatic(root = document) {
  document.documentElement.lang = locale();
  root.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
  root.querySelectorAll('[data-i18n-attr]').forEach((n) => {
    n.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':');
      if (attr && key) n.setAttribute(attr.trim(), t(key.trim()));
    });
  });
}
