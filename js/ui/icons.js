// Ícones SVG próprios (conteúdo fixo do site, não vem da API).

const SUN = '<g><circle cx="32" cy="32" r="11" fill="#FFC83D"/><g stroke="#FFC83D" stroke-width="3.5" stroke-linecap="round"><path d="M32 9v6M32 49v6M9 32h6M49 32h6M15.7 15.7l4.3 4.3M44 44l4.3 4.3M15.7 48.3l4.3-4.3M44 20l4.3-4.3"/></g></g>';
const SUN_SMALL = '<g transform="translate(-6 -8) scale(.8)">' + SUN + '</g>';
const MOON = '<path d="M40 12a20 20 0 1 0 14 30A16 16 0 0 1 40 12z" fill="#F1E9C6"/>';
const MOON_SMALL = '<g transform="translate(-4 -8) scale(.75)">' + MOON + '</g>';
// Nuvem com leve volume (degradê) — traço mais adulto que a versão chapada (ADR-028)
const GRAD = '<defs><linearGradient id="wxc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D5DEE8"/></linearGradient>'
  + '<linearGradient id="wxd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C3CDD8"/><stop offset="1" stop-color="#8E9AA8"/></linearGradient></defs>';
const cloud = (fill = 'url(#wxc)', y = 0) =>
  `<path transform="translate(0 ${y})" d="M19 50h28a11 11 0 0 0 1-22 15 15 0 0 0-29-3 12 12 0 0 0 0 25z" fill="${fill}"/>`;
// Chuva e garoa: riscos inclinados (garoa = curtos e finos; chuva = longos)
const streaks = (pts, len, w) => `<g stroke="#5BB4FF" stroke-width="${w}" stroke-linecap="round">`
  + pts.map(([x, y]) => `<path d="M${x} ${y}l-${(len * 0.4).toFixed(1)} ${len}"/>`).join('') + '</g>';
const DRIZZLE = streaks([[23, 53], [31, 57], [39, 53], [47, 57]], 4.8, 2);
const RAIN = streaks([[24, 52], [34, 52], [44, 52]], 9, 2.4);
const RAIN_HEAVY = streaks([[21, 51], [29, 54], [37, 51], [45, 54], [53, 51]], 10, 2.6);
// Neve: pequenos flocos de 6 pontas, não bolinhas
const flake = (x, y, r = 3.8) => `<g transform="translate(${x} ${y})"><path d="M0 -${r}V${r}M-${(r * 0.87).toFixed(2)} -${r / 2}L${(r * 0.87).toFixed(2)} ${r / 2}M-${(r * 0.87).toFixed(2)} ${r / 2}L${(r * 0.87).toFixed(2)} -${r / 2}"/></g>`;
const SNOW = '<g stroke="#EAF4FF" stroke-width="1.6" stroke-linecap="round">' + flake(22, 57) + flake(33, 60) + flake(44, 57) + '</g>';
const SLEET = streaks([[25, 53], [43, 53]], 7, 2.2) + '<g stroke="#EAF4FF" stroke-width="1.6" stroke-linecap="round">' + flake(34, 58, 3) + '</g>';
const BOLT = '<path d="M34 44l-8 12h7l-3 9 11-14h-7l4-7z" fill="#FFD23F"/>';
const FOG = '<g stroke="#DDE3EA" stroke-width="3.5" stroke-linecap="round"><path d="M12 24h40M8 33h44M14 42h38M10 51h36"/></g>';

export function icon(name, isDay = true) {
  const sky = isDay ? SUN_SMALL : MOON_SMALL;
  let body;
  switch (name) {
    case 'clear': body = isDay ? SUN : '<g transform="translate(-4 0)">' + MOON + '</g>'; break;
    case 'mostly-clear': body = sky + cloud('url(#wxc)', 6).replace('d="', 'opacity=".9" d="'); break;
    case 'partly': body = sky + cloud(); break;
    case 'cloudy': body = cloud('url(#wxd)', -6) + cloud('url(#wxc)', 2); break;
    case 'fog': body = FOG; break;
    case 'drizzle': body = cloud('url(#wxc)', -6) + DRIZZLE; break;
    case 'rain': case 'showers': body = (name === 'showers' ? sky : '') + cloud('url(#wxc)', -6) + RAIN; break;
    case 'heavy-rain': body = cloud('url(#wxd)', -6) + RAIN_HEAVY; break;
    case 'sleet': body = cloud('url(#wxc)', -6) + SLEET; break;
    case 'snow': body = cloud('url(#wxc)', -6) + SNOW; break;
    case 'storm': body = cloud('url(#wxd)', -8) + BOLT; break;
    default: body = cloud();
  }
  return `<svg class="wx-icon" viewBox="0 0 64 64" aria-hidden="true">${GRAD}${body}</svg>`;
}
