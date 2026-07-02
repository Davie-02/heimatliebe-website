#!/usr/bin/env bash
# Write runtime config.json from environment variables
cat > config.json <<EOF
{
  "SUPABASE_URL": "${SUPABASE_URL}",
  "SUPABASE_ANON": "${SUPABASE_ANON}",
  "ADMIN_PASSWORD": "${ADMIN_PASSWORD}"
}
EOF
