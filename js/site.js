// Public portfolio: fetch published content and render it into the new
// editorial layout (ported from the Figma design). Everything on the page is
// still CMS-driven — the design changed, the data contract did not.
import { getClient, getAdmin, isConfigured } from "./supabaseClient.js";
import { FALLBACK } from "./fallback.js";
import {
  esc, escAttr, safeUrl, initials, formatDate, icon, socialIconName, slugify, projectTitle,
  techLogo, hasTechLogo,
} from "./helpers.js";
import { artwork, projectVisual } from "./artwork.js";
import { initContactForm } from "./contact.js";
import {
  armMotion, initReveal, initPointerCards, initCounters, initScrollChrome,
  initHeroParallax, initMarquee,
} from "./motion.js";

const $ = (id) => document.getElementById(id);

// Arm the reveal styles before anything is rendered, so content that starts
// off-screen is already hidden when it is first painted rather than blinking.
armMotion();

/**
 * A logo image for a named tool, or "" when we have no certain logo for it —
 * so a name like "Manual QA" quietly keeps its bullet instead of requesting an
 * icon that does not exist. The `onerror` is the second line of defence, for a
 * mark that is withdrawn from the CDN later.
 */
function logoImg(name, className = "") {
  if (!hasTechLogo(name)) return "";
  return `<img class="${className}" src="${escAttr(techLogo(name))}" alt="" loading="lazy" decoding="async"
    onerror="this.closest('[data-logo-host]')?.classList.remove('has-logo');this.remove()" />`;
}

/** Load everything the page needs. Uses the database when configured,
 *  otherwise the built-in demo content. `includeDrafts` is honoured only for
 *  a signed-in admin (RLS blocks drafts for everyone else anyway). */
async function loadContent(includeDrafts) {
  if (!isConfigured()) return { data: FALLBACK, live: false };

  const supabase = getClient();
  const statuses = includeDrafts ? ["published", "draft"] : ["published"];

  const [
    settings, profile, hero, experiences, items, projects, tech, skills, skillCats, certs,
    socials, contact, projectCategories, projectCatMap, courses,
  ] = await Promise.all([
    supabase.from("site_settings").select("*").limit(1).maybeSingle(),
    supabase.from("profile").select("*").limit(1).maybeSingle(),
    supabase.from("hero").select("*").limit(1).maybeSingle(),
    supabase.from("experiences").select("*").in("status", statuses).order("display_order"),
    supabase.from("experience_items").select("*").in("status", statuses).order("display_order"),
    supabase.from("projects").select("*").in("status", statuses).order("display_order"),
    supabase.from("project_technologies").select("*").order("display_order"),
    supabase.from("skills").select("*").in("status", statuses).order("display_order"),
    supabase.from("skill_categories").select("*").order("display_order"),
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
      skillCategories: skillCats.data || [],
      certificates: certs.data || [],
      socialLinks: socials.data || [],
      contact: contact.data || FALLBACK.contact,
      projectCategories: projectCategories.data || [],
      projectCatMap: projectCatMap.data || [],
      courses: courses.data || [],
    },
  };
}

function editChip(href) {
  return `<a class="edit-chip" href="${href}" title="Edit">${icon("document", "")}Edit</a>`;
}

/* -------------------------------------------------------------------------
   Render
   ---------------------------------------------------------------------- */
function render(content, isAdmin) {
  const {
    settings, profile, hero, experiences, projects, skills, certificates, socialLinks, contact,
    skillCategories = [], projectCategories = [], projectCatMap = [], courses = [],
  } = content;

  // Head / SEO
  document.title = settings.site_title || "Portfolio";
  $("meta-description").content = settings.meta_description || "";
  $("og-title").content = settings.site_title || "Portfolio";
  $("og-description").content = settings.meta_description || "";

  renderNav(profile, isAdmin);
  renderHero(hero, profile, experiences, projects, courses, certificates, skills, isAdmin);
  renderWork(projects, projectCategories, projectCatMap, isAdmin);
  renderToolkit(projects, skills);
  renderWorkedOn(experiences, isAdmin);
  renderExperience(experiences, isAdmin);
  renderSkills(skills, skillCategories, isAdmin);
  renderCertificates(certificates, isAdmin);
  renderCourses(courses, isAdmin);
  renderContact(contact, profile, socialLinks, isAdmin);
  renderFooter(profile, settings, socialLinks);

  initContactForm(contact);

  // Everything above writes markup carrying [data-reveal] / [data-pointer];
  // these wire the behaviour to it now that the DOM exists.
  initReveal();
  initPointerCards();
  initCounters();
  initScrollChrome();
  initHeroParallax();
  initMarquee($("tech-band"));
}

/* -- Nav ---------------------------------------------------------------- */
function renderNav(profile, isAdmin) {
  $("brand-name").textContent = profile.full_name || "Portfolio";
  $("brand-role").textContent = profile.headline_role || "";
  if (profile.cv_url) {
    const cv = $("nav-cv");
    cv.href = safeUrl(profile.cv_url);
    cv.hidden = false;
    cv.innerHTML = `CV ${icon("download")}`;
  }
  if (isAdmin) $("nav-dashboard").hidden = false;
}

/* -- Hero --------------------------------------------------------------- */
function renderHero(hero, profile, experiences, projects, courses, certificates, skills, isAdmin) {
  $("hero-eyebrow").textContent = hero.eyebrow || profile.headline_role || "";
  // Each word gets its own span so the headline can deal itself in. `--w` is
  // the word's place in the line; the CSS turns that into its delay.
  let w = 0;
  const words = (text, cls = "") =>
    String(text || "")
      .split(/\s+/).filter(Boolean)
      .map((word) => `<span class="w${cls ? ` ${cls}` : ""}" style="--w:${w++}">${esc(word)}</span>`)
      .join(" ");
  $("hero-headline").innerHTML =
    `${words(hero.headline)}${hero.highlighted_text ? ` <em class="hl">${words(hero.highlighted_text)}</em>` : ""}`;
  $("hero-desc").textContent = hero.description || profile.about || "";

  const actions = [];
  if (hero.primary_visible && hero.primary_label)
    actions.push(`<a class="rule-link" href="${safeUrl(hero.primary_url)}">${esc(hero.primary_label)}</a>`);
  if (hero.secondary_visible && hero.secondary_label)
    actions.push(`<a class="btn btn-outline" href="${safeUrl(hero.secondary_url)}">${esc(hero.secondary_label)}</a>`);
  $("hero-actions").innerHTML = actions.join("");
  if (isAdmin) $("hero-edit").innerHTML = editChip("admin.html#hero");

  // The portrait panel: a hero image when one is set, otherwise the crawl
  // diagram from the design — so the frame is never empty.
  const art = $("hero-art");
  const img = hero.background_image || profile.avatar_url;
  art.innerHTML = img
    ? `<img src="${escAttr(img)}" alt="" />`
    : `<span class="art">${artwork("crawl")}</span>`;

  const exp = experiences[0];
  $("hero-art-cap").textContent = exp
    ? [exp.role, exp.company, exp.duration_label].filter(Boolean).join(" · ")
    : profile.headline_role || "";

  const tag = $("hero-art-tag");
  const mark = initials(profile.full_name, "");
  if (mark) {
    tag.textContent = mark;
    tag.hidden = false;
  }

  // Stat strip — every figure is counted from published content, so it can
  // never drift away from what the site actually shows.
  const techCount = new Set(
    projects.flatMap((p) => (p.technologies || []).map((t) => (typeof t === "string" ? t : t.name)))
  ).size;
  // A duration only works as a stat when it reads like a figure ("Six weeks",
  // "1.5 Months"). A full date range would run over three lines at 36px.
  const duration = exp && exp.duration_label && exp.duration_label.length <= 14 ? exp.duration_label : null;
  const stats = [
    duration && { n: duration, l: "Of experience" },
    projects.length && { n: String(projects.length), l: projects.length === 1 ? "Project" : "Projects" },
    (techCount || skills.length) && { n: String(techCount || skills.length), l: "Tools & tech" },
    (courses.length + certificates.length) && {
      n: String(courses.length + certificates.length), l: "Courses & certs",
    },
  ].filter(Boolean).slice(0, 4);

  const host = $("hero-stats");
  if (stats.length < 2) { host.hidden = true; return; }
  host.innerHTML = stats
    .map((s) => {
      // A plain figure counts up when it scrolls into view; one that reads as
      // words ("Six weeks") is printed as it is.
      const num = /^\d+$/.test(s.n) ? s.n : null;
      const n = num
        ? `<p class="n" data-count="${escAttr(num)}">${esc(num)}</p>`
        : `<p class="n">${esc(s.n)}</p>`;
      return `<div data-reveal>${n}<p class="l">${esc(s.l)}</p></div>`;
    })
    .join("");
}

/* -- Selected work ------------------------------------------------------ */
function renderWork(projects, categories, catMap, isAdmin) {
  const section = $("work");
  if (!projects.length) return;

  const catById = new Map(categories.map((c) => [c.id, c]));
  const catFor = (p) => {
    const mapped = catMap.filter((m) => m.project_id === p.id).map((m) => catById.get(m.category_id)).filter(Boolean);
    return mapped[0] || catById.get(p.category_id) || null;
  };

  const featured = projects.filter((p) => p.featured).sort((a, b) => a.featured_order - b.featured_order);
  const list = (featured.length ? featured : projects).slice(0, 5);

  section.hidden = false;
  $("work-note").textContent =
    "Each project is described by its sector and by my own contribution. Open one for the full case study.";

  $("work-grid").innerHTML = list
    .map((p, i) => {
      const cat = catFor(p);
      const href = `work.html?c=${encodeURIComponent(cat ? cat.slug : "all")}&p=${encodeURIComponent(p.slug || slugify(p.title))}`;
      const year = p.project_date ? new Date(p.project_date).getFullYear() : "";
      const meta = [cat ? cat.name : p.project_type, year].filter(Boolean).join(" — ");
      return `
      <a class="pcard${i === 0 ? " wide" : ""}" href="${href}" aria-label="${escAttr(projectTitle(p.title))}"
         data-reveal data-pointer>
        <span class="pcard-art">${projectVisual(p)}</span>
        <span class="pcard-veil"></span>
        <span class="pcard-index">${String(i + 1).padStart(2, "0")}</span>
        <span class="pcard-body">
          <span>
            ${meta ? `<span class="pcard-meta">${esc(meta)}</span>` : ""}
            <h3>${esc(projectTitle(p.title))}</h3>
            <span class="pcard-teaser">${esc(p.short_description)}</span>
          </span>
          <span class="pcard-go">
            <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
        </span>
      </a>`;
    })
    .join("");
  if (isAdmin) $("work-edit").innerHTML = editChip("admin.html#projects");
}

/* -- Toolkit marquee ----------------------------------------------------- */
/**
 * A scrolling band of every tool the published work actually used. Names come
 * from the projects first (so the band mirrors the case studies), then from
 * the skills list, and only names Simple Icons can illustrate are kept — a row
 * of half-blank tiles would look broken rather than lively.
 */
function renderToolkit(projects, skills) {
  const band = $("tech-band");
  const track = $("tech-track");
  if (!band || !track) return;

  const seen = new Set();
  const names = [];
  const add = (name) => {
    const key = String(name || "").trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    names.push(String(name).trim());
  };
  projects.forEach((p) => (p.technologies || []).forEach((t) => add(typeof t === "string" ? t : t.name)));
  skills.forEach((s) => add(s.name));

  const items = names.filter(hasTechLogo).slice(0, 24);
  if (items.length < 4) return;           // too few to read as a band

  track.innerHTML = items
    // The band's logos hide on failure rather than removing themselves, which
    // the other lists do. The marquee is built by cloning this track, and a
    // clone whose image disappears is narrower than its siblings — the loop
    // shifts by exactly one track width, so tracks of different widths would
    // misalign and jolt once per cycle. Keeping the box makes every copy
    // identical whatever the network does.
    .map((n) => `<span class="marquee-item has-logo">
      <img src="${escAttr(techLogo(n))}" alt="" loading="lazy" decoding="async"
        onerror="this.style.visibility='hidden'" />${esc(n)}</span>`)
    .join("");
  band.hidden = false;
}

/* -- What I worked on --------------------------------------------------- */
function renderWorkedOn(experiences, isAdmin) {
  const items = experiences.flatMap((e) => e.items || []);
  if (!items.length) return;
  $("worked-on").hidden = false;
  $("worked-grid").innerHTML = items
    .map(
      (it) => `
      <article class="work-card" data-reveal>
        <div class="work-ic">${icon(it.icon)}</div>
        <h3>${esc(it.title)}</h3>
        <p>${esc(it.description)}</p>
      </article>`
    )
    .join("");
  if (isAdmin) $("worked-edit").innerHTML = editChip("admin.html#experience");
}

/* -- Experience timeline ------------------------------------------------ */
function renderExperience(experiences, isAdmin) {
  if (!experiences.length) return;
  $("experience").hidden = false;
  $("experience-list").innerHTML = experiences
    .map((e) => {
      const date = e.duration_label
        || [e.start_date && formatDate(e.start_date), e.end_date ? formatDate(e.end_date) : "Present"]
          .filter(Boolean).join(" — ");
      const company = [e.company, e.department].filter(Boolean).join(" — ");
      return `
      <div class="tl-item" data-reveal>
        ${date ? `<p class="tl-date">${esc(date)}</p>` : ""}
        <h3>${esc(e.role)}</h3>
        ${company ? `<p class="tl-company">${esc(company)}</p>` : ""}
        ${e.description ? `<p class="tl-desc">${esc(e.description)}</p>` : ""}
        ${e.employment_type ? `<div class="tl-tags"><span class="tag">${esc(e.employment_type)}</span></div>` : ""}
      </div>`;
    })
    .join("");
  if (isAdmin) $("experience-edit").innerHTML = editChip("admin.html#experience");
}

/* -- Skills ------------------------------------------------------------- */
function renderSkills(skills, categories, isAdmin) {
  const host = $("skills-cols");
  if (!skills.length) {
    host.innerHTML = `<p class="loading">No skills published yet.</p>`;
    return;
  }

  // Grouped by category when the CMS defines them; otherwise split evenly into
  // three columns so the section keeps the design's rhythm either way.
  let groups;
  if (categories.length) {
    groups = categories
      .map((c) => ({ name: c.name, items: skills.filter((s) => s.category_id === c.id) }))
      .filter((g) => g.items.length);
    const loose = skills.filter((s) => !s.category_id || !categories.some((c) => c.id === s.category_id));
    if (loose.length) groups.push({ name: "Other", items: loose });
  } else {
    const per = Math.ceil(skills.length / 3);
    groups = [0, 1, 2]
      .map((i) => ({ name: ["Toolkit", "Also", "And"][i], items: skills.slice(i * per, (i + 1) * per) }))
      .filter((g) => g.items.length);
    if (groups.length === 1) groups[0].name = "Toolkit";
  }

  host.innerHTML = groups
    .map(
      (g) => `
      <div class="skill-col" data-reveal>
        <h3>${esc(g.name)}</h3>
        <ul>${g.items.map((s) => {
          // A skill Simple Icons knows shows its real mark instead of the
          // generic bullet; `has-logo` is dropped again if the image fails.
          const logo = s.icon_url
            ? `<img src="${escAttr(safeUrl(s.icon_url))}" alt="" loading="lazy" decoding="async"
                 onerror="this.closest('[data-logo-host]')?.classList.remove('has-logo');this.remove()" />`
            : logoImg(s.name);
          return `<li${logo ? ' class="has-logo" data-logo-host' : ""}>${logo}${esc(s.name)}</li>`;
        }).join("")}</ul>
      </div>`
    )
    .join("");
  if (isAdmin) $("skills-edit").innerHTML = editChip("admin.html#skills");
}

/* -- Certificates ------------------------------------------------------- */
function renderCertificates(certificates, isAdmin) {
  $("certs-list").innerHTML =
    certificates
      .map((c) => {
        const thumb = c.image_url
          ? `<img src="${escAttr(c.image_url)}" alt="${escAttr(c.title)}" loading="lazy" />`
          : `<span>${esc((c.organization || c.title).slice(0, 12).toUpperCase())}</span>`;
        const link = c.verify_url || c.file_url;
        return `
      <article class="cert-card" data-reveal>
        <div class="cert-thumb">${thumb}</div>
        <div>
          <h3>${esc(c.title)}</h3>
          ${c.organization || c.issue_date
            ? `<p class="cert-org">${esc(c.organization)}${c.issue_date ? ` · ${esc(formatDate(c.issue_date))}` : ""}</p>`
            : ""}
          <p>${esc(c.description)}</p>
          ${link ? `<a class="cert-link" href="${safeUrl(link)}" target="_blank" rel="noopener">View certificate ${icon("external")}</a>` : ""}
        </div>
      </article>`;
      })
      .join("") || `<p class="loading">No certificates published yet.</p>`;
  if (isAdmin) $("certs-edit").innerHTML = editChip("admin.html#certificates");
}

/* -- Courses preview ---------------------------------------------------- */
function renderCourses(courses, isAdmin) {
  const section = $("courses-preview");
  if (!section || !courses.length) return;
  const featured = courses.filter((c) => c.featured);
  const list = (featured.length ? featured : courses).slice(0, 4);
  section.hidden = false;
  $("courses-preview-grid").innerHTML = list
    .map((c) => {
      const provSlug = slugify(c.provider || "other") || "other";
      const href = `courses.html?c=${encodeURIComponent(provSlug)}&p=${encodeURIComponent(c.slug)}`;
      const thumb = c.certificate_image
        ? `<img src="${escAttr(c.certificate_image)}" alt="${escAttr(c.certificate_alt || c.title)}" loading="lazy" />`
        : `<span>${esc((c.provider || c.title).slice(0, 12).toUpperCase())}</span>`;
      return `
      <article class="cert-card" data-reveal>
        <a class="cert-thumb" href="${href}" aria-label="${escAttr(c.title)}">${thumb}</a>
        <div>
          <h3><a href="${href}">${esc(c.title)}</a></h3>
          ${c.provider || c.completion_date
            ? `<p class="cert-org">${esc(c.provider)}${c.completion_date ? ` · ${esc(formatDate(c.completion_date))}` : ""}</p>`
            : ""}
          <p>${esc(c.short_description)}</p>
        </div>
      </article>`;
    })
    .join("");
  if (isAdmin) $("courses-preview-edit").innerHTML = editChip("admin.html#courses");
}

/* -- Contact ------------------------------------------------------------ */
function renderContact(contact, profile, socialLinks, isAdmin) {
  $("contact-heading").innerHTML = `${esc(contact.heading)} ${isAdmin ? editChip("admin.html#contact") : ""}`;
  $("contact-desc").textContent = contact.description || "";

  const linkedin = socialLinks.find((l) => l.platform === "linkedin");
  const facts = [
    ["Email", contact.public_email || profile.email, (v) => `mailto:${v}`],
    ["Phone", profile.phone, (v) => `tel:${v.replace(/\s+/g, "")}`],
    ["Location", profile.location, null],
    // Show the handle rather than the word "LinkedIn" twice — the key column
    // already names the network.
    ["LinkedIn", linkedin ? linkedin.url.replace(/^https?:\/\/(www\.)?(linkedin\.com\/)?/, "").replace(/\/$/, "") : null,
      () => linkedin.url],
  ].filter(([, v]) => v);

  $("contact-facts").innerHTML = facts
    .map(([k, v, href]) => {
      const value = href
        ? `<a class="v" href="${safeUrl(href(v))}" ${String(href(v)).startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${esc(v)}</a>`
        : `<span class="v">${esc(v)}</span>`;
      return `<div class="row"><span class="k">${esc(k)}</span>${value}</div>`;
    })
    .join("");
}

/* -- Footer ------------------------------------------------------------- */
function renderFooter(profile, settings, socialLinks) {
  $("foot-name").textContent = profile.full_name || settings.site_title || "";
  $("foot-meta").textContent =
    `© ${new Date().getFullYear()}${profile.headline_role ? ` · ${profile.headline_role}` : ""}`;
  $("socials").innerHTML = socialLinks
    .map(
      (l) => `<a class="social-link" href="${safeUrl(l.url)}" ${l.url.startsWith("mailto:") ? "" : 'target="_blank" rel="noopener"'} aria-label="${escAttr(l.label || l.platform)}">${icon(socialIconName(l.platform))}</a>`
    )
    .join("");
}

/* -------------------------------------------------------------------------
   Chrome + boot
   ---------------------------------------------------------------------- */
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

  // Highlight the section currently in view, the way the design does.
  const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const targets = links
    .map((a) => ({ a, el: document.querySelector(a.getAttribute("href")) }))
    .filter((t) => t.el);
  if (!targets.length || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const hit = targets.find((t) => t.el === e.target);
        links.forEach((a) => a.classList.toggle("active", a === (hit && hit.a)));
      }
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  targets.forEach((t) => io.observe(t.el));
}

/** Reveal the page by fading out the first-load overlay. Safe to call twice. */
function hidePageLoader() {
  const loader = $("page-loader");
  if (loader) loader.classList.add("hidden");
}

async function main() {
  setupNav();
  try {
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
  } finally {
    hidePageLoader();
  }
}

// Safety net: never leave the overlay up if something stalls or throws.
setTimeout(hidePageLoader, 8000);

main();
