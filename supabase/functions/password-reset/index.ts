// Supabase Edge Function (TypeScript)
// Deploy with `supabase functions deploy password-reset`

export async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const provided = req.headers.get('x-fn-secret') || req.headers.get('x-function-secret') || '';
    const FN_SECRET = Deno.env.get('FUNCTION_SECRET') || '';
    if (!FN_SECRET || provided !== FN_SECRET) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

    const body = await req.json().catch(() => ({}));
    const email = body.email;
    const redirectTo = body.redirectTo || Deno.env.get('PASSWORD_RESET_REDIRECT') || '';
    if (!email) return new Response(JSON.stringify({ error: 'email required' }), { status: 400 });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON') || '';
    if (!SUPABASE_URL || !SUPABASE_ANON) return new Response(JSON.stringify({ error: 'Missing env' }), { status: 500 });

    const resp = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`
      },
      body: JSON.stringify({ email, redirect_to: redirectTo })
    });

    const text = await resp.text();
    return new Response(text, { status: resp.status, headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// For supabase CLI compatibility
export default handler;
