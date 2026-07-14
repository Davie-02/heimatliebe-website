/**
 * Heimatliebe Institute — supabase.js
 * Config loader, REST wrapper, Storage upload/delete helpers.
 * Loaded as <script src="/supabase.js"> on all pages.
 */
let SUPABASE_URL = null, SUPABASE_ANON = null, ADMIN_PASSWORD = ''; // default, overridden by config.json or window.__APP_CONFIG__
let __configPromise = null;

function loadRuntimeConfig() {
  if (__configPromise) return __configPromise;
  if (window.__APP_CONFIG__) {
    const c = window.__APP_CONFIG__;
    SUPABASE_URL = c.SUPABASE_URL || null; SUPABASE_ANON = c.SUPABASE_ANON || null; ADMIN_PASSWORD = c.ADMIN_PASSWORD || '';
    return (__configPromise = Promise.resolve());
  }
  __configPromise = fetch('/config.json').then(async r => {
    if (!r.ok) throw new Error('config.json not found');
    const c = await r.json();
    SUPABASE_URL = c.SUPABASE_URL || null; SUPABASE_ANON = c.SUPABASE_ANON || null; ADMIN_PASSWORD = c.ADMIN_PASSWORD || '';
  }).catch(e => console.error('[HMLI] Config load failed:', e));
  return __configPromise;
}
function configReady() { return loadRuntimeConfig(); }
function getAdminPassword() { return ADMIN_PASSWORD || ''; }

async function sbAdmin(path, options = {}) {
  await loadRuntimeConfig();
  if (!SUPABASE_URL || !SUPABASE_ANON) return { ok: false, status: 0, data: null };
  const { headers: extra = {}, ...rest } = options;
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...rest,
    headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation', ...extra }
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}
const sbFetch = sbAdmin;

/** Upload a file to Supabase Storage using the server proxy (handles CORS). Returns public URL. */
async function sbUpload(bucket, file, onProgress) {
  await loadRuntimeConfig();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/api/upload/${bucket}`, { method: 'POST', body: form });
  if (!res.ok) { const err = await res.text(); throw new Error(`Upload failed (${res.status}): ${err}`); }
  const data = await res.json();
  return data.url;
}

/** Delete a file from Supabase Storage via server proxy. */
async function sbDelete(bucket, path) {
  await loadRuntimeConfig();
  const res = await fetch(`/api/upload/${bucket}/${encodeURIComponent(path)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
  return true;
}

/** Get public URL for a storage object. */
function getPublicUrl(bucket, path) {
  if (!SUPABASE_URL || !path) return '';
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

function generateStudentId() {
  return `HMLI-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

// Session helpers (backward compat)
const SESSION_KEY = 'hmli_student';
function saveStudentSession(s) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: s.id, student_id: s.student_id, full_name: s.full_name, course: s.course, level: s.level, email: s.email }));
}
function getStudentSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; } }
function clearStudentSession() { sessionStorage.removeItem(SESSION_KEY); }
function requireStudent() {
  const s = getStudentSession();
  if (!s) window.location.href = '/login.html?next=' + encodeURIComponent(window.location.pathname);
  return s;
}
