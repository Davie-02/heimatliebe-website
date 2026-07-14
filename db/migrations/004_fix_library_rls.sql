-- ═══════════════════════════════════════════════════════════════
-- HEIMATLIEBE INSTITUTE — Fix Library RLS Policy
-- Run in Supabase SQL editor.
--
-- This script fixes the "violates row-level security policy" error
-- when adding books to the library from the admin panel.
--
-- 1. Enables RLS on the `library` table.
-- 2. Creates a permissive policy named "Allow full access for server"
--    that allows all operations for the `anon` role, which the
--    Node.js server uses.
-- ═══════════════════════════════════════════════════════════════

-- 1. Enable RLS on the library table
ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;

-- 2. Create a policy to allow all operations for the server (using anon key)
CREATE POLICY "Allow full access for server" ON public.library FOR ALL TO anon USING (true) WITH CHECK (true);

SELECT 'Library RLS policy fixed successfully.' as result;