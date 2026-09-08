// Small shared helpers used across the public site and the admin dashboard.

/** Escape untrusted text before inserting into innerHTML. Prevents XSS. */
export function esc(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Escape a value for safe use inside an HTML attribute. */
export function escAttr(value) {
  return esc(value);
}

/** Only allow safe-scheme links; otherwise return "#". */
export function safeUrl(url) {
  if (!url) return "#";
  const v = String(url).trim();
  if (
    v.startsWith("#") ||
    v.startsWith("/") ||
    v.startsWith("mailto:") ||
    /^https?:\/\//i.test(v)
  ) {
    return v;
  }
  return "#";
}

export function initials(name, fallback = "AA") {
  if (!name) return fallback;
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || fallback
  );
}

export function formatDate(date) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(date);
  }
}

export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Inline SVG icons (name → path markup) ───────────────────────────────────
const STROKE_ICONS = {
  document: '<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.6a1 1 0 01.7.3l5.4 5.4a1 1 0 01.3.7V19a2 2 0 01-2 2z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.9 5.7 3.9 9S14.5 18.4 12 21m0-18C9.5 5.6 8.1 8.7 8.1 12s1.4 6.4 3.9 9"/>',
  monitor: '<path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
  wordpress: '<circle cx="12" cy="12" r="9"/><path d="M4.5 9h5m-3 0l3.4 9M14.5 9H19m-6.9 0L15 18m-3-7.5L9.6 18m5.4-9l-2.4 7.5"/>',
  figma: '<circle cx="14.5" cy="12" r="2.5"/><path d="M9.5 4.5H12v5H9.5a2.5 2.5 0 010-5zm0 5H12v5H9.5a2.5 2.5 0 010-5zm0 5H12v2.5a2.5 2.5 0 11-2.5-2.5zm2.5-10h2.5a2.5 2.5 0 010 5H12v-5z"/>',
  brain: '<path d="M9.5 3A2.5 2.5 0 007 5.5v.55A3.5 3.5 0 004.5 9.5c0 .64.17 1.23.47 1.75A3.5 3.5 0 004.5 17a3.5 3.5 0 003.5 3.5c.54 0 1.05-.12 1.5-.34A2.5 2.5 0 0012 21a2.5 2.5 0 002.5-2.5v-13A2.5 2.5 0 0012 3h-2.5z"/>',
  chat: '<path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>',
  pulse: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
  sparkles: '<path d="M5 3v4M3 5h4m3 14v2m-1-1h2m6-16l.9 2.7L20.6 8l-2.7.9L17 11.6l-.9-2.7L13.4 8l2.7-1.3L17 4z"/>',
  download: '<path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v11m0 0l-4-4m4 4l4-4"/>',
  mail: '<path d="M3 8l7.9 5.3a2 2 0 002.2 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
  calendar: '<path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
  arrow: '<path d="M3 12h18m0 0l-7-7m7 7l-7 7"/>',
  external: '<path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>',
  heart: '<path d="M4.3 12.5a5 5 0 017.1-7.1l.6.6.6-.6a5 5 0 117.1 7.1L12 20.2l-7.7-7.7z"/>',
  database: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/>',
  code: '<path d="M9 18l-6-6 6-6m6 12l6-6-6-6"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
};

const FILL_ICONS = {
  linkedin: '<path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 013.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/>',
  github: '<path d="M12 2a10 10 0 00-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.58 9.58 0 015 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.18.58.69.48A10 10 0 0012 2z"/>',
};

export const ICON_CHOICES = [
  "document", "globe", "monitor", "wordpress", "figma", "brain", "chat", "pulse", "sparkles",
  "database", "code", "check", "download", "calendar",
];

/** Returns an <svg> string for the named icon. */
export function icon(name, cls = "") {
  if (FILL_ICONS[name]) {
    return `<svg viewBox="0 0 24 24" fill="currentColor" class="${cls}" aria-hidden="true">${FILL_ICONS[name]}</svg>`;
  }
  const body = STROKE_ICONS[name] || STROKE_ICONS.sparkles;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${body}</svg>`;
}

export function socialIconName(platform) {
  if (platform === "linkedin") return "linkedin";
  if (platform === "github") return "github";
  return "mail";
}

// ── Brand logos for tools & technologies ────────────────────────────────────
// Maps a tool/technology name to its Simple Icons slug. Common names that don't
// match their slug 1:1 are listed explicitly; anything else falls back to a
// slugified guess and lets the CDN 404 (handled by the <img> onerror, which
// then shows an initials badge instead). Served from https://cdn.simpleicons.org.
// Only verified-working Simple Icons slugs are listed. Some well-known brands
// (ChatGPT/OpenAI, the Adobe suite, Canva, Slack, VS Code, C#) have been pulled
// from Simple Icons for trademark reasons and have no CDN icon — those simply
// fall back to an initials badge (or an admin-uploaded icon_url).
const TECH_LOGO_SLUGS = {
  // CMS / site builders
  wordpress: "wordpress", elementor: "elementor", woocommerce: "woocommerce",
  wix: "wix", webflow: "webflow", shopify: "shopify", squarespace: "squarespace",
  drupal: "drupal", joomla: "joomla", ghost: "ghost", strapi: "strapi", contentful: "contentful",
  // Design tools
  figma: "figma", framer: "framer", sketch: "sketch", invision: "invision", blender: "blender",
  // AI
  claude: "claude", "claude ai": "claude", anthropic: "anthropic",
  // Simple Icons files ChatGPT under the OpenAI mark.
  chatgpt: "openai", "chat gpt": "openai", openai: "openai", gpt: "openai",
  gemini: "googlegemini", "google gemini": "googlegemini", huggingface: "huggingface",
  tensorflow: "tensorflow", pytorch: "pytorch", opencv: "opencv",
  // Markup / languages
  html: "html5", html5: "html5", css: "css", css3: "css",
  javascript: "javascript", js: "javascript", typescript: "typescript", ts: "typescript",
  php: "php", python: "python", java: "openjdk", "c++": "cplusplus",
  go: "go", golang: "go", rust: "rust", ruby: "ruby", kotlin: "kotlin",
  swift: "swift", dart: "dart", "c": "c", lua: "lua", perl: "perl", scala: "scala",
  // Runtimes / frameworks
  "node.js": "nodedotjs", node: "nodedotjs", nodejs: "nodedotjs",
  react: "react", "react.js": "react", reactnative: "react", "react native": "react",
  "next.js": "nextdotjs", nextjs: "nextdotjs", next: "nextdotjs",
  "nuxt.js": "nuxtdotjs", nuxt: "nuxtdotjs",
  vue: "vuedotjs", "vue.js": "vuedotjs", angular: "angular", svelte: "svelte",
  astro: "astro", gatsby: "gatsby", remix: "remixrun", solid: "solid", qwik: "qwik",
  laravel: "laravel", django: "django", flask: "flask", express: "express",
  "express.js": "express", spring: "spring", rails: "rubyonrails", "ruby on rails": "rubyonrails",
  flutter: "flutter", ".net": "dotnet", dotnet: "dotnet",
  // Styling / build
  tailwind: "tailwindcss", "tailwind css": "tailwindcss", tailwindcss: "tailwindcss",
  bootstrap: "bootstrap", sass: "sass", scss: "sass", jquery: "jquery",
  "material ui": "mui", mui: "mui", chakra: "chakraui",
  webpack: "webpack", vite: "vite", babel: "babel", npm: "npm", yarn: "yarn",
  eslint: "eslint", prettier: "prettier", "three.js": "threedotjs", threejs: "threedotjs",
  gsap: "greensock", greensock: "greensock", redux: "redux", graphql: "graphql",
  // Version control / DevOps
  git: "git", github: "github", gitlab: "gitlab", bitbucket: "bitbucket",
  docker: "docker", kubernetes: "kubernetes", jenkins: "jenkins", ansible: "ansible",
  linux: "linux", ubuntu: "ubuntu", nginx: "nginx", vercel: "vercel", netlify: "netlify",
  render: "render", railway: "railway", "render.com": "render",
  cloudflare: "cloudflare", heroku: "heroku", digitalocean: "digitalocean",
  "google cloud": "googlecloud", gcp: "googlecloud",
  // Databases / backend
  mysql: "mysql", postgresql: "postgresql", postgres: "postgresql", mariadb: "mariadb",
  mongodb: "mongodb", mongo: "mongodb", supabase: "supabase", firebase: "firebase",
  sqlite: "sqlite", redis: "redis", prisma: "prisma", appwrite: "appwrite",
  // Tools / SaaS
  notion: "notion", trello: "trello", jira: "jira", asana: "asana", clickup: "clickup",
  miro: "miro", airtable: "airtable", postman: "postman", storybook: "storybook",
  jest: "jest", cypress: "cypress", playwright: "playwright",
  stripe: "stripe", paypal: "paypal", mailchimp: "mailchimp",
  // Data
  pandas: "pandas", numpy: "numpy", jupyter: "jupyter", d3: "d3dotjs", "d3.js": "d3dotjs",
};

/**
 * Best-effort brand logo URL for a tool/technology name. Uses the curated slug
 * map first, then guesses a Simple Icons slug by stripping everything but
 * letters/numbers (their slugs have no spaces or hyphens, e.g. "tailwindcss").
 * Since some guesses won't exist on the CDN, callers must handle `onerror`
 * (the skills grid hides the tile when the icon fails to load).
 */
export function techLogo(name) {
  if (!name) return "";
  const key = String(name).trim().toLowerCase();
  if (TECH_LOGO_SLUGS[key]) return `https://cdn.simpleicons.org/${TECH_LOGO_SLUGS[key]}`;
  const slug = key.normalize("NFKD").replace(/[^a-z0-9]/g, "");
  return slug ? `https://cdn.simpleicons.org/${slug}` : "";
}

/**
 * True only for a name the slug map knows, so its logo is certain to exist.
 * `techLogo` will happily guess a URL for anything, which is fine where a
 * failed image just leaves plain text — but a row built *of* logos should
 * contain only the certain ones, or half of it renders as gaps.
 */
export function hasTechLogo(name) {
  return Boolean(TECH_LOGO_SLUGS[String(name || "").trim().toLowerCase()]);
}


// ── Industries ──────────────────────────────────────────────────────────────
// Projects are presented by the sector they were delivered for, not by client
// branding. Existing records store a company name in the CMS's industry field,
// so those known names are mapped to their sector here; anything else — and
// every value typed into the admin "Industry" field from now on — is shown
// exactly as entered. Keys are lower-cased.
const INDUSTRY_BY_NAME = {
  "al borg diagnostics": "Healthcare & Diagnostics",
  "al borg": "Healthcare & Diagnostics",
  "iciec": "Insurance & Trade Finance",
  "aramco station": "Energy & Fuel Retail",
  "aramco stations": "Energy & Fuel Retail",
  "aramco": "Energy & Fuel Retail",
  "redsea mall": "Retail & Shopping Malls",
  "red sea mall": "Retail & Shopping Malls",
  "elite auto distribution jaecoo and omoda": "Automotive",
  "jaecoo": "Automotive",
  "omoda": "Automotive",
  "bestune": "Automotive",
};

/**
 * The industry label for a stored value: the mapped sector when the value is a
 * company name we know, otherwise the value itself, trimmed.
 */
export function industryLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return INDUSTRY_BY_NAME[raw.toLowerCase()] || raw;
}

// Company names that appear inside project titles. The public site presents
// work by industry rather than by client branding, so these are stripped from
// titles at render time. Each entry is the brand token only ("aramco", not
// "aramco stations") so what remains of a title still describes the project;
// they are applied longest-first, so "al borg diagnostics" is tried before
// "al borg".
const CLIENT_BRANDS = [
  "al borg diagnostics", "al borg", "iciec", "redsea mall", "red sea mall",
  "elite auto distribution", "aramco", "jaecoo", "omoda", "bestune",
].sort((a, b) => b.length - a.length);

const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A project title with the client's name taken out: "Al Borg WhatsApp Chatbot
 * Solution" reads as "WhatsApp Chatbot Solution". Only a name at the start or
 * the end is removed — one in the middle is load-bearing grammar ("Migrating
 * Aramco to X") — and a title that would be left with no words is kept as it
 * is. Titles already renamed in the CMS pass through untouched.
 */
export function projectTitle(title) {
  let out = String(title || "").trim();
  for (const brand of CLIENT_BRANDS) {
    const b = reEscape(brand);
    // The possessive is included so "Al Borg's Platform" loses the whole of it.
    const lead = new RegExp(`^${b}(?:['\u2019]s)?\\b[\\s:\u2013\u2014-]*`, "i");
    const trail = new RegExp(`[\\s:\u2013\u2014-]*\\b(?:for|by|at|with)?\\s*${b}(?:['\u2019]s)?\\s*$`, "i");
    const stripped = out.replace(lead, "").replace(trail, "").trim();
    if (/[a-z0-9]/i.test(stripped)) out = stripped;
  }
  return out.replace(/\s{2,}/g, " ").trim() || String(title || "").trim();
}
