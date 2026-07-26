# Aqsa Arif — Portfolio + CMS (HTML / CSS / JavaScript)

A public portfolio website with a private, code-free admin dashboard — built
with **plain HTML, CSS, and JavaScript**. No framework, no build step, no npm.

The portfolio is visible to everyone. Only the approved administrator can sign
in and edit every section through a visual dashboard. **There is no public
sign-up anywhere.**

- **Frontend:** hand-written HTML + CSS + vanilla JavaScript (ES modules)
- **Backend:** [Supabase](https://supabase.com) — Postgres database, Auth, and
  file Storage. The one external script is the Supabase library, loaded from a
  CDN (`https://esm.sh/@supabase/supabase-js`).
- **Security:** Postgres Row-Level Security (RLS) is the enforcement layer —
  see [SECURITY.md](SECURITY.md).

---

## Files

```
.
├── index.html              # public portfolio (now with My Work + Courses previews)
├── work.html               # "My Work" gallery — categories → projects → detail
├── courses.html            # "Courses" — grouped by provider, with filters
├── admin.html              # admin login + dashboard (one page)
├── .htaccess               # Apache/XAMPP clean-URL rewrites for /work and /courses
├── _redirects              # Netlify / Cloudflare Pages clean-URL rewrites
├── vercel.json             # Vercel clean-URL rewrites
├── css/
│   ├── styles.css          # public site styles (+ Work/Courses components)
│   └── admin.css           # dashboard styles
├── js/
│   ├── config.js           # ← YOU EDIT THIS: Supabase URL + anon key
│   ├── supabaseClient.js   # creates the Supabase client, admin check
│   ├── fallback.js         # built-in demo content (shown before setup)
│   ├── helpers.js          # escaping, icons, formatting, slugify
│   ├── chrome.js           # shared navbar/footer + routing helpers (work/courses)
│   ├── site.js             # renders the public homepage
│   ├── work.js             # "My Work" client router + views
│   ├── courses.js          # "Courses" client router + views
│   ├── contact.js          # public contact form
│   └── admin/
│       ├── app.js          # login gate + sidebar routing + dashboard
│       ├── db.js           # data layer (CRUD, audit, revisions, uploads)
│       ├── ui.js           # toasts, dialogs, fields, drag-reorder, upload
│       └── sections.js     # every editable section
└── supabase/
    ├── migrations/
    │   ├── 0001_schema.sql          # tables, enums, helper functions
    │   ├── 0002_rls_policies.sql    # Row-Level Security + storage bucket
    │   ├── 0003_static_client_policies.sql  # anon contact + admin audit
    │   ├── 0004_work_and_courses.sql       # My Work + Courses tables/columns
    │   └── 0005_work_and_courses_rls.sql   # RLS for the new tables
    ├── seed.sql                     # initial content (projects, skills, …)
    └── seed_work_courses.sql        # demo course categories + Anthropic courses
```

## What's included in the "My Work" + "Courses" update

- **My Work** (`/work`): dynamic category cards → per-category project gallery
  (with sort + tool/type filters) → full project detail page (overview,
  objectives, my role, tools, gallery lightbox, videos, challenges, outcome,
  external links). Clean URLs: `/work/<category>/<project>`.
- **Courses** (`/courses`): completed courses grouped by **provider** — click a
  provider (e.g. *Anthropic*) to see its courses — plus an all-courses view with
  category / provider / year / skill filters and a certificate viewer.
- **Admin**: new *Project Categories* (reorder, rename, edit, delete-with-move),
  *Courses* and *Course Categories* sections; projects gained multiple
  categories, rich case-study fields, video embeds, gallery alt-text + reorder,
  duplicate, and a **Preview** button. The Dashboard overview now counts
  categories and courses too.
- **Homepage** shows a *My Work* category preview and a *Courses* preview, each
  linking through to the full pages. Nothing existing was removed.

Before you add your Supabase keys, the public site shows built-in demo content
and the admin page shows setup steps — so you can preview the design right away.

---

## Setup

### 1. Create the Supabase backend

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste and run, in order:
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_rls_policies.sql`
   3. `supabase/migrations/0003_static_client_policies.sql`
   4. `supabase/migrations/0004_work_and_courses.sql`
   5. `supabase/migrations/0005_work_and_courses_rls.sql`
   6. `supabase/seed.sql`
   7. `supabase/seed_work_courses.sql`   *(optional demo courses/categories)*

   > **Already have the site running from an earlier version?** Just run the two
   > new migrations (`0004…`, `0005…`) — they are additive and safe on an
   > existing database. Until you do, the Admin *Courses* / *Project Categories*
   > pages will show a "could not load" message and the public Courses page will
   > be empty; everything else keeps working.
3. **Create your admin user** (the only way to become an admin — there is no
   sign-up page):
   - **Authentication → Users → Add user** → your email + a strong password,
     and tick *Auto Confirm User*.
   - **SQL Editor** → run:
     ```sql
     select public.promote_admin('you@example.com');
     ```

### 2. Add your keys

Open `js/config.js` and paste in two values from
**Supabase → Project Settings → API**:

```js
export const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
export const SUPABASE_ANON_KEY = "your-anon-public-key";
```

Both are **safe to be public** — the `anon` key is designed to ship in the
browser, and RLS protects your data. **Never** put the `service_role` key here.

### 3. Run it locally

Because the site uses JavaScript modules, it must be opened over `http://`,
**not** by double-clicking the file. Any tiny static server works — for example:

```bash
# Python (built into Windows as "py")
py -m http.server 3000
# then open http://localhost:3000
```

Or use the **VS Code “Live Server”** extension (right-click `index.html` →
*Open with Live Server*).

- Public site: `http://localhost:3000/index.html`
- Admin: `http://localhost:3000/admin.html`

---

## Using the dashboard

- **Dashboard** — counts (projects, categories, courses…), recent changes,
  quick links, and a preview button.
- **Personal Info / Hero / Contact / Settings** — single forms.
- **Experience / Projects / Skills / Certificates / Courses** — add, edit,
  delete (with confirmation), drag-to-reorder, publish / unpublish / hide,
  duplicate, and **Preview**.
- **Project Categories** — create, rename, reorder, edit (icon, description,
  cover), and delete. Deleting a category with projects asks whether to **move
  them** to another category or delete them too.
- **Course Categories** — create, rename, reorder, delete.
- **Projects** support **multiple categories**, rich case-study fields
  (objectives, my role, duration, challenges & solutions, outcome), a gallery
  (with alt text + reordering), and **video embeds** (paste a YouTube/Vimeo link
  or a direct video-file URL).
- **Media** — upload images / PDFs / CV, copy URLs, set alt text, delete.
- **Preview** — the “Preview site” link (and `index.html?preview=1`) shows
  drafts to you only. Visitors always see published content.

**Publishing workflow:** new items start as **Draft** and appear publicly only
after you click **Publish**. Statuses are Draft / Published / Hidden. Each edit
also snapshots a revision (kept in `content_revisions`) for recovery.

---

## Deployment

It’s just static files — host them anywhere:

- **Netlify / Cloudflare Pages:** drag the whole folder onto their dashboard.
  The included `_redirects` file enables the clean `/work/…` and `/courses/…`
  URLs.
- **GitHub Pages:** push the folder to a repo and enable Pages.
- **Vercel:** import the repo as a static project (no framework preset). The
  included `vercel.json` enables the clean URLs.
- **XAMPP / Apache:** the included `.htaccess` enables the clean URLs (needs
  `mod_rewrite` + `AllowOverride All`, both on by default in XAMPP).

**Clean URLs** (`/work/<category>/<project>`, `/courses/<provider>/<course>`)
work out of the box on the hosts above. On any host *without* a rewrite rule,
navigation still works everywhere — the pages fall back to
`work.html?c=…&p=…` style links — so nothing ever breaks.

After deploying, in **Supabase → Authentication → URL Configuration** add your
live URL so password-reset links work.

> Your Supabase keys live in `js/config.js`, which is part of the deployed
> files. That’s expected and safe for the anon key — RLS is what protects your
> data.

---

## Security & testing

See [SECURITY.md](SECURITY.md) for the full security model, checklist, and a
step-by-step testing guide.
