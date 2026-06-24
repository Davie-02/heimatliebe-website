# Heimatliebe Institute — Website Setup Guide

## What's in this folder

```
heimatliebe-cms/
├── index.html              ← Your public website
├── netlify.toml            ← Netlify settings
├── admin/
│   ├── index.html          ← The CMS admin panel (yoursite.netlify.app/admin)
│   └── config.yml          ← Defines all content types
├── content/
│   ├── news/               ← News & announcements go here (managed by CMS)
│   ├── courses/            ← Course listings
│   ├── gallery/            ← Photo albums
│   ├── documents/          ← PDFs and brochures
│   └── testimonials/       ← Student testimonials
└── uploads/
    ├── images/             ← Images uploaded via CMS
    └── documents/          ← PDFs uploaded via CMS
```

---

## Step-by-step: Go live in ~15 minutes

### Step 1 — Create a GitHub account (free)
Go to https://github.com and sign up if you don't have an account.

### Step 2 — Create a new repository
1. Click the **+** icon → **New repository**
2. Name it: `heimatliebe-website`
3. Set it to **Public**
4. Click **Create repository**

### Step 3 — Upload your files
1. On your new repo page, click **uploading an existing file**
2. Drag the entire contents of this folder into the upload area
3. Click **Commit changes**

### Step 4 — Deploy to Netlify
1. Go to https://netlify.com and sign up (free) — use your GitHub account
2. Click **Add new site** → **Import an existing project** → **GitHub**
3. Select your `heimatliebe-website` repository
4. Leave all build settings as default
5. Click **Deploy site**
6. After ~1 minute, you'll get a URL like `https://amazing-name-123.netlify.app`

### Step 5 — Enable Netlify Identity (for CMS login)
1. In your Netlify dashboard, go to **Site settings** → **Identity**
2. Click **Enable Identity**
3. Under **Registration preferences**, set to **Invite only** (so only you can log in)
4. Scroll to **Git Gateway** → click **Enable Git Gateway**

### Step 6 — Invite yourself as admin
1. Still in Identity settings, click **Invite users**
2. Enter your email address
3. Check your email and accept the invitation — this creates your admin password

### Step 7 — Log in to your admin panel
1. Go to: `https://your-site.netlify.app/admin`
2. Log in with your email and the password you set
3. You're in! 🎉

### Step 8 — Update your site URL in config
Open `admin/config.yml` and replace:
```
site_url: https://your-site-name.netlify.app
```
with your actual Netlify URL.

---

## How to manage content day-to-day

Go to **yoursite.netlify.app/admin** and log in.

| Section | What you can do |
|---|---|
| **News & Announcements** | Write posts, add images, set category, publish/unpublish |
| **Courses & Timetable** | Add courses, set schedule, fee, status (Enrolling Now / Full / etc.) |
| **Photo Gallery** | Create albums, upload multiple photos with captions |
| **Documents & Brochures** | Upload PDFs, name them, they appear in the Downloads section |
| **Student Testimonials** | Add student names, course, year, quote, optional photo |

Every time you **Save** in the admin, your site updates automatically within ~30 seconds.

---

## Custom domain (optional, free with Netlify)
1. Netlify dashboard → **Domain settings** → **Add custom domain**
2. Enter e.g. `heimatliebe.mw` or `www.heimatliebe.mw`
3. Follow their DNS instructions with your domain registrar

---

## Need help?
- Netlify docs: https://docs.netlify.com
- Netlify CMS docs: https://www.netlifycms.org/docs/intro/
