-- Enable Row Level Security and create example policies
-- Run in Supabase SQL editor after creating tables

-- Enable RLS on key tables
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS news ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS library ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their profile (on sign up)
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT USING (auth.role() = 'authenticated');

-- Allow users to select their own profile or admins to select any
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.uid() = id OR exists(SELECT 1 FROM auth.users WHERE auth.uid() IS NOT NULL AND auth.role() = 'service_role'));

-- News: public read, authenticated insert, admins full
CREATE POLICY "news_public_select" ON news
  FOR SELECT USING (true);
CREATE POLICY "news_insert_auth" ON news
  FOR INSERT USING (auth.role() = 'authenticated');

-- Courses: public read
CREATE POLICY "courses_select" ON courses
  FOR SELECT USING (true);

-- Assignments: staff/admin can insert/update; students can select if course is relevant
CREATE POLICY "assignments_staff_insert" ON assignments
  FOR INSERT USING (auth.role() = 'staff' OR auth.role() = 'admin' OR auth.role() = 'superadmin');

-- Submissions: students can insert (their own), staff can view
CREATE POLICY "submissions_student_insert" ON submissions
  FOR INSERT USING (auth.role() = 'authenticated');
CREATE POLICY "submissions_select" ON submissions
  FOR SELECT USING (auth.role() = 'staff' OR auth.role() = 'admin' OR auth.uid() = student_id);

-- Library: public read, authenticated insert
CREATE POLICY "library_select" ON library
  FOR SELECT USING (true);
CREATE POLICY "library_insert" ON library
  FOR INSERT USING (auth.role() = 'authenticated');

-- Payments: students can insert their payments, staff/admin can view
CREATE POLICY "payments_insert" ON payments
  FOR INSERT USING (auth.role() = 'authenticated');
CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (auth.role() = 'staff' OR auth.role() = 'admin' OR auth.uid() = student_id);

-- Note: Adjust policies to match your auth setup and roles. Consider using custom claims for roles.
