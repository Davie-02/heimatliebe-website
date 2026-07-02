#!/usr/bin/env node
// Script: send_reminders.js
// Queries `payments` table for due reminders and calls notifications edge function.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON;
const NOTIFY_URL = process.env.NOTIFY_URL; // URL of deployed notifications function
const FN_SECRET = process.env.FUNCTION_SECRET;

// Do not exit on import; allow tests to inject a clientInstance.
let client;
if (SUPABASE_URL && SUPABASE_ANON) {
  client = createClient(SUPABASE_URL, SUPABASE_ANON);
} else {
  client = null;
}

async function sendReminders({ clientInstance = client, notifyUrl = NOTIFY_URL, fnSecret = FN_SECRET, fetchImpl = fetch } = {}) {
  if (!clientInstance) throw new Error('No Supabase client provided and SUPABASE not configured');
  const now = new Date().toISOString();
  const { data, error } = await clientInstance.from('payments').select('*').lte('reminder_date', now).eq('reminder_sent', false);
  if (error) throw error;
  for (const p of data) {
    const to = p.phone || p.email;
    const type = p.phone ? 'sms' : 'email';
    const body = `Dear student, your payment for ${p.description || p.item || 'fees'} is due. Amount: ${p.amount}`;
    try {
      const resp = await fetchImpl(notifyUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-fn-secret': fnSecret },
        body: JSON.stringify({ type, to, body, subject: 'Payment Reminder' })
      });
      if (!resp.ok) throw new Error('notify failed '+resp.status);
      await clientInstance.from('payments').update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() }).eq('id', p.id);
      console.log('Reminded', p.id);
    } catch (err) { console.error('Notify error', err); }
  }
  return data.length;
}

// run when executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  sendReminders().catch(err => { console.error('sendReminders error', err); process.exit(1); });
}

export { sendReminders };
