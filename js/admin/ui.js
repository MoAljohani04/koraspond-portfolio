// Shared admin UI helpers: toasts, confirm modal, form-field builders,
// drag-and-drop reordering, and the image/PDF upload widget.
import { esc, escAttr } from "../helpers.js";
import { uploadMedia } from "./db.js";

export { esc, escAttr };

// ── Toasts ──────────────────────────────────────────────────────────────────
let toastHost;
export function toast(kind, text) {
  if (!toastHost) {
    toastHost = document.createElement("div");
    toastHost.className = "toasts";
    document.body.appendChild(toastHost);
  }
  const t = document.createElement("div");
  t.className = `toast ${kind === "error" ? "error" : "success"}`;
  t.textContent = text;
  toastHost.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

/** Show ok/error toast from a {ok,error,message} result. Returns result.ok. */
export function toastResult(result, okMsg = "Saved.") {
  if (result && result.ok) toast("success", result.message || okMsg);
  else toast("error", (result && result.error) || "Something went wrong.");
  return !!(result && result.ok);
}

// ── Confirm dialog ───────────────────────────────────────────────────────────
export function confirmDialog({ title, description, confirmLabel = "Delete" }) {
  return new Promise((resolve) => {
    const bg = document.createElement("div");
    bg.className = "modal-bg";
    bg.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${esc(title)}</h3>
        <p>${esc(description)}</p>
        <div class="modal-acts">
          <button class="btn btn-ghost" data-x="cancel">Cancel</button>
          <button class="btn" style="background:var(--color-danger-solid);color:var(--color-text)" data-x="ok">${esc(confirmLabel)}</button>
        </div>
      </div>`;
    const close = (val) => { bg.remove(); resolve(val); };
    bg.addEventListener("click", (e) => { if (e.target === bg) close(false); });
    bg.querySelector('[data-x="cancel"]').onclick = () => close(false);
    bg.querySelector('[data-x="ok"]').onclick = () => close(true);
    document.body.appendChild(bg);
  });
}

// ── Element from HTML string ─────────────────────────────────────────────────
export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// ── Field builders (return HTML strings) ─────────────────────────────────────
export function fieldText({ label, name, value = "", type = "text", placeholder = "", required = false, hint = "" }) {
  return `
    <div class="field">
      <label for="f-${name}">${esc(label)}${required ? ' <span class="req">*</span>' : ""}</label>
      <input class="input" id="f-${name}" name="${escAttr(name)}" type="${type}" value="${escAttr(value)}"
        placeholder="${escAttr(placeholder)}" ${required ? "required" : ""} />
      ${hint ? `<p class="hint">${esc(hint)}</p>` : ""}
    </div>`;
}
export function fieldTextarea({ label, name, value = "", rows = 3, placeholder = "", hint = "" }) {
  return `
    <div class="field">
      <label for="f-${name}">${esc(label)}</label>
      <textarea class="textarea" id="f-${name}" name="${escAttr(name)}" rows="${rows}" placeholder="${escAttr(placeholder)}">${esc(value)}</textarea>
      ${hint ? `<p class="hint">${esc(hint)}</p>` : ""}
    </div>`;
}
export function fieldSelect({ label, name, value = "", options, hint = "" }) {
  const opts = options.map((o) =>
    `<option value="${escAttr(o.value)}" ${o.value === value ? "selected" : ""}>${esc(o.label)}</option>`).join("");
  return `
    <div class="field">
      <label for="f-${name}">${esc(label)}</label>
      <select class="select" id="f-${name}" name="${escAttr(name)}">${opts}</select>
      ${hint ? `<p class="hint">${esc(hint)}</p>` : ""}
    </div>`;
}

/** A toggle switch bound to a hidden input (value "true"/"false"). */
export function toggle({ label, name, checked, hint = "" }) {
  return `
    <div class="toggle">
      <div>
        <div class="tl">${esc(label)}</div>
        ${hint ? `<div class="th">${esc(hint)}</div>` : ""}
      </div>
      <input type="hidden" name="${escAttr(name)}" value="${checked ? "true" : "false"}" />
      <button type="button" class="switch ${checked ? "on" : ""}" role="switch" aria-checked="${checked}" aria-label="${escAttr(label)}"></button>
    </div>`;
}

/** Wire every .switch inside `root` to flip its sibling hidden input. */
export function wireToggles(root) {
  root.querySelectorAll(".switch").forEach((sw) => {
    sw.addEventListener("click", () => {
      const on = sw.classList.toggle("on");
      sw.setAttribute("aria-checked", String(on));
      const hidden = sw.parentElement.querySelector('input[type="hidden"]');
      if (hidden) hidden.value = on ? "true" : "false";
    });
  });
}

export function badge(status) {
  return `<span class="badge ${esc(status)}">${esc(status)}</span>`;
}

export function statusButtons(status) {
  const parts = [];
  if (status !== "published") parts.push(`<button class="publish" data-status="published">Publish</button>`);
  if (status === "published") parts.push(`<button class="unpublish" data-status="draft">Unpublish</button>`);
  if (status !== "hidden") parts.push(`<button class="hide" data-status="hidden">Hide</button>`);
  return `<span class="status-btns" style="display:inline-flex;gap:6px">${parts.join("")}</span>`;
}

// ── Sortable list (drag + arrow buttons) ─────────────────────────────────────
/** Attach reordering to a <ul class="rows">. `onReorder(ids)` gets the new order. */
export function makeSortable(ul, onReorder) {
  let dragEl = null;
  const items = () => Array.from(ul.querySelectorAll("[data-id]"));

  const emit = () => onReorder(items().map((li) => li.dataset.id));

  ul.querySelectorAll("[data-id]").forEach((li) => {
    li.setAttribute("draggable", "true");
    li.addEventListener("dragstart", () => { dragEl = li; li.classList.add("dragging"); });
    li.addEventListener("dragend", () => { li.classList.remove("dragging"); dragEl = null; });
    li.addEventListener("dragover", (e) => { e.preventDefault(); li.classList.add("dragover"); });
    li.addEventListener("dragleave", () => li.classList.remove("dragover"));
    li.addEventListener("drop", (e) => {
      e.preventDefault();
      li.classList.remove("dragover");
      if (dragEl && dragEl !== li) {
        const all = items();
        const from = all.indexOf(dragEl), to = all.indexOf(li);
        if (from < to) li.after(dragEl); else li.before(dragEl);
        emit();
      }
    });
    const up = li.querySelector('[data-arrow="up"]');
    const down = li.querySelector('[data-arrow="down"]');
    if (up) up.addEventListener("click", () => { const p = li.previousElementSibling; if (p) { li.parentElement.insertBefore(li, p); emit(); } });
    if (down) down.addEventListener("click", () => { const n = li.nextElementSibling; if (n) { li.parentElement.insertBefore(n, li); emit(); } });
  });
}

/** Reorder row scaffold: drag handle + up/down arrows around `inner`. */
export function sortableRow(id, inner) {
  return `
    <li class="row" data-id="${escAttr(id)}">
      <span class="drag" title="Drag to reorder">⠿</span>
      ${inner}
      <div class="arrows">
        <button type="button" data-arrow="up" aria-label="Move up">▲</button>
        <button type="button" data-arrow="down" aria-label="Move down">▼</button>
      </div>
    </li>`;
}

// ── Image / PDF upload widget ────────────────────────────────────────────────
/**
 * Renders an upload-with-preview control into `mount`. Calls `onChange(url)`
 * whenever the URL changes (upload or remove). Returns { getUrl }.
 */
export function imageUpload(mount, { label, folder, value = "", accept = "image", hint = "", onChange }) {
  let url = value || "";
  const acceptAttr = accept === "image-or-pdf"
    ? "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/pdf"
    : "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";

  function paint() {
    const isPdf = url && url.toLowerCase().endsWith(".pdf");
    mount.innerHTML = `
      <div class="field">
        <label>${esc(label)}</label>
        <div class="upload-prev">
          <div class="thumb">
            ${url ? (isPdf ? `<span class="ph">PDF</span>` : `<img src="${escAttr(url)}" alt="" />`) : `<span class="ph">None</span>`}
          </div>
          <div>
            <div style="display:flex;gap:8px">
              <button type="button" class="btn btn-ghost btn-sm" data-x="pick">${url ? "Replace" : "Upload"}</button>
              ${url ? `<button type="button" class="btn btn-danger btn-sm" data-x="remove">Remove</button>` : ""}
            </div>
            ${hint ? `<p class="hint" style="margin-top:6px">${esc(hint)}</p>` : ""}
          </div>
        </div>
        <input type="file" accept="${acceptAttr}" hidden data-x="file" />
      </div>`;
    const file = mount.querySelector('[data-x="file"]');
    mount.querySelector('[data-x="pick"]').onclick = () => file.click();
    const rm = mount.querySelector('[data-x="remove"]');
    if (rm) rm.onclick = () => { url = ""; onChange && onChange(""); paint(); };
    file.onchange = async () => {
      const f = file.files && file.files[0];
      if (!f) return;
      const btn = mount.querySelector('[data-x="pick"]');
      btn.disabled = true; btn.textContent = "Uploading…";
      const res = await uploadMedia(f, folder);
      if (res.ok) { url = res.url; onChange && onChange(url); toast("success", "Uploaded."); }
      else toast("error", res.error);
      paint();
    };
  }
  paint();
  return { getUrl: () => url };
}
