// "Courses" — completed courses grouped by provider. Landing shows provider
// cards (click "Anthropic" to see its courses) + a full filterable list, and a
// detail view per course with a certificate viewer. Same router pattern as
// js/work.js so behaviour and URLs stay consistent.
import { getClient, getAdmin, isConfigured } from "./supabaseClient.js";
import { FALLBACK } from "./fallback.js";
import { esc, escAttr, safeUrl, formatDate, icon, slugify } from "./helpers.js";
import { initChrome, ROOT, rootHref, parseRoute, pushRoute } from "./chrome.js";

const BASE = "courses";
const app = () => document.getElementById("courses-app");
let STATE = { courses: [], categories: [], providers: [], loaded: false, previewDrafts: false };

// ── Data ────────────────────────────────────────────────────────────────────
async function loadData(includeDrafts) {
  if (!isConfigured()) {
    const courses = (FALLBACK.certificates || []).map((c, i) => ({
      id: `demo-${i}`, title: c.title, slug: slugify(c.title), provider: c.organization || "Other",
      short_description: c.description, description: c.description, skills: "", instructor: "",
      completion_date: c.issue_date, certificate_image: c.image_url, certificate_file: c.file_url,
      verify_url: c.verify_url, status: "published", category: null,
    }));
    return { courses, categories: [] };
  }
  const supabase = getClient();
  const statuses = includeDrafts ? ["published", "draft", "hidden"] : ["published"];
  const [courses, cats] = await Promise.all([
    supabase.from("courses").select("*").in("status", statuses).order("display_order"),
    supabase.from("course_categories").select("*").order("display_order"),
  ]);
  const categories = cats.data || [];
  const catById = new Map(categories.map((c) => [c.id, c]));
  const list = (courses.data || []).map((c) => ({ ...c, category: c.category_id ? catById.get(c.category_id) : null }));
  return { courses: list, categories };
}

function providerSlug(name) { return slugify(name || "other") || "other"; }
function skillList(c) { return (c.skills || "").split(",").map((s) => s.trim()).filter(Boolean); }
function courseYear(c) { return c.completion_date ? new Date(c.completion_date).getFullYear() : null; }

async function ensureLoaded() {
  if (STATE.loaded) return;
  const data = await loadData(STATE.previewDrafts);
  STATE.courses = data.courses;
  STATE.categories = data.categories;
  const map = new Map();
  for (const c of STATE.courses) {
    const key = providerSlug(c.provider);
    if (!map.has(key)) map.set(key, { slug: key, name: c.provider || "Other", logo: c.provider_logo || null, courses: [] });
    map.get(key).courses.push(c);
  }
  STATE.providers = [...map.values()].sort((a, b) => b.courses.length - a.courses.length);
  STATE.loaded = true;
}

// ── Router ──────────────────────────────────────────────────────────────────
async function route() {
  await ensureLoaded();
  const { segments } = parseRoute(BASE);
  const [a, b] = segments;
  window.scrollTo({ top: 0, behavior: "auto" });
  if (a === "all") return viewAll();
  if (a && b) return viewCourse(a, b);
  if (a) return viewProvider(a);
  return viewLanding();
}
function go(segments) { pushRoute(segments); route(); }
document.addEventListener("click", (e) => {
  const el = e.target.closest("a[data-route]");
  if (!el) return;
  e.preventDefault();
  go(el.dataset.route.split("/").filter(Boolean));
});
window.addEventListener("popstate", route);

// ── Shared bits ─────────────────────────────────────────────────────────────
function transition(html) {
  const host = app();
  host.innerHTML = html;
  host.classList.remove("view-in");
  void host.offsetWidth;
  host.classList.add("view-in");
  // Safety net: a running CSS animation with fill:both overrides inline styles,
  // so if the enter frames never composite (e.g. rendered in a background tab)
  // the content stays stuck at opacity:0. Dropping the class reverts to the
  // visible base state. animationend covers the normal case; the timeout /
  // visibilitychange cover the stalled case.
  const reveal = () => host.classList.remove("view-in");
  host.addEventListener("animationend", reveal, { once: true });
  setTimeout(reveal, 600);
  document.addEventListener("visibilitychange", reveal, { once: true });
}
function breadcrumb(items) {
  return `<nav class="crumbs" aria-label="Breadcrumb">${items
    .map((it) => it.route
      ? `<a data-route="${escAttr(it.route)}" href="${escAttr(rootHref(it.route))}">${esc(it.label)}</a>`
      : `<span aria-current="page">${esc(it.label)}</span>`)
    .join('<span class="sep">/</span>')}</nav>`;
}
function courseCard(c) {
  const route = `${BASE}/${providerSlug(c.provider)}/${c.slug}`;
  const skills = skillList(c).slice(0, 4).map((s) => `<span class="tag">${esc(s)}</span>`).join("");
  const thumb = c.certificate_image
    ? `<img src="${escAttr(c.certificate_image)}" alt="${escAttr(c.certificate_alt || c.title)}" loading="lazy" />`
    : `<span>${esc((c.provider || c.title).toUpperCase())}</span>`;
  return `
    <article class="course-card">
      <a class="cc-thumb" data-route="${route}" href="${escAttr(rootHref(route))}" aria-label="${escAttr(c.title)}">${thumb}</a>
      <div class="cc-body">
        <div class="wp-meta">
          ${c.featured ? `<span class="wp-flag">★ Featured</span>` : ""}
          ${c.provider ? `<span class="wp-cat">${esc(c.provider)}</span>` : ""}
          ${c.completion_date ? `<span class="wp-date">${esc(formatDate(c.completion_date))}</span>` : ""}
        </div>
        <h3><a data-route="${route}" href="${escAttr(rootHref(route))}">${esc(c.title)}</a></h3>
        ${c.instructor ? `<div class="wp-sub">Instructor: ${esc(c.instructor)}</div>` : ""}
        <p>${esc(c.short_description)}</p>
        <div class="wp-tags">${skills}</div>
        <div class="wp-actions">
          <a class="btn btn-primary btn-sm" data-route="${route}" href="${escAttr(rootHref(route))}">View details ${icon("arrow")}</a>
          ${c.certificate_image || c.certificate_file ? `<a class="btn btn-outline btn-sm" href="${safeUrl(c.certificate_image || c.certificate_file)}" target="_blank" rel="noopener">Certificate ${icon("external")}</a>` : ""}
        </div>
      </div>
    </article>`;
}

// ── View: landing (provider groups + featured) ──────────────────────────────
function viewLanding() {
  const featured = STATE.courses.filter((c) => c.featured);
  const providerCards = STATE.providers.map((pr) => {
    const media = pr.logo ? `<img src="${escAttr(pr.logo)}" alt="" loading="lazy" />` : `<span class="wc-ic">${icon("brain")}</span>`;
    return `
      <a class="wc-card" data-route="${BASE}/${pr.slug}" href="${escAttr(rootHref(`${BASE}/${pr.slug}`))}">
        <div class="wc-media">${media}</div>
        <div class="wc-info">
          <h3>${esc(pr.name)}</h3>
          <span class="wc-count">${pr.courses.length} ${pr.courses.length === 1 ? "course" : "courses"} ${icon("arrow")}</span>
        </div>
      </a>`;
  }).join("");

  transition(`
    <header class="work-hero">
      <span class="eyebrow">LEARNING</span>
      <h1>My <span class="grad">Courses</span></h1>
      <p>Courses and certifications I've completed — grouped by provider. Click a provider to see its courses.</p>
      <div class="search-box">
        <span class="search-ic">${icon("globe")}</span>
        <input id="course-search" type="search" placeholder="Search courses, providers, skills…" aria-label="Search courses" />
      </div>
      <div class="hero-actions">
        <a class="btn btn-primary" data-route="${BASE}/all" href="${escAttr(rootHref(`${BASE}/all`))}">View all courses ${icon("arrow")}</a>
      </div>
    </header>
    <div id="courses-results"></div>
    <div id="courses-groups">
      ${featured.length ? `<section class="cs-section"><div class="section-head"><h2>Featured</h2></div><div class="course-grid">${featured.map(courseCard).join("")}</div></section>` : ""}
      <section class="cs-section">
        <div class="section-head"><h2>Providers</h2></div>
        ${STATE.providers.length ? `<div class="wc-grid">${providerCards}</div>` : emptyState("No courses yet", "Courses you publish will appear here, grouped by provider.")}
      </section>
    </div>`);

  // Same search behaviour as the My Work landing: typing swaps the grouped
  // sections for a flat result grid, clearing restores them.
  const input = document.getElementById("course-search");
  const results = document.getElementById("courses-results");
  const groups = document.getElementById("courses-groups");
  const run = (q) => {
    q = q.trim().toLowerCase();
    if (!q) { results.innerHTML = ""; groups.style.display = ""; return; }
    groups.style.display = "none";
    const matches = STATE.courses.filter((c) => searchCourse(c, q));
    results.innerHTML = `
      <div class="results-head"><h2>${matches.length} result${matches.length === 1 ? "" : "s"} for “${esc(q)}”</h2>
        <button class="btn btn-ghost btn-sm" id="clear-search">Clear</button></div>
      ${matches.length ? `<div class="course-grid">${matches.map(courseCard).join("")}</div>` : emptyState("No matches", "Try a different keyword, provider or skill.")}`;
    document.getElementById("clear-search").onclick = () => { input.value = ""; run(""); };
  };
  let t;
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => run(input.value), 180); });
}

function searchCourse(c, q) {
  const hay = [c.title, c.provider, c.instructor, c.short_description, c.description, c.category && c.category.name, ...skillList(c)]
    .filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q);
}

// ── View: single provider ───────────────────────────────────────────────────
function viewProvider(slug) {
  const pr = STATE.providers.find((p) => p.slug === slug);
  if (!pr) return notFound("Provider not found", "No courses are listed under this provider.");
  transition(`
    ${breadcrumb([{ label: "Courses", route: BASE }, { label: pr.name }])}
    <header class="cat-head">
      <div><h1>${esc(pr.name)}</h1><p>Courses completed through ${esc(pr.name)}.</p></div>
      <span class="cat-count">${pr.courses.length} ${pr.courses.length === 1 ? "course" : "courses"}</span>
    </header>
    <div class="course-grid">${pr.courses.map(courseCard).join("")}</div>`);
}

// ── View: all courses (filters) ─────────────────────────────────────────────
function viewAll() {
  const providers = [...new Set(STATE.courses.map((c) => c.provider).filter(Boolean))].sort();
  const cats = STATE.categories.map((c) => c.name);
  const years = [...new Set(STATE.courses.map(courseYear).filter(Boolean))].sort((a, b) => b - a);
  const skills = [...new Set(STATE.courses.flatMap(skillList))].sort();

  transition(`
    ${breadcrumb([{ label: "Courses", route: BASE }, { label: "All courses" }])}
    <header class="cat-head"><div><h1>All Courses</h1><p>Filter and search across everything I've completed.</p></div>
      <span class="cat-count">${STATE.courses.length} total</span></header>
    <div class="toolbar">
      <div class="search-box inline"><span class="search-ic">${icon("globe")}</span>
        <input id="cq" type="search" placeholder="Search courses, skills…" aria-label="Search courses" /></div>
      ${provSel("fProv", "Provider", providers)}
      ${provSel("fCat", "Category", cats)}
      ${provSel("fYear", "Year", years)}
      ${provSel("fSkill", "Skill", skills)}
      <div class="toolbar-group"><label>Sort</label><select id="fSort" class="mini-select">
        <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="featured">Featured first</option></select></div>
    </div>
    <div id="all-grid"></div>`);

  const grid = document.getElementById("all-grid");
  const cq = document.getElementById("cq");
  const get = (id) => document.getElementById(id);
  const paint = () => {
    const q = cq.value.trim().toLowerCase();
    let list = STATE.courses.filter((c) => {
      if (get("fProv").value && c.provider !== get("fProv").value) return false;
      if (get("fCat").value && (!c.category || c.category.name !== get("fCat").value)) return false;
      if (get("fYear").value && String(courseYear(c)) !== get("fYear").value) return false;
      if (get("fSkill").value && !skillList(c).includes(get("fSkill").value)) return false;
      if (q) {
        const hay = [c.title, c.provider, c.instructor, c.short_description, c.description, c.skills, c.category && c.category.name].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const mode = get("fSort").value;
    const d = (c) => (c.completion_date ? new Date(c.completion_date).getTime() : 0);
    if (mode === "oldest") list.sort((a, b) => (d(a) || Infinity) - (d(b) || Infinity));
    else if (mode === "featured") list.sort((a, b) => (b.featured - a.featured) || (a.featured_order - b.featured_order));
    else list.sort((a, b) => d(b) - d(a));
    grid.innerHTML = list.length ? `<div class="course-grid">${list.map(courseCard).join("")}</div>` : emptyState("No matches", "Adjust the filters or search term.");
  };
  ["fProv", "fCat", "fYear", "fSkill", "fSort"].forEach((id) => get(id).addEventListener("change", paint));
  let t; cq.addEventListener("input", () => { clearTimeout(t); t = setTimeout(paint, 180); });
  paint();
}
function provSel(id, label, values) {
  return `<div class="toolbar-group"><label>${esc(label)}</label><select id="${id}" class="mini-select"><option value="">All</option>${values.map((v) => `<option value="${escAttr(v)}">${esc(v)}</option>`).join("")}</select></div>`;
}

// ── View: course detail (with certificate viewer) ───────────────────────────
function viewCourse(provSlugArg, courseSlug) {
  const c = STATE.courses.find((x) => x.slug === courseSlug);
  if (!c) return notFound("Course not found", "This course may be unpublished or the link is out of date.");
  const pr = STATE.providers.find((p) => p.slug === providerSlug(c.provider));
  const facts = [
    c.provider && ["Provider", c.provider],
    c.instructor && ["Instructor", c.instructor],
    c.completion_date && ["Completed", formatDate(c.completion_date)],
    c.category && ["Category", c.category.name],
    c.certificate_id && ["Certificate ID", c.certificate_id],
  ].filter(Boolean);
  const skills = skillList(c);
  const hasCert = c.certificate_image || c.certificate_file;

  transition(`
    ${breadcrumb([{ label: "Courses", route: BASE }, { label: c.provider || "Provider", route: `${BASE}/${providerSlug(c.provider)}` }, { label: c.title }])}
    <article class="project-detail">
      <header class="pd-head" style="margin-top:8px">
        ${c.category ? `<div class="pd-cats"><span class="tag">${esc(c.category.name)}</span></div>` : ""}
        <h1>${esc(c.title)}</h1>
        ${c.short_description ? `<p class="pd-lead">${esc(c.short_description)}</p>` : ""}
        <div class="pd-links">
          ${hasCert ? `<button class="btn btn-primary btn-sm" id="view-cert">View Certificate ${icon("external")}</button>` : ""}
          ${c.verify_url ? `<a class="btn btn-outline btn-sm" href="${safeUrl(c.verify_url)}" target="_blank" rel="noopener">Verify ${icon("external")}</a>` : ""}
          ${c.course_url ? `<a class="btn btn-outline btn-sm" href="${safeUrl(c.course_url)}" target="_blank" rel="noopener">Go to course ${icon("external")}</a>` : ""}
        </div>
      </header>
      ${facts.length ? `<div class="pd-facts">${facts.map(([k, v]) => `<div class="fact"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`).join("")}</div>` : ""}
      ${c.description ? `<section class="pd-block"><h2>About this course</h2><p class="pd-text">${esc(c.description).replace(/\n/g, "<br>")}</p></section>` : ""}
      ${skills.length ? `<section class="pd-block"><h2>Skills learned</h2><div class="pd-tags">${skills.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div></section>` : ""}
      ${c.certificate_image ? `<section class="pd-block"><h2>Certificate</h2><div class="cert-preview"><img src="${escAttr(c.certificate_image)}" alt="${escAttr(c.certificate_alt || (c.title + ' certificate'))}" /></div></section>` : ""}
      <div class="pd-foot"><a class="btn btn-ghost" data-route="${BASE}/${providerSlug(c.provider)}" href="${escAttr(rootHref(`${BASE}/${providerSlug(c.provider)}`))}">${icon("arrow")} Back to ${esc(c.provider || "Courses")}</a></div>
    </article>
    <div id="lightbox" class="lightbox" hidden></div>`);

  const btn = document.getElementById("view-cert");
  if (btn) btn.onclick = () => openCert(c);
}

function openCert(c) {
  const box = document.getElementById("lightbox");
  const isPdf = c.certificate_file && !c.certificate_image;
  const src = c.certificate_image || c.certificate_file;
  box.innerHTML = `<button class="lb-close" aria-label="Close">×</button>${
    isPdf || /\.pdf($|\?)/i.test(src)
      ? `<iframe src="${escAttr(safeUrl(src))}" title="Certificate" style="width:90vw;height:85vh;border:0;border-radius:12px;background:#fff"></iframe>`
      : `<img src="${escAttr(src)}" alt="${escAttr(c.title + ' certificate')}" />`}`;
  box.hidden = false;
  box.querySelector(".lb-close").onclick = () => (box.hidden = true);
  box.onclick = (e) => { if (e.target === box) box.hidden = true; };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") box.hidden = true; });
}

// ── Empty / not-found ───────────────────────────────────────────────────────
function emptyState(title, text) {
  return `<div class="empty-state"><div class="empty-ic">${icon("sparkles")}</div><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
}
function notFound(title, text) {
  transition(`<div class="empty-state big"><div class="empty-ic">${icon("brain")}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>
    <a class="btn btn-primary" data-route="${BASE}" href="${escAttr(rootHref(BASE))}">Back to Courses</a></div>`);
}

// ── Boot ────────────────────────────────────────────────────────────────────
async function main() {
  app().innerHTML = `<div class="loading-grid">${Array.from({ length: 4 }).map(() => `<div class="skeleton"></div>`).join("")}</div>`;
  const admin = await getAdmin().catch(() => null);
  STATE.previewDrafts = admin !== null && new URLSearchParams(location.search).get("preview") === "1";
  const bar = document.getElementById("preview-bar");
  if (STATE.previewDrafts && bar) { bar.className = "notice-bar"; bar.textContent = "Draft preview — you are seeing unpublished courses."; }
  await initChrome("courses");
  await route();
}
main();
