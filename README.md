# Heimatliebe Institute — Website Setup Guide

## What's in this folder

```
heimatliebe-cms/
├── index.html              ← Your public website
├── admin/
│   ├── index.html          ← The CMS admin panel (your-site/admin)
│   └── config.yml          ← Defines all content types
├── content/
│   ├── news/               ← News & announcements go here (managed by CMS)
│   ├── courses/            ← Course listings
│   ├── gallery/            ← Photo albums
│   ├── documents/          ← PDFs and brochures
│   └── testimonials/       ← Student testimonials
└── uploads/
    ├── images/             ← Images uploaded via CMS
    └── documents/          ← PDFs uploaded via CMS
```

---

## Step-by-step: Go live (Railway + Supabase)

This repo hosts a static frontend (HTML/JS) and uses Supabase for the database/storage. The instructions below focus on deploying the frontend to Railway (or any static host) and keeping Supabase as the backend.

### Step 1 — Create a GitHub repo
1. Create a new public repository (e.g. `heimatliebe-website`) and push this folder.

### Step 2 — Deploy the frontend to Railway (or another host)
1. Sign in to Railway (https://railway.app) and create a new project.
2. Choose **Deploy from GitHub** and connect your `heimatliebe-website` repo.
3. Railway will deploy the static site. Note the generated URL (or set your custom domain later).

Note: This site is plain HTML/CSS/JS and requires no build step. Any static host (Netlify, Vercel, GitHub Pages, Railway, Docker) will work.

### Step 2.1 — Runtime configuration
Create a `config.json` file in the project root (do NOT commit it). Use `config.example.json` as a template. Example:

```json
{
    "SUPABASE_URL": "https://your-project.supabase.co",
    "SUPABASE_ANON": "your-anon-key",
    "ADMIN_PASSWORD": "change-me"
}
```

On Railway you can inject these values at deploy-time by creating a small deploy script that writes `config.json` from environment variables. Example `write-config.sh`:

```bash
cat > config.json <<EOF
{
    "SUPABASE_URL": "${SUPABASE_URL}",
    "SUPABASE_ANON": "${SUPABASE_ANON}",
    "ADMIN_PASSWORD": "${ADMIN_PASSWORD}"
}
EOF
```

Add this script as a Railway build step so `config.json` exists when the static server serves files.

### Step 3 — Configure Supabase (database + storage)
1. Create a Supabase project at https://supabase.com and enable Auth and Storage.
2. Create the necessary tables and RLS policies for your application (students, courses, news, gallery, documents, etc.).
3. Grab the `SUPABASE_URL` and `SUPABASE_ANON` (anon) key from the project settings.
4. For production, use Supabase Edge Functions or server-side secrets for any privileged actions; do not expose service_role keys in frontend code.
5. Create an admin user in Supabase Auth for the CMS admin area (email + password). Use the Supabase dashboard or psql to add a user.

### Step 4 — Built-in low-cost CMS (Supabase)
This project includes a lightweight Supabase-backed admin UI at `/admin/ui.html` that supports creating and editing `news` and `courses`. It is intentionally minimal so you can extend it for LMS features (courses, enrolments, students, lessons).

To use it:
1. Ensure `config.json` contains `SUPABASE_URL` and `SUPABASE_ANON` and deploy it or inject `window.__APP_CONFIG__` at runtime.
2. Create the following tables in your Supabase Postgres with appropriate columns (examples):

News table (`news`):
- id (serial, primary key)
- title (text)
- date (timestamp)
- category (text)
- summary (text)
- body (text)
- image (text)

Courses table (`courses`):
- id (serial)
- title (text)
- language (text)
- level (text)
- schedule (text)
- duration (text)
- fee (text)
- body (text)

3. Open `/admin/` to sign in with the admin user you created; after sign-in you'll be redirected to `/admin/ui.html`.

This approach keeps costs low (Supabase free tier) and gives you a direct path to expand the admin into a full LMS using Supabase tables and Edge Functions. If later you want a richer editor experience, we can add more features or migrate to Strapi.

### Database migrations & content import
1. Run the SQL in `db/migrations/001_create_lms_tables.sql` in your Supabase SQL editor to create the required tables.
2. (Optional) To import existing Markdown and resource files into Supabase, create a local `.env` or export environment variables and run:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON="your-anon-key"
npm install
npm run import:content
```

This script (`scripts/import_markdown_to_supabase.js`) will insert `news` and upload `library` files into the `library` bucket (create the bucket first in Supabase Storage).

### Storage buckets
Create a Supabase Storage bucket named `library` (public) to hold uploaded resources. The admin UI uses this bucket to store any file type and stores metadata in the `library` table.

### Step 4 — Update configuration
1. Open `admin/config.yml` and set `site_url:` to your deployed site URL.
2. If you want runtime configuration, replace the hardcoded values in `supabase.js` with environment variables or a small server-side proxy.

### Admin panel and auth
The previous Netlify Identity integration has been removed. For a CMS/admin workflow you can:
- Integrate Supabase Auth + a lightweight admin UI (custom or community projects).
- Or continue using a Git-backed CMS but configure auth to your chosen provider.

### How to manage content day-to-day
- Edit files in the `content/` folder for static content (Markdown). The site loads these files at runtime.
- Use Supabase storage for uploads and the database for structured content if you migrate the CMS to Supabase.

---

## Need help / references
- Railway docs: https://docs.railway.app
- Supabase docs: https://supabase.com/docs
- Decap (Netlify) CMS: https://www.netlifycms.org/docs/intro/ — only if you continue using a Git-backed CMS

---

## Production runtime config
For commercial production, the app should not rely on a local `config.json` file checked into source control.

- `server.js` now serves `/config.json` dynamically from environment variables.
- Set the following environment variables in your deployment platform (Railway, Vercel, etc.):
  - `SUPABASE_URL`
  - `SUPABASE_ANON`
  - `ADMIN_PASSWORD`
- Do not commit `config.json` to git. It is intentionally ignored by `.gitignore`.

In production, this keeps runtime config out of source control while allowing the frontend and admin panel to initialize safely.

---

## Railway deployment

For Railway, set these environment variables on your service:

- `SUPABASE_URL` — your Supabase project URL, e.g. `https://xyzcompany.supabase.co`
- `SUPABASE_ANON` — your Supabase anonymous key
- `ADMIN_PASSWORD` — the admin password used by local admin pages and student-facing admin flows

If you are also deploying the Edge Functions from this repo, set these additional vars on Railway or the appropriate function environment:

- `FUNCTION_SECRET` — shared secret value for `x-fn-secret`
- `SUPABASE_SERVICE_ROLE` — Supabase service role key for password reset or admin operations
- `GMAIL_USER` / `GMAIL_PASS` — Gmail SMTP credentials if using Gmail notifications
- `EMAIL_FROM` — sender address for email notifications
- `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM` — if using Twilio SMS notifications

To verify the deployment, run:

```bash
curl https://hmli.up.railway.app/config.json
```

You should see a JSON object with non-empty `SUPABASE_URL`, `SUPABASE_ANON`, and `ADMIN_PASSWORD` values. If they are blank, the Railway environment variables are not configured correctly.

---

## Edge Functions & Notifications

Two Edge Functions are included in `functions/edge/`:

- `password-reset/index.js` — triggers Supabase password reset using the service_role key. Set `SUPABASE_SERVICE_ROLE` and `SUPABASE_URL` in the function environment.
- `notifications/index.js` — sends email via Gmail SMTP or SendGrid, and SMS via Twilio. Configure `GMAIL_USER`, `GMAIL_PASS`, `EMAIL_FROM`, or `SENDGRID_API_KEY`, plus `TWILIO_*` env vars if using SMS.

Security: both functions require a shared secret header `x-fn-secret` (value set via `FUNCTION_SECRET` env) to prevent public abuse.

### Supabase Edge Functions (recommended)

1. From your Supabase project dashboard, enable Edge Functions and deploy the functions (convert to TypeScript if desired).
2. Set environment variables in Supabase: `SUPABASE_SERVICE_ROLE`, `SUPABASE_URL`, `FUNCTION_SECRET`, `SENDGRID_API_KEY`, `TWILIO_*`, `EMAIL_FROM`.
3. Use the function URL for `NOTIFY_URL` when configuring `scripts/send_reminders.js` or cron jobs.

### Railway / Vercel

1. Create a service on Railway or Vercel and add the function files as simple Node endpoints (or as serverless functions). Ensure you set the same env vars as above.
2. Protect endpoints by requiring `x-fn-secret` header with the same `FUNCTION_SECRET`.

### Scheduling reminders

Use `scripts/send_reminders.js` to run a scheduled job that calls the notifications function for due payments. Example cron on a server:

```bash
# Run every hour via system cron or a scheduler
cd /path/to/repo && FUNCTION_SECRET=xxx SUPABASE_URL=https://... SUPABASE_ANON=anonkey NOTIFY_URL=https://... node scripts/send_reminders.js
```

