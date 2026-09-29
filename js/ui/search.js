// Busca com autocompletar (RF-01): espera 300 ms, mínimo 2 letras, teclado acessível.
import { el } from './dom.js?v=5.1';
import { searchCities } from '../api/geocoding.js?v=5.1';
import { t } from '../i18n/index.js?v=5.1';

export function setupSearch({ input, list, onSelect }) {
  let timer;
  let seq = 0;
  let results = [];
  let active = -1;

  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };

  const showMessage = (text) => {
    results = [];
    list.replaceChildren(el('li', { class: 'search__msg', text }));
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  let lastPick = 0;
  const pick = (i) => {
    if (Date.now() - lastPick < 600) return; // mesmo toque chegando por outro evento
    lastPick = Date.now();
    choose(i);
  };

  const choose = (i) => {
    const place = results[i];
    if (!place) return;
    input.value = '';
    close();
    input.blur();
    onSelect(place);
  };

  const highlight = (i) => {
    const items = list.querySelectorAll('[role="option"]');
    items.forEach((n, j) => n.setAttribute('aria-selected', String(j === i)));
    active = i;
    if (items[i]) input.setAttribute('aria-activedescendant', items[i].id);
  };

  const render = () => {
    list.replaceChildren(...results.map((r, i) =>
      el('li', {
        id: `opt-${i}`,
        role: 'option',
        'aria-selected': 'false',
        // Escolha por toque robusta (4.1): o iPhone nem sempre entrega o mesmo evento. Tentamos
        // pointerdown (resposta imediata), touchend e click — o primeiro que chegar escolhe, os outros são ignorados.
        onpointerdown: (e) => { e.preventDefault(); pick(i); },
        ontouchend: (e) => { e.preventDefault(); pick(i); },
        onclick: () => pick(i),
        onmousedown: (e) => e.preventDefault(),
      }, [
        el('strong', { text: r.name }),
        el('span', { text: [r.region, r.country].filter(Boolean).join(', ') }),
      ])));
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { close(); return; }
    timer = setTimeout(async () => {
      const mine = ++seq;
      showMessage(t('search.searching'));
      try {
        const found = await searchCities(q);
        if (mine !== seq) return; // resposta antiga, ignora
        results = found;
        if (!found.length) showMessage(t('search.none'));
        else render();
      } catch (err) {
        if (mine !== seq) return;
        showMessage(t(err.kind === 'offline' ? 'search.offline' : 'search.fail'));
      }
    }, 300);
  });

  input.addEventListener('keydown', (e) => {
    if (list.hidden || !results.length) {
      if (e.key === 'Escape') close();
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); highlight((active + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlight((active - 1 + results.length) % results.length); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active >= 0 ? active : 0); }
    else if (e.key === 'Escape') close();
  });

  // No iPhone o teclado fecha (blur) antes de o toque na lista chegar: espera um pouco mais antes de fechar
  input.addEventListener('blur', () => setTimeout(close, 450));
}
