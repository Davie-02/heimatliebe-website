// ── RUNTIME CONFIG (loaded from /config.json or window.__APP_CONFIG__) ─
let SUPABASE_URL = null;
let SUPABASE_ANON = null;
// Admin password must be provided via runtime config.
let ADMIN_PASSWORD = '';

let __configPromise = null;
function loadRuntimeConfig() {
  if (__configPromise) return __configPromise;
  // Prefer explicit global injected config
  if (window.__APP_CONFIG__) {
    const c = window.__APP_CONFIG__;
    SUPABASE_URL = c.SUPABASE_URL || null;
    SUPABASE_ANON = c.SUPABASE_ANON || null;
    ADMIN_PASSWORD = c.ADMIN_PASSWORD || null;
    window.ADMIN_PASSWORD = ADMIN_PASSWORD || '';
    return (__configPromise = Promise.resolve());
  }
  // Fallback: fetch /config.json (not checked into repo)
  __configPromise = fetch('/config.json').then(async r => {
    if (!r.ok) return;
    try {
      const c = await r.json();
      SUPABASE_URL = c.SUPABASE_URL || null;
      SUPABASE_ANON = c.SUPABASE_ANON || null;
      ADMIN_PASSWORD = c.ADMIN_PASSWORD || null;
      window.ADMIN_PASSWORD = ADMIN_PASSWORD || '';
    } catch (e) {
      // ignore
    }
  }).catch(() => {});
  return __configPromise;
}

function getAdminPassword() {
  return ADMIN_PASSWORD || '';
}

async function loadLocalSupabaseBundle() {
  if (window.supabase) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/js/supabase.umd.js';
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load local Supabase bundle at /js/supabase.umd.js'));
    document.head.appendChild(script);
  });
}

async function getSupabaseClient() {
  await loadRuntimeConfig();
  if (window.__SUPABASE_CLIENT__) return window.__SUPABASE_CLIENT__;
  await loadLocalSupabaseBundle();
  if (!window.supabase) throw new Error('Supabase client not available.');
  window.__SUPABASE_CLIENT__ = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  return window.__SUPABASE_CLIENT__;
}

// ── LOW-LEVEL FETCH WRAPPER ───────────────────────────────────
async function sbFetch(path, options = {}) {
  await loadRuntimeConfig();
  const url = `${SUPABASE_URL}${path}`;
  const headers = {
    'apikey': SUPABASE_ANON || '',
    'Authorization': `Bearer ${getStudentToken() || SUPABASE_ANON || ''}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...options.headers
  };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

// Admin uses service role via edge function proxy — for now uses anon
// with RLS policies set appropriately in Supabase dashboard.
async function sbAdmin(path, options = {}) {
  await loadRuntimeConfig();
  const url = `${SUPABASE_URL}${path}`;
  const headers = {
    'apikey': SUPABASE_ANON || '',
    'Authorization': `Bearer ${SUPABASE_ANON || ''}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...options.headers
  };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

// ── STORAGE UPLOAD ────────────────────────────────────────────
async function uploadFile(bucket, path, file) {
  await loadRuntimeConfig();
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON || '',
      'Authorization': `Bearer ${SUPABASE_ANON || ''}`,
    },
    body: file
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  // Return public URL (bucket is private — we just store the path)
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// ── STUDENT AUTH (session stored in sessionStorage) ───────────
const SESSION_KEY = 'hmli_student';

function saveStudentSession(student) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(student));
}
function getStudentSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}
function getStudentToken() {
  // Students don't get JWT tokens in this simple system —
  // we verify against the DB and store session client-side.
  return null;
}
function clearStudentSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
function requireStudent() {
  const s = getStudentSession();
  if (!s) { window.location.href = '/login.html?next=' + encodeURIComponent(window.location.pathname); }
  return s;
}

// ── STUDENT ID GENERATOR ──────────────────────────────────────
function generateStudentId() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `HMLI-${year}-${rand}`;
}

// ── PASSWORD HASH (simple — use bcrypt in production) ─────────
async function hashPassword(password) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password + 'hmli_salt_2025'));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
