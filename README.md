# Heimatliebe Institute — Full Learning Management System (LMS)

A complete, role-based Learning Management System for Heimatliebe Institute, a private international language school in Karonga, Malawi.

**Tech Stack:** Plain HTML/JS/CSS frontend · Node.js server · Supabase (PostgreSQL + Storage)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PUBLIC WEBSITE                           │
│  index.html · library.html · apply.html · login.html       │
│  Public content (news, courses, gallery, testimonials)      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                     PORTALS (Role-based)                    │
│                                                             │
│  /student/    → Full student dashboard                     │
│  /teacher/    → Manage classes, assignments, exams, grades │
│  /accounts/   → Payments, invoices, fees, reports          │
│  /hr/         → Staff, teachers, users, attendance         │
│  /director/   → Executive overview, analytics, reports     │
│  /admin/      → Full CMS, all data management              │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    SHARED LAYER                             │
│                                                             │
│  /css/lms.css      → Brutalist design system               │
│  /js/auth.js       → Auth, session, role management         │
│  /supabase.js      → Config loader, API wrapper            │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND                                   │
│                                                             │
│  server.js          → Static serving, email, API endpoints │
│  Supabase           → PostgreSQL database, Storage          │
│  Edge Functions     → Password reset, notifications         │
└─────────────────────────────────────────────────────────────┘
```

---

## Role-Based Access Control

| Role | Access | Portal URL |
|------|--------|------------|
| **Student** | Own dashboard, assignments, exams, results, library, timetable, messages, payments | `/student/` |
| **Teacher** | Classes, assignments CRUD, exams CRUD, grading, attendance, messages | `/teacher/` |
| **Accounts** | Payments, invoices, fees, revenue reports | `/accounts/` |
| **HR** | Staff management, user creation, attendance reports | `/hr/` |
| **Director** | Executive dashboard, analytics, CSV reports, institution settings | `/director/` |
| **Admin** | Full system access including CMS content management | `/admin/` |
| **Superadmin** | Same as admin with full system access | `/admin/` |

---

## Project Structure

```
heimatliebe-cms/
│
├── server.js                   ← Node.js server (static + API)
├── index.html                  ← Public landing page
├── login.html                  ← Role-aware login page
├── apply.html                  ← Student application form
├── library.html                ← Public resource library
├── reset-password.html         ← Password reset flow
│
├── css/
│   └── lms.css                 ← Shared brutalist design system
│
├── js/
│   ├── supabase.js             ← Config loader + REST wrapper + storage
│   └── auth.js                 ← Auth, session, role management
│
├── student/
│   └── index.html              ← Student Portal (11 modules)
│
├── teacher/
│   └── index.html              ← Teacher Portal (10 modules)
│
├── accounts/
│   └── index.html              ← Accounts/Finance Portal
│
├── hr/
│   └── index.html              ← HR Portal
│
├── director/
│   └── index.html              ← Director/Executive Portal
│
├── admin/
│   ├── index.html              ← CMS Admin panel
│   ├── auth.js                 ← Admin authentication
│   └── config.yml              ← Content type definitions
│
├── db/
│   └── migrations/
│       ├── 001_full_lms_schema.sql   ← Complete LMS database schema
│       ├── 002_rls_policies.sql      ← Row-level security policies
│       └── 003_rls_harden.sql        ← Hardened RLS policies
│
├── content/                    ← Markdown content files (fallback)
│   ├── news/
│   ├── courses/
│   ├── gallery/
│   ├── documents/
│   ├── testimonials/
│   └── library/
│
├── scripts/
│   ├── import_markdown_to_supabase.js  ← Content import script
│   ├── send_reminders.js              ← Scheduled notification sender
│   └── config.yml                     ← Script config
│
├── functions/
│   └── edge/
│       ├── password-reset/
│       └── notifications/
│
└── uploads/                    ← Uploaded files
    ├── images/
    └── library/
```

---

## Student Portal — 11 Modules

Each student automatically lands in their role-based portal after login.

| Module | Description |
|--------|-------------|
| **Dashboard** | Overview with stats (assignments due, upcoming exams, average grade, deadlines) |
| **Assignments** | View all assignments, due dates, submission status, grades received |
| **Exams** | View scheduled exams, take online exams (MCQ + text), submit answers |
| **Results** | Exam scores, percentages, pass/fail status, average grade |
| **Library** | Browse/download resources filtered by language, level, type |
| **Timetable** | Weekly class schedule (Mon–Sun) with times and rooms |
| **Classmates** | List of other students in the same classes |
| **Messages** | Internal messaging system — compose, receive, reply |
| **Notifications** | System notifications about assignments, exams, payments |
| **Profile** | View personal details, student ID, course info |
| **Payments** | View payment history with amounts, methods, statuses |

---

## Teacher Portal — 10 Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | Overview — my classes, pending grading, upcoming exams |
| **My Classes** | View assigned classes with schedule, room, period info |
| **Assignments** | Create, view, and delete assignments for classes |
| **Exams** | Create exams with JSON-based questions, publish/unpublish |
| **Grading** | View submissions, input scores, save grades |
| **Students** | List of students enrolled in your classes |
| **Attendance** | Mark attendance per class and date (Present/Absent/Late/Excused) |
| **Messages** | Internal messaging with students |
| **Notifications** | Send notifications to individual students or all your classes |
| **Profile** | View personal staff details |

---

## Accounts Portal — 5 Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | Total payments, confirmed revenue, pending invoices, outstanding amounts |
| **Payments** | Record payments, confirm/reject pending payments |
| **Invoices** | Create invoices for students, track paid/overdue status |
| **Fees** | Define fee structures per course (one-time, monthly, term, yearly) |
| **Revenue Reports** | Monthly revenue breakdown, totals |

---

## HR Portal — 6 Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | Active users by role — students, teachers, other staff |
| **Staff** | View all non-student users with roles and departments |
| **Teachers** | View teachers with their assigned class counts |
| **Students** | View all students with course, level, status |
| **Add User** | Create any user (student/teacher/accounts/hr/director/admin) with auto-generated IDs |
| **Attendance** | View attendance records by date |

---

## Director Portal — 7 Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | Executive overview — students, teachers, courses, total/monthly revenue |
| **Analytics** | Users by role, payments by status, courses by level |
| **Students** | View all students with filtering |
| **Teachers** | View all teachers with class counts |
| **Revenue** | Full revenue overview, breakdowns |
| **Reports** | CSV downloads for students, payments, exam results, attendance |
| **Institution** | Institution-level settings (name, currency, term, academic year) |

---

## Database Schema

The full schema is in `db/migrations/001_full_lms_schema.sql`. Key tables:

| Table | Purpose |
|-------|---------|
| `users` | Unified user accounts (all roles: student → superadmin) |
| `courses` | Course offerings with language, level, fee |
| `classes` | Class groups linked to courses and teachers |
| `class_enrollments` | Many-to-many: students ↔ classes |
| `assignments` | Assignment tasks with due dates, points |
| `submissions` | Student assignment submissions with grades |
| `exams` | Exam definitions with JSON questions |
| `exam_results` | Student exam submissions with scores |
| `library` | Resource library (textbooks, guides, exercises) |
| `applications` | Student enrolment applications |
| `payments` | Payment records |
| `invoices` | Invoice records |
| `fees` | Fee structures per course |
| `timetable_entries` | Scheduled class sessions |
| `attendance` | Student attendance records |
| `conversations` / `messages` | Internal messaging system |
| `notifications` | User notifications |
| `scholarships` / `scholarship_applications` | Scholarship management |
| `alumni` | Graduated student records |
| `news` | News and announcements |
| `password_reset_tokens` | Password reset flow |

---

## Quick Start — Local Development

### Prerequisites
- Node.js 18+
- A Supabase project (free tier)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up Supabase
#    - Create a project at https://supabase.com
#    - Run db/migrations/001_full_lms_schema.sql in SQL editor
#    - (Optional) Run db/migrations/002_rls_policies.sql for RLS

# 3. Create config.json (do NOT commit)
cp config.example.json config.json
# Edit config.json with your SUPABASE_URL, SUPABASE_ANON, ADMIN_PASSWORD

# 4. Start the server
npm start
```

Visit `http://localhost:3000` — the site is live.

### Database setup with Supabase

1. Go to your Supabase project dashboard → SQL Editor
2. Copy-paste and run `db/migrations/001_full_lms_schema.sql`
3. This creates all tables for the full LMS

### Create your first admin user

1. Go to your Supabase dashboard → SQL Editor
2. Insert an admin user:
```sql
INSERT INTO users (user_id, full_name, email, password_hash, role)
VALUES ('ADMIN-001', 'Admin', 'admin@heimatliebe.mw',
        'hashed_password_here', 'superadmin');
```
3. Use the `hashPassword('your-password')` function from the JS console, or use a tool to generate SHA-256 with salt `hmli_salt_2025`

Alternatively, use the HR portal (`/hr/`) → Add User once you have one admin.

---

## Deployment (Railway)

### Environment Variables

Set these in your Railway project:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON` | Supabase anonymous key |
| `ADMIN_PASSWORD` | Admin panel password |
| `SMTP_HOST` | SMTP server (default: smtp.gmail.com) |
| `SMTP_PORT` | SMTP port (default: 465) |
| `SMTP_USER` | SMTP username/email |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | Sender email address |
| `SITE_URL` | Your deployed site URL |

### Quick deploy
```bash
# 1. Push to GitHub
git add . && git commit -m "LMS v2" && git push

# 2. On Railway: New Project → Deploy from GitHub → select repo

# 3. Add environment variables in Railway dashboard

# 4. Verify
curl https://your-app.railway.app/config.json
```

---

## Security

- **Password hashing:** SHA-256 with salt (`hmli_salt_2025`) — both client and server side
- **Row-Level Security:** Supabase RLS policies restrict data access per role
- **Session management:** sessionStorage-based (cleared on tab close)
- **Role enforcement:** `requireRole()` on every portal page protects against direct URL access
- **API security:** Server endpoints validate input; Supabase anon key only exposes what RLS permits
- **No service_role key in frontend:** All privileged operations run via server.js or Edge Functions

---

## Content Management

### Via CMS Admin Panel (`/admin/`)
- **Password gate:** Enter the `ADMIN_PASSWORD` (from config/env)
- **Manage:** Applications, students, courses, library, news, payments
- **Quick actions:** Add course, publish news, upload library books

### Via Supabase (direct database)
- Any Supabase client can read/write data (within RLS policies)

### Via Markdown files (legacy)
Markdown files in `/content/` serve as fallback for public-facing content.

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/config.json` | GET | Runtime config (served from env vars) |
| `/api/send-approval-email` | POST | Send Student ID email on application approval |
| `/api/request-password-reset` | POST | Generate and email password reset link |
| `/api/reset-password` | POST | Reset password with token verification |
| `/content-list?folder=` | GET | List markdown files in content folders |

---

## Edge Functions

Located in `functions/edge/`:

- **password-reset:** Triggers Supabase password reset using service_role key
- **notifications:** Sends email (SMTP/SendGrid) and SMS (Twilio)

Deploy as Supabase Edge Functions or Railway/Vercel serverless functions.

---

## File Size & Performance

- All portals are single HTML files (no frameworks, no build step)
- Brutalist CSS is lightweight (~12KB minified)
- Supabase API calls are cached client-side for 10 seconds
- All pages are server-rendered static files served by Node.js
- Fully responsive: desktop, tablet, mobile

---

## License

ISC — Heimatliebe Institute
