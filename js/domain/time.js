// Os horários chegam da API já no fuso da cidade, sem offset ("2026-09-27T14:00").
// Para não deixar o fuso do navegador interferir, tratamos esses textos como UTC.
// Formatos no costume do idioma (14:00 no Brasil, 2:00 PM nos EUA) — ADR-045.
import { t, locale, getLang } from '../i18n/index.js?v=6.1';

// Hora: "07:00" no Brasil; "7:00 AM" nos EUA; "7:00 p. m." no México — cada um no seu costume.
const HOUR = () => (getLang() === 'pt' ? '2-digit' : 'numeric');

const asUTC = (iso) => new Date((iso.length === 10 ? iso + 'T00:00' : iso) + ':00Z');
const fmt = (opts) => new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', ...opts });

export function hourLabel(iso) {
  return fmt({ hour: HOUR(), minute: '2-digit' }).format(asUTC(iso.slice(0, 16)));
}

export function dayLabel(isoDate, index) {
  if (index === 0) return t('time.today');
  if (index === 1) return t('time.tomorrow');
  const wd = fmt({ weekday: 'short' }).format(asUTC(isoDate)).replace('.', '');
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

export function dayMonth(isoDate) {
  return fmt({ day: '2-digit', month: '2-digit' }).format(asUTC(isoDate));
}

/** Dia da semana por extenso + data ("segunda-feira, 28 de setembro"). */
export function longDay(isoDate) {
  const s = fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(asUTC(isoDate));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Hora local do aparelho (para a viagem). */
export const clock = (ms) => new Date(ms).toLocaleTimeString(locale(), { hour: HOUR(), minute: '2-digit' });
export const shortDate = (ms) => new Date(ms).toLocaleDateString(locale(), { weekday: 'short', day: '2-digit', month: '2-digit' });
