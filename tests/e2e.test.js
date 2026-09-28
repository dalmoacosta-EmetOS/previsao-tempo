// Teste de ponta a ponta com APIs simuladas (o ambiente de build não acessa a internet).
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'shots');           // capturas de tela (fora do git)
const FIX = path.join(__dirname, 'fixtures');
fs.mkdirSync(OUT, { recursive: true });
const VERSION = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8').match(/VERSION = '([^']+)'/)[1];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, buf) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    res.end(buf);
  });
});

function forecast({ code = 2, isDay = 1, stormy = false, hot = false, rainNow = 0, rainNext = [0,0,0,0,0,0,0,0], hourNowCode = null, hourNowPop = null, icy = null } = {}) {
  const start = new Date(Date.UTC(2026, 8, 27, 0, 0));
  const hours = [], hT = [], hPop = [], hCode = [], hDay = [], hCape = [];
  for (let i = 0; i < 16 * 24; i++) {
    const t = new Date(start.getTime() + i * 3600e3);
    hours.push(t.toISOString().slice(0, 16));
    const hr = t.getUTCHours();
    hT.push(14 + 8 * Math.sin(((hr - 9) / 24) * 2 * Math.PI) + (hot ? 16 : 0));
    hPop.push(stormy ? 70 : Math.max(0, Math.round(40 * Math.sin(i / 7))));
    hCode.push(stormy && i > 10 && i < 20 ? 95 : [0, 1, 2, 3, 61, 80][i % 6]);
    hDay.push(hr >= 6 && hr < 19 ? 1 : 0);
    hCape.push(stormy ? 1800 : 200);
  }
  const hPrecip = hours.map(() => 0);
  if (icy) { hPrecip[9] = 1.2; for (let i = 11; i < 20; i++) hT[i] = -2; if (icy === 'danger') hCode[12] = 66; }
  if (hourNowCode != null) { hCode[8] = hourNowCode; hPop[8] = hourNowPop; hCode[9] = 3; hPop[9] = 20; }
  const dT = [], dCode = [], dMax = [], dMin = [], dPop = [], dSnow = [], dUv = [], dRise = [], dSet = [], dW = [], dG = [];
  const codes = [code, 3, 61, 0, 1, 80, 71, 2, 95, 45, 3, 0, 63, 2, 1, 0];
  for (let d = 0; d < 16; d++) {
    const day = new Date(start.getTime() + d * 86400e3).toISOString().slice(0, 10);
    dT.push(day); dCode.push(codes[d]);
    dMax.push(22 + (d % 5) - (d > 9 ? 3 : 0) + (hot ? 16 : 0)); dMin.push(10 + (d % 3) + (hot ? 12 : 0));
    dPop.push([10, 20, 80, 5, 0, 60, 40, 15, 90, 10, 30, 0, 70, 20, 10, 5][d]);
    dSnow.push(d === 6 ? 2.4 : 0); dUv.push(hot ? 10 : 5.2);
    dRise.push(day + 'T06:38'); dSet.push(day + 'T18:31');
    dW.push(18); dG.push(stormy ? 72 : 34);
  }
  return {
    timezone: 'America/New_York', timezone_abbreviation: 'GMT-4',
    current: { time: '2026-09-27T08:15', temperature_2m: hot ? 36.4 : 17.3, apparent_temperature: hot ? 39 : 16.1, relative_humidity_2m: 72, weather_code: code, wind_speed_10m: 14.8, wind_direction_10m: 225, is_day: isDay, precipitation: rainNow, rain: rainNow, showers: 0, snowfall: 0 },
    minutely_15: { time: [0,1,2,3,4,5,6,7].map(i => `2026-09-27T${String(8 + Math.floor((15 + i*15)/60)).padStart(2,'0')}:${String((15 + i*15)%60).padStart(2,'0')}`), precipitation: rainNext, snowfall: [0,0,0,0,0,0,0,0] },
    hourly: { time: hours, temperature_2m: hT, apparent_temperature: hT.map((v) => v - 3), relative_humidity_2m: hours.map(() => 88), wind_speed_10m: hours.map((_, i) => 25 + (i % 5) * 3), wind_direction_10m: hours.map(() => 30), wind_gusts_10m: hours.map(() => 55), cloud_cover: hours.map((_, i) => (i % 24 < 12 ? 95 : 40)), uv_index: hours.map(() => 2), visibility: hours.map(() => 8000), snowfall: hours.map(() => 0), precipitation_probability: hPop, precipitation: hPrecip, weather_code: hCode, is_day: hDay, cape: hCape },
    daily: { time: dT, weather_code: dCode, temperature_2m_max: dMax, temperature_2m_min: dMin, apparent_temperature_max: dMax.map((v) => v - 2), apparent_temperature_min: dMin.map((v) => v - 4), precipitation_probability_max: dPop, snowfall_sum: dSnow, uv_index_max: dUv, sunrise: dRise, sunset: dSet, wind_speed_10m_max: dW, wind_gusts_10m_max: dG },
  };
}

let nwsCalls = 0;
const GEO = { results: [
  { name: 'São Paulo', admin1: 'São Paulo', country: 'Brasil', latitude: -23.55, longitude: -46.63 },
  { name: 'São Paulo de Olivença', admin1: 'Amazonas', country: 'Brasil', latitude: -3.37, longitude: -68.87 },
] };

async function page(browser, { sw = false, mobile, fc = forecast(), geo = 'deny', failForecast = false, url = '/', radarFail = false, gridFail = false, radarNoCors = false, aqi = 42, routeFail = false }) {
  // O "modo sem internet" (sw.js) desviaria as respostas simuladas; só fica ligado no teste dele.
  const ctx = await browser.newContext({ serviceWorkers: sw ? 'allow' : 'block', ...(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1366, height: 900 } }) });
  if (geo === 'allow') { await ctx.grantPermissions(['geolocation']); await ctx.setGeolocation({ latitude: 42.39, longitude: -71.1 }); }
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !m.text().includes('Failed to load resource') && errors.push(m.text()));
  await p.route('https://api.open-meteo.com/**', (r) => {
    const u = new URL(r.request().url());
    const lats = (u.searchParams.get('latitude') || '').split(',');
    if (lats.length > 1 && u.searchParams.get('hourly').includes('wind_gusts_10m')) {
      // "Tempo na viagem": previsão por ponto da rota (ADR-039)
      const n = lats.length, now = Math.floor(Date.now() / 3600000) * 3600;
      const times = Array.from({ length: 72 }, (_, t) => now + t * 3600);
      return r.fulfill({ json: Array.from({ length: n }, (_, i) => ({ hourly: { time: times,
        temperature_2m: times.map(() => 15 - i), precipitation: times.map(() => (i === 2 ? 9 : 0)),
        precipitation_probability: times.map(() => (i === 2 ? 90 : 10)), weather_code: times.map(() => (i === 2 ? 65 : i === 3 ? 45 : 2)),
        visibility: times.map(() => (i === 3 ? 300 : 20000)), wind_gusts_10m: times.map(() => 20), snowfall: times.map(() => 0), is_day: times.map(() => 1) } })) });
    }
    if (lats.length > 1) {
      if (gridFail) return r.fulfill({ status: 500, body: '{}' });
      const n = lats.length, side = Math.round(Math.sqrt(n));
      const now = Math.floor(Date.now() / 3600000) * 3600;
      const times = Array.from({ length: 25 }, (_, t) => now + t * 3600);
      return r.fulfill({ json: Array.from({ length: n }, (_, i) => {
        const row = Math.floor(i / side), col = i % side;
        return { hourly: { time: times,
          precipitation: times.map((_, t) => Math.max(0, 7 - Math.hypot(row - 6, col - (1 + t * 0.45)) * 1.6)),
          snowfall: times.map((_, t) => (row < 3 && t > 12 ? 0.3 : 0)),
          rain: times.map(() => 1),
          // gelo (chuva congelante) no meio da área de chuva; névoa no canto sul, onde não chove
          weather_code: times.map(() => (row === 6 || row === 7 ? 66 : row > 10 && col > 9 ? 45 : 61)),
          visibility: times.map(() => (row > 10 && col > 9 ? 300 : 20000)) } };
      }) });
    }
    return failForecast ? r.fulfill({ status: 503, body: '{}' }) : r.fulfill({ json: fc });
  });
  await p.route('https://geocoding-api.open-meteo.com/**', (r) => r.request().url().includes('xyz') ? r.fulfill({ json: {} }) : r.fulfill({ json: GEO }));
  await p.route('https://api.bigdatacloud.net/**', (r) => r.fulfill({ json: { city: 'Somerville', principalSubdivision: 'Massachusetts', countryName: 'Estados Unidos' } }));
  const LD = path.join(path.dirname(require.resolve('leaflet/package.json')), 'dist');
  await p.route('https://cdnjs.cloudflare.com/**', (r) => r.fulfill({ path: path.join(LD, r.request().url().endsWith('.css') ? 'leaflet.css' : 'leaflet.js') }));
  await p.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ path: path.join(FIX, 'base.png'), contentType: 'image/png' }));
  await p.route('https://api.rainviewer.com/**', (r) => radarFail ? r.fulfill({ status: 500, body: '' }) : r.fulfill({ json: {
    host: 'https://tilecache.rainviewer.com',
    radar: { past: Array.from({ length: 13 }, (_, i) => ({ time: Math.floor(Date.now() / 1000) - (12 - i) * 600, path: `/v2/radar/${i}` })) } } }));
  await p.route('https://tilecache.rainviewer.com/**', (r) => {
    const m = r.request().url().match(/radar\/(\d+)\/256\/(\d+)\/(\d+)\/(\d+)/);
    const [f, , x, y] = m.slice(1).map(Number);
    const wet = ((x + y + f) % 3) === 0;
    // O Playwright libera CORS sozinho; para simular "servidor não deixa ler", recusamos o pedido com Origin
    if (radarNoCors && r.request().headers()['origin']) return r.fulfill({ status: 403, body: '' });
    r.fulfill({ path: path.join(FIX, wet ? 'rainUB.png' : 'empty.png'), contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await p.route('https://router.project-osrm.org/**', (r) => routeFail
    ? r.fulfill({ status: 400, json: { code: 'NoRoute' } })
    : r.fulfill({ json: { code: 'Ok', routes: [{ duration: 3 * 3600 + 600, distance: 290000,
      geometry: { coordinates: Array.from({ length: 50 }, (_, i) => [-71.06 - i * 0.06, 42.36 - i * 0.034]) } }] } }));
  await p.route('https://air-quality-api.open-meteo.com/**', (r) => aqi == null ? r.fulfill({ status: 500, body: '{}' }) : r.fulfill({ json: { current: { us_aqi: aqi, pm2_5: 9.1 } } }));
  await p.route('https://api.weather.gov/**', (r) => { nwsCalls++; r.fulfill({ json: { features: [
    { properties: { event: 'Flood Warning', severity: 'Severe', onset: new Date().toISOString(), ends: new Date(Date.now() + 3 * 3600e3).toISOString(), headline: 'Flood Warning issued by NWS Boston MA', description: 'The Flood Warning continues for the Mystic River at Malden.', instruction: 'Turn around, don\'t drown.', areaDesc: 'Middlesex, MA', senderName: 'NWS Boston/Norton MA' } },
    { properties: { event: 'Gale Warning', severity: 'Moderate', effective: new Date().toISOString(), expires: new Date(Date.now() + 6 * 3600e3).toISOString(), headline: 'Gale Warning', description: 'Northeast winds 25 to 35 kt.', areaDesc: 'Coastal waters', senderName: 'NWS Boston/Norton MA' } },
  ] } }); });
  await p.goto(`http://localhost:${Number(process.env.PORT) || 8765}` + url);
  await p.waitForTimeout(1200);
  return { p, ctx, errors };
}

(async () => {
  await new Promise((r) => server.listen(Number(process.env.PORT) || 8765, r));
  const browser = await chromium.launch();
  const results = [];
  const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`);

  // T01/T06: localização permitida → nome reverso
  let t = await page(browser, { mobile: false, geo: 'allow' });
  check('T06 localização permitida', (await t.p.textContent('.hero__city')) === 'Somerville');
  await t.p.screenshot({ path: `${OUT}/desktop-parcial.png`, fullPage: true });
  // T08 °F
  await t.p.click('.topbar [data-unit="F"]');
  check('T08 °C→°F', (await t.p.textContent('.hero__temp')) === '63°', await t.p.textContent('.hero__temp'));
  // T09 15 dias
  await t.p.click('#daily button:has-text("15 dias")');
  check('T09 15 dias', (await t.p.locator('.day').count()) === 15 && (await t.p.locator('.day.is-trend').count()) === 8);
  await t.p.screenshot({ path: `${OUT}/desktop-15dias.png`, fullPage: true });
  // Abas Temperatura | Sensação (em °F neste ponto do teste)
  const h1 = await t.p.textContent('.hour:nth-child(2) .hour__temp');
  const d1 = await t.p.textContent('.day:first-child .day__max');
  await t.p.click('#hourly [role="tab"]:has-text("Sensação")');
  const h2 = await t.p.textContent('.hour:nth-child(2) .hour__temp');
  const d2 = await t.p.textContent('.day:first-child .day__max');
  check('Aba Sensação muda horas (−3 °C ≈ −5 °F)', parseInt(h1) - parseInt(h2) >= 4 && parseInt(h1) - parseInt(h2) <= 6, `${h1}→${h2}`);
  check('Aba Sensação muda dias também', parseInt(d1) - parseInt(d2) >= 3 && parseInt(d1) - parseInt(d2) <= 4, `${d1}→${d2}`);
  check('Abas sincronizadas', (await t.p.getAttribute('#daily [role="tab"]:has-text("Sensação")', 'aria-selected')) === 'true');
  await t.p.screenshot({ path: `${OUT}/desktop-sensacao.png` });
  await t.p.click('#daily [role="tab"]:has-text("Temperatura")');
  check('Volta para Temperatura', (await t.p.textContent('.hour:nth-child(2) .hour__temp')) === h1);
  // T03 busca
  await t.p.fill('#search-input', 'São');
  await t.p.waitForTimeout(700);
  check('T03 sugestões', (await t.p.locator('[role="option"]').count()) === 2);
  await t.p.screenshot({ path: `${OUT}/desktop-busca.png` });
  await t.p.keyboard.press('Enter');
  await t.p.waitForTimeout(600);
  check('Seleção por teclado', (await t.p.textContent('.hero__city')) === 'São Paulo');
  // T04
  await t.p.fill('#search-input', 'xyzabc');
  await t.p.waitForTimeout(700);
  check('T04 não encontrada', (await t.p.textContent('#search-list')).includes('Nenhuma cidade'));
  check('Sem erros JS (desktop)', t.errors.length === 0, t.errors.join(' | '));
  await t.ctx.close();

  // T07: localização negada → Boston
  t = await page(browser, { mobile: true, geo: 'deny' });
  check('T07 negada → Boston', (await t.p.textContent('.hero__city')) === 'Boston');
  check('T07 aviso', !(await t.p.locator('#toast').isHidden()));
  const overflow = await t.p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('T02 sem rolagem lateral (390px)', !overflow);
  await t.p.screenshot({ path: `${OUT}/mobile-boston.png`, fullPage: true });
  check('Sem erros JS (mobile)', t.errors.length === 0, t.errors.join(' | '));
  await t.ctx.close();

  // ADR-017: toque na cidade responde na hora (celular), boas-vindas, barra fixa, voltar ao topo
  t = await page(browser, { mobile: true, geo: 'deny' });
  check('Boas-vindas com saudação', /^(Bom dia|Boa tarde|Boa noite)! Seja bem-vindo\.$/.test(await t.p.textContent('#greeting')), await t.p.textContent('#greeting'));
  await t.p.fill('#search-input', 'São');
  await t.p.waitForSelector('[role="option"]');
  const t0 = Date.now();
  await t.p.tap('[role="option"] >> nth=0');
  await t.p.waitForFunction(() => document.querySelector('.hero__city')?.textContent === 'São Paulo', null, { timeout: 3000 });
  check('Toque na cidade responde rápido', Date.now() - t0 < 1500, `${Date.now() - t0} ms`);
  check('Barra da cidade escondida no topo', !(await t.p.evaluate(() => document.body.classList.contains('show-citybar'))));
  await t.p.evaluate(() => window.scrollTo(0, 1400));
  await t.p.waitForTimeout(600);
  check('Barra da cidade aparece ao rolar', await t.p.evaluate(() => document.body.classList.contains('show-citybar')) && (await t.p.textContent('#citybar strong')) === 'São Paulo');
  await t.p.evaluate(() => document.getElementById('toast').hidden = true);
  await t.p.screenshot({ path: `${OUT}/mobile-citybar.png` });
  // ADR-026: a barra da cidade não pode empurrar a página (senão treme no ponto de virada)
  const shift = await t.p.evaluate(async () => {
    const y = () => document.getElementById('app').getBoundingClientRect().top + window.scrollY;
    const on = y(); document.body.classList.remove('show-citybar');
    await new Promise((r) => setTimeout(r, 350)); const off = y(); document.body.classList.add('show-citybar');
    return Math.abs(on - off);
  });
  check('Barra da cidade não empurra o conteúdo', shift === 0, `${shift}px`);
  const flips = await t.p.evaluate(async () => {
    const hero = document.getElementById('current'), bar = document.querySelector('.topbar');
    // rola até o ponto de virada: fim do bloco da cidade encostando na barra
    window.scrollTo(0, hero.getBoundingClientRect().bottom + window.scrollY - bar.getBoundingClientRect().height - 58);
    let n = 0; const mo = new MutationObserver(() => n++);
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    const y0 = window.scrollY; await new Promise((r) => setTimeout(r, 1500)); mo.disconnect();
    return { n, moved: Math.abs(window.scrollY - y0) };
  });
  check('Parado no ponto de virada: sem tremer', flips.n <= 1 && flips.moved === 0, JSON.stringify(flips));
  await t.p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await t.p.waitForTimeout(400);
  await t.p.click('#to-top');
  await t.p.waitForTimeout(1200);
  check('Voltar ao topo', (await t.p.evaluate(() => window.scrollY)) < 5, String(await t.p.evaluate(() => window.scrollY)));
  await t.p.screenshot({ path: `${OUT}/mobile-topo.png` });
  check('Sem erros JS (navegação)', t.errors.length === 0, t.errors.join(' | '));
  await t.ctx.close();

  // ADR-019/020: detalhe da hora, Dia/Noite, alertas oficiais
  nwsCalls = 0;
  t = await page(browser, { mobile: true, geo: 'deny' });   // Boston (EUA)
  await t.p.waitForTimeout(500);
  const nowTxt = await t.p.textContent('.hero__now');
  check('Resumo do agora', /Agora/.test(nowTxt) && /(Chuva provável|Sem chuva prevista|chuva deve)/i.test(nowTxt), nowTxt.slice(0, 160));
  check('Dia calmo: nenhum quadro em atenção', (await t.p.locator('#details .tile--action').count()) === 0);
  check('Resumo do agora sem contradição', !(/Sem chuva prevista/.test(nowTxt) && /Restante de hoje:[^.]*[Cc]huva/.test(nowTxt)), nowTxt);
  check('Horas sem visual de botão do sistema', (await t.p.$eval('.hour__btn', (b) => getComputedStyle(b).appearance)) === 'none');
  check('Alerta oficial em Boston', (await t.p.locator('.alert--official').count()) === 2 && (await t.p.textContent('.alert--official summary strong')) === 'Alerta de enchente');
  await t.p.click('.alert--official summary >> nth=0');
  check('Alerta abre texto oficial', (await t.p.textContent('.alert--official .alert__desc')).includes('Mystic River'));
  await t.p.evaluate(() => document.getElementById('toast').hidden = true);
  await t.p.locator('#alerts').screenshot({ path: `${OUT}/alertas-oficiais.png` });
  await t.p.click('.hour__btn >> nth=3');
  check('Toque na hora abre detalhe', await t.p.isVisible('#hour-detail') && (await t.p.locator('#hour-detail .tile').count()) === 8);
  await t.p.locator('#hourly').screenshot({ path: `${OUT}/hora-detalhe.png` });
  await t.p.click('#hour-detail .detail__close');
  check('Fecha detalhe da hora', (await t.p.locator('#hour-detail').count()) === 0);
  await t.p.focus('.day >> nth=2 >> .hit'); await t.p.keyboard.press('Enter'); await t.p.waitForTimeout(150);
  check('Teclado: Enter no dia abre o resumo', (await t.p.getAttribute('.day >> nth=2 >> .hit', 'aria-expanded')) === 'true');
  await t.p.keyboard.press('Enter'); await t.p.waitForTimeout(150);
  await t.p.click('.day >> nth=1');
  const dayTxt = await t.p.textContent('.day-panel__text');
  check('Toque no dia abre resumo do Dia', /Máxima de/.test(dayTxt) && /Ventos/.test(dayTxt), dayTxt.slice(0, 140));
  await t.p.click('.day-panel [role="tab"]:has-text("Noite")');
  const nightTxt = await t.p.textContent('.day-panel__text');
  check('Aba Noite muda o resumo', /Mínima de/.test(nightTxt), nightTxt.slice(0, 140));
  await t.p.locator('#daily').screenshot({ path: `${OUT}/dia-noite.png` });
  check('Nenhum "false" solto na tela', !(await t.p.evaluate(() => /\bfalse\b/.test(document.querySelector('main').innerText))));
  check('Sem erros JS (detalhes)', t.errors.length === 0, t.errors.join(' | '));
  await t.ctx.close();
  nwsCalls = 0;
  t = await page(browser, { mobile: false, geo: 'deny' });
  await t.p.fill('#search-input', 'São'); await t.p.waitForTimeout(700); await t.p.keyboard.press('Enter'); await t.p.waitForTimeout(800);
  check('Fora dos EUA: sem alerta oficial', (await t.p.locator('.alert--official').count()) === 0, `chamadas NWS após trocar: ${nwsCalls}`);
  await t.ctx.close();

  t = await page(browser, { mobile: false, geo: 'deny' });
  await t.p.evaluate(() => document.getElementById('toast').hidden = true);
  await t.p.screenshot({ path: `${OUT}/desktop-agora.png` });
  const a = await t.p.locator('.hero__now').boundingBox(), c = await t.p.locator('.hero__city').boundingBox();
  check('Desktop: resumo ao lado da cidade', a.x > c.x + 300 && a.y < c.y + 250, JSON.stringify([a.x, a.y, c.x, c.y]));
  await t.ctx.close();

  // Tempestade à noite + avisos
  t = await page(browser, { mobile: true, fc: forecast({ code: 95, isDay: 0, stormy: true }) });
  check('Aviso tempestade', (await t.p.locator('.alert--danger:not(.alert--official)').count()) === 1);
  check('Risco alto', (await t.p.textContent('.risk > span')) === 'Alto');
  // ADR-022: rajadas de 72 km/h e tempestade → vermelho; toque mostra cuidados
  check('Rajadas 72 km/h e tempestade em vermelho', (await t.p.locator('#details .tile--danger').count()) >= 2);
  await t.p.evaluate(() => document.getElementById('toast').hidden = true);
  await t.p.click('#details .tile--action >> nth=0');
  const care = await t.p.textContent('#care-panel');
  check('Toque mostra cuidados (caminhando/dirigindo/em casa)', /Caminhando/.test(care) && /Dirigindo/.test(care) && /Em casa/.test(care), care.slice(0, 120));
  await t.p.locator('#details').screenshot({ path: `${OUT}/detalhe-atencao.png` });
  await t.p.click('#care-panel .detail__close');
  check('Fecha cuidados', (await t.p.locator('#care-panel').count()) === 0);
  await t.p.screenshot({ path: `${OUT}/mobile-tempestade.png`, fullPage: true });
  await t.ctx.close();

  // Calor
  t = await page(browser, { mobile: false, fc: forecast({ code: 0, hot: true }) });
  check('Aviso calor + UV', (await t.p.locator('.alert').count()) >= 2);
  check('UV 10 → quadro vermelho', (await t.p.locator('#details .tile--danger').count()) >= 1);
  await t.p.screenshot({ path: `${OUT}/desktop-sol-calor.png`, fullPage: true });
  await t.ctx.close();

  // Demo neve
  t = await page(browser, { mobile: true, url: '/?demo=neve' });
  check('T12 demo neve', (await t.p.getAttribute('body', 'data-scene')) === 'snow' && (await t.p.locator('.flake').count()) > 0);
  await t.p.screenshot({ path: `${OUT}/mobile-demo-neve.png` });
  await t.ctx.close();

  // ADR-011: código diz NUBLADO mas o modelo mede chuva → céu com chuva
  t = await page(browser, { mobile: true, geo: 'deny', fc: forecast({ code: 3, rainNow: 0.6, rainNext: [0.5, 0.4, 0.2, 0, 0, 0, 0, 0] }) });
  check('ADR-011 chuva medida → cenário chuva', (await t.p.getAttribute('body', 'data-scene')) === 'rain' && (await t.p.locator('.drop').count()) > 0);
  check('ADR-011 rótulo Chuva', (await t.p.textContent('.hero__label')) === 'Chuva', await t.p.textContent('.hero__label'));
  check('Nowcast para em ~45 min', (await t.p.textContent('.hero__nowcast')) === 'Chuva deve parar em ~45 min', await t.p.textContent('.hero__nowcast'));
  check('Gráfico de 2 h com 8 barras (ADR-033)', (await t.p.locator('.rainchart__bar').count()) === 8);
  check('Barras molhadas coloridas, secas apagadas', (await t.p.getAttribute('.rainchart__bar >> nth=0', 'aria-label')).startsWith('chuva') && (await t.p.getAttribute('.rainchart__bar >> nth=6', 'aria-label')).startsWith('sem chuva'), await t.p.getAttribute('.rainchart__bar >> nth=0', 'aria-label'));
  await t.p.locator('.rainchart').screenshot({ path: `${OUT}/grafico-chuva.png` });
  await t.p.evaluate(() => document.getElementById('toast').hidden = true);
  await t.p.screenshot({ path: `${OUT}/mobile-chuva-medida.png` });
  await t.ctx.close();

  // Caso real Malden 27/09: atual 'nublado', hora atual 'garoa' 95%, sem mm medido
  t = await page(browser, { mobile: true, fc: forecast({ code: 3, hourNowCode: 53, hourNowPop: 95 }) });
  check('Caso Malden → chove na tela', (await t.p.getAttribute('body', 'data-scene')) === 'rain' && (await t.p.locator('.drop').count()) > 0);
  check('Caso Malden → rótulo Garoa', (await t.p.textContent('.hero__label')) === 'Garoa', await t.p.textContent('.hero__label'));
  check('Versão no rodapé', (await t.p.textContent('#version')) === `versão ${VERSION}`);
  await t.p.evaluate(() => document.getElementById('toast').hidden = true);
  await t.p.screenshot({ path: `${OUT}/mobile-caso-malden.png` });
  await t.ctx.close();

  // Nublado sem chuva → continua nublado
  t = await page(browser, { mobile: true, fc: forecast({ code: 3 }) });
  check('Nublado seco continua nublado', (await t.p.getAttribute('body', 'data-scene')) === 'cloudy');
  check('Sem nowcast quando seco', (await t.p.locator('.hero__nowcast').count()) === 0);
  check('Sem gráfico de chuva quando seco', (await t.p.locator('.rainchart').count()) === 0);
  await t.ctx.close();

  // Chuva começando
  t = await page(browser, { mobile: true, fc: forecast({ code: 3, rainNext: [0, 0.3, 0.5, 0.5, 0.2, 0, 0, 0] }) });
  check('Chuva começa em ~15 min → já mostra chuva fraca', (await t.p.getAttribute('body', 'data-scene')) === 'rain');
  check('Céu já chove → frase nunca diz "começa"', (await t.p.locator('.hero__nowcast').count()) === 0);
  await t.ctx.close();

  // Seco agora, chuva em 60 min → céu seco + "começa em ~60 min"
  t = await page(browser, { mobile: true, fc: forecast({ code: 3, rainNext: [0, 0, 0, 0, 0.3, 0.5, 0, 0] }) });
  check('Seco agora → céu nublado', (await t.p.getAttribute('body', 'data-scene')) === 'cloudy');
  check('Nowcast começa em ~60 min', (await t.p.textContent('.hero__nowcast')) === 'Chuva deve começar em ~60 min', await t.p.textContent('.hero__nowcast'));
  await t.ctx.close();

  // Caso real Malden 28/09 (v2.3.1): hora atual garoa 95%, série 15 min seca agora e molhada em 60 min
  t = await page(browser, { mobile: true, fc: forecast({ code: 3, hourNowCode: 53, hourNowPop: 95, rainNext: [0, 0, 0, 0, 0.3, 0.3, 0, 0] }) });
  check('Malden 28/09 → chove na tela', (await t.p.getAttribute('body', 'data-scene')) === 'rain');
  check('Malden 28/09 → sem "começa em ~60 min"', (await t.p.locator('.hero__nowcast').count()) === 0, await t.p.locator('.hero__nowcast').allTextContents());
  await t.ctx.close();

  // ADR-012 radar
  t = await page(browser, { mobile: false, geo: 'allow' });
  await t.p.locator('#radar').scrollIntoViewIfNeeded();
  await t.p.waitForTimeout(2500);
  check('Radar: mapa carregou', (await t.p.locator('#radar .leaflet-container').count()) === 1);
  const max = Number(await t.p.getAttribute('.radar__slider', 'max'));
  check('Linha do tempo: agora + ~23 h de previsão (sem passado)', max >= 21 && max <= 25, String(max));
  check('Rótulo RADAR', (await t.p.textContent('.radar__kind')) === 'RADAR');
  check('Radar: começa em Agora', (await t.p.textContent('.radar__time')).startsWith('Agora') && (await t.p.getAttribute('.radar__slider', 'value')) === '0', await t.p.textContent('.radar__time'));
  check('Mapa claro por padrão', (await t.p.getAttribute('.radar__map', 'class')).includes('radar__map--light'));
  await t.p.click('#radar button:has-text("Escuro")');
  check('Botão Escuro aplica estilo', (await t.p.getAttribute('.radar__map', 'class')).includes('radar__map--dark'));
  await t.p.click('#radar button:has-text("Claro")');
  check('Radar: vento com seta na legenda', (await t.p.textContent('.radar__wind')).includes('SO') && (await t.p.locator('.radar__wind .wind-arrow').count()) === 1, await t.p.textContent('.radar__wind'));
  check('Sem seta no mapa (parecia play)', (await t.p.locator('.wind-pin').count()) === 0 && (await t.p.locator('.city-pin').count()) === 1);
  const radarPx = () => t.p.evaluate(() => {
    let green = 0, blue = 0, colored = 0;
    document.querySelectorAll('#radar canvas.leaflet-tile').forEach((cv) => {
      if (getComputedStyle(cv.closest('.leaflet-layer')).opacity === '0') return;
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) { colored++;
        if (d[i + 1] > d[i] + 40 && d[i + 1] > d[i + 2] + 40) green++;
        if (d[i + 2] > d[i] + 40 && d[i + 2] > d[i + 1] + 10) blue++; }
    });
    return { green, blue, colored };
  });
  await t.p.waitForTimeout(500);
  const rp = await radarPx();
  check('Radar "agora" repintado em verde, sem azul (ADR-024)', rp.colored > 0 && rp.green > 0 && rp.blue === 0, JSON.stringify(rp));
  const halo = await t.p.evaluate(() => {
    let red = 0, seen = 0;
    document.querySelectorAll('#radar canvas.leaflet-tile').forEach((cv) => {
      const ctx = cv.getContext('2d');
      for (let x = 216; x < 256; x += 3) for (let y = 1; y < 39; y += 3) {
        const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
        if (!a) continue; seen++;
        if (r > 150 && g < 120) red++;
      }
    });
    return { red, seen };
  });
  check('Eco fraco/cinza NÃO vira vermelho (ADR-037)', halo.seen > 0 && halo.red === 0, JSON.stringify(halo));
  check('Uma legenda visível: Chuva verde + Neve azul', (await t.p.locator('.radar__legend:visible').count()) === 1 && (await t.p.textContent('.radar__legend:visible')).includes('Neve') && (await t.p.getAttribute('.radar__legend:visible li:nth-child(2) b', 'style')).replace(/ /g, '').includes('110,215,90'), await t.p.textContent('.radar__legend:visible'));
  await t.p.locator('#radar').screenshot({ path: `${OUT}/radar-desktop.png` });
  await t.p.click('.radar__play');
  await t.p.waitForTimeout(1600);
  check('Radar: animação avança para o futuro', (await t.p.textContent('.radar__time')).startsWith('+'), await t.p.textContent('.radar__time'));
  await t.p.click('.radar__play');
  await t.p.$eval('.radar__slider', (e) => { e.value = String(Number(e.max) - 8); e.dispatchEvent(new Event('input')); });
  await t.p.waitForTimeout(400);
  check('Futuro: rótulo PREVISÃO', (await t.p.textContent('.radar__kind')) === 'PREVISÃO DO MODELO');
  check('Futuro: tempo +h', (await t.p.textContent('.radar__time')).startsWith('+'), await t.p.textContent('.radar__time'));
  check('Futuro: aviso de modelo visível', await t.p.isVisible('.radar__warn'));
  check('Quadro PREVISÃO mantém a mesma legenda', (await t.p.locator('.radar__legend:visible').count()) === 1 && (await t.p.getAttribute('.radar__legend:visible', 'aria-label')) === 'Legenda de chuva e neve');
  check('Legenda tem Neve, Gelo, Mistura e Névoa (ADR-025)', /Neve.*Gelo.*Mistura.*Névoa/.test(await t.p.textContent('.radar__legend:visible')), await t.p.textContent('.radar__legend:visible'));
  const kinds = await t.p.evaluate(async () => {
    const im = [...document.querySelectorAll('img.leaflet-image-layer')].find((i) => i.src.startsWith('data:') && getComputedStyle(i).opacity !== '0');
    if (!im) return null; await im.decode().catch(() => {});
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data;
    const near = (r, g, b, R, G, B) => Math.abs(r - R) + Math.abs(g - G) + Math.abs(b - B) < 12;
    let ice = 0, fog = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 100) { if (near(d[i], d[i + 1], d[i + 2], 125, 85, 215)) ice++; if (near(d[i], d[i + 1], d[i + 2], 235, 222, 125)) fog++; }
    return { ice, fog };
  });
  check('Previsão pinta gelo (roxo) e névoa (amarelo-claro)', kinds && kinds.ice > 0 && kinds.fog > 0, JSON.stringify(kinds));
  await t.p.locator('#radar').screenshot({ path: `${OUT}/radar-futuro.png` });
  // Navegação: arrasta o mapa, troca °C/°F (não pode recentralizar), depois botão "casa" volta
  const center = () => t.p.evaluate(() => { const c = document.querySelector('#radar .leaflet-container'); return c && c._leaflet_id; });
  await t.p.mouse.move(600, 300);
  const box = await t.p.locator('#radar .radar__map').boundingBox();
  await t.p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await t.p.mouse.down(); await t.p.mouse.move(box.x + 60, box.y + 60, { steps: 8 }); await t.p.mouse.up();
  await t.p.waitForTimeout(300);
  const markerPos = () => t.p.evaluate(() => { const m = document.querySelector('.city-pin'); const r = m.getBoundingClientRect(); const b = document.querySelector('.radar__map').getBoundingClientRect(); return [Math.round(r.x + r.width/2 - b.x), Math.round(r.y + r.height/2 - b.y), Math.round(b.width/2), Math.round(b.height/2)]; });
  const moved = await markerPos();
  check('Mapa arrastável', Math.abs(moved[0] - moved[2]) > 100, JSON.stringify(moved));
  await t.p.click('.topbar [data-unit="C"]');
  await t.p.waitForTimeout(300);
  const after = await markerPos();
  check('Trocar °C/°F não recentraliza', Math.abs(after[0] - moved[0]) < 3, JSON.stringify(after));
  await t.p.click('.radar-home__btn[title^="Voltar"]');
  await t.p.waitForTimeout(1300);
  const home = await markerPos();
  check('Botão casa volta à cidade', Math.abs(home[0] - home[2]) < 4 && Math.abs(home[1] - home[3]) < 4, JSON.stringify(home));
  for (let k = 0; k < 5; k++) { await t.p.click('.leaflet-control-zoom-out'); await t.p.waitForTimeout(350); }
  await t.p.waitForTimeout(600);
  await t.p.locator('#radar').screenshot({ path: `${OUT}/radar-mundo.png` });
  await t.p.locator('#radar').screenshot({ path: `${OUT}/radar-mundo.png` });
  check('Zoom até o mundo (2)', await t.p.evaluate(() => document.querySelector('.leaflet-control-zoom-out').classList.contains('leaflet-disabled')));
  await t.p.click('.radar-home__btn[title^="Ir para"]');
  await t.p.waitForTimeout(1300);
  check('Botão minha localização mostra ponto azul', (await t.p.locator('.me-pin').count()) === 1);
  check('Sem erros JS (radar)', t.errors.length === 0, t.errors.join(' | '));
  await t.ctx.close();

  // Sem permissão de leitura do ladrilho → radar nas cores originais + legenda original (não mente)
  t = await page(browser, { mobile: false, radarNoCors: true });
  await t.p.locator('#radar').scrollIntoViewIfNeeded();
  await t.p.waitForTimeout(2500);
  check('Sem CORS: radar ainda aparece', (await t.p.locator('#radar canvas.leaflet-tile').count()) > 0);
  check('Sem CORS: legenda original do radar no quadro agora', (await t.p.getAttribute('.radar__legend:visible', 'aria-label')) === 'Legenda do radar (cores originais)', await t.p.evaluate(() => [document.querySelector('.radar__kind').textContent, [...document.querySelectorAll('#radar canvas.leaflet-tile')].map((c) => { try { c.getContext('2d').getImageData(0,0,1,1); return 'ok'; } catch (e) { return 'taint'; } }).join(',')].join(' | ')));
  check('Sem CORS: sem erros JS', t.errors.length === 0, t.errors.join(' | '));
  await t.ctx.close();

  t = await page(browser, { mobile: true, radarFail: true });
  await t.p.locator('#radar').scrollIntoViewIfNeeded();
  await t.p.waitForTimeout(2000);
  check('Radar falha, previsão segue', !(await t.p.isVisible('.radar__status')) && (await t.p.textContent('.radar__kind')) === 'PREVISÃO DO MODELO');
  await t.ctx.close();
  t = await page(browser, { mobile: true, radarFail: true, gridFail: true });
  await t.p.locator('#radar').scrollIntoViewIfNeeded();
  await t.p.waitForTimeout(2000);
  check('Radar e previsão falham → aviso só no cartão', (await t.p.textContent('.radar__status')).includes('indisponível') && (await t.p.textContent('.hero__city')) === 'Boston');
  await t.p.evaluate(() => document.getElementById('toast').hidden = true);
  await t.p.locator('#radar').screenshot({ path: `${OUT}/radar-falha.png` });
  await t.ctx.close();

  t = await page(browser, { mobile: true, geo: 'allow' });
  await t.p.locator('#radar').scrollIntoViewIfNeeded();
  await t.p.waitForTimeout(2500);
  check('Radar mobile sem rolagem lateral', !(await t.p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await t.p.locator('#radar').screenshot({ path: `${OUT}/radar-mobile.png` });
  await t.ctx.close();

  // Erro de serviço + T11 lembrar cidade (salvo em contexto novo não persiste; testamos erro)
  t = await page(browser, { mobile: true, failForecast: true });
  check('Erro serviço', (await t.p.textContent('#status')).includes('indisponível'));
  await t.p.screenshot({ path: `${OUT}/mobile-erro.png` });
  await t.ctx.close();

  // ADR-030: link por cidade, compartilhar e favoritos
  t = await page(browser, { mobile: true, url: '/?cidade=Malden&regiao=Massachusetts&pais=EUA&lat=42.425&lon=-71.066' });
  await t.p.waitForTimeout(800);
  check('Link + localização NEGADA → cidade do link', (await t.p.textContent('.hero__city')) === 'Malden', await t.p.textContent('.hero__city'));
  check('Sem favoritas: faixa escondida', await t.p.isHidden('#favs'));
  await t.p.click('.hero__act[aria-pressed]');
  await t.p.waitForTimeout(200);
  check('Estrela salva a cidade', (await t.p.getAttribute('.hero__act[aria-pressed]', 'aria-pressed')) === 'true' && (await t.p.textContent('#favs')).includes('Malden'));
  await t.p.fill('#search-input', 'São'); await t.p.waitForTimeout(700); await t.p.keyboard.press('Enter'); await t.p.waitForTimeout(600);
  check('Endereço acompanha a cidade', (await t.p.evaluate(() => location.search)).includes('cidade=S%C3%A3o+Paulo'), await t.p.evaluate(() => location.search));
  await t.p.click('.favs__chip:has-text("Malden")'); await t.p.waitForTimeout(600);
  check('Toque na favorita abre a cidade', (await t.p.textContent('.hero__city')) === 'Malden');
  await t.p.reload(); await t.p.waitForTimeout(900);
  check('Favorita continua depois de recarregar', (await t.p.textContent('#favs')).includes('Malden'));
  await t.p.evaluate(() => { navigator.share = undefined; });
  await t.ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await t.p.click('.hero__act[aria-label="Compartilhar link desta cidade"]'); await t.p.waitForTimeout(300);
  const copied = await t.p.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  check('Compartilhar copia o link da cidade', copied.includes('cidade=Malden') && copied.includes('lat=42.425'), copied);
  check('Sem erros JS (favoritos)', t.errors.length === 0, t.errors.join(' | '));
  await t.ctx.close();
  t = await page(browser, { mobile: true, geo: 'allow', url: '/?cidade=Malden&regiao=Massachusetts&pais=EUA&lat=42.425&lon=-71.066' });
  await t.p.waitForTimeout(1200);
  check('Link + localização ACEITA → cidade de quem abriu (ADR-036)', (await t.p.textContent('.hero__city')) === 'Somerville', await t.p.textContent('.hero__city'));
  await t.ctx.close();
  t = await page(browser, { mobile: false, url: '/?lat=999&lon=abc' });
  await t.p.waitForTimeout(900);
  check('Link com coordenada inválida cai no padrão (Boston)', (await t.p.textContent('.hero__city')) === 'Boston', await t.p.textContent('.hero__city'));
  await t.ctx.close();

  // ADR-031/032: qualidade do ar e gelo na pista
  t = await page(browser, { mobile: false });
  await t.p.waitForTimeout(900);
  check('AQI aparece com faixa EPA', (await t.p.textContent('#details')).includes('42 · Boa'), await t.p.locator('#details .tile:has-text("Qualidade do ar") dd > span').textContent().catch(() => '?'));
  check('Gelo na pista: sem risco em dia ameno', (await t.p.locator('#details .tile:has-text("Gelo na pista") dd > span').textContent()) === 'Sem risco');
  await t.ctx.close();
  t = await page(browser, { mobile: false, aqi: 165, fc: forecast({ icy: 'warn' }) });
  await t.p.waitForTimeout(900);
  check('AQI 165 → quadro vermelho', (await t.p.getAttribute('#details .tile:has-text("Qualidade do ar")', 'class')).includes('tile--danger'));
  check('Chuva + frio → gelo POSSÍVEL (amarelo)', (await t.p.locator('#details .tile:has-text("Gelo na pista") dd > span').textContent()) === 'Possível' && (await t.p.getAttribute('#details .tile:has-text("Gelo na pista")', 'class')).includes('tile--warn'));
  await t.p.click('#details .tile:has-text("Gelo na pista")');
  check('Gelo: cuidados ao dirigir', (await t.p.textContent('#care-panel')).includes('Pontes, viadutos'));
  await t.p.locator('#details').screenshot({ path: `${OUT}/detalhe-ar-gelo.png` });
  await t.ctx.close();
  t = await page(browser, { mobile: false, aqi: null, fc: forecast({ icy: 'danger' }) });
  await t.p.waitForTimeout(900);
  check('Chuva congelante → gelo PROVÁVEL (vermelho)', (await t.p.locator('#details .tile:has-text("Gelo na pista") dd > span').textContent()) === 'Provável');
  check('Ar indisponível → "--" sem quebrar', (await t.p.locator('#details .tile:has-text("Qualidade do ar") dd > span').textContent()) === '--' && t.errors.length === 0, t.errors.join(' | '));
  await t.ctx.close();

  // ADR-034: instalar na tela inicial + funcionar sem internet
  t = await page(browser, { mobile: true, sw: true });
  await t.p.waitForTimeout(800);
  const man = await t.p.evaluate(async () => {
    const href = document.querySelector('link[rel="manifest"]')?.href;
    const m = await (await fetch(href)).json();
    const icons = await Promise.all(m.icons.map(async (i) => (await fetch(new URL(i.src, href))).status));
    return { name: m.name, display: m.display, icons, apple: !!document.querySelector('link[rel="apple-touch-icon"]'), og: document.querySelector('meta[property="og:image"]')?.content };
  });
  check('Manifesto válido com ícones', man.name === 'Weather Forecast' && man.display === 'standalone' && man.icons.every((c) => c === 200) && man.apple, JSON.stringify(man));
  check('Prévia de compartilhamento (og:image)', /\/img\/og\.png$/.test(man.og || ''), man.og);
  const swOk = await t.p.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise((r) => setTimeout(() => r(false), 5000))]));
  check('Modo sem internet registrado', swOk);
  await t.p.reload(); await t.p.waitForTimeout(800);            // agora a página passa pelo sw.js e fica guardada
  await t.ctx.setOffline(true);
  await t.p.reload().catch(() => {}); await t.p.waitForTimeout(1500);
  check('Sem internet: a página abre (não fica em branco)', (await t.p.textContent('#version').catch(() => '')) === `versão ${VERSION}`, await t.p.textContent('body').then((b) => b.slice(0, 80)).catch((e) => e.message));
  await t.ctx.close();

  // Acessibilidade (axe-core, regras WCAG 2 A/AA) — ADR-035
  const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  for (const [label, opts] of [['celular, chuva', { mobile: true, fc: forecast({ code: 3, rainNow: 0.6, rainNext: [0.5, 0.4, 0.2, 0, 0, 0, 0, 0] }) }], ['computador, sol', { mobile: false }]]) {
    t = await page(browser, opts);
    await t.p.waitForTimeout(1200);
    await t.p.evaluate(() => { document.getElementById('toast').hidden = true; });
    await t.p.addScriptTag({ content: AXE });
    const v = await t.p.evaluate(async (dbg) => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations
      .map((x) => `${x.id}(${x.impact}) ×${x.nodes.length}: ${x.nodes.slice(0, 3).map((n) => n.target.join(' ') + (dbg ? ' → ' + n.failureSummary.replace(/\s+/g, ' ') + ' ' + n.html.slice(0, 160) : '')).join(' | ')}`), !!process.env.AXE_LOG);
    if (process.env.AXE_LOG) console.log(label, JSON.stringify(v, null, 1));
    check(`Acessibilidade WCAG AA sem falhas (${label})`, v.length === 0, v.join(' ;; '));
    await t.ctx.close();
  }

  // ADR-039: tempo na viagem
  t = await page(browser, { mobile: true });
  await t.p.waitForTimeout(800);
  await t.p.locator('#trip').scrollIntoViewIfNeeded();
  check('Viagem: fechada por padrão', await t.p.isHidden('#trip-body') && (await t.p.textContent('.trip__toggle')).includes('Planeje seu passeio ou viagem'));
  await t.p.click('.trip__toggle'); await t.p.waitForTimeout(150);
  check('Viagem: toque abre o formulário', await t.p.isVisible('#trip-to') && (await t.p.getAttribute('.trip__toggle', 'aria-expanded')) === 'true');
  check('Viagem: saída padrão = cidade atual, dentro do campo', (await t.p.inputValue('#trip-from')).startsWith('Boston'), await t.p.inputValue('#trip-from'));
  await t.p.click('.trip__go'); await t.p.waitForTimeout(200);
  check('Viagem: sem destino pede o destino', (await t.p.textContent('.trip__out')).includes('Escolha o destino'));
  await t.p.fill('#trip-to', 'São'); await t.p.waitForTimeout(700); await t.p.keyboard.press('Enter'); await t.p.waitForTimeout(300);
  check('Viagem: destino aparece dentro do campo', (await t.p.inputValue('#trip-to')) === 'São Paulo, São Paulo', await t.p.inputValue('#trip-to'));
  await t.p.click('.trip__go'); await t.p.waitForTimeout(1800);
  const trip = await t.p.textContent('.trip__summary').catch(() => '');
  check('Viagem: resumo aponta o pior trecho', trip.startsWith('Atenção: chuva forte'), trip);
  check('Viagem: 3h10 → pontos de hora em hora (5)', (await t.p.locator('.trip__stop').count()) === 5, String(await t.p.locator('.trip__stop').count()));
  check('Viagem: trecho com névoa sinalizado', (await t.p.locator('.trip__stop--danger').count()) === 1 && (await t.p.locator('.trip__stop--warn').count()) === 1 && (await t.p.textContent('.trip__stops')).includes('Névoa (visibilidade'));
  check('Viagem: chegada calculada', (await t.p.textContent('.trip__stats')).includes('3 h 10 min · 290 km'), await t.p.textContent('.trip__stats'));
  check('Viagem: mapa com a rota', (await t.p.locator('.trip__map path.leaflet-interactive').count()) >= 1);
  await t.p.click('.trip__stop--danger >> .hit'); await t.p.waitForTimeout(200);
  check('Viagem: toque no alerta abre cuidados', (await t.p.textContent('.trip__care')).includes('Dirigindo') && (await t.p.textContent('.trip__care')).includes('Chuva'), (await t.p.textContent('.trip__care').catch(() => '?')).slice(0, 120));
  await t.p.click('.trip__care .detail__close'); await t.p.waitForTimeout(150);
  check('Viagem: × fecha os cuidados', (await t.p.locator('.trip__care').count()) === 0);
  await t.p.click('.trip__stop--warn >> .hit'); await t.p.waitForTimeout(150);
  check('Viagem: névoa tem cuidados próprios', (await t.p.textContent('.trip__care')).includes('Farol baixo e de neblina'));
  await t.p.evaluate(() => document.getElementById('toast').hidden = true);
  await t.p.locator('#trip').screenshot({ path: `${OUT}/viagem.png` });
  check('Sem erros JS (viagem)', t.errors.length === 0, t.errors.join(' | '));
  await t.ctx.close();
  t = await page(browser, { mobile: true, geo: 'allow', url: '/?cidade=Malden&lat=42.425&lon=-71.066' });
  await t.p.waitForTimeout(900);
  await t.p.click('.trip__toggle'); await t.p.waitForTimeout(150);
  await t.p.fill('#trip-from', 'xyz');
  await t.p.click('.trip__locate'); await t.p.waitForTimeout(700);
  check('Viagem: botão "minha localização" preenche a saída', (await t.p.inputValue('#trip-from')).startsWith('Somerville'), await t.p.inputValue('#trip-from'));
  await t.ctx.close();
  t = await page(browser, { mobile: false, routeFail: true });
  await t.p.waitForTimeout(800);
  await t.p.click('.trip__toggle'); await t.p.waitForTimeout(150);
  await t.p.fill('#trip-to', 'São'); await t.p.waitForTimeout(700); await t.p.keyboard.press('Enter'); await t.p.waitForTimeout(300);
  await t.p.click('.trip__go'); await t.p.waitForTimeout(800);
  check('Viagem: sem rota → mensagem clara', (await t.p.textContent('.trip__out')).includes('Não encontrei rota'), await t.p.textContent('.trip__out'));
  await t.ctx.close();

  // T11 lembrar última cidade
  t = await page(browser, { mobile: false });
  await t.p.fill('#search-input', 'São'); await t.p.waitForTimeout(700); await t.p.keyboard.press('Enter'); await t.p.waitForTimeout(500);
  await t.p.reload(); await t.p.waitForTimeout(1000);
  check('T11 lembra última cidade', (await t.p.textContent('.hero__city')) === 'São Paulo');
  await t.ctx.close();

  await browser.close();
  server.close();
  console.log(results.join('\n'));
  const fails = results.filter((r) => r.startsWith('FAIL')).length;
  // No GitHub, cada falha vira uma anotação visível na página da execução
  if (process.env.GITHUB_ACTIONS) results.filter((r) => r.startsWith('FAIL')).forEach((r) => console.log(`::error title=Teste falhou::${r.replace(/\s+/g, ' ').slice(0, 400)}`));
  console.log(`\n${results.length - fails}/${results.length} testes passaram`);
  process.exitCode = fails ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
