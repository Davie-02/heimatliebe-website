#!/usr/bin/env bash
# Deployment helper for Supabase + Edge Functions + reminders
# Edit this file to fill in secrets where indicated before running.

set -euo pipefail

# ---------------------------
# Configuration (edit as needed)
# ---------------------------
export SUPABASE_URL="https://mcdcwrwzmifmouutpubn.supabase.co"
export SUPABASE_ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZGN3cnd6bWlmbW91dXRwdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDY1MjUsImV4cCI6MjA5Nzk4MjUyNX0.Xv_CrVMigI0nibRVa03NvPWgJQ9vVoJ1_T1xiRJWqTs"
PROJECT_REF="mcdcwrwzmifmouutpubn"

# Admin password used only for the local runtime config example
export ADMIN_PASSWORD="change-me"

# ---------------------------
# 1) Write runtime config.json for frontend (not checked into git)
# ---------------------------
echo "Writing config.json (used by frontend at runtime)"
./write-config.sh

# ---------------------------
# 2) Supabase CLI: login & link project
# ---------------------------
echo "Ensure Supabase CLI is installed and you are logged in: npm install -g supabase"
echo "If not logged in yet, run: supabase login"
supabase link --project-ref "$PROJECT_REF"

# ---------------------------
# 3) Set secrets (DO NOT paste service_role or provider keys into public places)
# ---------------------------

# Generate a random FUNCTION_SECRET.
# Keep this secret safe and use the printed command below to set it.
FUNCTION_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '+/=' | cut -c1-40)
export FUNCTION_SECRET

echo "Generated FUNCTION_SECRET: $FUNCTION_SECRET"
echo "Now run the following command after replacing the placeholder keys (service role, Gmail/SendGrid/Twilio if used):"
echo ""
echo "supabase secrets set \
  FUNCTION_SECRET=\"$FUNCTION_SECRET\" \
  SUPABASE_SERVICE_ROLE=\"<your-service-role-key>\" \
  GMAIL_USER=\"heimatliebemw@gmail.com\" \
  GMAIL_PASS=\"<your-gmail-app-password>\" \
  EMAIL_FROM=\"heimatliebemw@gmail.com\" \
  --project-ref \"$PROJECT_REF\""

echo ""
echo "If you want to use SendGrid instead, replace the GMAIL_* vars with SENDGRID_API_KEY and keep EMAIL_FROM set." 
echo "If you are not using Twilio, remove any TWILIO_* lines from the command before running it."

# ---------------------------
# 4) Deploy Edge Functions
# ---------------------------
echo "Deploying Edge Functions (password-reset, notifications)"
supabase functions deploy password-reset --project-ref "$PROJECT_REF"
supabase functions deploy notifications --project-ref "$PROJECT_REF"

echo "Deployed functions. Get their URLs from the Supabase dashboard or via CLI:"
echo "supabase functions list --project-ref $PROJECT_REF"

# ---------------------------
# 5) Create Storage bucket 'library' (recommended via Console)
# ---------------------------
echo "Create a storage bucket named 'library' in Supabase Storage (Console → Storage)."
echo "Optionally create via CLI (if supported): supabase storage create library --public --project-ref $PROJECT_REF"

# ---------------------------
# 6) Run DB migrations (manually in SQL Editor)
# ---------------------------
echo "Run the SQL migration files in Supabase SQL Editor (copy/paste):"
echo "  - db/migrations/001_create_lms_tables.sql"
echo "  - db/migrations/002_rls_policies.sql"
echo "  - db/migrations/003_rls_harden.sql"

# ---------------------------
# 7) Import existing content (optional)
# ---------------------------
echo "Install dependencies and run content import (uploads files to Storage and inserts library rows):"
echo "  npm install"
echo "  npm run import:content"

# ---------------------------
# 8) Reminder worker test (local)
# ---------------------------
echo "Example: run reminder script locally to call notifications function (requires FUNCTION_SECRET and NOTIFY_URL env)"
echo "  export FUNCTION_SECRET=your_secret"
echo "  export NOTIFY_URL=https://<your-notifications-function-url>"
echo "  node scripts/send_reminders.js"

# ---------------------------
# 9) Cron / Scheduler example
# ---------------------------
echo "Cron example (run hourly):"
echo "0 * * * * cd /path/to/repo && FUNCTION_SECRET=xxx SUPABASE_URL=$SUPABASE_URL SUPABASE_ANON=$SUPABASE_ANON NOTIFY_URL=https://... node send_reminders.js >> /var/log/reminders.log 2>&1"

echo "Deploy helper finished. Review the script and set secrets before running secret-setting commands."
