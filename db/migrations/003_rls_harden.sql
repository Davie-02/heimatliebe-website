-- Hardened RLS policies using `profiles` for role checks.
-- Run this after creating `profiles` and other tables.

-- Helper function: check if current auth user has a profile role
-- (This uses a correlated subquery against profiles)

-- Profiles: allow owner access and admins
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_owner_or_admin ON profiles
  FOR ALL USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('admin','superadmin'))
  ) WITH CHECK (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('admin','superadmin'))
  );

-- News: public read, only staff/admin/superadmin can insert/update/delete
ALTER TABLE IF EXISTS news ENABLE ROW LEVEL SECURITY;
CREATE POLICY news_public_select ON news FOR SELECT USING (true);
CREATE POLICY news_manage_by_staff ON news FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin','superadmin'))
);

-- Courses: public read, admin can manage
ALTER TABLE IF EXISTS courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY courses_public_select ON courses FOR SELECT USING (true);
CREATE POLICY courses_manage_by_admin ON courses FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

-- Assignments: staff/admin create & manage; students can select assignments
ALTER TABLE IF EXISTS assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY assignments_select ON assignments FOR SELECT USING (true);
CREATE POLICY assignments_manage_by_staff ON assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin','superadmin'))
);

-- Submissions: students may insert their own submissions; staff/admin may view
ALTER TABLE IF EXISTS submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY submissions_insert_own ON submissions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY submissions_select ON submissions FOR SELECT USING (
  auth.uid() = student_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin','superadmin'))
);
CREATE POLICY submissions_update_by_staff ON submissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin','superadmin'))
);

-- Library: public read, authenticated users can insert, staff/admin manage
ALTER TABLE IF EXISTS library ENABLE ROW LEVEL SECURITY;
CREATE POLICY library_select ON library FOR SELECT USING (true);
CREATE POLICY library_insert_auth ON library FOR INSERT USING (auth.role() = 'authenticated');
CREATE POLICY library_manage_by_admin ON library FOR UPDATE, DELETE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin','staff'))
);

-- Payments: students insert their own payments; staff/admin can manage
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_insert_own ON payments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY payments_select ON payments FOR SELECT USING (
  auth.uid() = student_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin','superadmin'))
);
CREATE POLICY payments_manage_by_admin ON payments FOR UPDATE, DELETE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

-- Exams & Results: staff/admin manage exams; students can view published exams and their results
ALTER TABLE IF EXISTS exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY exams_select_public ON exams FOR SELECT USING (published = true OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin','superadmin')));
CREATE POLICY exams_manage_by_staff ON exams FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin','superadmin')));

ALTER TABLE IF EXISTS results ENABLE ROW LEVEL SECURITY;
CREATE POLICY results_select ON results FOR SELECT USING (
  auth.uid() = student_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin','superadmin'))
);
CREATE POLICY results_insert_by_staff ON results FOR INSERT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('staff','admin','superadmin')));

-- Chats & Messages: authenticated users can insert messages; staff/admin can moderate
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_insert_auth ON messages FOR INSERT USING (auth.role() = 'authenticated');
CREATE POLICY messages_select ON messages FOR SELECT USING (true);

-- Notes: adapt policies if you use custom JWT claims. These policies use the `profiles` table to map auth.uid() to a role.
