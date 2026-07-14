-- ═══════════════════════════════════════════════════════════════
-- HEIMATLIEBE INSTITUTE — Full LMS Schema
-- Run in Supabase SQL editor. Replaces prior migrations.
--
-- This unified schema supports:
--   - All user roles (student, teacher, accounts, hr, director, admin, superadmin)
--   - Courses, classes, assignments, exams, submissions, grading
--   - Payments, fees, invoices
--   - Library resources
--   - Messages / chat
--   - Scholarship management
--   - Alumni tracking
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════
-- 1. USERS (unified for all roles)
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id bigserial PRIMARY KEY,
  user_id text UNIQUE NOT NULL,            -- Student ID (HMLI-2025-XXXX) or Staff ID (HMLI-STF-XXXX)
  full_name text NOT NULL,
  email text,
  phone text,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','accounts','hr','director','admin','superadmin')),
  photo_url text,
  course text,                             -- For students: enrolled course
  level text,                              -- For students: course level
  staff_id text,                           -- For staff: employee number
  department text,                         -- For staff: department
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════
-- 2. COURSES & CLASSES
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS courses (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  language text,
  level text,
  schedule text,
  duration text,
  fee text,
  body text,
  status text DEFAULT 'Coming Soon',
  published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Class groups (e.g. German A1 - Morning Group)
CREATE TABLE IF NOT EXISTS classes (
  id bigserial PRIMARY KEY,
  course_id bigint REFERENCES courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  teacher_id bigint REFERENCES users(id) ON DELETE SET NULL,
  schedule text,
  room text,
  start_date date,
  end_date date,
  max_students integer DEFAULT 30,
  created_at timestamptz DEFAULT now()
);

-- Class enrollment (many-to-many: students ↔ classes)
CREATE TABLE IF NOT EXISTS class_enrollments (
  id bigserial PRIMARY KEY,
  class_id bigint REFERENCES classes(id) ON DELETE CASCADE,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(class_id, user_id)
);

-- ═══════════════════════════════
-- 3. ASSIGNMENTS & SUBMISSIONS
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS assignments (
  id bigserial PRIMARY KEY,
  class_id bigint REFERENCES classes(id) ON DELETE CASCADE,
  course_id bigint REFERENCES courses(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  instructions text,
  due_date timestamptz,
  total_points numeric DEFAULT 100,
  attachments jsonb,                       -- Array of file metadata
  created_by bigint REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id bigserial PRIMARY KEY,
  assignment_id bigint REFERENCES assignments(id) ON DELETE CASCADE,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  files jsonb,                             -- Array of submitted file metadata
  notes text,
  submitted_at timestamptz DEFAULT now(),
  grade numeric,
  feedback text,
  graded_by bigint REFERENCES users(id),
  graded_at timestamptz,
  UNIQUE(assignment_id, user_id)
);

-- ═══════════════════════════════
-- 4. EXAMS & RESULTS
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS exams (
  id bigserial PRIMARY KEY,
  class_id bigint REFERENCES classes(id) ON DELETE CASCADE,
  course_id bigint REFERENCES courses(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  instructions text,
  date timestamptz,
  duration_minutes integer,
  total_points numeric DEFAULT 100,
  questions jsonb,                         -- Array of question objects
  published boolean DEFAULT false,
  created_by bigint REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_results (
  id bigserial PRIMARY KEY,
  exam_id bigint REFERENCES exams(id) ON DELETE CASCADE,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  answers jsonb,                           -- Student's answers
  score numeric,
  total_points numeric,
  percentage numeric,
  passed boolean,
  graded_by bigint REFERENCES users(id),
  graded_at timestamptz,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(exam_id, user_id)
);

-- ═══════════════════════════════
-- 5. LIBRARY (resources)
-- ═══════════════════════════════
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
  uploaded_by bigint REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════
-- 6. APPLICATIONS (student enrolment applications)
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS applications (
  id bigserial PRIMARY KEY,
  full_name text,
  email text,
  phone text,
  course text,
  level text,
  payment_proof_url text,
  password_hash text,
  status text DEFAULT 'pending',
  student_id text,
  notes text,
  reviewed_at timestamptz,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Legacy students table (kept for backward compatibility)
CREATE TABLE IF NOT EXISTS students (
  id bigserial PRIMARY KEY,
  student_id text UNIQUE,
  full_name text,
  email text,
  phone text,
  course text,
  level text,
  password_hash text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════
-- 7. NEWS & ANNOUNCEMENTS
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS news (
  id bigserial PRIMARY KEY,
  title text,
  date timestamptz,
  category text,
  summary text,
  body text,
  image text,
  published boolean DEFAULT true,
  created_by bigint REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════
-- 8. PAYMENTS & FINANCE
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS payments (
  id bigserial PRIMARY KEY,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  method text,                             -- airtel, tnm, bank, cash
  status text DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected','refunded')),
  receipt_url text,
  description text,
  invoice_number text,
  meta jsonb,
  processed_by bigint REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Fee structures
CREATE TABLE IF NOT EXISTS fees (
  id bigserial PRIMARY KEY,
  course_id bigint REFERENCES courses(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text DEFAULT 'MWK',
  frequency text DEFAULT 'one-time',       -- one-time, monthly, term, yearly
  description text,
  created_at timestamptz DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id bigserial PRIMARY KEY,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  invoice_number text UNIQUE,
  amount numeric NOT NULL,
  paid numeric DEFAULT 0,
  due_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','cancelled')),
  line_items jsonb,
  notes text,
  created_by bigint REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════
-- 9. TIMETABLE / SCHEDULING
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS timetable_entries (
  id bigserial PRIMARY KEY,
  class_id bigint REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week integer CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  room text,
  teacher_id bigint REFERENCES users(id) ON DELETE SET NULL,
  recurring boolean DEFAULT true,
  date date,                               -- For non-recurring sessions
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════
-- 10. MESSAGING
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS conversations (
  id bigserial PRIMARY KEY,
  subject text,
  created_by bigint REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id bigserial PRIMARY KEY,
  conversation_id bigint REFERENCES conversations(id) ON DELETE CASCADE,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id bigserial PRIMARY KEY,
  conversation_id bigint REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id bigint REFERENCES users(id),
  body text,
  attachments jsonb,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════
-- 11. NOTIFICATIONS
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id bigserial PRIMARY KEY,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  title text,
  body text,
  type text DEFAULT 'info',               -- info, warning, success, assignment, exam, payment
  link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════
-- 12. ATTENDANCE
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS attendance (
  id bigserial PRIMARY KEY,
  class_id bigint REFERENCES classes(id) ON DELETE CASCADE,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text DEFAULT 'present' CHECK (status IN ('present','absent','late','excused')),
  marked_by bigint REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(class_id, user_id, date)
);

-- ═══════════════════════════════
-- 13. SCHOLARSHIPS & ALUMNI
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS scholarships (
  id bigserial PRIMARY KEY,
  title text,
  description text,
  criteria text,
  amount numeric,
  open boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scholarship_applications (
  id bigserial PRIMARY KEY,
  scholarship_id bigint REFERENCES scholarships(id) ON DELETE CASCADE,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  documents jsonb,
  reviewed_by bigint REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alumni (
  id bigserial PRIMARY KEY,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  graduated_at timestamptz,
  certificates jsonb,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════
-- 14. PASSWORD RESET TOKENS
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id bigserial PRIMARY KEY,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════
-- INDEXES
-- ═══════════════════════════════
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_news_date ON news(date DESC);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(published);
CREATE INDEX IF NOT EXISTS idx_library_language ON library(language);
CREATE INDEX IF NOT EXISTS idx_library_level ON library(level);
CREATE INDEX IF NOT EXISTS idx_assignments_due ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user ON exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_user ON class_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
