// ═══════════════════════════════════════════════════════════════
// HEIMATLIEBE INSTITUTE — supabase.js (root)
// Loaded directly by all pages via <script src="/supabase.js">
// Fixed: async gate, config-ready pattern, no UMD dependency
// ═══════════════════════════════════════════════════════════════

let SUPABASE_URL   = null;
let SUPABASE_ANON  = null;
let ADMIN_PASSWORD = '';

let __configPromise = null;

function loadRuntimeConfig() {
  if (__configPromise) return __configPromise;

  if (window.__APP_CONFIG__) {
    const c = window.__APP_CONFIG__;
    SUPABASE_URL   = c.SUPABASE_URL   || null;
    SUPABASE_ANON  = c.SUPABASE_ANON  || null;
    ADMIN_PASSWORD = c.ADMIN_PASSWORD  || '';
    return (__configPromise = Promise.resolve());
  }

  __configPromise = fetch('/config.json')
    .then(async r => {
      if (!r.ok) throw new Error('config.json not found');
      const c = await r.json();
      SUPABASE_URL   = c.SUPABASE_URL   || null;
      SUPABASE_ANON  = c.SUPABASE_ANON  || null;
      ADMIN_PASSWORD = c.ADMIN_PASSWORD  || '';
    })
    .catch(err => {
      console.error('[HMLI] Failed to load runtime config:', err);
    });

  return __configPromise;
}

// Call this once on page load — resolves when config is ready
function configReady() {
  return loadRuntimeConfig();
}

function getAdminPassword() { return ADMIN_PASSWORD || ''; }

// ── REST WRAPPER ───────────────────────────────────────────────
async function sbAdmin(path, options = {}) {
  await loadRuntimeConfig();
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.error('[HMLI] Supabase not configured. Check Railway env vars.');
    return { ok: false, status: 0, data: null };
  }
  const { headers: extra = {}, ...rest } = options;
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...rest,
    headers: {
      'apikey':        SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
      ...extra
    }
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

// Alias
const sbFetch = sbAdmin;

// ── STORAGE UPLOAD ─────────────────────────────────────────────
async function uploadFile(bucket, filePath, file) {
  await loadRuntimeConfig();
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`, {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`
    },
    body: file
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Storage upload failed (${res.status}): ${err}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`;
}

// ── PASSWORD HASHING ───────────────────────────────────────────
async function hashPassword(password) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(password + 'hmli_salt_2025')
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── STUDENT ID GENERATOR ───────────────────────────────────────
function generateStudentId() {
  const year = new Date().getFullYear();
  const seq  = String(Math.floor(Math.random() * 9000) + 1000);
  return `HMLI-${year}-${seq}`;
}

// ── SESSION ────────────────────────────────────────────────────
const SESSION_KEY = 'hmli_student';

function saveStudentSession(s) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    id: s.id, student_id: s.student_id,
    full_name: s.full_name, course: s.course,
    level: s.level, email: s.email
  }));
}
function getStudentSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}
function getStudentToken() { return null; }
function clearStudentSession() { sessionStorage.removeItem(SESSION_KEY); }
function requireStudent() {
  const s = getStudentSession();
  if (!s) window.location.href = '/login.html?next=' + encodeURIComponent(window.location.pathname);
  return s;
}