// "My Work" — dynamic, DB-driven project gallery with three views handled by a
// tiny client router: category grid  ->  category gallery  ->  project detail.
// Clean URLs (/work/<category>/<project>) via the History API, with a query
// fallback so deep links work on any host.
import { getClient, getAdmin, isConfigured } from "./supabaseClient.js";
import { FALLBACK } from "./fallback.js";
import { esc, escAttr, safeUrl, formatDate, icon, slugify } from "./helpers.js";
import { initChrome, ROOT, rootHref, parseRoute, pushRoute } from "./chrome.js";

const BASE = "work";
const app = () => document.getElementById("work-app");
let STATE = { categories: [], projects: [], byCat: new Map(), loaded: false, previewDrafts: false };

// ── Data ────────────────────────────────────────────────────────────────────
async function loadData(includeDrafts) {
  if (!isConfigured()) {
    // Demo mode: no categories, just the fallback projects in one gallery.
    const projects = FALLBACK.projects.map((p, i) => normalizeFallback(p, i));
    return { categories: [], projects };
  }
  const supabase = getClient();
  const statuses = includeDrafts ? ["published", "draft", "hidden"] : ["published"];
  const [cats, projs, map, tech, imgs, vids] = await Promise.all([
    supabase.from("project_categories").select("*").order("display_order"),
    supabase.from("projects").select("*").in("status", statuses).order("display_order"),
    supabase.from("project_category_map").select("*"),
    supabase.from("project_technologies").select("*").order("display_order"),
    supabase.from("project_images").select("*").order("display_order"),
    supabase.from("project_videos").select("*").order("display_order"),
  ]);
  const categories = cats.data || [];
  const catById = new Map(categories.map((c) => [c.id, c]));
  const projects = (projs.data || []).map((p) => {
    const mapped = (map.data || []).filter((m) => m.project_id === p.id).map((m) => catById.get(m.category_id)).filter(Boolean);
    const catList = mapped.length ? mapped : (p.category_id && catById.get(p.category_id) ? [catById.get(p.category_id)] : []);
    return {
      ...p,
      cats: catList,
      tools: (tech.data || []).filter((t) => t.project_id === p.id).map((t) => t.name),
      images: (imgs.data || []).filter((i) => i.project_id === p.id),
      videos: (vids.data || []).filter((v) => v.project_id === p.id),
    };
  });
  return { categories, projects };
}

function normalizeFallback(p, i) {
  return {
    id: `demo-${i}`, title: p.title, slug: slugify(p.title), short_description: p.short_description,
    cover_image: p.cover_image, cats: [], tools: p.technologies || [], images: [], videos: [],
    project_url: p.project_url, project_date: null, status: "published",
  };
}

// ── Router ──────────────────────────────────────────────────────────────────
async function ensureLoaded() {
  if (STATE.loaded) return;
  const data = await loadData(STATE.previewDrafts);
  STATE.categories = data.categories;
  STATE.projects = data.projects;
  STATE.byCat = new Map();
  for (const c of STATE.categories) {
    STATE.byCat.set(c.slug, STATE.projects.filter((p) => p.cats.some((x) => x.id === c.id)));
  }
  STATE.loaded = true;
}

async function route() {
  await ensureLoaded();
  const { segments, query } = parseRoute(BASE);
  const [catSlug, projSlug] = segments;
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  if (catSlug && projSlug) return viewProject(catSlug, projSlug);
  if (catSlug) return viewCategory(catSlug);
  return viewLanding(query.get("q") || "");
}

function go(segments) {
  pushRoute(segments);
  route();
}

// Intercept internal work links so navigation is instant (no full reload).
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-route]");
  if (!a) return;
  e.preventDefault();
  go(a.dataset.route.split("/").filter(Boolean));
});
window.addEventListener("popstate", route);

// ── Shared UI bits ──────────────────────────────────────────────────────────
function transition(html) {
  const host = app();
  host.innerHTML = html;
  host.classList.remove("view-in");
  void host.offsetWidth; // reflow to restart the animation
  host.classList.add("view-in");
}
function breadcrumb(items) {
  return `<nav class="crumbs" aria-label="Breadcrumb">${items
    .map((it, i) => it.route
      ? `<a data-route="${escAttr(it.route)}" href="${escAttr(rootHref(it.route))}">${esc(it.label)}</a>`
      : `<span aria-current="page">${esc(it.label)}</span>`)
    .join('<span class="sep">/</span>')}</nav>`;
}
function projectCard(p) {
  const cat = p.cats[0];
  const route = cat ? `${BASE}/${cat.slug}/${p.slug}` : `${BASE}/all/${p.slug}`;
  const thumb = p.cover_image
    ? `<img src="${escAttr(p.cover_image)}" alt="${escAttr(p.cover_alt || p.title)}" loading="lazy" />`
    : `<span>${esc(p.title)}</span>`;
  const tools = p.tools.slice(0, 4).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
  return `
    <article class="wp-card">
      <a class="wp-thumb" data-route="${route}" href="${escAttr(rootHref(route))}" aria-label="${escAttr(p.title)}">${thumb}
        ${p.featured ? `<span class="wp-flag">★ Featured</span>` : ""}
      </a>
      <div class="wp-body">
        <div class="wp-meta">
          ${cat ? `<span class="wp-cat">${esc(cat.name)}</span>` : ""}
          ${p.project_date ? `<span class="wp-date">${esc(formatDate(p.project_date))}</span>` : ""}
        </div>
        <h3><a data-route="${route}" href="${escAttr(rootHref(route))}">${esc(p.title)}</a></h3>
        <p>${esc(p.short_description)}</p>
        ${p.project_type || p.client_name ? `<div class="wp-sub">${p.project_type ? esc(p.project_type) : ""}${p.project_type && p.client_name ? " · " : ""}${p.client_name ? `Client: ${esc(p.client_name)}` : ""}</div>` : ""}
        <div class="wp-tags">${tools}</div>
        <div class="wp-actions">
          <a class="btn btn-primary btn-sm" data-route="${route}" href="${escAttr(rootHref(route))}">View Project ${icon("arrow")}</a>
          ${p.project_url ? `<a class="btn btn-outline btn-sm" href="${safeUrl(p.project_url)}" target="_blank" rel="noopener">Live ${icon("external")}</a>` : ""}
        </div>
      </div>
    </article>`;
}

// ── View: landing (category grid + search) ──────────────────────────────────
function viewLanding(initialQuery) {
  const cats = STATE.categories;
  const catCards = cats.map((c) => {
    const count = (STATE.byCat.get(c.slug) || []).length;
    const media = c.cover_image
      ? `<img src="${escAttr(c.cover_image)}" alt="" loading="lazy" />`
      : `<span class="wc-ic">${icon(c.icon || "sparkles")}</span>`;
    return `
      <a class="wc-card" data-route="${BASE}/${c.slug}" href="${escAttr(rootHref(`${BASE}/${c.slug}`))}">
        <div class="wc-media">${media}</div>
        <div class="wc-info">
          <h3>${esc(c.name)}</h3>
          ${c.description ? `<p>${esc(c.description)}</p>` : ""}
          <span class="wc-count">${count} ${count === 1 ? "project" : "projects"} ${icon("arrow")}</span>
        </div>
      </a>`;
  }).join("");

  transition(`
    <header class="work-hero">
      <span class="eyebrow">PORTFOLIO</span>
      <h1>My <span class="grad">Work</span></h1>
      <p>Explore my projects by category — from design and development to branding and AI.</p>
      <div class="search-box">
        <span class="search-ic">${icon("globe")}</span>
        <input id="work-search" type="search" placeholder="Search projects, tools, categories…" value="${escAttr(initialQuery)}" aria-label="Search projects" />
      </div>
    </header>
    <div id="work-results"></div>
    <section id="work-cats">
      ${cats.length ? `<div class="wc-grid">${catCards}</div>` : (STATE.projects.length
        ? `<div class="wp-grid">${STATE.projects.map(projectCard).join("")}</div>`
        : emptyState("No work to show yet", "Projects you publish will appear here, grouped by category."))}
    </section>`);

  const input = document.getElementById("work-search");
  const results = document.getElementById("work-results");
  const catsSec = document.getElementById("work-cats");
  const run = (q) => {
    q = q.trim().toLowerCase();
    if (!q) { results.innerHTML = ""; catsSec.style.display = ""; return; }
    catsSec.style.display = "none";
    const matches = STATE.projects.filter((p) => searchProject(p, q));
    results.innerHTML = `
      <div class="results-head"><h2>${matches.length} result${matches.length === 1 ? "" : "s"} for “${esc(q)}”</h2>
        <button class="btn btn-ghost btn-sm" id="clear-search">Clear</button></div>
      ${matches.length ? `<div class="wp-grid">${matches.map(projectCard).join("")}</div>` : emptyState("No matches", "Try a different keyword, tool or category name.")}`;
    document.getElementById("clear-search").onclick = () => { input.value = ""; run(""); };
  };
  let t;
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => run(input.value), 180); });
  if (initialQuery) run(initialQuery);
}

function searchProject(p, q) {
  const hay = [p.title, p.short_description, p.project_type, p.client_name, ...(p.tools || []), ...p.cats.map((c) => c.name)]
    .filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q);
}

// ── View: single category (gallery + filters/sort) ──────────────────────────
function viewCategory(slug) {
  const cat = STATE.categories.find((c) => c.slug === slug);
  const all = slug === "all" ? STATE.projects.slice() : (STATE.byCat.get(slug) || []);
  const title = cat ? cat.name : (slug === "all" ? "All Projects" : "Category");
  if (!cat && slug !== "all") return notFound("Category not found", "This category may have been renamed or removed.");

  const tools = [...new Set(all.flatMap((p) => p.tools))].sort();
  const types = [...new Set(all.map((p) => p.project_type).filter(Boolean))].sort();

  transition(`
    ${breadcrumb([{ label: "My Work", route: BASE }, { label: title }])}
    <header class="cat-head">
      <div>
        <h1>${esc(title)}</h1>
        ${cat && cat.description ? `<p>${esc(cat.description)}</p>` : ""}
      </div>
      <span class="cat-count">${all.length} ${all.length === 1 ? "project" : "projects"}</span>
    </header>
    <div class="toolbar">
      <div class="toolbar-group">
        <label>Sort</label>
        <select id="sort" class="mini-select">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="featured">Featured first</option>
        </select>
      </div>
      ${tools.length ? `<div class="toolbar-group"><label>Tool</label><select id="fTool" class="mini-select"><option value="">All tools</option>${tools.map((t) => `<option value="${escAttr(t)}">${esc(t)}</option>`).join("")}</select></div>` : ""}
      ${types.length ? `<div class="toolbar-group"><label>Type</label><select id="fType" class="mini-select"><option value="">All types</option>${types.map((t) => `<option value="${escAttr(t)}">${esc(t)}</option>`).join("")}</select></div>` : ""}
    </div>
    <div id="cat-grid"></div>`);

  const grid = document.getElementById("cat-grid");
  const sortSel = document.getElementById("sort");
  const toolSel = document.getElementById("fTool");
  const typeSel = document.getElementById("fType");
  const paint = () => {
    let list = all.slice();
    if (toolSel && toolSel.value) list = list.filter((p) => p.tools.includes(toolSel.value));
    if (typeSel && typeSel.value) list = list.filter((p) => p.project_type === typeSel.value);
    list = sortProjects(list, sortSel.value);
    grid.innerHTML = list.length
      ? `<div class="wp-grid">${list.map(projectCard).join("")}</div>`
      : emptyState("No projects match", "Adjust the filters to see more work.");
  };
  [sortSel, toolSel, typeSel].forEach((s) => s && s.addEventListener("change", paint));
  paint();
}

function sortProjects(list, mode) {
  const d = (p) => (p.project_date ? new Date(p.project_date).getTime() : 0);
  if (mode === "oldest") return list.sort((a, b) => (d(a) || Infinity) - (d(b) || Infinity));
  if (mode === "featured") return list.sort((a, b) => (b.featured - a.featured) || (a.featured_order - b.featured_order));
  return list.sort((a, b) => d(b) - d(a)); // newest
}

// ── View: project detail ────────────────────────────────────────────────────
function viewProject(catSlug, projSlug) {
  const p = STATE.projects.find((x) => x.slug === projSlug);
  if (!p) return notFound("Project not found", "This project may be unpublished or the link is out of date.");
  const cat = STATE.categories.find((c) => c.slug === catSlug) || p.cats[0];
  const backRoute = cat ? `${BASE}/${cat.slug}` : BASE;

  const meta = [
    p.project_date && ["Date", formatDate(p.project_date)],
    p.project_type && ["Type", p.project_type],
    p.client_name && ["Client", p.client_name],
    p.duration_text && ["Duration", p.duration_text],
    p.role && ["My role", p.role],
    p.project_state && ["Status", p.project_state.replace(/-/g, " ")],
  ].filter(Boolean);

  const links = [
    p.project_url && ["Live site", p.project_url],
    p.behance_url && ["Behance", p.behance_url],
    p.github_url && ["GitHub", p.github_url],
  ].filter(Boolean);

  const section = (title, body) => body ? `<section class="pd-block"><h2>${esc(title)}</h2>${body}</section>` : "";
  const para = (t) => t ? `<p class="pd-text">${esc(t).replace(/\n/g, "<br>")}</p>` : "";

  const gallery = p.images.length ? `<div class="pd-gallery">${p.images
    .map((im, i) => `<button class="pd-shot" data-shot="${i}"><img src="${escAttr(im.url)}" alt="${escAttr(im.alt)}" loading="lazy" /></button>`).join("")}</div>` : "";

  const videos = p.videos.length ? `<div class="pd-videos">${p.videos.map(videoEmbed).join("")}</div>` : "";

  transition(`
    ${breadcrumb([{ label: "My Work", route: BASE }, { label: cat ? cat.name : "Project", route: cat ? `${BASE}/${cat.slug}` : null }, { label: p.title }])}
    <article class="project-detail">
      <div class="pd-cover">${p.cover_image ? `<img src="${escAttr(p.cover_image)}" alt="${escAttr(p.cover_alt || p.title)}" />` : `<span>${esc(p.title)}</span>`}</div>
      <header class="pd-head">
        <div class="pd-cats">${p.cats.map((c) => `<a class="tag" data-route="${BASE}/${c.slug}" href="${escAttr(rootHref(`${BASE}/${c.slug}`))}">${esc(c.name)}</a>`).join("")}</div>
        <h1>${esc(p.title)}</h1>
        ${p.short_description ? `<p class="pd-lead">${esc(p.short_description)}</p>` : ""}
        ${links.length ? `<div class="pd-links">${links.map(([l, u]) => `<a class="btn btn-outline btn-sm" href="${safeUrl(u)}" target="_blank" rel="noopener">${esc(l)} ${icon("external")}</a>`).join("")}</div>` : ""}
      </header>

      ${meta.length ? `<div class="pd-facts">${meta.map(([k, v]) => `<div class="fact"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`).join("")}</div>` : ""}

      ${section("Overview", para(p.case_study || p.description))}
      ${section("Objectives", para(p.objectives))}
      ${p.tools.length ? section("Tools & Technologies", `<div class="pd-tags">${p.tools.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>`) : ""}
      ${section("Gallery", gallery)}
      ${section("Videos", videos)}
      ${section("Challenges & Solutions", para(p.challenges))}
      ${section("Final Outcome", para(p.outcome))}

      <div class="pd-foot">
        <a class="btn btn-ghost" data-route="${backRoute}" href="${escAttr(rootHref(backRoute))}">${icon("arrow")} Back to ${esc(cat ? cat.name : "My Work")}</a>
      </div>
    </article>
    <div id="lightbox" class="lightbox" hidden></div>`);

  wireLightbox(p.images);
}

function videoEmbed(v) {
  const url = String(v.url || "");
  if (v.provider === "file" || /\.(mp4|webm|ogg)(\?|$)/i.test(url)) {
    return `<div class="pd-video"><video src="${safeUrl(url)}" controls preload="metadata"></video></div>`;
  }
  const embed = toEmbedUrl(url);
  if (embed) return `<div class="pd-video"><iframe src="${escAttr(embed)}" title="${escAttr(v.title || "Project video")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  return `<a class="btn btn-outline btn-sm" href="${safeUrl(url)}" target="_blank" rel="noopener">Watch video ${icon("external")}</a>`;
}
function toEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (/youtube\.com$/.test(u.hostname) || u.hostname === "www.youtube.com") {
      const id = u.searchParams.get("v"); if (id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed/${encodeURIComponent(u.pathname.slice(1))}`;
    if (/vimeo\.com$/.test(u.hostname)) { const id = u.pathname.split("/").filter(Boolean).pop(); if (id) return `https://player.vimeo.com/video/${encodeURIComponent(id)}`; }
  } catch { /* ignore */ }
  return null;
}

function wireLightbox(images) {
  const box = document.getElementById("lightbox");
  if (!box) return;
  document.querySelectorAll("[data-shot]").forEach((b) => {
    b.onclick = () => {
      const im = images[Number(b.dataset.shot)];
      box.innerHTML = `<button class="lb-close" aria-label="Close">×</button><img src="${escAttr(im.url)}" alt="${escAttr(im.alt)}" />`;
      box.hidden = false;
      box.querySelector(".lb-close").onclick = () => (box.hidden = true);
      box.onclick = (e) => { if (e.target === box) box.hidden = true; };
    };
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") box.hidden = true; });
}

// ── Empty / not-found states ────────────────────────────────────────────────
function emptyState(title, text) {
  return `<div class="empty-state"><div class="empty-ic">${icon("sparkles")}</div><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
}
function notFound(title, text) {
  transition(`<div class="empty-state big"><div class="empty-ic">${icon("globe")}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>
    <a class="btn btn-primary" data-route="${BASE}" href="${escAttr(rootHref(BASE))}">Back to My Work</a></div>`);
}

// ── Boot ────────────────────────────────────────────────────────────────────
async function main() {
  app().innerHTML = `<div class="loading-grid">${Array.from({ length: 6 }).map(() => `<div class="skeleton"></div>`).join("")}</div>`;
  const admin = await getAdmin().catch(() => null);
  STATE.previewDrafts = admin !== null && new URLSearchParams(location.search).get("preview") === "1";
  const bar = document.getElementById("preview-bar");
  if (STATE.previewDrafts && bar) { bar.className = "notice-bar"; bar.textContent = "Draft preview — you are seeing unpublished work."; }
  await initChrome("work");
  await route();
}
main();
