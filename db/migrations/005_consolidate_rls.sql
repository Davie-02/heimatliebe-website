-- ═══════════════════════════════════════════════════════════════
-- HEIMATLIEBE INSTITUTE — Consolidate RLS Policies for CMS
-- Run in Supabase SQL editor.
--
-- This script ensures the server (using the 'anon' key) has full
-- access to all tables required by the CMS. It makes all previous
-- RLS-related migrations redundant.
--
-- 1. Enables RLS on all tables.
-- 2. Drops any conflicting old policies.
-- 3. Creates a single, permissive policy on each table for the server.
-- 4. Ensures the `library.published` column exists.
-- ═══════════════════════════════════════════════════════════════

-- List of all tables managed by the CMS
DO $$
DECLARE
  t_name TEXT;
  tables TEXT[] := ARRAY[
    'users', 'courses', 'classes', 'class_enrollments', 'assignments',
    'submissions', 'exams', 'exam_results', 'library', 'applications',
    'students', 'news', 'payments', 'fees', 'invoices', 'timetable_entries',
    'attendance', 'notifications', 'conversations', 'conversation_participants',
    'messages', 'scholarships', 'scholarship_applications', 'alumni',
    'password_reset_tokens'
  ];
BEGIN
  FOREACH t_name IN ARRAY tables
  LOOP
    -- Enable RLS on the table
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);

    -- Drop old policies to prevent conflicts
    EXECUTE format('DROP POLICY IF EXISTS "Allow full access for server" ON public.%I;', t_name);
    EXECUTE format('DROP POLICY IF EXISTS "Allow full access for server (anon)" ON public.%I;', t_name);
    EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON public.%I;', t_name);

    -- Create the new permissive policy for the server (anon role)
    EXECUTE format('
      CREATE POLICY "Allow full access for server (anon)"
      ON public.%I
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
    ', t_name);

    RAISE NOTICE 'RLS policy applied to table: %', t_name;
  END LOOP;
END;
$$;

-- Also ensure storage policies are permissive for the server.
-- This needs to be in its own DO block to use RAISE NOTICE.
DO $$
BEGIN
  -- Drop the policy if it exists to ensure the script is re-runnable
  DROP POLICY IF EXISTS "Public Access" ON storage.objects;

  -- Create a fully permissive policy for the server
  CREATE POLICY "Public Access" ON storage.objects
    FOR ALL
    USING (true)
    WITH CHECK (true);

  RAISE NOTICE 'Storage policies updated.';
END;
$$;

-- Ensure library.published column exists (from 003_fix_rls_and_library.sql)
ALTER TABLE IF EXISTS public.library ADD COLUMN IF NOT EXISTS published boolean DEFAULT true;

SELECT 'CMS RLS policies consolidated and applied successfully.' as result;