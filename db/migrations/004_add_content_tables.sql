-- ═══════════════════════════════════════════════════════════════════════
-- HEIMATLIEBE INSTITUTE — COMPLETE DATABASE SETUP
-- Run in Supabase → SQL Editor → Run All
-- Safe to re-run (uses IF NOT EXISTS, ON CONFLICT DO NOTHING)
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. USERS (central auth — all roles: student, teacher, staff) ────
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  user_id       text unique not null,
  full_name     text not null,
  email         text,
  phone         text,
  role          text not null default 'student'
                check (role in ('student','teacher','accounts','hr','director','admin','superadmin')),
  status        text not null default 'active'
                check (status in ('active','inactive','suspended')),
  password_hash text not null,
  course        text,
  level         text,
  department    text,
  staff_id      text,
  photo_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── 2. APPLICATIONS ─────────────────────────────────────────────────
create table if not exists applications (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  email             text not null,
  phone             text,
  course            text not null,
  level             text not null,
  payment_proof_url text,
  password_hash     text not null,
  status            text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  student_id        text,
  notes             text,
  submitted_at      timestamptz not null default now(),
  reviewed_at       timestamptz
);

-- ── 3. COURSES ───────────────────────────────────────────────────────
create table if not exists courses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  language    text,
  level       text,
  status      text default 'Coming Soon',
  schedule    text,
  duration    text,
  fee         text,
  body        text,
  published   boolean default true,
  created_at  timestamptz not null default now()
);

-- ── 4. LIBRARY ───────────────────────────────────────────────────────
create table if not exists library (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  author      text,
  language    text,
  level       text,
  type        text,
  file_url    text,
  cover_url   text,
  description text,
  free        boolean default true,
  published   boolean default true,
  date        timestamptz default now(),
  created_at  timestamptz not null default now()
);

-- ── 5. NEWS ──────────────────────────────────────────────────────────
create table if not exists news (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text,
  summary     text,
  body        text,
  image       text,
  published   boolean default true,
  date        timestamptz default now(),
  created_at  timestamptz not null default now()
);

-- ── 6. ASSIGNMENTS ───────────────────────────────────────────────────
create table if not exists assignments (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  course      text,
  due_date    timestamptz,
  description text,
  max_score   integer default 100,
  published   boolean default true,
  created_at  timestamptz not null default now()
);

-- ── 7. SUBMISSIONS (student assignment submissions) ──────────────────
create table if not exists submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments(id) on delete cascade,
  student_id    text not null,
  file_url      text,
  notes         text,
  score         numeric(5,2),
  feedback      text,
  graded_by     text,
  submitted_at  timestamptz default now(),
  graded_at     timestamptz
);

-- ── 8. EXAMS ─────────────────────────────────────────────────────────
create table if not exists exams (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  course      text,
  exam_date   timestamptz,
  duration    text,
  location    text,
  notes       text,
  published   boolean default true,
  created_at  timestamptz not null default now()
);

-- ── 9. EXAM RESULTS ──────────────────────────────────────────────────
create table if not exists exam_results (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid references exams(id) on delete cascade,
  student_id  text not null,
  score       numeric(5,2),
  grade       text,
  feedback    text,
  created_at  timestamptz not null default now()
);

-- ── 10. PAYMENTS ─────────────────────────────────────────────────────
create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  student_id  text not null,
  amount      numeric(10,2) default 0,
  description text,
  paid_at     timestamptz default now(),
  method      text,
  reference   text,
  created_at  timestamptz not null default now()
);

-- ── 11. TIMETABLE ────────────────────────────────────────────────────
create table if not exists timetable_entries (
  id          uuid primary key default gen_random_uuid(),
  course      text,
  day_of_week text,
  start_time  text,
  end_time    text,
  room        text,
  teacher     text,
  created_at  timestamptz not null default now()
);

-- ── 12. ATTENDANCE ───────────────────────────────────────────────────
create table if not exists attendance (
  id          uuid primary key default gen_random_uuid(),
  student_id  text not null,
  course      text,
  date        date,
  status      text default 'present'
              check (status in ('present','absent','late','excused')),
  notes       text,
  created_at  timestamptz not null default now()
);

-- ── 13. NOTIFICATIONS ────────────────────────────────────────────────
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  title       text,
  body        text,
  link        text,
  is_read     boolean default false,
  created_at  timestamptz not null default now()
);

-- ── 14. MESSAGES (contact form + internal) ───────────────────────────
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  from_name   text,
  from_email  text,
  student_id  text,
  subject     text,
  body        text not null,
  read        boolean default false,
  created_at  timestamptz not null default now()
);

-- ── 15. SCHOLARSHIPS ─────────────────────────────────────────────────
create table if not exists scholarships (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  amount      numeric(10,2),
  student_id  text,
  awarded_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- ── 16. ALUMNI ───────────────────────────────────────────────────────
create table if not exists alumni (
  id          uuid primary key default gen_random_uuid(),
  user_id     text,
  full_name   text not null,
  course      text,
  grad_year   integer,
  current_job text,
  location    text,
  created_at  timestamptz not null default now()
);

-- ── 17. PASSWORD RESET TOKENS ─────────────────────────────────────────
create table if not exists password_reset_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,
  student_id  text not null,
  token       text not null unique,
  expires_at  timestamptz not null,
  used        boolean default false,
  created_at  timestamptz not null default now()
);

-- ══════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- Server uses SERVICE_ROLE_KEY which bypasses RLS entirely.
-- These open policies allow the anon key (used by /config.json clients)
-- to also read — adjust once you add user-level JWT auth.
-- ══════════════════════════════════════════════════════════════════════
do $$ declare t text;
begin
  foreach t in array array[
    'users','applications','courses','library','news','assignments',
    'submissions','exams','exam_results','payments','timetable_entries',
    'attendance','notifications','messages','scholarships','alumni',
    'password_reset_tokens'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Drop all existing policies
do $$ declare r record;
begin
  for r in select schemaname,tablename,policyname from pg_policies where schemaname='public'
  loop
    execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename);
  end loop;
end $$;

-- Service role bypasses RLS (no policy needed). 
-- Allow anon SELECT for read-only public content (courses, news, library).
create policy "public_read_courses" on courses for select to anon using (published = true);
create policy "public_read_news"    on news    for select to anon using (published = true);
create policy "public_read_library" on library for select to anon using (published = true);

-- Allow anon INSERT for applications (public form)
create policy "public_insert_applications" on applications for insert to anon with check (true);

-- ══════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ══════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values
  ('payment-proofs', 'payment-proofs', false),
  ('library-files',  'library-files',  true),
  ('uploads',        'uploads',        true),
  ('avatars',        'avatars',        true)
on conflict (id) do nothing;

-- Storage policies
do $$ declare b text;
begin
  foreach b in array array['payment-proofs','library-files','uploads','avatars'] loop
    execute format('drop policy if exists "anon_insert_%s" on storage.objects', b);
    execute format('drop policy if exists "anon_select_%s" on storage.objects', b);
    execute format('create policy "anon_insert_%s" on storage.objects for insert to anon with check (bucket_id = %L)', b, b);
    execute format('create policy "anon_select_%s" on storage.objects for select to anon using (bucket_id = %L)', b, b);
  end loop;
end $$;

-- ══════════════════════════════════════════════════════════════════════
-- VERIFY
-- ══════════════════════════════════════════════════════════════════════
select table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
from information_schema.tables
where table_schema = 'public'
order by table_name;