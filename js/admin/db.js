// Admin data layer. Every write runs under the signed-in admin's session, so
// Row-Level Security enforces authorization in the database. We also snapshot
// a revision before updates and append an audit-log entry.
import { getClient, BUCKET } from "../supabaseClient.js";

// Set once after login (see app.js). { supabase, user }
export let admin = null;
export function setAdmin(ctx) { admin = ctx; }

function db() {
  if (!admin) throw new Error("Not signed in.");
  return admin.supabase;
}

export async function audit(action, table, recordId = null, details = null) {
  try {
    await db().from("audit_logs").insert({
      actor_id: admin.user.id,
      actor_email: admin.user.email,
      action, table_name: table, record_id: recordId, details,
    });
  } catch (e) { console.warn("audit failed", e); }
}

async function saveRevision(table, id) {
  try {
    const { data } = await db().from(table).select("*").eq("id", id).maybeSingle();
    if (!data) return;
    await db().from("content_revisions").insert({
      table_name: table, record_id: id, data, created_by: admin.user.id,
    });
  } catch (e) { console.warn("revision failed", e); }
}

export async function listAll(table, order = "display_order") {
  const { data, error } = await db().from(table).select("*").order(order);
  if (error) throw error;
  return data || [];
}

export async function getSingleton(table) {
  const { data } = await db().from(table).select("*").limit(1).maybeSingle();
  return data;
}

/** Rows from `table` where `col` = `val`, ordered by `order`. */
export async function listWhere(table, col, val, order = "display_order") {
  const { data, error } = await db().from(table).select("*").eq(col, val).order(order);
  if (error) throw error;
  return data || [];
}

/** Replace a project's many-to-many category assignments. Also mirrors the
 *  first selected category into projects.category_id for backward compatibility
 *  with the existing homepage rail. */
export async function replaceProjectCategories(projectId, categoryIds) {
  await db().from("project_category_map").delete().eq("project_id", projectId);
  if (categoryIds.length) {
    const rows = categoryIds.map((category_id) => ({ project_id: projectId, category_id }));
    const { error } = await db().from("project_category_map").insert(rows);
    if (error) return { ok: false, error: error.message };
  }
  await db().from("projects").update({ category_id: categoryIds[0] || null, updated_by: admin.user.id }).eq("id", projectId);
  await audit("update", "project_category_map", projectId, { count: categoryIds.length });
  return { ok: true };
}

/** Move every project in `fromCat` to `toCat` (or clear it when toCat is null). */
export async function moveProjectsToCategory(fromCat, toCat) {
  const { data: maps } = await db().from("project_category_map").select("project_id").eq("category_id", fromCat);
  const ids = [...new Set((maps || []).map((m) => m.project_id))];
  for (const pid of ids) {
    const { data: existing } = await db().from("project_category_map").select("category_id").eq("project_id", pid);
    const set = new Set((existing || []).map((r) => r.category_id).filter((c) => c !== fromCat));
    if (toCat) set.add(toCat);
    await replaceProjectCategories(pid, [...set]);
  }
  return { ok: true, moved: ids.length };
}

export async function createRow(table, values) {
  const { data, error } = await db()
    .from(table)
    .insert({ ...values, created_by: admin.user.id, updated_by: admin.user.id })
    .select("id").single();
  if (error) return { ok: false, error: error.message };
  await audit("create", table, data.id);
  return { ok: true, id: data.id };
}

export async function updateRow(table, id, values, { snapshot = true } = {}) {
  if (snapshot) await saveRevision(table, id);
  const { error } = await db().from(table)
    .update({ ...values, updated_by: admin.user.id }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await audit("update", table, id, { fields: Object.keys(values) });
  return { ok: true };
}

export async function deleteRow(table, id) {
  await saveRevision(table, id);
  const { error } = await db().from(table).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await audit("delete", table, id);
  return { ok: true };
}

export async function reorder(table, ids) {
  for (let i = 0; i < ids.length; i++) {
    const { error } = await db().from(table)
      .update({ display_order: i, updated_by: admin.user.id }).eq("id", ids[i]);
    if (error) return { ok: false, error: error.message };
  }
  await audit("reorder", table, null, { count: ids.length });
  return { ok: true };
}

export async function setStatus(table, id, status) {
  const { error } = await db().from(table)
    .update({ status, updated_by: admin.user.id }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await audit(status === "published" ? "publish" : status === "draft" ? "unpublish" : "hide", table, id);
  return { ok: true };
}

export async function upsertSingleton(table, values) {
  const existing = await getSingleton(table);
  if (existing) {
    await saveRevision(table, existing.id);
    const { error } = await db().from(table)
      .update({ ...values, updated_by: admin.user.id }).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    await audit("update", table, existing.id);
  } else {
    const { error } = await db().from(table)
      .insert({ ...values, updated_by: admin.user.id });
    if (error) return { ok: false, error: error.message };
    await audit("create", table);
  }
  return { ok: true };
}

// ── Media upload ────────────────────────────────────────────────────────────
const MAX_SIZE = 10 * 1024 * 1024;
const TYPES = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
  "image/gif": "gif", "image/svg+xml": "svg", "application/pdf": "pdf",
};
const PDF_FOLDERS = ["certificates", "cv", "general"];

export async function uploadMedia(file, folder) {
  if (!file || file.size === 0) return { ok: false, error: "Choose a file to upload." };
  if (file.size > MAX_SIZE) return { ok: false, error: "File is too large (max 10 MB)." };
  const ext = TYPES[file.type];
  if (!ext) return { ok: false, error: "Unsupported type. Use PNG, JPG, WebP, GIF, SVG or PDF." };
  if (ext === "pdf" && !PDF_FOLDERS.includes(folder))
    return { ok: false, error: "PDFs can only go in certificates, cv or general." };

  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await db().storage.from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { ok: false, error: upErr.message };

  const url = db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { data: row, error } = await db().from("media").insert({
    filename: file.name.slice(0, 200) || path, path, url, folder, alt: "",
    size_bytes: file.size, mime_type: file.type, created_by: admin.user.id,
  }).select("id").single();
  if (error) {
    await db().storage.from(BUCKET).remove([path]); // roll back orphan
    return { ok: false, error: error.message };
  }
  await audit("upload", "media", row.id, { path });
  return { ok: true, url, id: row.id };
}

export async function deleteMedia(id) {
  const { data: item } = await db().from("media").select("path").eq("id", id).maybeSingle();
  if (!item) return { ok: false, error: "File not found." };
  const { error: sErr } = await db().storage.from(BUCKET).remove([item.path]);
  if (sErr) return { ok: false, error: sErr.message };
  const { error } = await db().from("media").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await audit("delete", "media", id);
  return { ok: true };
}
