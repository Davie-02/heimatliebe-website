-- ═══════════════════════════════════════════════════════════════
-- HEIMATLIEBE INSTITUTE — Fix User ID Foreign Key Data Types
-- Run in Supabase SQL editor.
--
-- This script fixes the "operator does not exist: uuid = bigint"
-- error by ensuring all columns that reference a user's ID are
-- of type UUID, matching the `users.id` primary key.
--
-- It alters the `user_id` column in several tables.
-- ═══════════════════════════════════════════════════════════════

-- Drop dependent views/functions if they exist, to allow column type change
DROP FUNCTION IF EXISTS public.get_user_classes(user_id uuid);

-- Alter `class_enrollments` table
ALTER TABLE public.class_enrollments
  DROP CONSTRAINT IF EXISTS class_enrollments_user_id_fkey,
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid,
  ADD CONSTRAINT class_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Alter `submissions` table
ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_user_id_fkey,
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid,
  ADD CONSTRAINT submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Alter `notifications` table
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid,
  ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Recreate the function with the correct signature
CREATE OR REPLACE FUNCTION public.get_user_classes(p_user_id uuid)
RETURNS TABLE(id int) AS $$
  SELECT class_id FROM public.class_enrollments WHERE class_enrollments.user_id = p_user_id
  UNION
  SELECT c.id FROM public.classes c WHERE c.teacher_id = p_user_id;
$$ LANGUAGE sql STABLE;

SELECT 'User ID foreign key types fixed successfully.' as result;