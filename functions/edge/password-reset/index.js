// Edge Function: password-reset
// This function accepts { email } and triggers Supabase admin reset for that user using service_role key.
// Deploy this as a server-side function and set SUPABASE_SERVICE_ROLE in env.
// Uses ES module syntax to match the project.

import { createClient } from '@supabase/supabase-js';

export default async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    const body = await getRequestBody(req);
    const email = body && body.email;
    if (!email) return res.status(400).json({ error: 'email required' });

    // verify shared secret to prevent public abuse
    const FN_SECRET = process.env.FUNCTION_SECRET;
    const provided = req.headers['x-fn-secret'] || req.headers['x-function-secret'];
    if (!FN_SECRET || !provided || provided !== FN_SECRET) return res.status(403).json({ error: 'Forbidden' });

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return res.status(500).json({ error: 'Missing Supabase service role env' });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false }
    });

    // Use admin API to send reset password email
    const { data, error } = await admin.auth.api.resetPasswordForEmail(email, { redirectTo: process.env.PASSWORD_RESET_REDIRECT || '' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
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
