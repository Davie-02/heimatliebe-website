-- ═══════════════════════════════════════════════════════════════
-- Heimatliebe Institute — Create First Admin User
-- Run this in Supabase SQL Editor AFTER running 001_full_lms_schema.sql
--
-- Password hashing: SHA-256("password" + "hmli_salt_2025") → hex
-- Matches hashPassword() in supabase.js and js/auth.js
--
-- Two methods provided. Method 1 uses pgcrypto (recommended).
-- If pgcrypto is not available, use Method 2 with a pre-computed hash.
-- ═══════════════════════════════════════════════════════════════

-- ═══════ METHOD 1: Using pgcrypto (recommended — enabled by default on Supabase) ═══════
-- CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions; -- (usually already enabled)

INSERT INTO users (user_id, full_name, email, password_hash, role, status)
VALUES (
  'ADMIN-001',
  'Administrator',
  'admin@heimatliebe.mw',
  ENCODE(DIGEST('admin123hmli_salt_2025', 'sha256'), 'hex'),
  'superadmin',
  'active'
);

-- Test student (password: admin123)
INSERT INTO users (user_id, full_name, email, password_hash, role, course, level, status)
VALUES (
  'HMLI-2026-1000',
  'Test Student',
  'student@heimatliebe.mw',
  ENCODE(DIGEST('admin123hmli_salt_2025', 'sha256'), 'hex'),
  'student', 'German', 'A1', 'active'
);

INSERT INTO students (student_id, full_name, email, course, level, password_hash, status)
VALUES (
  'HMLI-2026-1000',
  'Test Student',
  'student@heimatliebe.mw',
  'German', 'A1',
  ENCODE(DIGEST('admin123hmli_salt_2025', 'sha256'), 'hex'),
  'active'
);

SELECT '✅ Admin and test student created! Both passwords: admin123' AS result;
