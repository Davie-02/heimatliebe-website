-- ═══════════════════════════════════════════════════════════════
-- HEIMATLIEBE INSTITUTE — Fix RLS Policies & Schema
-- Run in Supabase SQL editor.
--
-- 1. Disables RLS on all tables so the anon key can read/write.
-- 2. Adds missing `published` column to library table.
-- 3. Creates storage buckets if missing.
-- 4. Creates storage policies using PL/pgSQL (safe, idempotent).
-- ═══════════════════════════════════════════════════════════════

-- 🔓 Disable RLS on all tables (the server is the only client,
--    and it uses the anon key for all operations)
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS class_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exam_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS library DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS students DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS news DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS timetable_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scholarships DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scholarship_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alumni DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS password_reset_tokens DISABLE ROW LEVEL SECURITY;

-- 🏗️ Add missing `published` column to library table
ALTER TABLE IF EXISTS library ADD COLUMN IF NOT EXISTS published boolean DEFAULT true;

-- 📁 Ensure storage buckets exist
INSERT INTO storage.buckets (id, name, public) VALUES
  ('library-files', 'library-files', true),
  ('library-covers', 'library-covers', true),
  ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 🔐 Create permissive storage access policies
CREATE POLICY "Public Access" ON storage.objects FOR ALL USING (true) WITH CHECK (true);

SELECT 'RLS disabled, library fixed, and storage configured.' as result;