// ── SUPABASE CONFIG ───────────────────────────────────────────
const SUPABASE_URL  = 'https://mcdcwrwzmifmouutpubn.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZGN3cnd6bWlmbW91dXRwdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDY1MjUsImV4cCI6MjA5Nzk4MjUyNX0.Xv_CrVMigI0nibRVa03NvPWgJQ9vVoJ1_T1xiRJWqTs';

// ── ADMIN PASSWORD (change this!) ─────────────────────────────
// This protects the admin-students.html page on the client side.
// For stronger security later, move to Supabase Edge Functions.
const ADMIN_PASSWORD = 'HMLI@Admin2025';

// ── LOW-LEVEL FETCH WRAPPER ───────────────────────────────────
async function sbFetch(path, options = {}) {
  const url = `${SUPABASE_URL}${path}`;
  const headers = {
    'apikey': SUPABASE_ANON,
    'Authorization': `Bearer ${getStudentToken() || SUPABASE_ANON}`,
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
  const url = `${SUPABASE_URL}${path}`;
  const headers = {
    'apikey': SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`,
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
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
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
