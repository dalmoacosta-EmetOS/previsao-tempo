import { el } from './dom.js';
import { computeAlerts } from '../domain/alerts.js';

export function renderAlerts(root, { data, unit }) {
  const alerts = computeAlerts(data, unit);
  root.hidden = alerts.length === 0;
  root.replaceChildren(
    ...alerts.map((a) =>
      el('div', { class: `alert alert--${a.level}`, role: 'note' }, [
        el('strong', { text: a.title }),
        el('span', { text: a.text }),
        el('small', { text: 'Aviso automático — não oficial' }),
      ]),
    ),
  );
}
