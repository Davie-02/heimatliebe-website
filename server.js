/**
 * @file Main server for the Heimatliebe Institute website.
 * This Node.js server handles:
 * - Serving static files from the project root.
 * - Providing a dynamic `/config.json` for frontend runtime configuration.
 * - API endpoints for sending emails (student approval, password reset).
 * - API endpoints for password reset flow.
 * - A helper endpoint to list content files for the frontend.
 */

import { createServer } from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { createTransport } from 'nodemailer';

const port = process.env.PORT || 3000;
const publicDir = process.cwd(); // Serve files from project root (not /public)
const contentDir = path.join(process.cwd(), 'content'); // Markdown content lives here
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.pdf':  'application/pdf',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.epub': 'application/epub+zip',
  '.txt':  'text/plain; charset=utf-8'
};

/**
 * Returns the appropriate MIME type for a given file path.
 * @param {string} filePath - The path to the file.
 * @returns {string} The MIME type.
 */
function contentType(filePath) {
  return mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

// ── Nodemailer Transport ───────────────────────────────────────
/**
 * Creates and configures a Nodemailer transport for sending emails.
 * Reads SMTP configuration from environment variables.
 */
function getTransport() {
  return createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '465'),
    secure: parseInt(process.env.SMTP_PORT || '465') === 465,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  });
}

// ── Email Templates ────────────────────────────────────────────
function approvalEmailHtml({ full_name, student_id, course, level, site_url }) {
  const loginUrl     = `${site_url}/login.html?id=${encodeURIComponent(student_id)}`;
  const resetUrl     = `${site_url}/reset-password.html`;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Student ID — Heimatliebe Institute</title></head>
<body style="margin:0;padding:0;background:#F7F5EF;font-family:'Inter',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5EF;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-top:4px solid #C9A84C">
        <tr><td style="background:#1B4332;padding:28px 36px">
          <p style="margin:0;font-family:Georgia,serif;font-size:20px;font-weight:700;color:#C9A84C">
            Heimatliebe <span style="color:rgba(255,255,255,0.75);font-weight:400">Institute</span>
          </p>
          <p style="margin:6px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.4)">
            Student Portal
          </p>
        </td></tr>
        <tr><td style="padding:36px 36px 28px">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C9A84C">
            Enrolment Confirmed
          </p>
          <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:26px;font-weight:700;color:#1B4332;line-height:1.2">
            Welcome to Heimatliebe, ${full_name}!
          </h1>
          <p style="margin:0 0 24px;font-size:15px;color:#4A6572;line-height:1.7">
            Your payment has been confirmed and your enrolment in <strong style="color:#1B4332">${course} (${level})</strong>
            is now active. Your Student ID has been issued below.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1B4332;margin:0 0 28px">
            <tr><td style="padding:24px;text-align:center">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.5)">
                Your Student ID
              </p>
              <p style="margin:0;font-family:'Courier New',monospace;font-size:28px;font-weight:700;color:#C9A84C;letter-spacing:3px">
                ${student_id}
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.45)">
                Keep this safe — you need it to log in
              </p>
            </td></tr>
          </table>
          <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1B4332;text-transform:uppercase;letter-spacing:1px">
            Next Steps
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;width:100%">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f0ede5;vertical-align:top">
                <span style="display:inline-block;width:22px;height:22px;background:#C9A84C;color:#1B4332;font-size:11px;font-weight:700;text-align:center;line-height:22px;margin-right:10px;flex-shrink:0">1</span>
                <span style="font-size:14px;color:#4A6572">Set your password using the link below</span>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f0ede5;vertical-align:top">
                <span style="display:inline-block;width:22px;height:22px;background:#C9A84C;color:#1B4332;font-size:11px;font-weight:700;text-align:center;line-height:22px;margin-right:10px">2</span>
                <span style="font-size:14px;color:#4A6572">Log in with your Student ID + new password</span>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;vertical-align:top">
                <span style="display:inline-block;width:22px;height:22px;background:#C9A84C;color:#1B4332;font-size:11px;font-weight:700;text-align:center;line-height:22px;margin-right:10px">3</span>
                <span style="font-size:14px;color:#4A6572">Access the full student library</span>
              </td>
            </tr>
          </table>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px">
            <tr>
              <td style="padding-right:12px">
                <a href="${resetUrl}?id=${encodeURIComponent(student_id)}&email=${encodeURIComponent('')}"
                   style="display:inline-block;background:#C9A84C;color:#1B4332;padding:12px 24px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none">
                  Set My Password
                </a>
              </td>
              <td>
                <a href="${loginUrl}"
                   style="display:inline-block;background:transparent;color:#2D6A4F;padding:12px 24px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;border:2px solid #52B788">
                  Go to Login
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:0;font-size:13px;color:#4A6572;line-height:1.7">
            Questions? Reply to this email or contact us on
            <a href="https://wa.me/265991383466" style="color:#2D6A4F;font-weight:600">WhatsApp +265 991 383 466</a>.
          </p>
        </td></tr>
        <tr><td style="background:#f7f5ef;padding:20px 36px;border-top:1px solid #ede9df">
          <p style="margin:0;font-size:12px;color:#9aacb4;text-align:center">
            Heimatliebe Institute · Karonga, Northern Malawi<br>
            <a href="${site_url}" style="color:#9aacb4">${site_url}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function resetEmailHtml({ student_id, reset_token, site_url }) {
  const resetUrl = `${site_url}/reset-password.html?token=${reset_token}&id=${encodeURIComponent(student_id)}`;
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Reset Password — Heimatliebe Institute</title></head>
<body style="margin:0;padding:0;background:#F7F5EF;font-family:'Inter',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5EF;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-top:4px solid #C9A84C">
        <tr><td style="background:#1B4332;padding:28px 36px">
          <p style="margin:0;font-family:Georgia,serif;font-size:20px;font-weight:700;color:#C9A84C">
            Heimatliebe <span style="color:rgba(255,255,255,0.75);font-weight:400">Institute</span>
          </p>
        </td></tr>
        <tr><td style="padding:36px">
          <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;color:#1B4332">Password Reset Request</h1>
          <p style="margin:0 0 12px;font-size:14px;color:#4A6572;line-height:1.7">
            We received a request to reset the password for Student ID
            <strong style="color:#1B4332;font-family:'Courier New',monospace">${student_id}</strong>.
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#4A6572;line-height:1.7">
            Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
          </p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#C9A84C;color:#1B4332;padding:13px 28px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;margin-bottom:24px">
            Reset My Password
          </a>
          <p style="margin:0;font-size:12px;color:#9aacb4;line-height:1.6">
            If you did not request this, ignore this email — your password will not change.<br>
            Link: ${resetUrl}
          </p>
        </td></tr>
        <tr><td style="background:#f7f5ef;padding:16px 36px;border-top:1px solid #ede9df">
          <p style="margin:0;font-size:12px;color:#9aacb4;text-align:center">
            Heimatliebe Institute · Karonga, Northern Malawi
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Reads and parses the JSON body from an incoming request.
 * @param {import('http').IncomingMessage} req - The request object.
 * @returns {Promise<object>} The parsed JSON body.
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

/**
 * Helper function to send a JSON response.
 */
function jsonRes(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

/**
 * A server-side helper to make authenticated requests to the Supabase REST API.
 */
async function supabaseFetch(path, options = {}) {
  const url = `${process.env.SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey':        process.env.SUPABASE_ANON,
      'Authorization': `Bearer ${process.env.SUPABASE_ANON}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

// ── Main Server Logic ──────────────────────────────────────────
const server = createServer(async (req, res) => {
  try {
    const urlObj  = new URL(req.url, `http://localhost`);
    const url     = decodeURIComponent(urlObj.pathname);
    const method  = req.method.toUpperCase();

    // ── CORS preflight ─────────────────────────────────────────
    if (method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
      res.end(); return;
    }

    // ── /api/send-approval-email ───────────────────────────────
    if (url === '/api/send-approval-email' && method === 'POST') {
      const body = await readBody(req);
      const { student_id, full_name, email, course, level } = body;

      if (!student_id || !email) {
        jsonRes(res, 400, { error: 'Missing student_id or email' }); return;
      }

      const site_url = process.env.SITE_URL || `https://${req.headers.host}`;

      try {
        const transport = getTransport();
        await transport.sendMail({
          from:    process.env.SMTP_FROM || `"Heimatliebe Institute" <${process.env.SMTP_USER}>`,
          to:      email,
          subject: `Your Student ID — Heimatliebe Institute`,
          html:    approvalEmailHtml({ full_name, student_id, course, level, site_url })
        });
        console.log(`[email] Approval sent to ${email} for ${student_id}`);
        jsonRes(res, 200, { ok: true });
      } catch (err) {
        console.error('[email] Approval send failed:', err.message);
        jsonRes(res, 500, { error: err.message });
      }
      return;
    }

    // ── /api/request-password-reset ───────────────────────────
    if (url === '/api/request-password-reset' && method === 'POST') {
      const body = await readBody(req);
      const { student_id, email } = body;

      if (!student_id || !email) {
        jsonRes(res, 400, { error: 'Missing student_id or email' }); return;
      }

      const { ok, data } = await supabaseFetch(
        `/rest/v1/students?student_id=eq.${encodeURIComponent(student_id.toUpperCase())}&email=eq.${encodeURIComponent(email.toLowerCase())}&select=id,student_id,full_name,email`,
        { method: 'GET', headers: { 'Prefer': '' } }
      );

      if (!ok || !Array.isArray(data) || data.length === 0) {
        jsonRes(res, 200, { ok: true, message: 'If that Student ID and email match, a reset link has been sent.' });
        return;
      }

      const student = data[0];

      // Generate reset token
      const token     = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2,'0')).join('');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await supabaseFetch('/rest/v1/password_reset_tokens', {
        method: 'POST',
        body: JSON.stringify({
          student_id: student.student_id,
          token,
          expires_at: expiresAt,
          used: false
        })
      });

      const site_url = process.env.SITE_URL || `https://${req.headers.host}`;

      try {
        const transport = getTransport();
        await transport.sendMail({
          from:    process.env.SMTP_FROM || `"Heimatliebe Institute" <${process.env.SMTP_USER}>`,
          to:      student.email,
          subject: 'Reset Your Password — Heimatliebe Institute',
          html:    resetEmailHtml({ student_id: student.student_id, reset_token: token, site_url })
        });
        console.log(`[email] Reset link sent to ${student.email}`);
      } catch (err) {
        console.error('[email] Reset send failed:', err.message);
      }

      jsonRes(res, 200, { ok: true, message: 'If that Student ID and email match, a reset link has been sent.' });
      return;
    }

    // ── /api/reset-password ────────────────────────────────────
    if (url === '/api/reset-password' && method === 'POST') {
      const body = await readBody(req);
      const { token, student_id, new_password } = body;

      if (!token || !student_id || !new_password) {
        jsonRes(res, 400, { error: 'Missing fields' }); return;
      }
      if (new_password.length < 8) {
        jsonRes(res, 400, { error: 'Password must be at least 8 characters' }); return;
      }

      const { ok, data } = await supabaseFetch(
        `/rest/v1/password_reset_tokens?token=eq.${encodeURIComponent(token)}&student_id=eq.${encodeURIComponent(student_id.toUpperCase())}&used=eq.false&select=*`,
        { method: 'GET', headers: { 'Prefer': '' } }
      );

      if (!ok || !Array.isArray(data) || data.length === 0) {
        jsonRes(res, 400, { error: 'Invalid or expired reset link.' }); return;
      }

      const tokenRow = data[0];
      if (new Date(tokenRow.expires_at) < new Date()) {
        jsonRes(res, 400, { error: 'This reset link has expired. Please request a new one.' }); return;
      }

      const { createHash } = await import('crypto');
      const pwHash = createHash('sha256').update(new_password + 'hmli_salt_2025').digest('hex');

      await supabaseFetch(
        `/rest/v1/students?student_id=eq.${encodeURIComponent(student_id.toUpperCase())}`,
        { method: 'PATCH', body: JSON.stringify({ password_hash: pwHash }) }
      );

      await supabaseFetch(
        `/rest/v1/password_reset_tokens?id=eq.${tokenRow.id}`,
        { method: 'PATCH', body: JSON.stringify({ used: true }) }
      );

      console.log(`[reset] Password updated for ${student_id}`);
      jsonRes(res, 200, { ok: true });
      return;
    }

    // ── /config.json ───────────────────────────────────────────
    // Serve AFTER API routes so it doesn't catch /api/* routes
    if (url === '/config.json') {
      let fileConfig = {};
      try {
        const raw = await fs.readFile(path.join(publicDir, 'config.json'), 'utf8');
        const trimmed = raw.trim();
        if (trimmed.startsWith('{')) {
          fileConfig = JSON.parse(trimmed);
        }
      } catch {}

      const config = {
        SUPABASE_URL:   process.env.SUPABASE_URL   || fileConfig.SUPABASE_URL   || '',
        SUPABASE_ANON:  process.env.SUPABASE_ANON  || fileConfig.SUPABASE_ANON  || '',
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD  || fileConfig.ADMIN_PASSWORD || ''
      };
      jsonRes(res, 200, config); return;
    }

    // ── /content-list ──────────────────────────────────────────
    if (url.startsWith('/content-list')) {
      const folder = urlObj.searchParams.get('folder') || '';
      if (!/^[a-zA-Z0-9_-]+$/.test(folder)) { jsonRes(res, 400, { error: 'Invalid folder' }); return; }
      const listDir = path.join(contentDir, folder);
      try {
        const entries = await fs.readdir(listDir, { withFileTypes: true });
        const files = entries.filter(e => e.isFile() && e.name.endsWith('.md')).map(e => e.name).sort();
        jsonRes(res, 200, files);
      } catch {
        jsonRes(res, 404, { error: 'Folder not found' });
      }
      return;
    }

    // ── Static File Serving ────────────────────────────────────
    let filePath = path.join(publicDir, url);
    let stat;
    try { stat = await fs.stat(filePath); } catch { stat = null; }
    if (!stat) {
      filePath = path.join(publicDir, 'index.html');
    } else if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const fileData = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(fileData);

  } catch (err) {
    console.error('[server]', err);
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
});

server.listen(port, () => console.log(`Heimatliebe server running on port ${port}`));
