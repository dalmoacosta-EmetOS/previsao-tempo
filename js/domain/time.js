// Os horários chegam da API já no fuso da cidade, sem offset ("2026-09-27T14:00").
// Para não deixar o fuso do navegador interferir, tratamos esses textos como UTC.

const asUTC = (iso) => new Date((iso.length === 10 ? iso + 'T00:00' : iso) + ':00Z');

const weekdayFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });
const dayMonthFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });

export function hourLabel(iso) {
  return iso.slice(11, 16);
}

export function dayLabel(isoDate, index) {
  if (index === 0) return 'Hoje';
  if (index === 1) return 'Amanhã';
  const wd = weekdayFmt.format(asUTC(isoDate)).replace('.', '');
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

export function dayMonth(isoDate) {
  return dayMonthFmt.format(asUTC(isoDate));
}
