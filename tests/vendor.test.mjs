// Bibliotecas copiadas para o site (vendor/) têm de ser IDÊNTICAS às do pacote oficial do npm,
// na versão travada em package.json. Se alguém trocar o arquivo, o teste falha (cadeia de suprimentos).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const pairs = [
  ['vendor/leaflet/leaflet.js', path.join(path.dirname(require.resolve('leaflet/package.json')), 'dist/leaflet.js')],
  ['vendor/supabase/supabase.js', path.join(path.dirname(require.resolve('@supabase/supabase-js/package.json')), 'dist/umd/supabase.js')],
];
let bad = 0;
for (const [mine, official] of pairs) {
  const ok = sha(path.join(ROOT, mine)) === sha(official);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${mine} = npm`);
  if (!ok) bad++;
}
process.exitCode = bad ? 1 : 0;
