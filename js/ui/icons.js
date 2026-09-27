// Ícones SVG próprios (conteúdo fixo do site, não vem da API).

const SUN = '<g><circle cx="32" cy="32" r="11" fill="#FFC83D"/><g stroke="#FFC83D" stroke-width="3.5" stroke-linecap="round"><path d="M32 9v6M32 49v6M9 32h6M49 32h6M15.7 15.7l4.3 4.3M44 44l4.3 4.3M15.7 48.3l4.3-4.3M44 20l4.3-4.3"/></g></g>';
const SUN_SMALL = '<g transform="translate(-6 -8) scale(.8)">' + SUN + '</g>';
const MOON = '<path d="M40 12a20 20 0 1 0 14 30A16 16 0 0 1 40 12z" fill="#F1E9C6"/>';
const MOON_SMALL = '<g transform="translate(-4 -8) scale(.75)">' + MOON + '</g>';
const cloud = (fill = '#F4F7FB', y = 0) =>
  `<path transform="translate(0 ${y})" d="M19 50h28a11 11 0 0 0 1-22 15 15 0 0 0-29-3 12 12 0 0 0 0 25z" fill="${fill}"/>`;
const RAIN = '<g stroke="#5BB4FF" stroke-width="3" stroke-linecap="round"><path d="M22 54l-3 7M33 54l-3 7M44 54l-3 7"/></g>';
const DRIZZLE = '<g fill="#5BB4FF"><circle cx="22" cy="57" r="2"/><circle cx="32" cy="60" r="2"/><circle cx="42" cy="57" r="2"/></g>';
const SNOW = '<g fill="#FFFFFF" stroke="#9CC9F0" stroke-width="1"><circle cx="21" cy="57" r="3"/><circle cx="32" cy="60" r="3"/><circle cx="43" cy="57" r="3"/></g>';
const BOLT = '<path d="M34 44l-8 12h7l-3 9 11-14h-7l4-7z" fill="#FFD23F"/>';
const FOG = '<g stroke="#DDE3EA" stroke-width="3.5" stroke-linecap="round"><path d="M12 24h40M8 33h44M14 42h38M10 51h36"/></g>';

export function icon(name, isDay = true) {
  const sky = isDay ? SUN_SMALL : MOON_SMALL;
  let body;
  switch (name) {
    case 'clear': body = isDay ? SUN : '<g transform="translate(-4 0)">' + MOON + '</g>'; break;
    case 'mostly-clear': body = sky + cloud('#F4F7FB', 6).replace('d="', 'opacity=".9" d="'); break;
    case 'partly': body = sky + cloud(); break;
    case 'cloudy': body = cloud('#C9D3DE', -6) + cloud('#F4F7FB', 2); break;
    case 'fog': body = FOG; break;
    case 'drizzle': body = cloud('#E3E9F0', -6) + DRIZZLE; break;
    case 'rain': case 'showers': body = (name === 'showers' ? sky : '') + cloud('#DCE3EB', -6) + RAIN; break;
    case 'heavy-rain': body = cloud('#AEB9C6', -6) + RAIN + '<g transform="translate(5 0)">' + RAIN + '</g>'; break;
    case 'sleet': body = cloud('#DCE3EB', -6) + DRIZZLE + SNOW.replace(/cy="5\d"/g, 'cy="52"'); break;
    case 'snow': body = cloud('#E8EEF4', -6) + SNOW; break;
    case 'storm': body = cloud('#8F9BAA', -8) + BOLT; break;
    default: body = cloud();
  }
  return `<svg class="wx-icon" viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;
}
