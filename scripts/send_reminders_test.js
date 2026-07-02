// Lightweight test for send_reminders.js using mocked client and fetch
import { sendReminders } from './send_reminders.js';

async function mock() {
  // mock payments data
  const payments = [ { id: 1, phone: null, email: 'student@example.com', description: 'Course fee', amount: '50', reminder_date: '2000-01-01', reminder_sent: false } ];
  const clientMock = {
    from: () => ({
      select: () => ({ lte: () => ({ eq: async () => ({ data: payments, error: null }) }) }),
      update: () => ({ eq: async () => ({ data: [], error: null }) })
    })
  };

  let notified = [];
  const fetchMock = async (url, opts) => { notified.push({ url, body: JSON.parse(opts.body) }); return { ok: true }; };

  const count = await sendReminders({ clientInstance: clientMock, notifyUrl: 'https://example.com/notify', fnSecret: 'secret', fetchImpl: fetchMock });
  console.log('Test notified count:', count, 'notified:', notified.length);
}

mock().catch(err=>{ console.error(err); process.exit(1); });
