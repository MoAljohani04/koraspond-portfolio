// Public portfolio: fetch published content and render it.
import { getClient, getAdmin, isConfigured } from "./supabaseClient.js";
import { FALLBACK } from "./fallback.js";
import {
  esc, escAttr, safeUrl, initials, formatDate, icon, socialIconName, slugify,
} from "./helpers.js";
import { initContactForm } from "./contact.js";

const $ = (id) => document.getElementById(id);

/** Load everything the page needs. Uses the database when configured,
 *  otherwise the built-in demo content. `includeDrafts` is honoured only for
 *  a signed-in admin (RLS blocks drafts for everyone else anyway). */
async function loadContent(includeDrafts) {
  if (!isConfigured()) return { data: FALLBACK, live: false };

  const supabase = getClient();
  const statuses = includeDrafts ? ["published", "draft"] : ["published"];

  const [
    settings, profile, hero, experiences, items, projects, tech, skills, certs, socials, contact,
    projectCategories, projectCatMap, courses,
  ] = await Promise.all([
    supabase.from("site_settings").select("*").limit(1).maybeSingle(),
    supabase.from("profile").select("*").limit(1).maybeSingle(),
    supabase.from("hero").select("*").limit(1).maybeSingle(),
    supabase.from("experiences").select("*").in("status", statuses).order("display_order"),
    supabase.from("experience_items").select("*").in("status", statuses).order("display_order"),
    supabase.from("projects").select("*").in("status", statuses).order("display_order"),
    supabase.from("project_technologies").select("*").order("display_order"),
    supabase.from("skills").select("*").in("status", statuses).order("display_order"),
    supabase.from("certificates").select("*").in("status", statuses).order("display_order"),
    supabase.from("social_links").select("*").in("status", statuses).order("display_order"),
    supabase.from("contact_settings").select("*").limit(1).maybeSingle(),
    supabase.from("project_categories").select("*").order("display_order"),
    supabase.from("project_category_map").select("*"),
    supabase.from("courses").select("*").in("status", statuses).order("display_order"),
  ]);

  const exps = experiences.data || [];
  for (const e of exps) e.items = (items.data || []).filter((i) => i.experience_id === e.id);
  const projs = projects.data || [];
  for (const p of projs) p.technologies = (tech.data || []).filter((t) => t.project_id === p.id);

  return {
    live: true,
    data: {
      settings: settings.data || FALLBACK.settings,
      profile: profile.data || FALLBACK.profile,
      hero: hero.data || FALLBACK.hero,
      experiences: exps,
      projects: projs,
      skills: skills.data || [],
      certificates: certs.data || [],
      socialLinks: socials.data || [],
      contact: contact.data || FALLBACK.contact,
      projectCategories: projectCategories.data || [],
      projectCatMap: projectCatMap.data || [],
      courses: courses.data || [],
    },
  };
}

function editChip(href, dark) {
  const cls = dark ? "edit-chip dark" : "edit-chip lightchip";
  return `<a class="${cls}" href="${href}" title="Edit">${icon("document", "")}Edit</a>`;
}

function render(content, isAdmin) {
  const {
    settings, profile, hero, experiences, projects, skills, certificates, socialLinks, contact,
    projectCategories = [], projectCatMap = [], courses = [],
  } = content;

  // Head / SEO
  document.title = settings.site_title || "Portfolio";
  $("meta-description").content = settings.meta_description || "";
  $("og-title").content = settings.site_title || "Portfolio";
  $("og-description").content = settings.meta_description || "";

  // Navbar
  $("brand-badge").textContent = initials(profile.full_name);
  $("brand-name").textContent = profile.full_name || "";
  $("brand-role").textContent = profile.headline_role || "";
  if (profile.cv_url) {
    const cv = $("nav-cv");
    cv.href = safeUrl(profile.cv_url);
    cv.hidden = false;
    cv.innerHTML = `Download CV ${icon("download")}`;
  }
  if (isAdmin) $("nav-dashboard").hidden = false;

  // Hero
  $("hero-eyebrow").textContent = hero.eyebrow || "";
  $("hero-headline").innerHTML =
    `${esc(hero.headline)}${hero.highlighted_text ? ` <span class="grad">${esc(hero.highlighted_text)}</span>` : ""}`;
  $("hero-desc").textContent = hero.description || "";
  if (hero.background_image) {
    const bg = $("hero-bg");
    bg.src = hero.background_image;
    bg.hidden = false;
  }
  const actions = [];
  if (hero.primary_visible && hero.primary_label)
    actions.push(`<a class="btn btn-primary" href="${safeUrl(hero.primary_url)}">${esc(hero.primary_label)} ${icon("arrow")}</a>`);
  if (hero.secondary_visible && hero.secondary_label)
    actions.push(`<a class="btn btn-outline" href="${safeUrl(hero.secondary_url)}">${esc(hero.secondary_label)} ${icon("mail")}</a>`);
  $("hero-actions").innerHTML = actions.join("");
  if (isAdmin) $("hero-edit").innerHTML = editChip("admin.html#hero", true);

  // Experience card (first experience)
  const exp = experiences[0];
  if (exp) {
    const logo = exp.logo_url
      ? `<img src="${escAttr(exp.logo_url)}" alt="${escAttr(exp.company)} logo" />`
      : `<span>${esc(exp.company.toUpperCase())}</span>`;
    $("experience").innerHTML = `
      <div class="exp-card">
        ${isAdmin ? `<div style="position:absolute;right:16px;top:16px">${editChip("admin.html#experience", true)}</div>` : ""}
        <div class="exp-head">
          <div class="exp-logo">${logo}</div>
          <div>
            <div class="exp-company">${esc(exp.company)}</div>
            <div class="exp-role">${esc(exp.role)}${exp.department ? ` – ${esc(exp.department)}` : ""}</div>
            ${exp.duration_label ? `<div class="exp-duration">${icon("calendar")}${esc(exp.duration_label)}</div>` : ""}
          </div>
        </div>
        ${exp.description ? `<p class="exp-desc">${esc(exp.description)}</p>` : ""}
        ${exp.employment_type ? `<span class="exp-tag">${esc(exp.employment_type.replace(/ Internship$/, " Experience"))}</span>` : ""}
      </div>`;
  }

  // What I worked on
  const items = experiences.flatMap((e) => e.items || []);
  if (items.length) {
    $("worked-on").hidden = false;
    $("worked-grid").innerHTML = items
      .map(
        (it) => `
      <article class="work-card">
        <div class="work-ic">${icon(it.icon)}</div>
        <h3>${esc(it.title)}</h3>
        <p>${esc(it.description)}</p>
      </article>`
      )
      .join("");
    if (isAdmin) $("worked-edit").innerHTML = editChip("admin.html#experience", false);
  }

  // Featured projects
  const featured = projects.filter((p) => p.featured).sort((a, b) => a.featured_order - b.featured_order);
  const list = featured.length ? featured : projects;
  if (list.length) {
    $("projects").hidden = false;
    $("projects-rail").innerHTML = list
      .map((p) => {
        const thumb = p.cover_image
          ? `<img src="${escAttr(p.cover_image)}" alt="${escAttr(p.title)}" />`
          : `<span>${esc(p.title)}</span>`;
        const title = p.project_url
          ? `<a href="${safeUrl(p.project_url)}" target="_blank" rel="noopener">${esc(p.title)}</a>`
          : esc(p.title);
        const tags = (p.technologies || []).map((t) => `<span class="tag">${esc(t.name)}</span>`).join("");
        return `
        <article class="proj-card">
          <div class="proj-thumb">${thumb}</div>
          <div class="proj-body">
            <h3>${title}</h3>
            <p>${esc(p.short_description)}</p>
            <div class="proj-tags">${tags}</div>
          </div>
        </article>`;
      })
      .join("");
    if (isAdmin) $("projects-edit").innerHTML = editChip("admin.html#projects", true);
    setupRail(Math.min(4, list.length));
  }

  // My Work categories preview
  renderWorkPreview(projectCategories, projects, projectCatMap, isAdmin);

  // Courses preview
  renderCoursesPreview(courses, isAdmin);

  // Skills
  $("skills-grid").innerHTML = skills
    .map((s) => {
      const badge = s.icon_url
        ? `<img src="${escAttr(s.icon_url)}" alt="${escAttr(s.name)}" />`
        : `<span class="skill-badge">${esc(s.name.slice(0, 2).toUpperCase())}</span>`;
      return `<div class="skill-tile" title="${escAttr(s.name)}">${badge}<span class="label">${esc(s.name)}</span></div>`;
    })
    .join("");
  if (isAdmin) $("skills-edit").innerHTML = editChip("admin.html#skills", false);

  // Certificates
  $("certs-list").innerHTML =
    certificates
      .map((c) => {
        const thumb = c.image_url
          ? `<img src="${escAttr(c.image_url)}" alt="${escAttr(c.title)}" />`
          : `<span>${esc((c.organization || c.title).toUpperCase())}</span>`;
        const link = c.verify_url || c.file_url;
        return `
      <article class="cert-card">
        <div class="cert-thumb">${thumb}</div>
        <div>
          <h3>${esc(c.title)}</h3>
          ${c.organization || c.issue_date ? `<p class="cert-org">${esc(c.organization)}${c.issue_date ? ` · ${esc(formatDate(c.issue_date))}` : ""}</p>` : ""}
          <p>${esc(c.description)}</p>
          ${link ? `<a class="cert-link" href="${safeUrl(link)}" target="_blank" rel="noopener">View Certificate ${icon("external")}</a>` : ""}
        </div>
      </article>`;
      })
      .join("") || `<p style="color:var(--color-text-muted);font-size:14px">No certificates published yet.</p>`;
  if (isAdmin) $("certs-edit").innerHTML = editChip("admin.html#certificates", false);

  // Contact
  $("contact-heading").innerHTML = `${esc(contact.heading)} ${isAdmin ? editChip("admin.html#contact", true) : ""}`;
  $("contact-desc").textContent = contact.description || "";
  $("socials").innerHTML = socialLinks
    .map(
      (l) => `<a class="social-link" href="${safeUrl(l.url)}" ${l.url.startsWith("mailto:") ? "" : 'target="_blank" rel="noopener"'} aria-label="${escAttr(l.label || l.platform)}">${icon(socialIconName(l.platform))}</a>`
    )
    .join("");

  initContactForm(contact);
}

/** Category cards on the homepage that link into work.html. */
function renderWorkPreview(categories, projects, catMap, isAdmin) {
  const section = $("work-preview");
  if (!section) return;
  const countFor = (cat) => {
    const mapped = catMap.filter((m) => m.category_id === cat.id).length;
    return mapped || projects.filter((p) => p.category_id === cat.id).length;
  };
  const cats = categories.filter((c) => countFor(c) > 0).slice(0, 6);
  if (!cats.length) return;
  section.hidden = false;
  $("work-cats-grid").innerHTML = cats
    .map((c) => {
      const count = countFor(c);
      const media = c.cover_image
        ? `<img src="${escAttr(c.cover_image)}" alt="" loading="lazy" />`
        : `<span class="wc-ic">${icon(c.icon || "sparkles")}</span>`;
      return `
      <a class="wc-card" href="work.html?c=${encodeURIComponent(c.slug)}">
        <div class="wc-media">${media}</div>
        <div class="wc-info">
          <h3>${esc(c.name)}</h3>
          ${c.description ? `<p>${esc(c.description)}</p>` : ""}
          <span class="wc-count">${count} ${count === 1 ? "project" : "projects"} ${icon("arrow")}</span>
        </div>
      </a>`;
    })
    .join("");
  if (isAdmin) $("work-preview-edit").innerHTML = editChip("admin.html#project-categories", false);
}

/** Course cards on the homepage that link into courses.html. */
function renderCoursesPreview(courses, isAdmin) {
  const section = $("courses-preview");
  if (!section) return;
  const featured = courses.filter((c) => c.featured);
  const list = (featured.length ? featured : courses).slice(0, 3);
  if (!list.length) return;
  section.hidden = false;
  $("courses-preview-grid").innerHTML = list
    .map((c) => {
      const provSlug = slugify(c.provider || "other") || "other";
      const href = `courses.html?c=${encodeURIComponent(provSlug)}&p=${encodeURIComponent(c.slug)}`;
      const thumb = c.certificate_image
        ? `<img src="${escAttr(c.certificate_image)}" alt="${escAttr(c.certificate_alt || c.title)}" loading="lazy" />`
        : `<span>${esc((c.provider || c.title).toUpperCase())}</span>`;
      const skills = (c.skills || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3)
        .map((s) => `<span class="tag">${esc(s)}</span>`).join("");
      return `
      <article class="course-card">
        <a class="cc-thumb" href="${href}" aria-label="${escAttr(c.title)}">${thumb}</a>
        <div class="cc-body">
          <div class="wp-meta">${c.provider ? `<span class="wp-cat">${esc(c.provider)}</span>` : ""}${c.completion_date ? `<span class="wp-date">${esc(formatDate(c.completion_date))}</span>` : ""}</div>
          <h3><a href="${href}">${esc(c.title)}</a></h3>
          <p>${esc(c.short_description)}</p>
          <div class="wp-tags">${skills}</div>
        </div>
      </article>`;
    })
    .join("");
  if (isAdmin) $("courses-preview-edit").innerHTML = editChip("admin.html#courses", true);
}

function setupRail(dotCount) {
  const rail = $("projects-rail");
  const dots = $("projects-dots");
  $("rail-prev").onclick = () => rail.scrollBy({ left: -rail.clientWidth * 0.8, behavior: "smooth" });
  $("rail-next").onclick = () => rail.scrollBy({ left: rail.clientWidth * 0.8, behavior: "smooth" });
  dots.innerHTML = Array.from({ length: dotCount }).map((_, i) => `<span class="dot${i === 0 ? " active" : ""}"></span>`).join("");
  rail.onscroll = () => {
    const max = Math.max(1, rail.scrollWidth - rail.clientWidth);
    const active = Math.round((rail.scrollLeft / max) * (dotCount - 1));
    dots.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("active", i === Math.min(active, dotCount - 1)));
  };
}

function setupNav() {
  const toggle = $("nav-toggle");
  const mobile = $("nav-mobile");
  toggle.addEventListener("click", () => {
    const open = mobile.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  mobile.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      mobile.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );
}

async function main() {
  setupNav();
  const admin = await getAdmin();
  const isAdmin = admin !== null;
  const previewDrafts = isAdmin && new URLSearchParams(location.search).get("preview") === "1";
  if (previewDrafts) {
    $("preview-bar").className = "notice-bar";
    $("preview-bar").textContent =
      "Draft preview — you are seeing unpublished content. Visitors see the published site.";
  }
  const { data } = await loadContent(previewDrafts);
  render(data, isAdmin);
}

main();
