# Security model, checklist & testing guide

## How security works in the static version

This is a static site (HTML/CSS/JS) with **no server of its own**, so security
is **not** enforced by hiding pages or buttons. It is enforced inside Supabase:

1. **Supabase Auth** issues a login session only for a correct email + password.
2. **Row-Level Security (RLS)** in Postgres is the real gate. Every table has
   policies (`supabase/migrations/0002_…` and `0003_…`) that decide, per row,
   what the anonymous public and the signed-in admin may read or write. These
   run on Supabase's servers and cannot be bypassed from the browser.
3. The admin dashboard's JavaScript is fully downloadable — that's fine.
   Downloading it grants no powers: without a valid admin session, every
   read of a draft and every write is rejected by RLS.

**Why the anon key in `js/config.js` is safe:** the `anon` key only lets a
caller *attempt* operations; RLS decides what actually succeeds. Anonymous
visitors can read published content and send a contact message — nothing else.
The powerful `service_role` key is **never** in the browser.

### Honest trade-offs vs. a server version

- **Sessions** are stored by Supabase in the browser's `localStorage` (standard
  for static single-page apps), not in HTTP-only cookies. RLS still fully
  protects the data.
- **Contact-form rate limiting** can't run server-side here. Spam is mitigated
  by a honeypot field, a minimum fill-time check, and database `CHECK`
  constraints on the insert. For stronger limits later, add a Supabase Edge
  Function — no frontend changes needed.

## Checklist

- [x] **No public registration** — no sign-up page, link, or code anywhere.
- [x] **Approved administrators only** — a login is accepted only if the user
      exists in the `admin_users` table (checked at login and enforced by RLS
      via `public.is_admin()`); accounts are created only in the Supabase
      dashboard + `promote_admin()`.
- [x] **Secure password auth** — Supabase Auth (bcrypt-hashed passwords).
- [x] **Row-Level Security** on every table; anonymous users can read only
      `published` rows and INSERT a contact message, nothing more.
- [x] **Draft isolation** — draft/hidden rows are invisible to the public
      because RLS filters them out, regardless of the frontend.
- [x] **Admin-only writes** — all create/update/delete/reorder/publish
      operations require `public.is_admin()`.
- [x] **File-upload restrictions** — type allowlist (PNG/JPG/WebP/GIF/SVG/PDF),
      10 MB limit, and server-generated storage paths (no path traversal),
      enforced both in `js/admin/db.js` and by the storage bucket config.
- [x] **XSS protection** — all database text is HTML-escaped before it is
      inserted into the page (`esc()` in `js/helpers.js`); links are limited to
      safe schemes (`safeUrl()`).
- [x] **SQL injection** — all queries go through the Supabase client
      (parameterized); no hand-built SQL strings.
- [x] **Contact messages are private** — no public read policy; only the admin
      can read/update/delete them.
- [x] **Audit log** — every admin change is appended to `audit_logs`
      (append-only: admins can read and insert, but not edit or delete).
- [x] **Content revisions** — updates snapshot the previous row into
      `content_revisions`.
- [x] **Password reset** — reset emails go only to the address entered; the
      response is identical whether or not it's the admin (no enumeration).
- [x] **Secure logout** — `auth.signOut()` clears the session.
- [x] **Session expiry** — Supabase access tokens expire and auto-refresh.

## Testing guide

**Public visitor (signed out)**
1. Open `index.html` — the full portfolio renders. ✅
2. There are no edit buttons anywhere. ✅
3. Open `admin.html` — you see the sign-in screen, never the dashboard. ✅

**Draft isolation**
1. Sign in, create a project, leave it **Draft**.
2. Open `index.html` in a private window (signed out) — the draft is absent. ✅
3. Signed in, open `index.html?preview=1` — the draft shows, with a banner. ✅

**Authorization**
1. Create a second Supabase Auth user but do **not** run `promote_admin` for it.
   Try to sign in → rejected ("does not have administrator access"). ✅
2. In devtools, try `supabase.from('projects').update(...)` as that non-admin
   (or signed out) → blocked by RLS. ✅

**Uploads**
1. Try to upload a `.exe` or a >10 MB file → rejected. ✅

**Contact form**
1. Send a valid message → appears in **Contact → Messages**, never on the site. ✅
2. Fill the hidden `website` field via devtools → silently ignored (honeypot). ✅
