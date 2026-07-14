-- ═══════════════════════════════════════════════════════════════
-- HEIMATLIEBE INSTITUTE — Comprehensive Role-Based RLS Policies
-- Run in Supabase SQL editor.
--
-- This script replaces all previous RLS policies with a granular,
-- role-based security model. It assumes the server uses a
-- service_role key and can impersonate users.
-- ═══════════════════════════════════════════════════════════════

-- Helper function to get user role from JWT
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb->>'role';
$$ LANGUAGE sql STABLE;

-- -------------------------------------------------------------
-- Table: users
-- -------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access for admins" ON public.users;
DROP POLICY IF EXISTS "Allow users to view their own data" ON public.users;
DROP POLICY IF EXISTS "Allow users to update their own data" ON public.users;

CREATE POLICY "Allow full access for admins" ON public.users
  FOR ALL USING (public.get_user_role() IN ('admin', 'superadmin', 'hr'));

CREATE POLICY "Allow users to view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- -------------------------------------------------------------
-- Table: assignments, submissions, exams, exam_results
-- Students can see assignments for their class and their own submissions/results.
-- Teachers can manage assignments/exams for their classes and see all related submissions.
-- -------------------------------------------------------------
-- Get classes for a given user (student or teacher)
CREATE OR REPLACE FUNCTION get_user_classes(user_id uuid)
RETURNS TABLE(id int) AS $$
  SELECT class_id FROM public.class_enrollments WHERE class_enrollments.user_id = user_id
  UNION
  SELECT id FROM public.classes WHERE classes.teacher_id = user_id;
$$ LANGUAGE sql STABLE;

-- Assignments
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access for admins" ON public.assignments;
DROP POLICY IF EXISTS "Allow teachers to manage assignments" ON public.assignments;
DROP POLICY IF EXISTS "Allow students to view assignments" ON public.assignments;

CREATE POLICY "Allow full access for admins" ON public.assignments
  FOR ALL USING (public.get_user_role() IN ('admin', 'superadmin'));
CREATE POLICY "Allow teachers to manage assignments" ON public.assignments
  FOR ALL USING (class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid()))
  WITH CHECK (public.get_user_role() = 'teacher');
CREATE POLICY "Allow students to view assignments" ON public.assignments
  FOR SELECT USING (class_id IN (SELECT id FROM get_user_classes(auth.uid())));

-- Submissions
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access for admins" ON public.submissions;
DROP POLICY IF EXISTS "Allow students to manage their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Allow teachers to view/grade submissions for their classes" ON public.submissions;

CREATE POLICY "Allow full access for admins" ON public.submissions
  FOR ALL USING (public.get_user_role() IN ('admin', 'superadmin'));
CREATE POLICY "Allow students to manage their own submissions" ON public.submissions
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Allow teachers to view/grade submissions for their classes" ON public.submissions
  FOR ALL USING (assignment_id IN (SELECT id FROM public.assignments WHERE class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid())))
  WITH CHECK (public.get_user_role() = 'teacher');

-- -------------------------------------------------------------
-- Table: library
-- All authenticated users can read. Only admins can write.
-- -------------------------------------------------------------
ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.library;
DROP POLICY IF EXISTS "Allow admins to manage library" ON public.library;

CREATE POLICY "Allow read access to all authenticated users" ON public.library
  FOR SELECT USING (auth.role() = 'authenticated' AND published = true);
CREATE POLICY "Allow admins to manage library" ON public.library
  FOR ALL USING (public.get_user_role() IN ('admin', 'superadmin'));

-- -------------------------------------------------------------
-- Table: notifications
-- Users can only see their own notifications.
-- -------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notifications;

CREATE POLICY "Users can manage their own notifications" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- -------------------------------------------------------------
-- Generic Policies for other tables (Courses, Classes, etc.)
-- Read for all authenticated, write for admins/teachers.
-- -------------------------------------------------------------
DO $$
DECLARE
  t_name TEXT;
  tables TEXT[] := ARRAY['courses', 'classes', 'class_enrollments', 'exams', 'exam_results', 'payments', 'invoices', 'fees', 'timetable_entries', 'attendance', 'news', 'scholarships', 'alumni'];
BEGIN
  FOREACH t_name IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
    EXECUTE format('DROP POLICY IF EXISTS "Allow admins full access" ON public.%I;', t_name);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated read access" ON public.%I;', t_name);

    EXECUTE format('CREATE POLICY "Allow admins full access" ON public.%I FOR ALL USING (public.get_user_role() IN (''admin'', ''superadmin'', ''accounts'', ''hr''));', t_name);
    EXECUTE format('CREATE POLICY "Allow authenticated read access" ON public.%I FOR SELECT USING (auth.role() = ''authenticated'');', t_name);
  END LOOP;
END;
$$;

SELECT 'Comprehensive role-based RLS policies applied successfully.' as result;