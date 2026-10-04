// Conta opcional (ADR-051): Casa, favoritas e viagens iguais em todos os aparelhos da pessoa.
// • Sem conta, o site funciona como sempre — nada é carregado nem enviado.
// • Login sem senha: link no e-mail ou Google (Supabase Auth, fluxo PKCE).
// • Limite de aparelhos do plano: ao entrar num aparelho novo, o mais antigo é desconectado
//   pelo servidor (claim_device) e perde acesso aos dados na hora (RLS confere a sessão).
// • Tudo que volta do servidor é tratado como dado de fora: limpo e validado antes de usar.
import { load, save, onSave } from './storage.js?v=6.4.0';
import { cleanText } from './domain/text.js?v=6.4.0';

export const SB_URL = 'https://qrpuodtyevkemaykfpgn.supabase.co';
const SB_KEY = 'sb_publishable_4PXJN_fMSJK0W74XARdC1Q_EWZhhjpe'; // chave pública (feita para ficar no site; a proteção é o RLS)
const LIB = 'vendor/supabase/supabase.js?v=6.4.0';
const AUTH_KEY = 'previsao-tempo:auth';
const SYNC = ['home', 'favorites', 'trips'];
const MAX_FAV = 8, MAX_TRIPS = 4;

let sb = null;
let uid = null;
let pushTimer = 0;
let state = { status: 'out', email: '', plan: null, devices: [], sync: '', kicked: false, error: '', sent: '' };
const subs = new Set();

export function onAccount(fn) {
  subs.add(fn);
  fn(state);
  return () => subs.delete(fn);
}
const emit = (patch) => { state = { ...state, ...patch }; subs.forEach((fn) => { try { fn(state); } catch { /* ok */ } }); };
export const accountState = () => state;

// ---------- carregar a biblioteca só quando precisa ----------
function loadLib() {
  if (window.supabase?.createClient) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = LIB;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('lib'));
    document.head.append(s);
  });
}

async function client() {
  if (sb) return sb;
  await loadLib();
  sb = window.supabase.createClient(SB_URL, SB_KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: AUTH_KEY },
  });
  sb.auth.onAuthStateChange((event, session) => {
    // o aviso chega fora da pilha do Supabase (evita travar a própria biblioteca)
    setTimeout(() => {
      if (session?.user) { if (uid !== session.user.id) afterLogin(session); } else if (uid) afterLogout();
    }, 0);
  });
  return sb;
}

const hasStoredSession = () => { try { return !!localStorage.getItem(AUTH_KEY); } catch { return false; } };
const returningFromLogin = () => /[?&](code|error_description)=/.test(location.search);

/** Chamado ao abrir o site. Só liga a conta se já há sessão ou se a pessoa voltou do link de login. */
export async function initAccount() {
  onSave((key) => { if (uid && SYNC.includes(key)) schedulePush(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && uid) claim(); });
  if (!hasStoredSession() && !returningFromLogin()) return;
  emit({ status: 'loading' });
  try {
    const c = await client();
    const q = new URLSearchParams(location.search);
    if (q.get('error_description')) emit({ error: 'link' });
    const { data } = await c.auth.getSession();
    if (returningFromLogin()) { // tira ?code= do endereço (não deve ficar no histórico nem em links copiados)
      ['code', 'error', 'error_code', 'error_description'].forEach((k) => q.delete(k));
      history.replaceState(null, '', `${location.pathname}${q.toString() ? `?${q}` : ''}${location.hash}`);
    }
    if (data?.session?.user) await afterLogin(data.session); else emit({ status: 'out' });
  } catch {
    emit({ status: 'out', error: 'offline' });
  }
}

// ---------- entrar / sair ----------
const redirectTo = () => `${location.origin}${location.pathname}`;
const EMAIL = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[a-z]{2,24}$/i;

export async function signInEmail(email) {
  const e = String(email || '').trim();
  if (!EMAIL.test(e)) { emit({ error: 'email' }); return false; }
  emit({ error: '', sent: '' });
  try {
    const c = await client();
    const { error } = await c.auth.signInWithOtp({ email: e, options: { emailRedirectTo: redirectTo(), shouldCreateUser: true } });
    if (error) { emit({ error: error.status === 429 ? 'rate' : 'send' }); return false; }
    emit({ sent: e });
    return true;
  } catch {
    emit({ error: 'offline' });
    return false;
  }
}

export async function signInGoogle() {
  emit({ error: '' });
  try {
    const c = await client();
    const { error } = await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } });
    if (error) emit({ error: 'google' });
  } catch {
    emit({ error: 'offline' });
  }
}

export async function signOut() {
  if (!sb) return;
  try { await sb.auth.signOut({ scope: 'local' }); } catch { /* sem internet: sai só daqui */ }
  afterLogout();
}

async function afterLogin(session) {
  uid = session.user.id;
  emit({ status: 'in', email: cleanText(session.user.email, 120), kicked: false, error: '', sent: '' });
  await claim();
  if (uid) await Promise.all([pull(), loadPlan()]);
}

function afterLogout(kicked = false) {
  uid = null;
  clearTimeout(pushTimer);
  emit({ status: 'out', email: '', plan: null, devices: [], sync: '', kicked });
}

// ---------- aparelhos ----------
export function deviceLabel(ua = navigator.userAgent) {
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android'
    : /Macintosh|Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
  const br = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  return [os, br].filter(Boolean).join(' · ') || '?';
}

const isAuthError = (e) => e && (e.code === '28000' || /not_authenticated|JWT|401/.test(`${e.message} ${e.code}`));

/** Registra este aparelho (e desconecta os excedentes). Se ESTE aparelho foi desconectado, sai. */
async function claim() {
  if (!sb || !uid) return;
  const { data, error } = await sb.rpc('claim_device', { p_label: deviceLabel() });
  if (error) {
    if (isAuthError(error)) { try { await sb.auth.signOut({ scope: 'local' }); } catch { /* ok */ } afterLogout(true); }
    return; // função ainda não instalada ou sem internet: segue sem a lista
  }
  const devices = (Array.isArray(data) ? data : []).slice(0, 10).map((d) => ({
    id: String(d.session_id || ''), label: cleanText(d.label, 60), lastSeen: Date.parse(d.last_seen) || 0, current: !!d.is_current,
  }));
  emit({ devices });
}

export async function revokeDevice(id) {
  if (!sb || !uid || !/^[0-9a-f-]{36}$/i.test(id)) return;
  await sb.rpc('revoke_device', { p_session: id });
  await claim();
}

async function loadPlan() {
  const { data, error } = await sb.rpc('my_plan');
  if (error || !data) return;
  const p = Array.isArray(data) ? data[0] : data;
  const int = (v, max) => (Number.isInteger(v) && v >= 0 && v <= max ? v : 0);
  emit({ plan: { id: /^[a-z_]{2,20}$/.test(p?.id) ? p.id : 'free', devices: int(p.max_devices, 10), favorites: int(p.max_favorites, 200) } });
}

// ---------- sincronização ----------
const place = (p) => {
  if (!p || typeof p !== 'object') return null;
  const lat = Number(p.lat), lon = Number(p.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const name = cleanText(p.name);
  return name ? { name, region: cleanText(p.region), country: cleanText(p.country), lat, lon } : null;
};
const VEH = ['car', 'moto', 'large'];
const trip = (r) => {
  const f = place(r?.from), t = place(r?.to);
  return f && t ? { from: f, to: t, vehicle: VEH.includes(r.vehicle) ? r.vehicle : 'car' } : null;
};
const keyP = (p) => `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;
const keyT = (r) => `${keyP(r.from)}>${keyP(r.to)}`;
const uniq = (list, key) => { const seen = new Set(); return list.filter((x) => x && !seen.has(key(x)) && seen.add(key(x))); };

/** Junta o que está na conta com o que está neste aparelho (nada se perde ao entrar). */
export function mergeData(cloud, local) {
  const arr = (v) => (Array.isArray(v) ? v : []);
  return {
    home: place(cloud?.home) || place(local?.home) || null,
    favorites: uniq([...arr(cloud?.favorites).map(place), ...arr(local?.favorites).map(place)], keyP).slice(0, MAX_FAV),
    trips: uniq([...arr(local?.trips).map(trip), ...arr(cloud?.trips).map(trip)], keyT).slice(0, MAX_TRIPS),
  };
}

const localData = () => ({ home: load('home'), favorites: load('favorites'), trips: load('trips') });

async function pull() {
  emit({ sync: 'syncing' });
  const { data, error } = await sb.from('user_data').select('home,favorites,trips').maybeSingle();
  if (error) { emit({ sync: 'error' }); return; }
  const merged = mergeData(data || {}, localData());
  SYNC.forEach((k) => save(k, merged[k], { silent: true }));
  window.dispatchEvent(new CustomEvent('wf:sync'));
  const same = data && JSON.stringify(mergeData(data, {})) === JSON.stringify(merged);
  if (same) emit({ sync: 'ok' }); else await push();
}

function schedulePush() {
  clearTimeout(pushTimer);
  emit({ sync: 'syncing' });
  pushTimer = setTimeout(push, 800);
}

async function push() {
  if (!sb || !uid) return;
  const d = mergeData(localData(), {});
  // a linha nasce junto com a conta (gatilho no banco); aqui só atualiza as 3 colunas permitidas
  const { error } = await sb.from('user_data').update({ home: d.home, favorites: d.favorites, trips: d.trips }).eq('user_id', uid);
  emit({ sync: error ? 'error' : 'ok' });
}

// ---------- apagar tudo ----------
export async function deleteAccount() {
  if (!sb || !uid) return false;
  const { error } = await sb.rpc('delete_my_account');
  if (error) { emit({ error: 'delete' }); return false; }
  SYNC.forEach((k) => save(k, null, { silent: true }));
  window.dispatchEvent(new CustomEvent('wf:sync'));
  try { await sb.auth.signOut({ scope: 'local' }); } catch { /* a conta já não existe */ }
  try { localStorage.removeItem(AUTH_KEY); } catch { /* ok */ }
  afterLogout();
  emit({ deleted: true });
  return true;
}
