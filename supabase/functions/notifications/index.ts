// Supabase Edge Function (TypeScript) for notifications (Gmail SMTP / SendGrid / Twilio)
// Deploy with `supabase functions deploy notifications`

import { SmtpClient } from 'https://deno.land/x/smtp/mod.ts';

export async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const provided = req.headers.get('x-fn-secret') || req.headers.get('x-function-secret') || '';
    const FN_SECRET = Deno.env.get('FUNCTION_SECRET') || '';
    if (!FN_SECRET || provided !== FN_SECRET) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

    const payload = await req.json().catch(() => ({}));
    if (!payload || !payload.type) return new Response(JSON.stringify({ error: 'type required' }), { status: 400 });

    if (payload.type === 'email') {
      const emailFrom = Deno.env.get('EMAIL_FROM') || Deno.env.get('GMAIL_USER') || 'no-reply@example.com';
      const gmailUser = Deno.env.get('GMAIL_USER') || '';
      const gmailPass = Deno.env.get('GMAIL_PASS') || '';

      if (gmailUser && gmailPass) {
        const client = new SmtpClient();
        await client.connect({
          hostname: 'smtp.gmail.com',
          port: 587,
          username: gmailUser,
          password: gmailPass,
          tls: true
        });

        await client.send({
          from: emailFrom,
          to: payload.to,
          subject: payload.subject || '',
          content: payload.html || payload.body || ''
        });
        await client.close();

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
      if (!SENDGRID_API_KEY) return new Response(JSON.stringify({ error: 'Email provider not configured' }), { status: 500 });

      const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: payload.to }] }],
          from: { email: emailFrom },
          subject: payload.subject || '',
          content: [{ type: 'text/html', value: payload.html || payload.body || '' }]
        })
      });
      const text = await resp.text();
      return new Response(text, { status: resp.status, headers: { 'content-type': resp.headers.get('content-type') || 'text/plain' } });
    }

    if (payload.type === 'sms') {
      const TWILIO_SID = Deno.env.get('TWILIO_SID') || '';
      const TWILIO_TOKEN = Deno.env.get('TWILIO_TOKEN') || '';
      const TWILIO_FROM = Deno.env.get('TWILIO_FROM') || '';
      if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return new Response(JSON.stringify({ error: 'Twilio not configured' }), { status: 500 });

      const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
      const params = new URLSearchParams();
      params.append('From', TWILIO_FROM);
      params.append('To', payload.to);
      params.append('Body', payload.body || payload.text || '');

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const text = await resp.text();
      return new Response(text, { status: resp.status, headers: { 'content-type': resp.headers.get('content-type') || 'text/plain' } });
    }

    return new Response(JSON.stringify({ error: 'unknown type' }), { status: 400 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export default handler;
