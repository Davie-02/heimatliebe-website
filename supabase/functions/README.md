# Supabase Edge Functions — deploy & secrets

Install the Supabase CLI:

```bash
npm install -g supabase
```

Login and link to your project:

```bash
supabase login
supabase link --project-ref your-project-ref
```

Set required secrets (example):

```bash
supabase secrets set FUNCTION_SECRET="your-secret" SUPABASE_SERVICE_ROLE="<service_role_key>" SENDGRID_API_KEY="<key>" TWILIO_SID="..." TWILIO_TOKEN="..." TWILIO_FROM="+1234" EMAIL_FROM="no-reply@yourdomain.com"
```

Deploy functions:

```bash
supabase functions deploy password-reset --project-ref your-project-ref
supabase functions deploy notifications --project-ref your-project-ref
```

Notes:
- The functions use `FUNCTION_SECRET` — the client-side callers must set `x-fn-secret` header.
- The `password-reset` function uses the public recover endpoint (`SUPABASE_ANON`) to trigger reset emails. For admin-only flows you can instead use `SUPABASE_SERVICE_ROLE` (set as secret) and call admin endpoints.
