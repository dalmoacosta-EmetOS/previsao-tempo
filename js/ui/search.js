// Busca com autocompletar (RF-01): espera 300 ms, mínimo 2 letras, teclado acessível.
import { el } from './dom.js?v=5.4.1';
import { searchCities } from '../api/geocoding.js?v=5.4.1';
import { t } from '../i18n/index.js?v=5.4.1';

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
    if (press) return; // dedo na lista: não troca o que está debaixo dele
    results = [];
    list.replaceChildren(el('li', { class: 'search__msg', text }));
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  // Escolha por toque — correção definitiva (5.4, vídeo do Dalmo de 29/09 20:44):
  //  1. O corretor do iPhone trocava "Brasilia" por "Brasília" no meio do toque → nova busca → a lista
  //     era refeita e o toque caía em OUTRA cidade (tocou Brasília, abriu Porecatu). Agora o corretor
  //     fica desligado no campo e uma nova busca com o mesmo texto não refaz a lista.
  //  2. A escolha guarda a CIDADE tocada (não a posição na lista): mesmo se a lista mudar, vale o que
  //     estava debaixo do dedo.
  //  3. Toque = dedo desce e sobe no mesmo item sem arrastar (arrastar = rolar a lista). Enquanto o dedo
  //     está na lista, nenhuma resposta nova redesenha a lista.
  let lastPick = { at: 0, key: '' };
  let press = null;       // { place, x, y }
  let pendingRender = null;
  const keyOf = (p) => `${p.lat},${p.lon}`;
  const choosePlace = (place) => {
    if (!place) return;
    const k = keyOf(place);
    if (Date.now() - lastPick.at < 700 && lastPick.key === k) return; // mesmo toque chegando por outro evento
    lastPick = { at: Date.now(), key: k };
    press = null;
    input.value = '';
    lastQuery = '';
    close();
    input.blur();
    onSelect(place);
  };
  const choose = (i) => choosePlace(results[i]);
  list.addEventListener('pointerdown', (e) => {
    const li = e.target.closest('[role="option"]');
    if (!li || !li._place) return;
    press = { place: li._place, x: e.clientX, y: e.clientY };
  });
  list.addEventListener('pointermove', (e) => {
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 12) press = null; // está rolando
  });
  list.addEventListener('pointercancel', () => { press = null; flushRender(); });
  list.addEventListener('pointerup', () => {
    const p = press;
    press = null;
    if (p) choosePlace(p.place);
    else flushRender();
  });
  // Teclado, leitor de tela e navegadores sem "pointer": o clique comum também escolhe
  list.addEventListener('click', (e) => {
    const li = e.target.closest('[role="option"]');
    if (li?._place) choosePlace(li._place);
  });
  // Não deixa o campo perder o foco ao tocar na lista (o teclado fechando mexia a página)
  list.addEventListener('mousedown', (e) => e.preventDefault());
  const flushRender = () => { if (pendingRender) { const f = pendingRender; pendingRender = null; f(); } };

  const highlight = (i) => {
    const items = list.querySelectorAll('[role="option"]');
    items.forEach((n, j) => n.setAttribute('aria-selected', String(j === i)));
    active = i;
    if (items[i]) input.setAttribute('aria-activedescendant', items[i].id);
  };

  const render = () => {
    if (press) { pendingRender = render; return; } // dedo na lista: redesenha depois
    list.replaceChildren(...results.map((r, i) => {
      const li = el('li', { id: `opt-${list.id}-${i}`, role: 'option', 'aria-selected': 'false' }, [
        el('strong', { text: r.name }),
        el('span', { text: [r.region, r.country].filter(Boolean).join(', ') }),
      ]);
      li._place = r;
      return li;
    }));
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  let lastQuery = '';
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { close(); lastQuery = ''; return; }
    // Mesmo texto (ex.: corretor só trocou acento, ou evento repetido) com a lista aberta: não refaz
    if (q.localeCompare(lastQuery, undefined, { sensitivity: 'base' }) === 0 && !list.hidden && results.length) return;
    lastQuery = q;
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
