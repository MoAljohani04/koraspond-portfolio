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
├── vercel.json             # Vercel rewrites, security headers, caching
├── .vercelignore           # files kept out of the Vercel deployment
├── css/
│   ├── styles.css          # public site styles (+ Work/Courses components)
│   └── admin.css           # dashboard styles
├── js/
│   ├── config.js           # ← YOU EDIT THIS: Supabase URL + anon key
│   ├── supabaseClient.js   # creates the Supabase client, admin check
│   ├── fallback.js         # built-in demo content (shown before setup)
│   ├── helpers.js          # escaping, icons, formatting, slugify
│   ├── artwork.js          # generated SVG project artwork, matched to the subject
│   ├── motion.js           # scroll reveals, pointer response, marquee
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

## Design system

The public site and the dashboard share one system, ported from the Figma
file. It lives in the `:root` blocks of `css/styles.css` and `css/admin.css` —
change it there and both surfaces follow.

| Token | Value | Used for |
| --- | --- | --- |
| `--ground` / `--ground-2` / `--ground-3` | `#010203` / `#080a0d` / `#11151a` | page, section and panel grounds |
| `--line` | `#414741` | every hairline rule, border and diagram stroke |
| `--border` | `#4b6582` | input and control borders |
| `--text` / `--muted` | `#f4f7fa` / `#8ca5c1` | body copy and secondary copy |
| `--accent` / `--accent-light` | `#57a2ff` / `#8bc3ff` | the single emphasis colour |
| `--font-display` | Encode Sans | headings, figures, names |
| `--font-mono` | DM Mono | every label, eyebrow, button and metric caption |

Rules of the system: square corners, hairlines instead of shadows, one accent
colour, and mono uppercase for anything that labels rather than reads.

Projects without a cover image are drawn rather than left blank —
`js/artwork.js` renders an SVG diagram chosen from the project's own subject
(its title, type, categories and tools), so a chatbot proposal gets a
conversation thread and a translation job gets the EN/AR columns. A project
matching nothing keeps a stable drawing picked from a hash of its text.

`js/motion.js` adds the movement: scroll reveals, pointer-tracked cards, the
counting stats and the toolkit marquee. All of it is layered on top of a page
that already renders without it — the reveal styles apply only under a
`js-motion` class the script adds, and reduced motion turns the lot off.

## What's included in the "My Work" + "Courses" update

- **My Work** (`/work`): dynamic category cards → per-category project gallery
  (with sort + tool/type filters) → full project detail page (overview,
  objectives, my role, tools, gallery lightbox, challenges, outcome,
  external links). Clean URLs: `/work/<category>/<project>`.
- **Courses** (`/courses`): completed courses grouped by **provider** — click a
  provider (e.g. *Anthropic*) to see its courses — plus an all-courses view with
  category / provider / year / skill filters and a certificate viewer.
- **Admin**: new *Project Categories* (reorder, rename, edit, delete-with-move),
  *Courses* and *Course Categories* sections; projects gained multiple
  categories, rich case-study fields, gallery alt-text + reorder,
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
  (objectives, my role, duration, challenges & solutions, outcome), and a gallery
  (with alt text + reordering).
- **Media** — upload images / PDFs / CV, copy URLs, set alt text, delete.
- **Preview** — the “Preview site” link (and `index.html?preview=1`) shows
  drafts to you only. Visitors always see published content.

**Publishing workflow:** new items start as **Draft** and appear publicly only
after you click **Publish**. Statuses are Draft / Published / Hidden. Each edit
also snapshots a revision (kept in `content_revisions`) for recovery.

---

## Deployment

It's just static files — no build step, no server.

### Vercel + a custom domain (the live setup)

1. **Import the repo** at [vercel.com/new](https://vercel.com/new). Framework
   preset: **Other**. Leave the build command empty and the output directory as
   the repository root — there is nothing to compile.
2. **Deploy.** The included `vercel.json` supplies the clean-URL rewrites and
   the security headers; `.vercelignore` keeps docs, migrations and local
   tooling out of the deployment.
3. **Add the domain** under *Project → Settings → Domains*. Vercel then shows
   the exact DNS records to create — use the values it prints, not the ones in
   any guide, because they differ per project and change over time.
4. **Point the domain at them** in Namecheap: *Domain List → Manage → Advanced
   DNS*. Delete the two records Namecheap adds by default (a `CNAME` for `www`
   to `parkingpage.cash…` and a `URL Redirect` on `@`) — they will otherwise
   keep overriding yours — then add what Vercel showed:
   - the apex, `@`, as an **A Record**
   - `www` as a **CNAME Record**

   Nameservers must stay on **Namecheap BasicDNS** for Advanced DNS to apply.
   Propagation is usually minutes; Vercel issues the HTTPS certificate itself
   once the records resolve.
5. **Tell Supabase about the new address**: *Authentication → URL Configuration*
   → set **Site URL** to the live domain and add it under **Redirect URLs**, or
   the admin password-reset link will send people to the wrong host.

Every push to `main` redeploys automatically.

### Other hosts

The same files run anywhere:

- **Netlify / Cloudflare Pages:** `_redirects` supplies the clean URLs.
- **Render:** `render.yaml` is a ready Blueprint.
- **GitHub Pages:** push and enable Pages.
- **XAMPP / Apache:** `.htaccess` supplies the clean URLs (needs `mod_rewrite`
  and `AllowOverride All`, both on by default in XAMPP).

**Clean URLs** (`/work/<category>/<project>`, `/courses/<provider>/<course>`)
work out of the box on all of the above. On a host *without* rewrites,
navigation still works — the pages fall back to `work.html?c=…&p=…` links — so
nothing ever breaks.

### Two things to keep in step

- **The `?v=` number** on `css/styles.css` and the page scripts is how
  returning visitors are told to fetch a changed file. Bump it in all three
  HTML pages whenever CSS or JS changes.
- **The meta tags** at the top of each HTML page are what Google indexes and
  what LinkedIn or WhatsApp show in a link preview — those crawlers do not run
  JavaScript, so the CMS values never reach them. Edit the tags when the Site
  settings change.

> Your Supabase keys live in `js/config.js`, which is part of the deployed
> files. That's expected and safe for the anon key — RLS is what protects your
> data.
---

## Security & testing

See [SECURITY.md](SECURITY.md) for the full security model, checklist, and a
step-by-step testing guide.
