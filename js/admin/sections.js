// All admin dashboard sections. Each renderer paints into `container` and is
// given `reload` to repaint itself after a change.
import {
  listAll, listWhere, getSingleton, createRow, updateRow, deleteRow, reorder, setStatus,
  upsertSingleton, deleteMedia, replaceProjectCategories, moveProjectsToCategory,
} from "./db.js";
import {
  toast, toastResult, confirmDialog, el, esc, escAttr,
  fieldText, fieldTextarea, fieldSelect, toggle, wireToggles,
  badge, statusButtons, makeSortable, sortableRow, imageUpload,
} from "./ui.js";
import { ICON_CHOICES, icon, formatDate, formatBytes, slugify } from "../helpers.js";

// ── small utilities ──────────────────────────────────────────────────────────
const formData = (form) => Object.fromEntries(new FormData(form).entries());

function pageHead(title, desc, actionHtml = "") {
  return `<div class="page-head">
    <div><h1>${esc(title)}</h1>${desc ? `<p>${esc(desc)}</p>` : ""}</div>
    <div>${actionHtml}</div>
  </div>`;
}
function emptyState(text) { return `<div class="empty">${esc(text)}</div>`; }

/** Attach publish/unpublish/hide handlers within a row. */
function wireStatus(rowEl, table, id, reload) {
  rowEl.querySelectorAll(".status-btns button").forEach((b) => {
    b.onclick = async () => { toastResult(await setStatus(table, id, b.dataset.status), "Updated."); reload(); };
  });
}
async function confirmDelete(table, id, { title, description }, reload) {
  if (!(await confirmDialog({ title, description }))) return;
  toastResult(await deleteRow(table, id), "Deleted.");
  reload();
}

// ============================================================================
// PROFILE
// ============================================================================
export async function renderProfile(container, reload) {
  const p = (await getSingleton("profile")) || {};
  container.innerHTML =
    pageHead("Personal Information", "Your name, bio, contact details and CV.") +
    `<form id="frm" class="card stack">
      <div class="grid2">
        ${fieldText({ label: "Full name", name: "full_name", value: p.full_name || "", required: true })}
        ${fieldText({ label: "Headline / role", name: "headline_role", value: p.headline_role || "", placeholder: "Co-op Intern | Technology" })}
      </div>
      ${fieldTextarea({ label: "About me", name: "about", value: p.about || "", rows: 4 })}
      <div class="grid2">
        ${fieldText({ label: "Email", name: "email", value: p.email || "", type: "email", required: true })}
        ${fieldText({ label: "Phone", name: "phone", value: p.phone || "" })}
        ${fieldText({ label: "Location", name: "location", value: p.location || "" })}
        ${fieldText({ label: "LinkedIn URL", name: "linkedin_url", value: p.linkedin_url || "", placeholder: "https://linkedin.com/in/…" })}
      </div>
      <div class="grid2"><div id="up-avatar"></div><div id="up-cv"></div></div>
      <div><button class="btn btn-primary" type="submit">Save changes</button></div>
    </form>`;

  const avatar = imageUpload(container.querySelector("#up-avatar"),
    { label: "Profile photo", folder: "profile", value: p.avatar_url || "", hint: "Square image works best." });
  const cv = imageUpload(container.querySelector("#up-cv"),
    { label: "CV file (PDF)", folder: "cv", accept: "image-or-pdf", value: p.cv_url || "", hint: "Shown as the Download CV button." });

  container.querySelector("#frm").onsubmit = async (e) => {
    e.preventDefault();
    const v = formData(e.target);
    const res = await upsertSingleton("profile", {
      full_name: v.full_name, headline_role: v.headline_role, about: v.about,
      email: v.email, phone: v.phone || null, location: v.location || null,
      linkedin_url: v.linkedin_url || null, avatar_url: avatar.getUrl() || null, cv_url: cv.getUrl() || null,
    });
    toastResult(res);
  };
}

// ============================================================================
// HERO
// ============================================================================
export async function renderHero(container, reload) {
  const h = (await getSingleton("hero")) || {};
  container.innerHTML =
    pageHead("Hero Section", "The headline and call-to-action buttons at the top of your site.") +
    `<form id="frm" class="card stack">
      ${fieldText({ label: "Eyebrow (small label)", name: "eyebrow", value: h.eyebrow || "PORTFOLIO" })}
      <div class="grid2">
        ${fieldText({ label: "Headline", name: "headline", value: h.headline || "", required: true, placeholder: "Turning Ideas into" })}
        ${fieldText({ label: "Highlighted headline text", name: "highlighted_text", value: h.highlighted_text || "", placeholder: "Impactful Solutions.", hint: "Shown in the gradient accent colour." })}
      </div>
      ${fieldTextarea({ label: "Description", name: "description", value: h.description || "", rows: 3 })}
      <div class="grid2">
        <div class="block-inner">
          <div class="bt">Primary button</div>
          ${fieldText({ label: "Label", name: "primary_label", value: h.primary_label || "View My Work" })}
          ${fieldText({ label: "Link", name: "primary_url", value: h.primary_url || "#projects", hint: "Use #projects, /path or https://…" })}
          ${toggle({ label: "Show primary button", name: "primary_visible", checked: h.primary_visible !== false })}
        </div>
        <div class="block-inner">
          <div class="bt">Secondary button</div>
          ${fieldText({ label: "Label", name: "secondary_label", value: h.secondary_label || "Contact Me" })}
          ${fieldText({ label: "Link", name: "secondary_url", value: h.secondary_url || "#contact", hint: "Use #contact, /path or https://…" })}
          ${toggle({ label: "Show secondary button", name: "secondary_visible", checked: h.secondary_visible !== false })}
        </div>
      </div>
      <div id="up-bg"></div>
      <div><button class="btn btn-primary" type="submit">Save changes</button></div>
    </form>`;
  wireToggles(container);
  const bg = imageUpload(container.querySelector("#up-bg"),
    { label: "Background image (optional)", folder: "general", value: h.background_image || "", hint: "Displayed faintly behind the hero. Leave empty for the plain dark background." });

  container.querySelector("#frm").onsubmit = async (e) => {
    e.preventDefault();
    const v = formData(e.target);
    toastResult(await upsertSingleton("hero", {
      eyebrow: v.eyebrow, headline: v.headline, highlighted_text: v.highlighted_text, description: v.description,
      primary_label: v.primary_label, primary_url: v.primary_url, primary_visible: v.primary_visible === "true",
      secondary_label: v.secondary_label, secondary_url: v.secondary_url, secondary_visible: v.secondary_visible === "true",
      background_image: bg.getUrl() || null,
    }));
  };
}

// ============================================================================
// SITE SETTINGS
// ============================================================================
export async function renderSettings(container) {
  const s = (await getSingleton("site_settings")) || {};
  container.innerHTML =
    pageHead("Site Settings", "SEO metadata used across the site and in social previews.") +
    `<form id="frm" class="card stack">
      ${fieldText({ label: "Page title", name: "site_title", value: s.site_title || "", required: true, hint: "Shown in the browser tab and search results." })}
      ${fieldTextarea({ label: "Meta description", name: "meta_description", value: s.meta_description || "", rows: 3, hint: "1–2 sentence summary for search engines (≤160 chars)." })}
      <div id="up-og"></div>
      <div><button class="btn btn-primary" type="submit">Save changes</button></div>
    </form>`;
  const og = imageUpload(container.querySelector("#up-og"),
    { label: "Open Graph image", folder: "general", value: s.og_image_url || "", hint: "Shown when shared on social media (1200×630 recommended)." });
  container.querySelector("#frm").onsubmit = async (e) => {
    e.preventDefault();
    const v = formData(e.target);
    toastResult(await upsertSingleton("site_settings", {
      site_title: v.site_title, meta_description: v.meta_description, og_image_url: og.getUrl() || null,
    }));
  };
}

// ============================================================================
// EXPERIENCE
// ============================================================================
export async function renderExperience(container, reload) {
  const [exps, items] = await Promise.all([listAll("experiences"), listAll("experience_items")]);
  for (const e of exps) e.items = items.filter((i) => i.experience_id === e.id);

  container.innerHTML =
    pageHead("Work Experience", "Add roles and the responsibilities shown in “What I Worked On”.",
      `<button class="btn btn-primary" id="add">Add experience</button>`) +
    `<div id="addform"></div><div id="list" class="stack"></div>`;

  container.querySelector("#add").onclick = () => toggleAddExperience(container, reload);

  const list = container.querySelector("#list");
  if (!exps.length) { list.innerHTML = emptyState("No experiences yet. Click “Add experience” to create your first one."); return; }
  list.innerHTML = "";
  exps.forEach((exp) => list.appendChild(experienceCard(exp, reload)));
}

function toggleAddExperience(container, reload) {
  const host = container.querySelector("#addform");
  if (host.dataset.open === "1") { host.innerHTML = ""; host.dataset.open = "0"; return; }
  host.dataset.open = "1";
  host.innerHTML = `<form class="form-block stack">
    <h2>New experience</h2>
    <div class="grid2">
      ${fieldText({ label: "Company", name: "company", required: true })}
      ${fieldText({ label: "Role", name: "role", required: true })}
      ${fieldText({ label: "Department", name: "department" })}
      ${fieldText({ label: "Employment type", name: "employment_type", placeholder: "Co-op Internship" })}
      ${fieldText({ label: "Duration label", name: "duration_label", placeholder: "1.5 Months" })}
      ${fieldText({ label: "Start date", name: "start_date", type: "date" })}
      ${fieldText({ label: "End date", name: "end_date", type: "date" })}
    </div>
    ${fieldTextarea({ label: "Short description", name: "description", rows: 2 })}
    <div><button class="btn btn-primary" type="submit">Create experience</button></div>
  </form>`;
  host.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const v = formData(e.target);
    if (!v.company || !v.role) return toast("error", "Company and role are required.");
    const res = await createRow("experiences", {
      company: v.company, role: v.role, department: v.department || null,
      employment_type: v.employment_type || null, duration_label: v.duration_label || null,
      start_date: v.start_date || null, end_date: v.end_date || null,
      description: v.description || "", status: "draft",
    });
    if (toastResult(res, "Experience added as draft.")) reload();
  };
}

function experienceCard(exp, reload) {
  const card = el(`<div class="card" style="padding:0">
    <div class="row" style="border:0">
      <div class="row-main">
        <div class="row-title">${esc(exp.company)} · ${esc(exp.role)}</div>
        <div class="row-sub">${esc(exp.department || "—")}${exp.duration_label ? ` · ${esc(exp.duration_label)}` : ""}</div>
      </div>
      <div class="row-actions">
        ${badge(exp.status)} ${statusButtons(exp.status)}
        <button class="btn btn-ghost btn-sm" data-x="edit">Edit</button>
        <button class="btn btn-danger btn-sm" data-x="del">Delete</button>
      </div>
    </div>
    <div data-x="body" style="display:none;border-top:1px solid var(--color-border);padding:20px"></div>
  </div>`);
  wireStatus(card, "experiences", exp.id, reload);
  card.querySelector('[data-x="del"]').onclick = () =>
    confirmDelete("experiences", exp.id, { title: "Delete experience?", description: "This removes the experience and its responsibility items." }, reload);

  const body = card.querySelector('[data-x="body"]');
  card.querySelector('[data-x="edit"]').onclick = () => {
    if (body.style.display === "block") { body.style.display = "none"; return; }
    body.style.display = "block";
    renderExperienceBody(body, exp, reload);
  };
  return card;
}

function renderExperienceBody(body, exp, reload) {
  body.innerHTML = `
    <form class="stack" data-x="expform">
      <div class="grid2">
        ${fieldText({ label: "Company", name: "company", value: exp.company, required: true })}
        ${fieldText({ label: "Role", name: "role", value: exp.role, required: true })}
        ${fieldText({ label: "Department", name: "department", value: exp.department || "" })}
        ${fieldText({ label: "Employment type", name: "employment_type", value: exp.employment_type || "" })}
        ${fieldText({ label: "Duration label", name: "duration_label", value: exp.duration_label || "" })}
        ${fieldText({ label: "Start date", name: "start_date", type: "date", value: exp.start_date || "" })}
        ${fieldText({ label: "End date", name: "end_date", type: "date", value: exp.end_date || "" })}
      </div>
      ${fieldTextarea({ label: "Short description", name: "description", value: exp.description || "", rows: 2 })}
      <div id="up-logo-${exp.id}"></div>
      <div><button class="btn btn-primary" type="submit">Save experience</button></div>
    </form>
    <div style="border-top:1px solid var(--color-border);margin-top:20px;padding-top:20px">
      <div class="bt" style="font-weight:700;margin-bottom:12px">Responsibilities &amp; “What I Worked On” cards</div>
      <ul class="rows" id="items-${exp.id}"></ul>
      <form class="stack" id="itemadd-${exp.id}" style="margin-top:14px;background:var(--color-surface-2);border-radius:12px;padding:14px">
        <div class="grid2">
          ${fieldText({ label: "Title", name: "title", required: true })}
          ${fieldText({ label: "Description", name: "description" })}
        </div>
        ${fieldSelect({ label: "Icon", name: "icon", value: "sparkles", options: ICON_CHOICES.map((i) => ({ value: i, label: i })) })}
        <div><button class="btn btn-primary btn-sm" type="submit">Add item</button></div>
      </form>
    </div>`;

  const logo = imageUpload(body.querySelector(`#up-logo-${exp.id}`),
    { label: "Company logo", folder: "logos", value: exp.logo_url || "" });

  body.querySelector('[data-x="expform"]').onsubmit = async (e) => {
    e.preventDefault();
    const v = formData(e.target);
    const res = await updateRow("experiences", exp.id, {
      company: v.company, role: v.role, department: v.department || null,
      employment_type: v.employment_type || null, duration_label: v.duration_label || null,
      start_date: v.start_date || null, end_date: v.end_date || null,
      description: v.description || "", logo_url: logo.getUrl() || null,
    });
    if (toastResult(res)) reload();
  };

  // items list
  const ul = body.querySelector(`#items-${exp.id}`);
  (exp.items || []).forEach((it) => ul.appendChild(experienceItemRow(it, reload)));
  makeSortable(ul, async (ids) => { await reorder("experience_items", ids); });

  body.querySelector(`#itemadd-${exp.id}`).onsubmit = async (e) => {
    e.preventDefault();
    const v = formData(e.target);
    if (!v.title) return toast("error", "Title is required.");
    const res = await createRow("experience_items", {
      experience_id: exp.id, title: v.title, description: v.description || "",
      icon: v.icon || "sparkles", status: "published",
    });
    if (toastResult(res, "Item added.")) reload();
  };
}

function experienceItemRow(it, reload) {
  const inner = `
    <span style="width:28px;height:28px;border-radius:8px;background:var(--color-primary-soft);color:var(--color-primary);display:flex;align-items:center;justify-content:center;flex:none">${icon(it.icon, "")}</span>
    <div class="row-main">
      <div class="row-title">${esc(it.title)}</div>
      <div class="row-sub">${esc(it.description)}</div>
    </div>
    <div class="row-actions">
      <button class="btn btn-danger btn-sm" data-x="del">Delete</button>
    </div>`;
  const li = el(sortableRow(it.id, inner));
  li.querySelector('[data-x="del"]').onclick = () =>
    confirmDelete("experience_items", it.id, { title: "Delete item?", description: "Remove this responsibility card." }, reload);
  return li;
}

// ============================================================================
// PROJECTS
// ============================================================================
export async function renderProjects(container, reload) {
  const [projects, categories, tech, images, map] = await Promise.all([
    listAll("projects"), listAll("project_categories"),
    listAll("project_technologies"), listAll("project_images"),
    // This table arrives with migration 0004; degrade gracefully until then.
    listAll("project_category_map", "project_id").catch(() => []),
  ]);
  for (const p of projects) {
    p.technologies = tech.filter((t) => t.project_id === p.id);
    p.images = images.filter((i) => i.project_id === p.id);
    p.categoryIds = map.filter((m) => m.project_id === p.id).map((m) => m.category_id);
    if (!p.categoryIds.length && p.category_id) p.categoryIds = [p.category_id];
  }

  container.innerHTML =
    pageHead("Projects", "Create, order, feature, publish and organise your projects.",
      `<a class="btn btn-ghost" href="#project-categories" style="margin-right:8px">Manage categories</a><button class="btn btn-primary" id="new">New project</button>`) +
    `<div id="formbox"></div><ul class="rows" id="list"></ul>`;

  container.querySelector("#new").onclick = () => openProjectForm(container, null, categories, reload);

  const list = container.querySelector("#list");
  if (!projects.length) { list.outerHTML = emptyState("No projects yet. Click “New project” to add one."); return; }
  projects.forEach((p) => list.appendChild(projectRow(p, categories, reload)));
  makeSortable(list, async (ids) => { await reorder("projects", ids); });
}

function projectPreviewHref(p, categories) {
  const catId = (p.categoryIds && p.categoryIds[0]) || p.category_id;
  const cat = categories.find((c) => c.id === catId);
  return `work.html?c=${encodeURIComponent(cat ? cat.slug : "all")}&p=${encodeURIComponent(p.slug)}&preview=1`;
}

function projectRow(p, categories, reload) {
  const catNames = (p.categoryIds || []).map((id) => categories.find((c) => c.id === id)).filter(Boolean).map((c) => c.name);
  const thumb = p.cover_image ? `<img src="${escAttr(p.cover_image)}" alt="" style="width:56px;height:44px;border-radius:8px;object-fit:cover;flex:none" />`
    : `<div style="width:56px;height:44px;border-radius:8px;background:var(--color-surface-2);display:flex;align-items:center;justify-content:center;flex:none;font-size:10px;color:var(--color-text-faint)">No image</div>`;
  const li = el(sortableRow(p.id, `
    ${thumb}
    <div class="row-main">
      <div class="row-title">${esc(p.title)} ${p.featured ? `<span class="badge" style="background:var(--color-primary-soft);color:var(--color-primary);font-size:10px">Featured</span>` : ""}</div>
      <div class="row-sub">${esc(catNames.length ? catNames.join(", ") : "Uncategorised")}</div>
    </div>
    <div class="row-actions">
      ${badge(p.status)} ${statusButtons(p.status)}
      <a class="btn btn-ghost btn-sm" data-x="preview" href="${escAttr(projectPreviewHref(p, categories))}" target="_blank" rel="noopener">Preview</a>
      <button class="btn btn-ghost btn-sm" data-x="edit">Edit</button>
      <button class="btn btn-ghost btn-sm" data-x="dup">Duplicate</button>
      <button class="btn btn-danger btn-sm" data-x="del">Delete</button>
    </div>`));
  wireStatus(li, "projects", p.id, reload);
  li.querySelector('[data-x="edit"]').onclick = () => openProjectForm(document, p, categories, reload);
  li.querySelector('[data-x="dup"]').onclick = async () => { if (toastResult(await duplicateProject(p), "Duplicated.")) reload(); };
  li.querySelector('[data-x="del"]').onclick = () =>
    confirmDelete("projects", p.id, { title: "Delete project?", description: "This removes the project, its gallery images and technologies." }, reload);
  return li;
}

async function duplicateProject(p) {
  const copy = { ...p };
  ["id", "created_at", "updated_at", "technologies", "images", "categoryIds"].forEach((k) => delete copy[k]);
  copy.title = `${p.title} (copy)`;
  copy.slug = `${p.slug}-copy-${Date.now().toString(36)}`;
  copy.status = "draft"; copy.featured = false;
  const res = await createRow("projects", copy);
  if (!res.ok) return res;
  for (let i = 0; i < (p.technologies || []).length; i++)
    await createRow("project_technologies", { project_id: res.id, name: p.technologies[i].name, display_order: i }).catch(() => {});
  if ((p.categoryIds || []).length) await replaceProjectCategories(res.id, p.categoryIds).catch(() => {});
  return res;
}

function openProjectForm(_container, project, categories, reload) {
  const box = document.querySelector("#formbox");
  const assigned = new Set(project?.categoryIds || (project?.category_id ? [project.category_id] : []));
  box.innerHTML = `<form class="form-block stack">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h2>${project ? "Edit project" : "New project"}</h2>
      <div style="display:flex;gap:8px">
        ${project ? `<a class="btn btn-ghost btn-sm" href="${escAttr(projectPreviewHref(project, categories))}" target="_blank" rel="noopener">Preview</a>` : ""}
        <button type="button" class="btn btn-ghost btn-sm" data-x="close">Close</button>
      </div>
    </div>

    ${fieldText({ label: "Title", name: "title", value: project?.title || "", required: true })}

    <div class="field">
      <label>Categories <span class="hint" style="display:inline">(a project can belong to several)</span></label>
      ${categories.length
        ? `<div class="cat-check">${categories.map((c) => `<label class="checkbox"><input type="checkbox" data-cat value="${escAttr(c.id)}" ${assigned.has(c.id) ? "checked" : ""} /> ${esc(c.name)}</label>`).join("")}</div>`
        : `<p class="hint">No categories yet — create some under <b>Project Categories</b> first.</p>`}
    </div>

    ${fieldTextarea({ label: "Short description", name: "short_description", value: project?.short_description || "", rows: 2, hint: "Shown on the project card." })}

    <div class="grid2">
      ${fieldText({ label: "Project type", name: "project_type", value: project?.project_type || "", placeholder: "Web App, Branding…" })}
      ${fieldText({ label: "Technologies / tools", name: "technologies", value: (project?.technologies || []).map((t) => t.name).join(", "), hint: "Comma-separated." })}
      ${fieldText({ label: "Client name", name: "client_name", value: project?.client_name || "" })}
      ${fieldText({ label: "Project date", name: "project_date", type: "date", value: project?.project_date || "" })}
      ${fieldText({ label: "Duration", name: "duration_text", value: project?.duration_text || "", placeholder: "e.g. 3 weeks" })}
      ${fieldSelect({ label: "State", name: "project_state", value: project?.project_state || "completed", options: [
        { value: "completed", label: "Completed" }, { value: "in-progress", label: "In progress" }, { value: "archived", label: "Archived" }] })}
    </div>

    ${fieldText({ label: "My role", name: "role", value: project?.role || "", placeholder: "e.g. Designer & front-end developer" })}
    ${fieldTextarea({ label: "Overview / detailed description", name: "case_study", value: project?.case_study || "", rows: 4 })}
    ${fieldTextarea({ label: "Objectives", name: "objectives", value: project?.objectives || "", rows: 3 })}
    ${fieldTextarea({ label: "Challenges & solutions", name: "challenges", value: project?.challenges || "", rows: 3 })}
    ${fieldTextarea({ label: "Final outcome", name: "outcome", value: project?.outcome || "", rows: 3 })}

    <div class="grid2">
      ${fieldText({ label: "Live / project URL", name: "project_url", value: project?.project_url || "", placeholder: "https://…" })}
      ${fieldText({ label: "Behance URL", name: "behance_url", value: project?.behance_url || "", placeholder: "https://behance.net/…" })}
      ${fieldText({ label: "GitHub URL", name: "github_url", value: project?.github_url || "", placeholder: "https://github.com/…" })}
      ${fieldText({ label: "Cover image alt text", name: "cover_alt", value: project?.cover_alt || "", hint: "For accessibility & SEO." })}
    </div>

    <div id="up-cover"></div>
    <div id="up-client-logo"></div>
    ${toggle({ label: "Featured project", name: "featured", checked: !!project?.featured, hint: "Featured projects show as clickable client logos in the homepage “Featured Clients” grid." })}
    <div id="gallerybox"></div>
    <div><button class="btn btn-primary" type="submit">${project ? "Save project" : "Create project"}</button></div>
  </form>`;
  wireToggles(box);
  box.scrollIntoView({ behavior: "smooth", block: "start" });
  box.querySelector('[data-x="close"]').onclick = () => { box.innerHTML = ""; };
  const cover = imageUpload(box.querySelector("#up-cover"),
    { label: "Cover image", folder: "projects", value: project?.cover_image || "" });
  const clientLogo = imageUpload(box.querySelector("#up-client-logo"),
    { label: "Client logo", folder: "projects", value: project?.client_logo || "",
      hint: "Shown in the homepage “Featured Clients” grid. A transparent PNG or SVG works best." });

  if (project) {
    renderGallery(box.querySelector("#gallerybox"), project, reload);
  } else {
    box.querySelector("#gallerybox").innerHTML = `<p class="hint">Save the project first to add gallery images.</p>`;
  }

  box.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const v = formData(e.target);
    if (!v.title.trim()) return toast("error", "Title is required.");
    const categoryIds = [...box.querySelectorAll("[data-cat]:checked")].map((c) => c.value);
    const tech = v.technologies.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 30);
    const values = {
      title: v.title.trim(), short_description: v.short_description, case_study: v.case_study,
      objectives: v.objectives, role: v.role, duration_text: v.duration_text || null,
      challenges: v.challenges, outcome: v.outcome, project_type: v.project_type || null,
      cover_image: cover.getUrl() || null, cover_alt: v.cover_alt || "",
      client_logo: clientLogo.getUrl() || null,
      project_date: v.project_date || null, client_name: v.client_name || null,
      project_url: v.project_url || null, behance_url: v.behance_url || null, github_url: v.github_url || null,
      project_state: v.project_state, featured: v.featured === "true",
    };
    let res, pid;
    if (project) { res = await updateRow("projects", project.id, values); pid = project.id; }
    else { values.slug = `${slugify(v.title)}-${Date.now().toString(36)}`; values.status = "draft"; res = await createRow("projects", values); pid = res.id; }
    if (!res.ok) return toast("error", res.error);
    await replaceProjectCategories(pid, categoryIds);
    // sync technologies
    const existing = await listWhere("project_technologies", "project_id", pid);
    for (const t of existing) await deleteRow("project_technologies", t.id);
    for (let i = 0; i < tech.length; i++) await createRow("project_technologies", { project_id: pid, name: tech[i], display_order: i });
    toast("success", project ? "Project saved." : "Project created as draft.");
    box.innerHTML = "";
    reload();
  };
}

function renderGallery(host, project, reload) {
  host.innerHTML = `<div class="block-inner">
    <div class="bt">Gallery images <span class="hint" style="display:inline">— drag to reorder, edit alt text for accessibility</span></div>
    <ul class="rows" id="gal"></ul>
    <label class="add-tile" style="margin-top:12px">+ Add image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden /></label>
  </div>`;
  const gal = host.querySelector("#gal");
  if (!(project.images || []).length) gal.innerHTML = `<p class="hint">No gallery images yet.</p>`;
  (project.images || []).forEach((img) => {
    const li = el(sortableRow(img.id, `
      <img src="${escAttr(img.url)}" alt="" style="width:64px;height:48px;border-radius:8px;object-fit:cover;flex:none" />
      <div class="row-main"><input class="input" data-alt value="${escAttr(img.alt)}" placeholder="Alt text (describe the image)" /></div>
      <div class="row-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-x="savealt">Save alt</button>
        <button type="button" class="btn btn-danger btn-sm" data-x="del">Remove</button>
      </div>`));
    li.querySelector('[data-x="savealt"]').onclick = async () =>
      toastResult(await updateRow("project_images", img.id, { alt: li.querySelector("[data-alt]").value }, { snapshot: false }), "Alt text saved.");
    li.querySelector('[data-x="del"]').onclick = async () => {
      if (!(await confirmDialog({ title: "Remove image?", description: "This removes the image from the gallery." }))) return;
      if (toastResult(await deleteRow("project_images", img.id), "Removed.")) reload();
    };
    gal.appendChild(li);
  });
  makeSortable(gal, async (ids) => { await reorder("project_images", ids); });
  host.querySelector(".add-tile input").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const { uploadMedia } = await import("./db.js");
    const up = await uploadMedia(f, "projects");
    if (!up.ok) return toast("error", up.error);
    const res = await createRow("project_images", { project_id: project.id, url: up.url, alt: "" });
    if (toastResult(res, "Image added.")) reload();
  };
}

// ============================================================================
// PROJECT CATEGORIES (dedicated page: reorder, rename, edit, delete + move)
// ============================================================================
export async function renderProjectCategories(container, reload) {
  const [categories, map, projects] = await Promise.all([
    listAll("project_categories"), listAll("project_category_map", "project_id"), listAll("projects"),
  ]);
  const countFor = (id) => new Set(map.filter((m) => m.category_id === id).map((m) => m.project_id)).size
    || projects.filter((p) => p.category_id === id).length;

  container.innerHTML =
    pageHead("Project Categories", "Create, rename, reorder and delete the categories shown on your Work page.",
      `<button class="btn btn-primary" id="add">Add category</button>`) +
    `<div id="addform"></div><ul class="rows" id="list"></ul>`;

  container.querySelector("#add").onclick = () => toggleCatForm(container.querySelector("#addform"), null, reload);

  const list = container.querySelector("#list");
  if (!categories.length) { list.outerHTML = emptyState("No categories yet. Click “Add category” to create your first one."); return; }
  categories.forEach((c) => list.appendChild(projectCategoryRow(c, countFor(c.id), categories, reload)));
  makeSortable(list, async (ids) => { await reorder("project_categories", ids); });
}

function toggleCatForm(host, cat, reload) {
  if (!cat && host.dataset.open === "1") { host.innerHTML = ""; host.dataset.open = "0"; return; }
  host.dataset.open = "1";
  host.innerHTML = `<form class="form-block stack">
    <h2>${cat ? "Edit category" : "New category"}</h2>
    <div class="grid2">
      ${fieldText({ label: "Name", name: "name", value: cat?.name || "", required: true })}
      ${fieldSelect({ label: "Icon", name: "icon", value: cat?.icon || "sparkles", options: ICON_CHOICES.map((i) => ({ value: i, label: i })) })}
    </div>
    ${fieldTextarea({ label: "Description", name: "description", value: cat?.description || "", rows: 2, hint: "Shown on the category card." })}
    <div id="up-cover"></div>
    <div style="display:flex;gap:8px"><button class="btn btn-primary" type="submit">${cat ? "Save category" : "Create category"}</button>
      ${cat ? `<button type="button" class="btn btn-ghost" data-x="cancel">Cancel</button>` : ""}</div>
  </form>`;
  const cover = imageUpload(host.querySelector("#up-cover"),
    { label: "Cover image (optional)", folder: "general", value: cat?.cover_image || "", hint: "Used as the category card background." });
  const cancel = host.querySelector('[data-x="cancel"]');
  if (cancel) cancel.onclick = () => { host.innerHTML = ""; host.dataset.open = "0"; };
  host.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const v = formData(e.target);
    if (!v.name.trim()) return toast("error", "Name is required.");
    const values = { name: v.name.trim(), description: v.description || "", icon: v.icon || "sparkles", cover_image: cover.getUrl() || null };
    let res;
    if (cat) res = await updateRow("project_categories", cat.id, values);
    else res = await createRow("project_categories", { ...values, slug: `${slugify(v.name)}-${Date.now().toString(36).slice(-4)}` });
    if (toastResult(res, cat ? "Category saved." : "Category added.")) { host.innerHTML = ""; host.dataset.open = "0"; reload(); }
  };
}

function projectCategoryRow(c, count, categories, reload) {
  const li = el(sortableRow(c.id, `
    <span style="width:34px;height:34px;border-radius:9px;background:var(--color-primary-soft);color:var(--color-primary);display:flex;align-items:center;justify-content:center;flex:none">${icon(c.icon || "sparkles")}</span>
    <div class="row-main"><div class="row-title">${esc(c.name)}</div><div class="row-sub">${count} ${count === 1 ? "project" : "projects"}${c.description ? ` · ${esc(c.description)}` : ""}</div></div>
    <div class="row-actions">
      <button class="btn btn-ghost btn-sm" data-x="edit">Edit</button>
      <button class="btn btn-danger btn-sm" data-x="del">Delete</button>
    </div>`));
  const body = el(`<div style="display:none"></div>`);
  li.appendChild(body);
  li.querySelector('[data-x="edit"]').onclick = () => {
    if (body.style.display === "block") { body.style.display = "none"; body.innerHTML = ""; return; }
    body.style.display = "block"; body.style.width = "100%"; body.style.marginTop = "14px";
    toggleCatForm(body, c, reload);
  };
  li.querySelector('[data-x="del"]').onclick = () => deleteProjectCategory(c, count, categories, reload);
  return li;
}

async function deleteProjectCategory(c, count, categories, reload) {
  if (count === 0) {
    if (!(await confirmDialog({ title: `Delete “${c.name}”?`, description: "This category has no projects. This cannot be undone." }))) return;
    if (toastResult(await deleteRow("project_categories", c.id), "Category deleted.")) reload();
    return;
  }
  // Category has projects — ask what to do with them.
  const others = categories.filter((x) => x.id !== c.id);
  const choice = await categoryDeleteDialog(c, count, others);
  if (!choice) return;
  if (choice.action === "delete-projects") {
    const maps = await listWhere("project_category_map", "category_id", c.id, "project_id");
    const ids = [...new Set(maps.map((m) => m.project_id))];
    for (const pid of ids) await deleteRow("projects", pid);
  } else {
    await moveProjectsToCategory(c.id, choice.target || null);
  }
  if (toastResult(await deleteRow("project_categories", c.id), "Category deleted.")) reload();
}

/** Custom confirm dialog offering "move to…" or "delete projects". */
function categoryDeleteDialog(c, count, others) {
  return new Promise((resolve) => {
    const bg = document.createElement("div");
    bg.className = "modal-bg";
    bg.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>Delete “${esc(c.name)}”?</h3>
        <p>This category contains ${count} ${count === 1 ? "project" : "projects"}. Choose what happens to ${count === 1 ? "it" : "them"}:</p>
        <div class="field" style="margin-top:6px">
          <label class="checkbox"><input type="radio" name="cda" value="move" checked /> Move ${count === 1 ? "it" : "them"} to another category</label>
          <select class="select" id="cda-target" style="margin:8px 0 4px">
            <option value="">— Uncategorised —</option>
            ${others.map((o) => `<option value="${escAttr(o.id)}">${esc(o.name)}</option>`).join("")}
          </select>
          <label class="checkbox" style="margin-top:8px"><input type="radio" name="cda" value="delete" /> Delete the ${count === 1 ? "project" : "projects"} too</label>
        </div>
        <div class="modal-acts">
          <button class="btn btn-ghost" data-x="cancel">Cancel</button>
          <button class="btn" style="background:var(--color-danger-solid);color:var(--color-text)" data-x="ok">Delete category</button>
        </div>
      </div>`;
    const close = (val) => { bg.remove(); resolve(val); };
    bg.addEventListener("click", (e) => { if (e.target === bg) close(null); });
    bg.querySelector('[data-x="cancel"]').onclick = () => close(null);
    bg.querySelector('[data-x="ok"]').onclick = () => {
      const mode = bg.querySelector('input[name="cda"]:checked').value;
      close(mode === "delete" ? { action: "delete-projects" } : { action: "move", target: bg.querySelector("#cda-target").value });
    };
    document.body.appendChild(bg);
  });
}

// ============================================================================
// SKILLS
// ============================================================================
export async function renderSkills(container, reload) {
  const [skills, categories] = await Promise.all([listAll("skills"), listAll("skill_categories")]);
  const catOptions = [{ value: "", label: "— No category —" }, ...categories.map((c) => ({ value: c.id, label: c.name }))];

  container.innerHTML =
    pageHead("Skills & Tools", "Add tools, reorder them, and control which appear publicly.") +
    `<div style="display:grid;gap:22px;grid-template-columns:2fr 1fr" id="wrap">
      <div><ul class="rows" id="list"></ul></div>
      <div class="stack">
        <form class="card stack" id="addform">
          <div class="bt" style="font-weight:700">Add skill</div>
          ${fieldText({ label: "Skill name", name: "name", required: true })}
          ${fieldSelect({ label: "Category", name: "category_id", options: catOptions })}
          ${fieldSelect({ label: "Proficiency (optional)", name: "proficiency", options: [
            { value: "", label: "— None —" }, { value: "1", label: "1 · Beginner" }, { value: "2", label: "2" },
            { value: "3", label: "3 · Intermediate" }, { value: "4", label: "4" }, { value: "5", label: "5 · Expert" }] })}
          <div id="up-icon"></div>
          <button class="btn btn-primary" type="submit">Add skill</button>
        </form>
        <div class="card">
          <div class="bt" style="font-weight:700;margin-bottom:10px">Categories</div>
          <div class="chips" id="catchips">${categories.map((c) => `<span class="chip" data-id="${escAttr(c.id)}">${esc(c.name)}<button data-del>×</button></span>`).join("")}</div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <input class="input" id="catname" placeholder="New category" />
            <button class="btn btn-primary btn-sm" id="catadd">Add</button>
          </div>
        </div>
      </div>
    </div>`;

  const iconUp = imageUpload(container.querySelector("#up-icon"),
    { label: "Icon (optional)", folder: "general", value: "", hint: "Small square logo. Falls back to initials." });

  const list = container.querySelector("#list");
  if (!skills.length) list.innerHTML = emptyState("No skills yet. Add your first one on the right.");
  else { skills.forEach((s) => list.appendChild(skillRow(s, catOptions, reload))); makeSortable(list, async (ids) => { await reorder("skills", ids); }); }

  container.querySelector("#addform").onsubmit = async (e) => {
    e.preventDefault();
    const v = formData(e.target);
    if (!v.name) return toast("error", "Skill name is required.");
    const res = await createRow("skills", {
      name: v.name, category_id: v.category_id || null,
      proficiency: v.proficiency ? Number(v.proficiency) : null,
      icon_url: iconUp.getUrl() || null, status: "published",
    });
    if (toastResult(res, "Skill added.")) reload();
  };
  container.querySelector("#catadd").onclick = async () => {
    const name = container.querySelector("#catname").value.trim();
    if (!name) return;
    if (toastResult(await createRow("skill_categories", { name }), "Category added.")) reload();
  };
  container.querySelectorAll("#catchips [data-del]").forEach((b) => {
    b.onclick = async () => {
      const id = b.closest(".chip").dataset.id;
      if (!(await confirmDialog({ title: "Delete category?", description: "Skills keep their content but lose this category." }))) return;
      if (toastResult(await deleteRow("skill_categories", id), "Deleted.")) reload();
    };
  });
}

function skillRow(s, catOptions, reload) {
  const badgeHtml = s.icon_url ? `<img src="${escAttr(s.icon_url)}" alt="" style="width:28px;height:28px;border-radius:6px;object-fit:contain;flex:none" />`
    : `<span style="width:28px;height:28px;border-radius:6px;background:var(--color-primary-soft);color:var(--color-primary);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex:none">${esc(s.name.slice(0, 2).toUpperCase())}</span>`;
  const li = el(sortableRow(s.id, `
    ${badgeHtml}
    <div class="row-main"><div class="row-title">${esc(s.name)}</div></div>
    <div class="row-actions">
      ${badge(s.status)} ${statusButtons(s.status)}
      <button class="btn btn-ghost btn-sm" data-x="edit">Edit</button>
      <button class="btn btn-danger btn-sm" data-x="del">Delete</button>
    </div>`));
  wireStatus(li, "skills", s.id, reload);
  li.querySelector('[data-x="del"]').onclick = () =>
    confirmDelete("skills", s.id, { title: "Delete skill?", description: "Remove this skill from your portfolio." }, reload);
  li.querySelector('[data-x="edit"]').onclick = () => {
    const main = li.querySelector(".row-main");
    main.innerHTML = `<form style="display:flex;gap:8px;align-items:center" data-x="ef">
      <input class="input" name="name" value="${escAttr(s.name)}" required style="max-width:180px" />
      <select class="select" name="category_id" style="max-width:160px">${catOptions.map((o) => `<option value="${escAttr(o.value)}" ${o.value === (s.category_id || "") ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select>
      <button class="btn btn-primary btn-sm" type="submit">Save</button>
    </form>`;
    main.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const v = formData(e.target);
      const res = await updateRow("skills", s.id, { name: v.name, category_id: v.category_id || null }, { snapshot: false });
      if (toastResult(res)) reload();
    };
  };
  return li;
}

// ============================================================================
// CERTIFICATES
// ============================================================================
export async function renderCertificates(container, reload) {
  const certs = await listAll("certificates");
  container.innerHTML =
    pageHead("Certificates & Courses", "Add certificates with images or PDFs and verification links.",
      `<button class="btn btn-primary" id="add">Add certificate</button>`) +
    `<div id="formbox"></div><ul class="rows" id="list"></ul>`;
  container.querySelector("#add").onclick = () => openCertForm(container, null, reload);

  const list = container.querySelector("#list");
  if (!certs.length) { list.outerHTML = emptyState("No certificates yet. Click “Add certificate” to create one."); return; }
  certs.forEach((c) => list.appendChild(certRow(c, reload)));
  makeSortable(list, async (ids) => { await reorder("certificates", ids); });
}

function certRow(c, reload) {
  const thumb = c.image_url ? `<img src="${escAttr(c.image_url)}" alt="" style="width:56px;height:44px;border-radius:8px;object-fit:cover;flex:none" />`
    : `<div style="width:56px;height:44px;border-radius:8px;background:var(--color-surface-2);display:flex;align-items:center;justify-content:center;flex:none;font-size:10px;color:var(--color-text-faint)">No image</div>`;
  const li = el(sortableRow(c.id, `
    ${thumb}
    <div class="row-main"><div class="row-title">${esc(c.title)}</div><div class="row-sub">${esc(c.organization || "")}</div></div>
    <div class="row-actions">
      ${badge(c.status)} ${statusButtons(c.status)}
      <button class="btn btn-ghost btn-sm" data-x="edit">Edit</button>
      <button class="btn btn-danger btn-sm" data-x="del">Delete</button>
    </div>`));
  wireStatus(li, "certificates", c.id, reload);
  li.querySelector('[data-x="edit"]').onclick = () => openCertForm(document, c, reload);
  li.querySelector('[data-x="del"]').onclick = () =>
    confirmDelete("certificates", c.id, { title: "Delete certificate?", description: "This permanently removes the certificate." }, reload);
  return li;
}

function openCertForm(_c, cert, reload) {
  const box = document.querySelector("#formbox");
  box.innerHTML = `<form class="form-block stack">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h2>${cert ? "Edit certificate" : "New certificate"}</h2>
      <button type="button" class="btn btn-ghost btn-sm" data-x="close">Close</button>
    </div>
    <div class="grid2">
      ${fieldText({ label: "Title", name: "title", value: cert?.title || "", required: true })}
      ${fieldText({ label: "Issuing organization", name: "organization", value: cert?.organization || "" })}
      ${fieldText({ label: "Issue date", name: "issue_date", type: "date", value: cert?.issue_date || "" })}
      ${fieldText({ label: "Verification link", name: "verify_url", value: cert?.verify_url || "", placeholder: "https://…" })}
    </div>
    ${fieldTextarea({ label: "Description", name: "description", value: cert?.description || "", rows: 2 })}
    <div class="grid2"><div id="up-img"></div><div id="up-file"></div></div>
    <div><button class="btn btn-primary" type="submit">${cert ? "Save certificate" : "Create certificate"}</button></div>
  </form>`;
  box.scrollIntoView({ behavior: "smooth", block: "start" });
  box.querySelector('[data-x="close"]').onclick = () => { box.innerHTML = ""; };
  const img = imageUpload(box.querySelector("#up-img"), { label: "Certificate image", folder: "certificates", value: cert?.image_url || "" });
  const file = imageUpload(box.querySelector("#up-file"), { label: "Certificate PDF (optional)", folder: "certificates", accept: "image-or-pdf", value: cert?.file_url || "" });
  box.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const v = formData(e.target);
    if (!v.title) return toast("error", "Title is required.");
    const values = {
      title: v.title, organization: v.organization, issue_date: v.issue_date || null,
      description: v.description, image_url: img.getUrl() || null, file_url: file.getUrl() || null,
      verify_url: v.verify_url || null,
    };
    const res = cert ? await updateRow("certificates", cert.id, values) : await createRow("certificates", { ...values, status: "draft" });
    if (toastResult(res, cert ? "Saved." : "Created as draft.")) { box.innerHTML = ""; reload(); }
  };
}

// ============================================================================
// CONTACT (settings + social + messages)
// ============================================================================
export async function renderContact(container, reload) {
  const [settings, socials, messages] = await Promise.all([
    getSingleton("contact_settings"), listAll("social_links"),
    listAll("contact_messages", "created_at"),
  ]);
  const unread = messages.filter((m) => !m.is_read && !m.is_archived).length;
  container.innerHTML =
    pageHead("Contact & Messages", "Edit the contact section, social links, and read visitor messages.") +
    `<div class="tabs">
      <button data-tab="settings" class="active">Contact settings</button>
      <button data-tab="messages">Messages${unread ? ` (${unread})` : ""}</button>
    </div><div id="tabbody"></div>`;

  const body = container.querySelector("#tabbody");
  const tabs = container.querySelectorAll(".tabs button");
  const newestFirst = messages.slice().reverse();
  const show = (tab) => {
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
    if (tab === "settings") renderContactSettings(body, settings, socials, reload);
    else renderMessages(body, newestFirst, reload);
  };
  tabs.forEach((t) => (t.onclick = () => show(t.dataset.tab)));
  show("settings");
}

function renderContactSettings(body, s, socials, reload) {
  s = s || {};
  body.innerHTML = `
    <form class="card stack" id="cs">
      <div class="bt" style="font-weight:700">Contact section</div>
      ${fieldText({ label: "Heading", name: "heading", value: s.heading || "" })}
      ${fieldTextarea({ label: "Description", name: "description", value: s.description || "", rows: 2 })}
      <div class="grid2">
        ${fieldText({ label: "Public email", name: "public_email", type: "email", value: s.public_email || "", hint: "Shown to visitors." })}
        ${fieldText({ label: "Contact-form recipient email", name: "recipient_email", type: "email", value: s.recipient_email || "", hint: "Where you'd read messages." })}
        ${fieldText({ label: "Success message", name: "success_message", value: s.success_message || "" })}
        ${fieldText({ label: "Error message", name: "error_message", value: s.error_message || "" })}
      </div>
      <div><button class="btn btn-primary" type="submit">Save changes</button></div>
    </form>
    <div class="card">
      <div class="bt" style="font-weight:700;margin-bottom:12px">Social links</div>
      <ul class="rows" id="sl"></ul>
      <form id="sladd" style="display:grid;gap:8px;grid-template-columns:1fr 1fr 2fr auto;margin-top:14px;border-top:1px solid var(--color-surface-2);padding-top:14px">
        <input class="input" name="platform" placeholder="platform (linkedin)" required />
        <input class="input" name="label" placeholder="Label" />
        <input class="input" name="url" placeholder="https://…" required />
        <button class="btn btn-primary" type="submit">Add</button>
      </form>
    </div>`;

  body.querySelector("#cs").onsubmit = async (e) => {
    e.preventDefault();
    const v = formData(e.target);
    toastResult(await upsertSingleton("contact_settings", {
      heading: v.heading, description: v.description, public_email: v.public_email,
      recipient_email: v.recipient_email, success_message: v.success_message, error_message: v.error_message,
    }));
  };

  const sl = body.querySelector("#sl");
  if (!socials.length) sl.innerHTML = `<p style="font-size:14px;color:var(--color-text-muted)">No social links yet.</p>`;
  socials.forEach((l) => {
    const li = el(`<li class="row">
      <div class="row-main"><div class="row-title" style="text-transform:capitalize">${esc(l.label || l.platform)}</div><div class="row-sub">${esc(l.url)}</div></div>
      <div class="row-actions"><button class="btn btn-danger btn-sm" data-x="del">Delete</button></div>
    </li>`);
    li.querySelector('[data-x="del"]').onclick = async () => {
      if (!(await confirmDialog({ title: "Delete social link?", description: "Remove this link from the contact section." }))) return;
      if (toastResult(await deleteRow("social_links", l.id), "Deleted.")) reload();
    };
    sl.appendChild(li);
  });
  body.querySelector("#sladd").onsubmit = async (e) => {
    e.preventDefault();
    const v = formData(e.target);
    if (!v.platform || !v.url) return toast("error", "Platform and URL are required.");
    const res = await createRow("social_links", { platform: v.platform.toLowerCase(), label: v.label || "", url: v.url, status: "published" });
    if (toastResult(res, "Link added.")) reload();
  };
}

function renderMessages(body, messages, reload) {
  let filter = "inbox";
  body.innerHTML = `<div style="display:flex;gap:8px;margin-bottom:16px">
    <button class="filter-chip active" data-f="inbox">Inbox</button>
    <button class="filter-chip" data-f="archived">Archived</button>
  </div><div id="mlist" class="stack"></div>`;
  const paint = () => {
    body.querySelectorAll(".filter-chip").forEach((c) => c.classList.toggle("active", c.dataset.f === filter));
    const list = body.querySelector("#mlist");
    const visible = messages.filter((m) => (filter === "inbox" ? !m.is_archived : m.is_archived));
    if (!visible.length) { list.innerHTML = emptyState(filter === "inbox" ? "No messages yet." : "No archived messages."); return; }
    list.innerHTML = "";
    visible.forEach((m) => list.appendChild(messageCard(m, reload)));
  };
  body.querySelectorAll(".filter-chip").forEach((c) => (c.onclick = () => { filter = c.dataset.f; paint(); }));
  paint();
}

function messageCard(m, reload) {
  const card = el(`<article class="msg ${m.is_read ? "" : "unread"}">
    <div class="mh">
      <div>
        <div class="from">${esc(m.name)} <a href="mailto:${escAttr(m.email)}">&lt;${esc(m.email)}&gt;</a></div>
        ${m.subject ? `<div class="subj">${esc(m.subject)}</div>` : ""}
      </div>
      <span class="when" style="font-size:12px;color:var(--color-text-faint)">${esc(formatDate(m.created_at))}</span>
    </div>
    <div class="body">${esc(m.message)}</div>
    <div class="macts">
      <button class="btn btn-ghost btn-sm" data-x="read">Mark ${m.is_read ? "unread" : "read"}</button>
      <button class="btn btn-ghost btn-sm" data-x="arch">${m.is_archived ? "Unarchive" : "Archive"}</button>
      <button class="btn btn-danger btn-sm" data-x="del">Delete</button>
    </div>
  </article>`);
  card.querySelector('[data-x="read"]').onclick = async () => { toastResult(await updateRow("contact_messages", m.id, { is_read: !m.is_read }, { snapshot: false })); reload(); };
  card.querySelector('[data-x="arch"]').onclick = async () => { toastResult(await updateRow("contact_messages", m.id, { is_archived: !m.is_archived }, { snapshot: false })); reload(); };
  card.querySelector('[data-x="del"]').onclick = async () => {
    if (!(await confirmDialog({ title: "Delete message?", description: "This permanently deletes the message." }))) return;
    if (toastResult(await deleteRow("contact_messages", m.id), "Deleted.")) reload();
  };
  return card;
}

// ============================================================================
// MEDIA
// ============================================================================
const MEDIA_FOLDERS = ["profile", "projects", "logos", "certificates", "cv", "general"];

export async function renderMedia(container, reload) {
  const media = await listAll("media", "created_at");
  media.reverse();
  let filter = "all";
  let folder = "general";

  container.innerHTML =
    pageHead("Media Library", "Upload and manage images, certificate PDFs and your CV.") +
    `<div class="card" style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:14px;margin-bottom:22px">
      <div class="field" style="margin:0">
        <label>Upload to folder</label>
        <select class="select" id="folder">${MEDIA_FOLDERS.map((f) => `<option value="${f}">${f}</option>`).join("")}</select>
      </div>
      <button class="btn btn-primary" id="upbtn">Upload files</button>
      <p class="hint" style="margin:0">Max 10 MB. Images (PNG, JPG, WebP, GIF, SVG) and PDF.</p>
      <input type="file" id="file" multiple hidden accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/pdf" />
    </div>
    <div class="chips" id="filters" style="margin-bottom:16px"></div>
    <div id="grid"></div>`;

  container.querySelector("#folder").onchange = (e) => { folder = e.target.value; };
  container.querySelector("#upbtn").onclick = () => container.querySelector("#file").click();
  container.querySelector("#file").onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    const { uploadMedia } = await import("./db.js");
    for (const f of files) { const r = await uploadMedia(f, folder); if (!r.ok) toast("error", `${f.name}: ${r.error}`); }
    toast("success", "Upload complete."); reload();
  };

  const filters = container.querySelector("#filters");
  const grid = container.querySelector("#grid");
  const counts = (f) => (f === "all" ? media.length : media.filter((m) => m.folder === f).length);
  filters.innerHTML = ["all", ...MEDIA_FOLDERS].map((f) => `<button class="filter-chip ${f === "all" ? "active" : ""}" data-f="${f}">${f} (${counts(f)})</button>`).join("");
  const paintGrid = () => {
    const list = filter === "all" ? media : media.filter((m) => m.folder === filter);
    if (!list.length) { grid.innerHTML = emptyState("No files here yet."); return; }
    grid.className = "media-grid";
    grid.innerHTML = "";
    list.forEach((m) => grid.appendChild(mediaCard(m, reload)));
  };
  filters.querySelectorAll(".filter-chip").forEach((c) => (c.onclick = () => {
    filter = c.dataset.f;
    filters.querySelectorAll(".filter-chip").forEach((x) => x.classList.toggle("active", x === c));
    paintGrid();
  }));
  paintGrid();
}

function mediaCard(m, reload) {
  const isPdf = m.mime_type === "application/pdf";
  const card = el(`<div class="media-card">
    <div class="mt">${isPdf ? `<a href="${escAttr(m.url)}" target="_blank" rel="noopener" style="font-weight:700;color:var(--color-text-muted)">PDF ↗</a>` : `<img src="${escAttr(m.url)}" alt="${escAttr(m.alt)}" />`}</div>
    <div class="mb">
      <div class="fn" title="${escAttr(m.filename)}">${esc(m.filename)}</div>
      <div class="fi">${esc(formatBytes(m.size_bytes))} · ${esc(m.folder)}</div>
      ${isPdf ? "" : `<div style="display:flex;gap:6px"><input class="input" data-x="alt" value="${escAttr(m.alt)}" placeholder="Alt text" style="padding:6px 10px;font-size:12px" /><button class="btn btn-ghost btn-sm" data-x="savealt">Save</button></div>`}
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" data-x="copy" style="flex:1">Copy URL</button>
        <button class="btn btn-danger btn-sm" data-x="del">Delete</button>
      </div>
    </div>
  </div>`);
  card.querySelector('[data-x="copy"]').onclick = async () => {
    try { await navigator.clipboard.writeText(m.url); toast("success", "URL copied."); }
    catch { toast("error", "Could not copy URL."); }
  };
  const saveAlt = card.querySelector('[data-x="savealt"]');
  if (saveAlt) saveAlt.onclick = async () => {
    const alt = card.querySelector('[data-x="alt"]').value;
    toastResult(await updateRow("media", m.id, { alt }, { snapshot: false }), "Alt text saved.");
  };
  card.querySelector('[data-x="del"]').onclick = async () => {
    if (!(await confirmDialog({ title: "Delete file?", description: "This removes the file from storage. Any page using it will show a broken image." }))) return;
    if (toastResult(await deleteMedia(m.id), "Deleted.")) reload();
  };
  return card;
}

// ============================================================================
// COURSES
// ============================================================================
export async function renderCourses(container, reload) {
  const [courses, categories] = await Promise.all([listAll("courses"), listAll("course_categories")]);

  container.innerHTML =
    pageHead("Courses", "Completed courses grouped by provider on your public Courses page.",
      `<a class="btn btn-ghost" href="#course-categories" style="margin-right:8px">Manage categories</a><button class="btn btn-primary" id="add">Add course</button>`) +
    `<div id="formbox"></div><ul class="rows" id="list"></ul>`;
  container.querySelector("#add").onclick = () => openCourseForm(null, categories, reload);

  const list = container.querySelector("#list");
  if (!courses.length) { list.outerHTML = emptyState("No courses yet. Click “Add course” to create one."); return; }
  courses.forEach((c) => list.appendChild(courseRow(c, categories, reload)));
  makeSortable(list, async (ids) => { await reorder("courses", ids); });
}

function coursePreviewHref(c) {
  return `courses.html?c=${encodeURIComponent(slugify(c.provider || "other") || "other")}&p=${encodeURIComponent(c.slug)}&preview=1`;
}

function courseRow(c, categories, reload) {
  const thumb = c.certificate_image ? `<img src="${escAttr(c.certificate_image)}" alt="" style="width:56px;height:44px;border-radius:8px;object-fit:cover;flex:none" />`
    : `<div style="width:56px;height:44px;border-radius:8px;background:var(--color-surface-2);display:flex;align-items:center;justify-content:center;flex:none;font-size:10px;color:var(--color-text-faint)">No image</div>`;
  const li = el(sortableRow(c.id, `
    ${thumb}
    <div class="row-main">
      <div class="row-title">${esc(c.title)} ${c.featured ? `<span class="badge" style="background:var(--color-primary-soft);color:var(--color-primary);font-size:10px">Featured</span>` : ""}</div>
      <div class="row-sub">${esc(c.provider || "—")}${c.completion_date ? ` · ${esc(formatDate(c.completion_date))}` : ""}</div>
    </div>
    <div class="row-actions">
      ${badge(c.status)} ${statusButtons(c.status)}
      <a class="btn btn-ghost btn-sm" href="${escAttr(coursePreviewHref(c))}" target="_blank" rel="noopener">Preview</a>
      <button class="btn btn-ghost btn-sm" data-x="edit">Edit</button>
      <button class="btn btn-ghost btn-sm" data-x="dup">Duplicate</button>
      <button class="btn btn-danger btn-sm" data-x="del">Delete</button>
    </div>`));
  wireStatus(li, "courses", c.id, reload);
  li.querySelector('[data-x="edit"]').onclick = () => openCourseForm(c, categories, reload);
  li.querySelector('[data-x="dup"]').onclick = async () => {
    const copy = { ...c };
    ["id", "created_at", "updated_at"].forEach((k) => delete copy[k]);
    copy.title = `${c.title} (copy)`; copy.slug = `${c.slug}-copy-${Date.now().toString(36)}`;
    copy.status = "draft"; copy.featured = false;
    if (toastResult(await createRow("courses", copy), "Duplicated.")) reload();
  };
  li.querySelector('[data-x="del"]').onclick = () =>
    confirmDelete("courses", c.id, { title: "Delete course?", description: "This permanently removes the course and its certificate references." }, reload);
  return li;
}

function openCourseForm(course, categories, reload) {
  const box = document.querySelector("#formbox");
  const catOptions = [{ value: "", label: "— No category —" }, ...categories.map((c) => ({ value: c.id, label: c.name }))];
  box.innerHTML = `<form class="form-block stack">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h2>${course ? "Edit course" : "New course"}</h2>
      <div style="display:flex;gap:8px">
        ${course ? `<a class="btn btn-ghost btn-sm" href="${escAttr(coursePreviewHref(course))}" target="_blank" rel="noopener">Preview</a>` : ""}
        <button type="button" class="btn btn-ghost btn-sm" data-x="close">Close</button>
      </div>
    </div>
    <div class="grid2">
      ${fieldText({ label: "Course title", name: "title", value: course?.title || "", required: true })}
      ${fieldText({ label: "Provider / institution", name: "provider", value: course?.provider || "", placeholder: "e.g. Anthropic", hint: "Courses are grouped by provider." })}
      ${fieldText({ label: "Instructor", name: "instructor", value: course?.instructor || "" })}
      ${fieldText({ label: "Completion date", name: "completion_date", type: "date", value: course?.completion_date || "" })}
      ${fieldSelect({ label: "Category", name: "category_id", value: course?.category_id || "", options: catOptions })}
      ${fieldText({ label: "Certificate ID", name: "certificate_id", value: course?.certificate_id || "" })}
    </div>
    ${fieldTextarea({ label: "Short description", name: "short_description", value: course?.short_description || "", rows: 2, hint: "Shown on the course card." })}
    ${fieldTextarea({ label: "Full description", name: "description", value: course?.description || "", rows: 3 })}
    ${fieldText({ label: "Skills learned", name: "skills", value: course?.skills || "", hint: "Comma-separated, e.g. Prompt Engineering, Claude" })}
    <div class="grid2">
      ${fieldText({ label: "Verification link", name: "verify_url", value: course?.verify_url || "", placeholder: "https://…" })}
      ${fieldText({ label: "Course link", name: "course_url", value: course?.course_url || "", placeholder: "https://…" })}
    </div>
    <div class="grid2"><div id="up-cert"></div><div id="up-file"></div></div>
    ${fieldText({ label: "Certificate image alt text", name: "certificate_alt", value: course?.certificate_alt || "", hint: "For accessibility & SEO." })}
    <div id="up-logo"></div>
    ${toggle({ label: "Featured course", name: "featured", checked: !!course?.featured, hint: "Featured courses appear first and on the homepage." })}
    <div><button class="btn btn-primary" type="submit">${course ? "Save course" : "Create course"}</button></div>
  </form>`;
  wireToggles(box);
  box.scrollIntoView({ behavior: "smooth", block: "start" });
  box.querySelector('[data-x="close"]').onclick = () => { box.innerHTML = ""; };
  const cert = imageUpload(box.querySelector("#up-cert"), { label: "Certificate image", folder: "certificates", value: course?.certificate_image || "" });
  const file = imageUpload(box.querySelector("#up-file"), { label: "Certificate PDF (optional)", folder: "certificates", accept: "image-or-pdf", value: course?.certificate_file || "" });
  const logo = imageUpload(box.querySelector("#up-logo"), { label: "Provider logo (optional)", folder: "logos", value: course?.provider_logo || "", hint: "Shown on the provider card." });

  box.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const v = formData(e.target);
    if (!v.title.trim()) return toast("error", "Course title is required.");
    const values = {
      title: v.title.trim(), provider: v.provider || "", instructor: v.instructor || null,
      completion_date: v.completion_date || null, category_id: v.category_id || null,
      short_description: v.short_description, description: v.description, skills: v.skills || "",
      certificate_image: cert.getUrl() || null, certificate_alt: v.certificate_alt || "",
      certificate_file: file.getUrl() || null, provider_logo: logo.getUrl() || null,
      certificate_id: v.certificate_id || null, verify_url: v.verify_url || null, course_url: v.course_url || null,
      featured: v.featured === "true",
    };
    let res;
    if (course) res = await updateRow("courses", course.id, values);
    else res = await createRow("courses", { ...values, slug: `${slugify(v.title)}-${Date.now().toString(36)}`, status: "draft" });
    if (toastResult(res, course ? "Course saved." : "Course created as draft.")) { box.innerHTML = ""; reload(); }
  };
}

// ============================================================================
// COURSE CATEGORIES
// ============================================================================
export async function renderCourseCategories(container, reload) {
  const [categories, courses] = await Promise.all([listAll("course_categories"), listAll("courses")]);
  const countFor = (id) => courses.filter((c) => c.category_id === id).length;

  container.innerHTML =
    pageHead("Course Categories", "Categories used to filter courses on your public Courses page.",
      `<button class="btn btn-primary" id="add">Add category</button>`) +
    `<div id="addform"></div><ul class="rows" id="list"></ul>`;

  container.querySelector("#add").onclick = () => {
    const host = container.querySelector("#addform");
    if (host.dataset.open === "1") { host.innerHTML = ""; host.dataset.open = "0"; return; }
    host.dataset.open = "1";
    host.innerHTML = `<form class="form-block stack"><h2>New category</h2>
      ${fieldText({ label: "Name", name: "name", required: true })}
      <div><button class="btn btn-primary" type="submit">Create category</button></div></form>`;
    host.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const v = formData(e.target);
      if (!v.name.trim()) return toast("error", "Name is required.");
      const res = await createRow("course_categories", { name: v.name.trim(), slug: `${slugify(v.name)}-${Date.now().toString(36).slice(-4)}` });
      if (toastResult(res, "Category added.")) reload();
    };
  };

  const list = container.querySelector("#list");
  if (!categories.length) { list.outerHTML = emptyState("No course categories yet. Click “Add category”."); return; }
  categories.forEach((c) => list.appendChild(courseCategoryRow(c, countFor(c.id), reload)));
  makeSortable(list, async (ids) => { await reorder("course_categories", ids); });
}

function courseCategoryRow(c, count, reload) {
  const li = el(sortableRow(c.id, `
    <div class="row-main"><div class="row-title">${esc(c.name)}</div><div class="row-sub">${count} ${count === 1 ? "course" : "courses"}</div></div>
    <div class="row-actions">
      <button class="btn btn-ghost btn-sm" data-x="edit">Rename</button>
      <button class="btn btn-danger btn-sm" data-x="del">Delete</button>
    </div>`));
  li.querySelector('[data-x="edit"]').onclick = () => {
    const main = li.querySelector(".row-main");
    main.innerHTML = `<form style="display:flex;gap:8px;align-items:center"><input class="input" name="name" value="${escAttr(c.name)}" required style="max-width:260px" /><button class="btn btn-primary btn-sm" type="submit">Save</button></form>`;
    main.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const v = formData(e.target);
      if (toastResult(await updateRow("course_categories", c.id, { name: v.name.trim() }, { snapshot: false }), "Renamed.")) reload();
    };
  };
  li.querySelector('[data-x="del"]').onclick = async () => {
    if (!(await confirmDialog({ title: `Delete “${c.name}”?`, description: "Courses in this category keep their content but lose this label." }))) return;
    if (toastResult(await deleteRow("course_categories", c.id), "Deleted.")) reload();
  };
  return li;
}
