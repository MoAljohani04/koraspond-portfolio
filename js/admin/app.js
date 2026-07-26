// Admin controller: login gate, sidebar routing, dashboard.
import { getClient, getAdmin, isConfigured } from "../supabaseClient.js";
import { setAdmin, admin, listAll } from "./db.js";
import { toast, esc } from "./ui.js";
import { formatDate } from "../helpers.js";
import {
  renderProfile, renderHero, renderSettings, renderExperience, renderProjects,
  renderProjectCategories, renderCourses, renderCourseCategories,
  renderSkills, renderCertificates, renderContact, renderMedia,
} from "./sections.js";

const $ = (id) => document.getElementById(id);

const SECTIONS = {
  dashboard: { label: "Dashboard", render: renderDashboard },
  profile: { label: "Personal Info", render: renderProfile },
  hero: { label: "Hero Section", render: renderHero },
  experience: { label: "Work Experience", render: renderExperience },
  projects: { label: "Projects", render: renderProjects },
  "project-categories": { label: "Project Categories", render: renderProjectCategories },
  courses: { label: "Courses", render: renderCourses },
  "course-categories": { label: "Course Categories", render: renderCourseCategories },
  skills: { label: "Skills & Tools", render: renderSkills },
  certificates: { label: "Certificates", render: renderCertificates },
  contact: { label: "Contact & Messages", render: renderContact },
  media: { label: "Media Library", render: renderMedia },
  settings: { label: "Site Settings", render: renderSettings },
};

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot() {
  const ctx = await getAdmin();
  $("boot").classList.add("hidden");
  if (ctx) { setAdmin(ctx); showApp(ctx); }
  else showLogin();
}

// ── Login view ────────────────────────────────────────────────────────────────
function showLogin() {
  $("login-view").classList.remove("hidden");
  const body = $("login-body");
  if (!isConfigured()) {
    body.innerHTML = `<div class="login-setup">
      <strong>Supabase is not configured yet.</strong>
      <ol>
        <li>Create a project at supabase.com</li>
        <li>Paste your Project URL + anon key into <code>js/config.js</code></li>
        <li>Run the SQL in <code>supabase/migrations</code> and <code>supabase/seed.sql</code></li>
        <li>Create your admin user (see README)</li>
      </ol>
    </div>`;
    return;
  }
  renderLoginForm(body);
}

function renderLoginForm(body, mode = "signin") {
  const reset = mode === "reset";
  body.innerHTML = `
    <form id="login-form">
      <div class="login-field">
        <label for="l-email">Email</label>
        <input id="l-email" name="email" type="email" required autocomplete="email" placeholder="admin@example.com" />
      </div>
      ${reset ? "" : `<div class="login-field">
        <label for="l-pass">Password</label>
        <input id="l-pass" name="password" type="password" required autocomplete="current-password" placeholder="••••••••" />
      </div>`}
      <div id="l-alert"></div>
      <button class="btn btn-primary" type="submit" style="width:100%;margin-top:16px;justify-content:center">
        ${reset ? "Send reset link" : "Sign in"}
      </button>
      <button type="button" class="link-btn" id="l-toggle">${reset ? "← Back to sign in" : "Forgot password?"}</button>
    </form>`;

  $("l-toggle").onclick = () => renderLoginForm(body, reset ? "signin" : "reset");
  const alert = (kind, msg) => { $("l-alert").innerHTML = `<div class="login-alert ${kind}">${esc(msg)}</div>`; };

  $("login-form").onsubmit = async (e) => {
    e.preventDefault();
    $("l-alert").innerHTML = "";
    const email = e.target.email.value.trim();
    const supabase = getClient();

    if (reset) {
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.href.split("#")[0] });
      alert("ok", "If that address belongs to the administrator, a reset link has been sent.");
      return;
    }

    const password = e.target.password.value;
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Please wait…";
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) { btn.disabled = false; btn.textContent = "Sign in"; return alert("err", "Invalid email or password."); }

    // Authoritative admin check — enforced by RLS on admin_users.
    const { data: adminRow } = await supabase.from("admin_users").select("id").eq("id", data.user.id).maybeSingle();
    if (!adminRow) {
      await supabase.auth.signOut();
      btn.disabled = false; btn.textContent = "Sign in";
      return alert("err", "This account does not have administrator access.");
    }
    const ctx = await getAdmin();
    setAdmin(ctx);
    $("login-view").classList.add("hidden");
    showApp(ctx);
  };
}

// ── App view ──────────────────────────────────────────────────────────────────
function showApp(ctx) {
  $("app-view").classList.remove("hidden");
  $("sb-email").textContent = ctx.user.email || "";

  const nav = $("sb-nav");
  nav.innerHTML = Object.entries(SECTIONS)
    .map(([key, s]) => `<a data-nav="${key}">${esc(s.label)}</a>`)
    .join("");
  nav.querySelectorAll("[data-nav]").forEach((a) =>
    a.addEventListener("click", () => { location.hash = a.dataset.nav; })
  );

  $("signout").onclick = async () => {
    await getClient().auth.signOut();
    location.hash = "";
    location.reload();
  };
  $("mobile-toggle").onclick = () => $("sidebar").classList.toggle("collapsed");

  window.addEventListener("hashchange", route);
  route();
}

function currentKey() {
  const key = location.hash.replace(/^#/, "");
  return SECTIONS[key] ? key : "dashboard";
}

async function route() {
  const key = currentKey();
  document.querySelectorAll("#sb-nav [data-nav]").forEach((a) =>
    a.classList.toggle("active", a.dataset.nav === key)
  );
  $("sidebar").classList.remove("collapsed");
  const content = $("content");
  content.innerHTML = `<div style="color:var(--color-text-faint);padding:40px;text-align:center">Loading…</div>`;
  const reload = () => SECTIONS[key].render(content, reload);
  try {
    await SECTIONS[key].render(content, reload);
  } catch (err) {
    console.error(err);
    content.innerHTML = `<div class="empty">Could not load this section: ${esc(err.message || String(err))}</div>`;
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function renderDashboard(container) {
  const [projects, projCats, courses, courseCats, certificates, messages, audits] = await Promise.all([
    listAll("projects", "created_at").catch(() => []),
    listAll("project_categories", "created_at").catch(() => []),
    listAll("courses", "created_at").catch(() => []),
    listAll("course_categories", "created_at").catch(() => []),
    listAll("certificates", "created_at").catch(() => []),
    listAll("contact_messages", "created_at").catch(() => []),
    admin.supabase.from("audit_logs").select("action, table_name, created_at").order("created_at", { ascending: false }).limit(8).then((r) => r.data || []),
  ]);
  const pub = projects.filter((p) => p.status === "published").length;
  const draft = projects.filter((p) => p.status === "draft").length;
  const coursesPub = courses.filter((c) => c.status === "published").length;
  const unread = messages.filter((m) => !m.is_read && !m.is_archived).length;

  const quick = [
    ["projects", "Manage projects"], ["project-categories", "Project categories"],
    ["courses", "Manage courses"], ["course-categories", "Course categories"],
    ["experience", "Manage experience"], ["skills", "Manage skills"],
    ["media", "Media library"], ["contact", "Contact & messages"],
  ];

  container.innerHTML = `
    <div class="page-head">
      <div><h1>Dashboard</h1><p>Welcome back. Manage your portfolio content from here.</p></div>
      <a class="btn btn-primary" href="index.html?preview=1" target="_blank" rel="noopener">Preview website</a>
    </div>
    <div class="stats" style="margin-bottom:22px">
      <div class="stat"><div class="n">${projects.length}</div><div class="l">Total projects</div></div>
      <div class="stat"><div class="n">${pub}</div><div class="l">Published projects</div></div>
      <div class="stat"><div class="n">${draft}</div><div class="l">Draft projects</div></div>
      <div class="stat"><div class="n">${projCats.length}</div><div class="l">Project categories</div></div>
      <div class="stat"><div class="n">${courses.length}</div><div class="l">Total courses</div></div>
      <div class="stat"><div class="n">${coursesPub}</div><div class="l">Published courses</div></div>
      <div class="stat"><div class="n">${courseCats.length}</div><div class="l">Course categories</div></div>
      <div class="stat"><div class="n">${unread}</div><div class="l">Unread messages</div></div>
    </div>
    <div class="grid2">
      <div class="card">
        <div style="font-weight:700;margin-bottom:14px">Quick edit</div>
        <div class="quick">${quick.map(([k, l]) => `<a data-go="${k}">${esc(l)}</a>`).join("")}</div>
      </div>
      <div class="card">
        <div style="font-weight:700;margin-bottom:14px">Recent updates</div>
        ${audits.length ? `<ul class="recent">${audits.map((a) =>
          `<li><span><strong style="text-transform:capitalize">${esc(a.action)}</strong> <span style="color:var(--color-text-muted)">${esc(a.table_name.replace(/_/g, " "))}</span></span><span class="when">${esc(formatDate(a.created_at))}</span></li>`).join("")}</ul>`
          : `<p style="font-size:14px;color:var(--color-text-muted)">No changes recorded yet. Edits will appear here.</p>`}
      </div>
    </div>`;
  container.querySelectorAll("[data-go]").forEach((a) => (a.onclick = () => { location.hash = a.dataset.go; }));
}

boot();
