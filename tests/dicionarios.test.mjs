// Checagem dos dicionários de idioma (ADR-045) — roda antes dos testes de tela.
// 1. Paridade: toda chave do português existe em inglês e espanhol (exceto nomes de alertas NWS em inglês).
// 2. Marcadores: {v}, {name}… iguais nos três idiomas (senão aparece "{v}" na tela ou some um número).
// 3. Ortografia: cada palavra passa no corretor Hunspell do idioma — os mesmos dicionários do LibreOffice:
//    pt_BR = VERO (Verificador Ortográfico Livre, Brasil) · en_US · es_MX (espanhol latino-americano).
//    Instalar: sudo apt-get install hunspell hunspell-pt-br hunspell-en-us hunspell-es
//    Palavras que não estão no corretor (marcas, siglas, termos técnicos) ficam numa lista explícita abaixo,
//    para revisão humana — nada é aceito "no escuro".
import { execFileSync } from 'node:child_process';
import pt from '../js/i18n/pt.js';
import en from '../js/i18n/en.js';
import es from '../js/i18n/es.js';

const DICTS = { pt, en, es };
const HUNSPELL = { pt: 'pt_BR', en: 'en_US', es: 'es_MX' };
/** Palavras que o Hunspell não reconhece (uma chamada por idioma, com todas as palavras). */
function unknownWords(lang, list) {
  const out = execFileSync('hunspell', ['-d', HUNSPELL[lang], '-l', '-i', 'utf-8'], { input: list.join('\n'), encoding: 'utf8' });
  return new Set(out.split('\n').filter(Boolean));
}

// Marcas, siglas, unidades e termos que o corretor não conhece (revisados um a um).
const ALLOW = {
  all: ['Weather', 'Forecast', 'Open-Meteo', 'OpenStreetMap', 'BigDataCloud', 'RainViewer', 'NOAA', 'NWS', 'INMET', 'EPA', 'OMS',
    'WHO', 'Beaufort', 'Google', 'Outlook', 'iPhone', 'UV', 'FPS', 'SPF', 'RADAR', 'km', 'mi', 'mm', 'cm', 'in', 'ft', 'mph', 'h', 'min',
    'Boston', 'IA', 'AI', 'EUA', 'EE', 'UU', 'NE', 'SE', 'SO', 'NO', 'SW', 'NW', 'N', 'S', 'L', 'O', 'E', 'W', 'e-mail', 'Email', 'E-mail',
    'C', 'F', 'B', 'º', 'Calendar'],
  // pt: abreviações de máxima/mínima usadas nos apps de clima do Brasil; "black ice" é o termo em inglês entre parênteses
  pt: ['Máx', 'Mín', 'máx', 'black', 'ice'],
  en: [],
  // es: imperativo com pronome (enclítico) — correto pela RAE, o Hunspell não gera essas formas;
  //     "recirculación": termo dos manuais de carro em espanhol (modo do ar-condicionado)
  es: ['Hidrátate', 'pégalo', 'Cópialo', 'enciéndelo', 'recirculación'],
};
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const words = (s) => String(s)
  .replace(/\{\w+\}/g, ' ')
  .replace(/https?:\S+/g, ' ')
  .split(/[^\p{L}'’-]+/u)
  .map((w) => w.replace(/^[-'’]+|[-'’]+$/g, ''))
  .filter((w) => w && !/^\d/.test(w));

const problems = [];
let checked = 0;
for (const key of Object.keys(pt)) {
  for (const lang of ['en', 'es']) {
    const v = DICTS[lang][key];
    if (v === undefined) {
      if (!(lang === 'en' && key.startsWith('nws.'))) problems.push(`[${lang}] falta a chave ${key}`);
      continue;
    }
    if (placeholders(v) !== placeholders(pt[key])) problems.push(`[${lang}] ${key}: marcadores {…} diferentes do português`);
  }
}
for (const lang of ['en', 'es']) {
  for (const key of Object.keys(DICTS[lang])) if (!(key in pt)) problems.push(`[${lang}] chave a mais (não existe em pt): ${key}`);
}
for (const [lang, dict] of Object.entries(DICTS)) {
  const allow = new Set([...ALLOW.all, ...ALLOW[lang]]);
  const found = []; // [chave, palavra]
  for (const [key, value] of Object.entries(dict)) {
    if (typeof value !== 'string') continue;
    for (const w of words(value)) if (!allow.has(w)) found.push([key, w]);
  }
  checked += found.length;
  // palavras com hífen: vale a palavra inteira ou cada parte
  const pieces = [...new Set(found.flatMap(([, w]) => [w, ...w.split('-')]).filter(Boolean))];
  const bad = unknownWords(lang, pieces);
  const wrong = (w) => bad.has(w) && (!w.includes('-') || w.split('-').some((p) => p && !allow.has(p) && bad.has(p)));
  for (const [key, w] of found) if (wrong(w)) problems.push(`[${lang}] ${key}: "${w}"`);
}

console.log(`Dicionários: ${Object.keys(pt).length} chaves · ${checked} palavras conferidas no corretor (pt, en, es).`);
if (problems.length) {
  console.log(problems.join('\n'));
  console.log(`\n${problems.length} problema(s) nos dicionários`);
  process.exitCode = 1;
} else {
  console.log('Dicionários OK: paridade de chaves, marcadores e ortografia.');
}
