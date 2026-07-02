-- LMS schema: create tables for content, students, assignments, exams, payments, library, etc.
-- Run these in your Supabase SQL editor or psql.

-- Profiles (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  role text DEFAULT 'student', -- student, staff, admin, superadmin
  phone text,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- News
CREATE TABLE IF NOT EXISTS news (
  id bigserial PRIMARY KEY,
  title text,
  date timestamptz,
  category text,
  summary text,
  body text,
  image text,
  published boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id bigserial PRIMARY KEY,
  title text,
  language text,
  level text,
  schedule text,
  duration text,
  fee text,
  body text,
  published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id bigserial PRIMARY KEY,
  course_id bigint REFERENCES courses(id) ON DELETE SET NULL,
  title text,
  description text,
  due_date timestamptz,
  attachments jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id bigserial PRIMARY KEY,
  assignment_id bigint REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  submitted_at timestamptz DEFAULT now(),
  files jsonb, -- array of file metadata
  grade numeric,
  feedback text
);

-- Exams
CREATE TABLE IF NOT EXISTS exams (
  id bigserial PRIMARY KEY,
  course_id bigint REFERENCES courses(id) ON DELETE SET NULL,
  title text,
  description text,
  date timestamptz,
  duration_minutes integer,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Results
CREATE TABLE IF NOT EXISTS results (
  id bigserial PRIMARY KEY,
  exam_id bigint REFERENCES exams(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  score numeric,
  passed boolean,
  data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Library (resources)
CREATE TABLE IF NOT EXISTS library (
  id bigserial PRIMARY KEY,
  title text,
  author text,
  language text,
  level text,
  type text,
  file_url text,
  file_metadata jsonb,
  cover_url text,
  description text,
  free boolean DEFAULT true,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id bigserial PRIMARY KEY,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric,
  method text,
  status text DEFAULT 'pending', -- pending, confirmed, rejected
  receipt_url text,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

-- Alumni
CREATE TABLE IF NOT EXISTS alumni (
  id bigserial PRIMARY KEY,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  approved boolean DEFAULT false,
  certificates jsonb,
  created_at timestamptz DEFAULT now()
);

-- Scholarships
CREATE TABLE IF NOT EXISTS scholarships (
  id bigserial PRIMARY KEY,
  title text,
  description text,
  criteria text,
  open boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Chats and messages (simple)
CREATE TABLE IF NOT EXISTS chats (
  id bigserial PRIMARY KEY,
  title text,
  is_group boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id bigserial PRIMARY KEY,
  chat_id bigint REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id),
  body text,
  attachments jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_news_date ON news(date DESC);
CREATE INDEX IF NOT EXISTS idx_courses_title ON courses(title);
CREATE INDEX IF NOT EXISTS idx_library_title ON library(title);

-- Note: Supabase Auth manages users. Use `profiles` to store additional metadata.
