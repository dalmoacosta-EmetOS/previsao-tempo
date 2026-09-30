import { el, fill } from './dom.js?v=5.4';
import { computeAlerts } from '../domain/alerts.js?v=5.4';
import { t, locale, getLang } from '../i18n/index.js?v=5.4';

export function renderAlerts(root, { data, unit, official = [] }) {
  const alerts = computeAlerts(data, unit);
  root.hidden = alerts.length === 0 && official.length === 0;
  const fmt = (iso) => {
    try {
      return new Intl.DateTimeFormat(locale(), { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: data.timezone }).format(new Date(iso));
    } catch { return ''; }
  };
  fill(root,
    // Oficiais primeiro (NWS, EUA) — ADR-020
    ...official.map((a) =>
      el('details', { class: `alert alert--official alert--${a.level}` }, [
        el('summary', {}, [
          el('span', { class: 'alert__badge', text: t('alert.official') }),
          el('strong', { text: a.title }),
          a.title !== a.event && el('span', { class: 'alert__orig', text: ` (${a.event})` }),
          a.ends && el('span', { class: 'alert__when', text: t('alert.until', { when: fmt(a.ends) }) }),
          el('small', { text: t('alert.tapRead', { sender: a.sender }) }),
        ]),
        el('div', { class: 'alert__body' }, [
          getLang() !== 'en' && el('p', { class: 'alert__note', text: t('alert.originalText') }),
          a.headline && el('p', { class: 'alert__headline', text: a.headline }),
          el('p', { class: 'alert__desc', text: a.description }),
          a.instruction && el('p', { class: 'alert__desc', text: a.instruction }),
          a.area && el('p', { class: 'alert__area', text: t('alert.area', { area: a.area }) }),
        ]),
      ])),
    ...alerts.map((a) =>
      el('div', { class: `alert alert--${a.level}`, role: 'note' }, [
        el('strong', { text: a.title }),
        el('span', { text: a.text }),
        el('small', { text: t('alert.auto') }),
      ]),
    ),
  );
}
