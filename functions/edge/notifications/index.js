// Edge Function: notifications
// Supports sending email/SMS notifications using providers configured via env vars.
// Example payload: { type: 'email'|'sms', to: 'recipient', subject, body }

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    // verify shared secret header
    const FN_SECRET = process.env.FUNCTION_SECRET;
    const provided = req.headers['x-fn-secret'] || req.headers['x-function-secret'];
    if (!FN_SECRET || !provided || provided !== FN_SECRET) return res.status(403).json({ error: 'Forbidden' });
    const payload = await getRequestBody(req);
    if (!payload || !payload.type) return res.status(400).json({ error: 'type required' });

    if (payload.type === 'email') {
      // Use SendGrid if SENDGRID_API_KEY set
      const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
      if (!SENDGRID_API_KEY) return res.status(500).json({ error: 'SendGrid not configured' });
      const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: payload.to }] }],
          from: { email: process.env.EMAIL_FROM || 'no-reply@example.com' },
          subject: payload.subject || '',
          content: [{ type: 'text/html', value: payload.html || payload.body || '' }]
        })
      });
      if (!resp.ok) return res.status(500).json({ error: 'SendGrid error', status: resp.status });
      return res.status(200).json({ ok: true });
    }

    if (payload.type === 'sms') {
      // Example: Twilio
      const TWILIO_SID = process.env.TWILIO_SID;
      const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
      const TWILIO_FROM = process.env.TWILIO_FROM;
      if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return res.status(500).json({ error: 'Twilio not configured' });
      const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
      const params = new URLSearchParams();
      params.append('From', TWILIO_FROM);
      params.append('To', payload.to);
      params.append('Body', payload.body || payload.text || '');
      const resp = await fetch(url, { method: 'POST', headers: { 'Authorization': 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64') }, body: params });
      if (!resp.ok) return res.status(500).json({ error: 'Twilio error', status: resp.status });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'unknown type' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}
