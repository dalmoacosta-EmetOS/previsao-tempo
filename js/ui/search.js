// Busca com autocompletar (RF-01): espera 300 ms, mínimo 2 letras, teclado acessível.
import { el } from './dom.js?v=1.9';
import { searchCities } from '../api/geocoding.js?v=1.9';

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
        // pointerdown responde ao toque NA HORA (o antigo mousedown chegava atrasado no iPhone);
        // preventDefault evita que o campo perca o foco antes da escolha.
        onpointerdown: (e) => { e.preventDefault(); choose(i); },
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
      showMessage('Buscando…');
      try {
        const found = await searchCities(q);
        if (mine !== seq) return; // resposta antiga, ignora
        results = found;
        if (!found.length) showMessage('Nenhuma cidade encontrada com esse nome.');
        else render();
      } catch (err) {
        if (mine !== seq) return;
        showMessage(err.kind === 'offline' ? 'Sem conexão. Verifique sua internet.' : 'Não foi possível buscar agora. Tente de novo.');
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

  input.addEventListener('blur', () => setTimeout(close, 250));
}
