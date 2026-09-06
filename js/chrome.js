// Shared page chrome for the standalone public pages (work.html, courses.html):
// fills the navbar brand + footer socials from the database (with demo
// fallback), wires the mobile menu, and exposes small routing helpers so the
// new pages match index.html exactly without duplicating logic.
import { getClient, isConfigured } from "./supabaseClient.js";
import { FALLBACK } from "./fallback.js";
import { esc, escAttr, safeUrl, initials, icon, socialIconName } from "./helpers.js";

const $ = (id) => document.getElementById(id);

// Site root (the folder that contains index.html), derived from this module's
// own URL — works whether the site is at the domain root or in a subfolder.
export const ROOT = new URL("..", import.meta.url).pathname;

/** Absolute href for a path relative to the site root. */
export const rootHref = (p = "") => ROOT + String(p).replace(/^\//, "");

/**
 * Parse the current URL into `{ segments, query }`, tolerant of three hosting
 * setups so deep links never break:
 *   1. Clean URLs (with the shipped rewrites):  /work/website-design/some-project
 *   2. The .html page itself:                   /work.html
 *   3. Query fallback (no rewrite):             /work.html?c=website-design&p=some-project
 */
export function parseRoute(base) {
  const q = new URLSearchParams(location.search);
  let path = decodeURIComponent(location.pathname);
  const root = decodeURIComponent(ROOT);
  if (path.startsWith(root)) path = path.slice(root.length);
  path = path.replace(/^\/+/, "");
  // Strip the leading "work" / "work.html" (or courses) segment.
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === base || parts[0] === `${base}.html`) parts.shift();
  const segments = parts.length ? parts : [q.get("c"), q.get("p")].filter(Boolean);
  return { segments, query: q };
}

/** Push a clean URL for in-page navigation (falls back gracefully on refresh).
 *  `segments` is the full path including the base, e.g. ["work", "<cat>", "<proj>"]. */
export function pushRoute(segments) {
  const clean = segments.filter(Boolean).map(encodeURIComponent).join("/");
  const url = rootHref(clean);
  if (location.pathname + location.search !== url) history.pushState({}, "", url);
}

async function chromeData() {
  if (!isConfigured()) {
    return { settings: FALLBACK.settings, profile: FALLBACK.profile, socials: FALLBACK.socialLinks };
  }
  const supabase = getClient();
  const [settings, profile, socials] = await Promise.all([
    supabase.from("site_settings").select("*").limit(1).maybeSingle(),
    supabase.from("profile").select("*").limit(1).maybeSingle(),
    supabase.from("social_links").select("*").eq("status", "published").order("display_order"),
  ]);
  return {
    settings: settings.data || FALLBACK.settings,
    profile: profile.data || FALLBACK.profile,
    socials: socials.data || [],
  };
}

/** Render the shared navbar + footer and wire the mobile menu. `active` is the
 *  nav key ("work" | "courses") to highlight. */
export async function initChrome(active) {
  wireMobileNav();
  const { settings, profile, socials } = await chromeData();

  const brandBadge = $("brand-badge");
  if (brandBadge) brandBadge.textContent = initials(profile.full_name);
  const brandName = $("brand-name");
  if (brandName) brandName.textContent = profile.full_name || "";
  const brandRole = $("brand-role");
  if (brandRole) brandRole.textContent = profile.headline_role || "";

  document.querySelectorAll("[data-nav-active]").forEach((a) => {
    a.classList.toggle("active", a.dataset.navActive === active);
  });

  // Download CV — same button index.html shows, so every page offers it.
  const cv = $("nav-cv");
  if (cv && profile.cv_url) {
    cv.href = safeUrl(profile.cv_url);
    cv.hidden = false;
    cv.innerHTML = `CV ${icon("download")}`;
  }

  // Footer identity line — same shape as the homepage footer.
  const footName = $("foot-name");
  if (footName) footName.textContent = profile.full_name || settings.site_title || "";
  const footMeta = $("foot-meta");
  if (footMeta) {
    footMeta.textContent =
      `© ${new Date().getFullYear()}${profile.headline_role ? ` · ${profile.headline_role}` : ""}`;
  }

  const socialsHost = $("socials");
  if (socialsHost) {
    socialsHost.innerHTML = (socials || [])
      .map((l) => `<a class="social-link" href="${safeUrl(l.url)}" ${l.url.startsWith("mailto:") ? "" : 'target="_blank" rel="noopener"'} aria-label="${escAttr(l.label || l.platform)}">${icon(socialIconName(l.platform))}</a>`)
      .join("");
  }
  return { settings, profile, socials };
}

function wireMobileNav() {
  const toggle = $("nav-toggle");
  const mobile = $("nav-mobile");
  if (!toggle || !mobile) return;
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

export { esc, escAttr, safeUrl, icon };
