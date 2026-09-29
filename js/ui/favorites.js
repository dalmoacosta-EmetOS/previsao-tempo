// Faixa de cidades favoritas (ADR-030): atalho de um toque.
import { el, fill } from './dom.js?v=5.3';
import { placeKey } from '../domain/place-url.js?v=5.3';
import { t } from '../i18n/index.js?v=5.3';

export function renderFavorites(root, favorites, current, onPick) {
  root.hidden = favorites.length === 0;
  if (!favorites.length) { root.replaceChildren(); return; }
  const cur = current ? placeKey(current) : '';
  fill(root,
    el('span', { class: 'favs__title', text: `★ ${t('fav.title')}` }),
    favorites.map((p) => el('button', {
      class: 'favs__chip', type: 'button',
      'aria-current': placeKey(p) === cur ? 'true' : null,
      title: [p.name, p.region, p.country].filter(Boolean).join(', '),
      text: p.name,
      onclick: () => onPick(p),
    })),
  );
}
