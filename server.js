/**
 * @file Heimatliebe Institute — Full API & Static Server
 * Supports: CRUD on all tables, file uploads to Supabase Storage, auth, email, session
 */
import { createServer } from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { createHash, randomBytes } from 'crypto';
import { createTransport } from 'nodemailer';

const PORT  = process.env.PORT || 3000;
const ROOT  = process.cwd();

// ── Load Config ───────────────────────────────────────────────
let CFG = { SUPABASE_URL: '', SUPABASE_ANON: '', ADMIN_PASSWORD: '' };
try {
  const raw = await fs.readFile(path.join(ROOT, 'config.json'), 'utf8');
  const parsed = JSON.parse(raw.trim());
  CFG.SUPABASE_URL   = process.env.SUPABASE_URL   || parsed.SUPABASE_URL   || '';
  CFG.SUPABASE_ANON  = process.env.SUPABASE_ANON  || parsed.SUPABASE_ANON  || '';
  CFG.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD  || parsed.ADMIN_PASSWORD || '';
} catch { /* fallback to env only */ }

// ── MIME TYPES ────────────────────────────────────────────────
const MIME = {
  '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.gif':'image/gif','.svg':'image/svg+xml','.pdf':'application/pdf',
  '.mp4':'video/mp4','.webm':'video/webm','.epub':'application/epub+zip',
  '.txt':'text/plain; charset=utf-8','.ico':'image/x-icon','.webp':'image/webp',
  '.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.zip':'application/zip'
};

function mimeType(p) { return MIME[path.extname(p).toLowerCase()] || 'application/octet-stream'; }

// ── Helpers ───────────────────────────────────────────────────
const readBody = req => new Promise((res, rej) => {
  let b = '';
  req.on('data', c => { b += c; if (b.length > 5e6) req.destroy(); });
  req.on('end', () => { try { res(JSON.parse(b)); } catch { res({}); } });
  req.on('error', rej);
});

const readBuffer = req => new Promise((res, rej) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => res(Buffer.concat(chunks)));
  req.on('error', rej);
});

const json = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
};

const hashPw = pw => createHash('sha256').update(pw + 'hmli_salt_2025').digest('hex');

// ── Supabase REST Helper ──────────────────────────────────────
async function supabase(path, options = {}) {
  const url = `${CFG.SUPABASE_URL}${path}`;
  const headers = {
    'apikey': CFG.SUPABASE_ANON, 'Authorization': `Bearer ${CFG.SUPABASE_ANON}`,
    'Content-Type': 'application/json', 'Prefer': 'return=representation',
    ...(options.headers || {})
  };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

// ── Parse multipart/form-data ─────────────────────────────────
function parseMultipart(body, boundary) {
  const parts = body.toString('binary').split(`--${boundary}`);
  const fields = {};
  for (const part of parts) {
    if (part.includes('Content-Disposition: form-data;')) {
      const nameMatch = part.match(/name="([^"]+)"/);
      const filenameMatch = part.match(/filename="([^"]+)"/);
      if (!nameMatch) continue;
      const name = nameMatch[1];
      const contentStart = part.indexOf('\r\n\r\n') + 4;
      const contentEnd = part.lastIndexOf('\r\n');
      if (filenameMatch) {
        fields[name] = {
          filename: filenameMatch[1],
          data: Buffer.from(part.slice(contentStart, contentEnd > contentStart ? contentEnd : undefined), 'binary')
        };
      } else {
        fields[name] = part.slice(contentStart, contentEnd > contentStart ? contentEnd : undefined).trim();
      }
    }
  }
  return fields;
}

// ── Nodemailer Transport ──────────────────────────────────────
function getTransport() {
  return createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: parseInt(process.env.SMTP_PORT || '465') === 465,
    auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' }
  });
}

function approvalEmailHtml({ full_name, student_id, course, level, site_url }) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Your Student ID — Heimatliebe Institute</title></head>
<body style="margin:0;padding:0;background:#F7F5EF;font-family:Inter,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5EF;padding:40px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-top:4px solid #C9A84C">
<tr><td style="background:#1B4332;padding:28px 36px">
<p style="margin:0;font-family:Georgia,serif;font-size:20px;font-weight:700;color:#C9A84C">Heimatliebe <span style="color:rgba(255,255,255,.75);font-weight:400">Institute</span></p>
<p style="margin:6px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.4)">Student Portal</p></td></tr>
<tr><td style="padding:36px 36px 28px">
<p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C9A84C">Enrolment Confirmed</p>
<h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:26px;font-weight:700;color:#1B4332;line-height:1.2">Welcome to Heimatliebe, ${full_name}!</h1>
<p style="margin:0 0 24px;font-size:15px;color:#4A6572;line-height:1.7">Your payment has been confirmed and your enrolment in <strong style="color:#1B4332">${course} (${level})</strong> is now active.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1B4332;margin:0 0 28px"><tr><td style="padding:24px;text-align:center">
<p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.5)">Your Student ID</p>
<p style="margin:0;font-family:'Courier New',monospace;font-size:28px;font-weight:700;color:#C9A84C;letter-spacing:3px">${student_id}</p>
<p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,.45)">Use this to log in at <a href="${site_url}/login.html" style="color:#C9A84C">${site_url}/login.html</a></p>
</td></tr></table>
<p style="margin:0;font-size:13px;color:#4A6572;line-height:1.7">Questions? Contact us on <a href="https://wa.me/265991383466" style="color:#2D6A4F;font-weight:600">WhatsApp +265 991 383 466</a>.</p>
</td></tr></table></td></tr></table></body></html>`;
}

function resetEmailHtml({ full_name, site_url, token, student_id }) {
  const resetLink = `${site_url}/reset-password.html?token=${token}&id=${encodeURIComponent(student_id)}`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reset Your Password — Heimatliebe Institute</title></head>
<body style="margin:0;padding:0;background:#F7F5EF;font-family:Inter,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5EF;padding:40px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-top:4px solid #C9A84C">
<tr><td style="background:#1B4332;padding:28px 36px">
<p style="margin:0;font-family:Georgia,serif;font-size:20px;font-weight:700;color:#C9A84C">Heimatliebe <span style="color:rgba(255,255,255,.75);font-weight:400">Institute</span></p>
<p style="margin:6px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.4)">Password Reset</p></td></tr>
<tr><td style="padding:36px 36px 28px">
<h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1B4332;line-height:1.2">Hi ${full_name},</h1>
<p style="margin:0 0 24px;font-size:15px;color:#4A6572;line-height:1.7">A password reset was requested for your Heimatliebe account (<strong>${student_id}</strong>). Click the button below to set a new password. This link expires in 1 hour.</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 28px">
<a href="${resetLink}" style="display:inline-block;padding:14px 32px;background:#C9A84C;color:#1B4332;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:.08em;border-radius:2px">Reset Password</a>
</td></tr></table>
<p style="margin:0;font-size:13px;color:#4A6572;line-height:1.7">If you didn't request this, you can ignore this email. Your password will remain unchanged.</p></td></tr></table></td></tr></table></body></html>`;
}

// ── Router ─────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  try {
    const urlObj   = new URL(req.url, 'http://localhost');
    const urlPath  = decodeURIComponent(urlObj.pathname);
    const method   = req.method.toUpperCase();
    const query    = Object.fromEntries(urlObj.searchParams);
    const siteUrl  = process.env.SITE_URL || `http://${req.headers.host || 'localhost:3000'}`;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // ─── /config.json (public — only non-sensitive fields) ────
    if (urlPath === '/config.json') {
      json(res, 200, { SUPABASE_URL: CFG.SUPABASE_URL, SUPABASE_ANON: CFG.SUPABASE_ANON });
      return;
    }

    // ─── VERIFY ADMIN PASSWORD (server-side, no exposure to client) ──
    if (urlPath === '/api/verify-admin' && method === 'POST') {
      const { password } = await readBody(req);
      if (!password) { json(res, 400, { error: 'Password required' }); return; }
      const correct = CFG.ADMIN_PASSWORD;
      if (!correct) { json(res, 500, { error: 'Admin password not configured' }); return; }
      if (password === correct) { json(res, 200, { ok: true }); return; }
      json(res, 401, { error: 'Incorrect password' });
      return;
    }

    // ─── AUTH / LOGIN ──────────────────────────────────────
    if (urlPath === '/api/login' && method === 'POST') {
      const { user_id, password } = await readBody(req);
      if (!user_id || !password) { json(res, 400, { error: 'Missing credentials' }); return; }
      const pwHash = hashPw(password);
      // Check users table
      let result = await supabase(`/rest/v1/users?user_id=eq.${encodeURIComponent(user_id.toUpperCase())}&password_hash=eq.${encodeURIComponent(pwHash)}&select=*`, { method: 'GET', headers: { 'Prefer': '' } });
      if (!result.ok || !result.data?.length) {
        result = await supabase(`/rest/v1/users?email=eq.${encodeURIComponent(user_id.toLowerCase())}&password_hash=eq.${encodeURIComponent(pwHash)}&select=*`, { method: 'GET', headers: { 'Prefer': '' } });
      }
      if (!result.ok || !result.data?.length) {
        // Legacy students table
        result = await supabase(`/rest/v1/students?student_id=eq.${encodeURIComponent(user_id.toUpperCase())}&password_hash=eq.${encodeURIComponent(pwHash)}&select=*`, { method: 'GET', headers: { 'Prefer': '' } });
        if (result.ok && result.data?.length) {
          const s = result.data[0];
          json(res, 200, { user: { ...s, user_id: s.student_id, role: 'student' } });
          return;
        }
        json(res, 401, { error: 'Invalid credentials' });
        return;
      }
      json(res, 200, { user: result.data[0] });
      return;
    }

    // ─── CHANGE PASSWORD ───────────────────────────────────
    if (urlPath === '/api/change-password' && method === 'POST') {
      const { user_id, old_password, new_password } = await readBody(req);
      if (!user_id || !old_password || !new_password) { json(res, 400, { error: 'Missing fields' }); return; }
      if (new_password.length < 8) { json(res, 400, { error: 'Password must be 8+ chars' }); return; }
      const oldHash = hashPw(old_password);
      const newHash = hashPw(new_password);
      const check = await supabase(`/rest/v1/users?user_id=eq.${encodeURIComponent(user_id.toUpperCase())}&password_hash=eq.${encodeURIComponent(oldHash)}&select=id`, { method: 'GET', headers: { 'Prefer': '' } });
      if (!check.ok || !check.data?.length) { json(res, 401, { error: 'Current password incorrect' }); return; }
      await supabase(`/rest/v1/users?user_id=eq.${encodeURIComponent(user_id.toUpperCase())}`, { method: 'PATCH', body: JSON.stringify({ password_hash: newHash }) });
      await supabase(`/rest/v1/students?student_id=eq.${encodeURIComponent(user_id.toUpperCase())}`, { method: 'PATCH', body: JSON.stringify({ password_hash: newHash }) });
      console.log(`[auth] Password changed for ${user_id}`);
      json(res, 200, { ok: true });
      return;
    }

    // ─── REQUEST PASSWORD RESET ────────────────────────────
    if (urlPath === '/api/request-password-reset' && method === 'POST') {
      const { student_id, email } = await readBody(req);
      if (!student_id || !email) { json(res, 400, { error: 'Student ID and email required' }); return; }
      // Find user — don't reveal whether the combo exists
      const userResult = await supabase(`/rest/v1/users?user_id=eq.${encodeURIComponent(student_id.toUpperCase())}&email=eq.${encodeURIComponent(email.toLowerCase())}&select=id,user_id,full_name,email`, { method: 'GET', headers: { 'Prefer': '' } });
      if (userResult.ok && userResult.data?.length) {
        const user = userResult.data[0];
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour
        await supabase('/rest/v1/password_reset_tokens', {
          method: 'POST',
          body: JSON.stringify({ user_id: user.id, student_id: user.user_id, token, expires_at: expiresAt, used: false })
        });
        // Try email
        try {
          if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            const t = getTransport();
            await t.sendMail({
              from: process.env.SMTP_FROM || `"Heimatliebe" <${process.env.SMTP_USER}>`,
              to: user.email,
              subject: 'Reset Your Password — Heimatliebe Institute',
              html: resetEmailHtml({ full_name: user.full_name, site_url: siteUrl, token, student_id: user.user_id })
            });
          }
        } catch (e) { console.warn('[email] Reset email send failed:', e.message); }
      }
      // Always return same message to avoid leaking user info
      json(res, 200, { ok: true, message: 'If that Student ID and email match, a reset link has been sent.' });
      return;
    }

    // ─── RESET PASSWORD (with token) ───────────────────────
    if (urlPath === '/api/reset-password' && method === 'POST') {
      const { token, student_id, new_password } = await readBody(req);
      if (!token || !student_id || !new_password) { json(res, 400, { error: 'Missing required fields' }); return; }
      if (new_password.length < 8) { json(res, 400, { error: 'Password must be 8+ characters' }); return; }
      // Find valid token
      const tokenResult = await supabase(`/rest/v1/password_reset_tokens?token=eq.${encodeURIComponent(token)}&student_id=eq.${encodeURIComponent(student_id.toUpperCase())}&used=eq.false&select=*`, { method: 'GET', headers: { 'Prefer': '' } });
      if (!tokenResult.ok || !tokenResult.data?.length) { json(res, 400, { error: 'Invalid or expired reset link.' }); return; }
      const resetRecord = tokenResult.data[0];
      if (new Date(resetRecord.expires_at) < new Date()) { json(res, 400, { error: 'Reset link has expired. Request a new one.' }); return; }
      // Update password
      const newHash = hashPw(new_password);
      await supabase(`/rest/v1/users?id=eq.${resetRecord.user_id}`, { method: 'PATCH', body: JSON.stringify({ password_hash: newHash }) });
      await supabase(`/rest/v1/students?student_id=eq.${encodeURIComponent(student_id.toUpperCase())}`, { method: 'PATCH', body: JSON.stringify({ password_hash: newHash }) });
      // Mark token as used
      await supabase(`/rest/v1/password_reset_tokens?id=eq.${resetRecord.id}`, { method: 'PATCH', body: JSON.stringify({ used: true }) });
      console.log(`[auth] Password reset completed for ${student_id}`);
      json(res, 200, { ok: true, message: 'Password has been reset successfully.' });
      return;
    }

    // ─── APPROVE APPLICATION ───────────────────────────────
    if (urlPath === '/api/approve-application' && method === 'POST') {
      const { application_id } = await readBody(req);
      if (!application_id) { json(res, 400, { error: 'Missing application_id' }); return; }
      const appRes = await supabase(`/rest/v1/applications?id=eq.${application_id}&select=*`, { method: 'GET', headers: { 'Prefer': '' } });
      if (!appRes.ok || !appRes.data?.length) { json(res, 404, { error: 'Application not found' }); return; }
      const app = appRes.data[0];
      const sid = `HMLI-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000)}`;
      const userPayload = { user_id: sid, full_name: app.full_name, email: app.email, phone: app.phone || '', course: app.course, level: app.level, password_hash: app.password_hash, role: 'student', status: 'active' };
      await supabase('/rest/v1/users', { method: 'POST', body: JSON.stringify(userPayload) });
      await supabase('/rest/v1/students', { method: 'POST', body: JSON.stringify({ student_id: sid, full_name: app.full_name, email: app.email, phone: app.phone, course: app.course, level: app.level, password_hash: app.password_hash }) });
      await supabase(`/rest/v1/applications?id=eq.${application_id}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved', student_id: sid, reviewed_at: new Date().toISOString() }) });
      // Try email
      try {
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
          const t = getTransport();
          await t.sendMail({ from: process.env.SMTP_FROM || `"Heimatliebe" <${process.env.SMTP_USER}>`, to: app.email, subject: 'Your Student ID — Heimatliebe Institute', html: approvalEmailHtml({ full_name: app.full_name, student_id: sid, course: app.course, level: app.level, site_url: siteUrl }) });
        }
      } catch (e) { console.warn('[email] Send failed:', e.message); }
      console.log(`[approve] ${sid} created for ${app.full_name}`);
      json(res, 200, { ok: true, student_id: sid });
      return;
    }

    // ─── REJECT APPLICATION ────────────────────────────────
    if (urlPath === '/api/reject-application' && method === 'POST') {
      const { application_id } = await readBody(req);
      await supabase(`/rest/v1/applications?id=eq.${application_id}`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected', reviewed_at: new Date().toISOString() }) });
      json(res, 200, { ok: true });
      return;
    }

    // ─── FILE UPLOAD ────────────────────────────────────────
    const uploadMatch = urlPath.match(/^\/api\/upload\/([^/]+)(?:\/(.+))?$/);
    if (uploadMatch && method === 'POST') {
      const bucket = uploadMatch[1];
      const buf = await readBuffer(req);
      const ct = req.headers['content-type'] || '';
      const boundaryMatch = ct.match(/boundary=(.+)/);
      if (!boundaryMatch) { json(res, 400, { error: 'No boundary' }); return; }
      const boundary = boundaryMatch[1].trim();
      const fields = parseMultipart(buf, boundary);
      const file = fields.file;
      if (!file || !file.filename) { json(res, 400, { error: 'No file uploaded' }); return; }
      const ext = path.extname(file.filename) || '';
      const storagePath = `${Date.now()}-${randomBytes(4).toString('hex')}${ext}`;
      const upRes = await fetch(`${CFG.SUPABASE_URL}/storage/v1/object/${bucket}/${storagePath}`, {
        method: 'POST',
        headers: { 'apikey': CFG.SUPABASE_ANON, 'Authorization': `Bearer ${CFG.SUPABASE_ANON}`, 'Content-Type': mimeType(file.filename) },
        body: file.data
      });
      if (!upRes.ok) { const t = await upRes.text(); json(res, 500, { error: 'Upload failed', detail: t }); return; }
      const publicUrl = `${CFG.SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;
      console.log(`[upload] ${bucket}/${storagePath}`);
      json(res, 200, { url: publicUrl, path: storagePath, bucket });
      return;
    }

    // ─── FILE DELETE ────────────────────────────────────────
    if (uploadMatch && method === 'DELETE') {
      const bucket = uploadMatch[1];
      const filePath = uploadMatch[2];
      if (!bucket || !filePath) { json(res, 400, { error: 'Missing bucket or path' }); return; }
      await fetch(`${CFG.SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`, {
        method: 'DELETE',
        headers: { 'apikey': CFG.SUPABASE_ANON, 'Authorization': `Bearer ${CFG.SUPABASE_ANON}` }
      });
      json(res, 200, { ok: true });
      return;
    }

    // ─── GENERIC TABLE API ─────────────────────────────────
    const tableMatch = urlPath.match(/^\/api\/([a-zA-Z_]+)(?:\/([0-9]+))?$/);
    if (tableMatch) {
      const table = tableMatch[1];
      const id = tableMatch[2];
      const allowed = ['users','students','courses','classes','class_enrollments','assignments','submissions','exams','exam_results','library','applications','news','payments','fees','invoices','timetable_entries','attendance','notifications','conversations','conversation_participants','messages','scholarships','scholarship_applications','alumni','password_reset_tokens'];
      if (!allowed.includes(table)) { json(res, 403, { error: 'Table not allowed' }); return; }

      if (method === 'GET') {
        const opts = [];
        if (query.order) opts.push(`order=${encodeURIComponent(query.order)}`);
        else opts.push('order=created_at.desc');
        if (query.limit) opts.push(`limit=${query.limit}`);
        let filterPath = `/rest/v1/${table}?select=*&${opts.join('&')}`;
        for (const [k, v] of Object.entries(query)) {
          if (!['order','limit','select','page'].includes(k)) {
            // Detect if value already has a Supabase operator prefix (e.g., "eq.5", "in.(1,2,3)", "gte.10")
            // This preserves subqueries: "class_id=in.(select id from class_enrollments where user_id=eq.123)"
            const hasOperator = /^[a-zA-Z_]+\./.test(v);
            filterPath += hasOperator ? `&${k}=${encodeURIComponent(v)}` : `&${k}=eq.${encodeURIComponent(v)}`;
          }
        }
        const result = await supabase(filterPath, { method: 'GET', headers: { 'Prefer': '' } });
        if (!result.ok) { json(res, result.status, { error: result.data }); return; }
        json(res, 200, result.data);
        return;
      }
      if (method === 'POST') {
        const body = await readBody(req);
        const result = await supabase(`/rest/v1/${table}`, { method: 'POST', body: JSON.stringify(body) });
        if (!result.ok) { json(res, result.status, { error: result.data }); return; }
        json(res, 201, result.data);
        return;
      }
      if (method === 'PATCH' && id) {
        const body = await readBody(req);
        const result = await supabase(`/rest/v1/${table}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(body) });
        if (!result.ok) { json(res, result.status, { error: result.data }); return; }
        json(res, 200, result.data);
        return;
      }
      if (method === 'DELETE' && id) {
        await supabase(`/rest/v1/${table}?id=eq.${id}`, { method: 'DELETE' });
        json(res, 200, { ok: true });
        return;
      }
      json(res, 405, { error: 'Method not allowed' });
      return;
    }

    // ─── CONTENT LIST (list markdown files in a content folder) ──
    if (urlPath === '/content-list' && method === 'GET') {
      const folder = query.folder || '';
      const contentDir = path.join(ROOT, 'content', folder);
      try {
        const files = await fs.readdir(contentDir);
        const mdFiles = files.filter(f => f.endsWith('.md')).sort().reverse();
        json(res, 200, mdFiles);
      } catch {
        json(res, 200, []);
      }
      return;
    }

    // ─── CONTACT ENQUIRY ────────────────────────────────────
    if (urlPath === '/api/contact-enquiry' && method === 'POST') {
      const body = await readBody(req);
      if (!body.name || !body.email) { json(res, 400, { error: 'Name and email required' }); return; }
      const logDir = path.join(ROOT, 'data');
      await fs.mkdir(logDir, { recursive: true });
      const logFile = path.join(logDir, 'enquiries.json');
      let enquiries = [];
      try { enquiries = JSON.parse(await fs.readFile(logFile, 'utf8')); } catch {}
      enquiries.push({ id: Date.now(), ...body, created_at: new Date().toISOString() });
      if (enquiries.length > 500) enquiries = enquiries.slice(-500);
      await fs.writeFile(logFile, JSON.stringify(enquiries, null, 2));
      json(res, 200, { ok: true, message: 'Thank you! We will be in touch.' });
      return;
    }

    // ─── STATIC FILE SERVING ────────────────────────────────
    let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    } catch {
      // Try index.html in directory
      filePath = path.join(ROOT, urlPath, 'index.html');
      try { await fs.stat(filePath); } catch { filePath = path.join(ROOT, 'index.html'); }
    }
    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': mimeType(filePath) });
    res.end(data);

  } catch (err) {
    console.error('[server]', err.message);
    if (!res.headersSent) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }
});

server.listen(PORT, () => console.log(`Heimatliebe server running on port ${PORT}`));
