// Bespoke SVG artwork, ported from the Figma design.
//
// Every project tile draws a diagram of the actual work rather than a stock
// image, so nothing can fail to load and the grid never waits on the network.
// A project with a real cover image in the CMS uses that instead; everything
// else falls back to one of these, picked deterministically from its slug so a
// project always keeps the same drawing.

const LINE = "var(--line)";
const ACCENT = "var(--accent)";
const DIM = "var(--muted)";
const FILL = "var(--ground-3)";

const wrap = (children, vb = "0 0 400 300") =>
  `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${children}</svg>`;

/* -- crawl: pages discovered, links traced, a few flagged ----------------- */
function crawl() {
  const nodes = [
    [200, 40], [110, 105], [290, 105], [60, 185], [160, 185],
    [245, 185], [340, 185], [110, 258], [205, 258], [300, 258],
  ];
  const edges = [
    [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6],
    [4, 7], [4, 8], [5, 8], [5, 9], [3, 7], [6, 9],
  ];
  const flagged = [3, 6, 9];
  const lines = edges
    .map(([a, b]) =>
      `<line x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}" stroke="${LINE}" stroke-width="1"/>`)
    .join("");
  const dots = nodes
    .map(([x, y], i) => {
      const bad = flagged.includes(i);
      const halo = i === 0
        ? `<circle cx="${x}" cy="${y}" r="16" fill="none" stroke="${ACCENT}" stroke-width="1" opacity="0.35"/>`
        : "";
      return `<g>${halo}
        <rect x="${x - 9}" y="${y - 7}" width="18" height="14"
          fill="${bad ? "none" : FILL}" stroke="${bad ? ACCENT : DIM}" stroke-width="1"
          ${bad ? 'stroke-dasharray="2 2"' : ""}/>
        <line x1="${x - 5}" y1="${y - 2}" x2="${x + 5}" y2="${y - 2}" stroke="${bad ? ACCENT : LINE}" stroke-width="1"/>
        <line x1="${x - 5}" y1="${y + 2}" x2="${x + 1}" y2="${y + 2}" stroke="${bad ? ACCENT : LINE}" stroke-width="1"/>
      </g>`;
    })
    .join("");
  return wrap(lines + dots);
}

/* -- score: health gauge + the weighted criteria ------------------------- */
function score() {
  const bars = [
    { label: "LINKS", w: 30 }, { label: "SEO", w: 25 }, { label: "SEC", w: 20 },
    { label: "SPEED", w: 15 }, { label: "CRAWL", w: 10 },
  ];
  const R = 62, CX = 108, CY = 150;
  const C = 2 * Math.PI * R;
  const gauge = `
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${LINE}" stroke-width="10"/>
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${ACCENT}" stroke-width="10"
      stroke-dasharray="${(C * 0.78).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${CX} ${CY})"/>
    <text x="${CX}" y="${CY + 4}" text-anchor="middle" fill="var(--text)"
      style="font:700 40px var(--font-display)">78</text>
    <text x="${CX}" y="${CY + 24}" text-anchor="middle" fill="${DIM}"
      style="font:400 9px var(--font-mono);letter-spacing:2px">HEALTH</text>`;
  const rows = bars
    .map((b, i) => {
      const y = 78 + i * 30;
      return `<g>
        <text x="212" y="${y + 4}" fill="${DIM}" style="font:400 9px var(--font-mono);letter-spacing:1px">${b.label}</text>
        <rect x="258" y="${y - 5}" width="110" height="8" fill="none" stroke="${LINE}" stroke-width="1"/>
        <rect x="258" y="${y - 5}" width="${(110 * b.w) / 30}" height="8" fill="${ACCENT}" opacity="0.85"/>
        <text x="374" y="${y + 4}" fill="${DIM}" style="font:400 9px var(--font-mono)">${b.w}</text>
      </g>`;
    })
    .join("");
  return wrap(gauge + rows);
}

/* -- pages: eleven page wireframes, last row mirrored for RTL ------------- */
function pages() {
  let out = "";
  for (let i = 0; i < 11; i++) {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 22 + col * 92, y = 40 + row * 82;
    const rtl = row === 2;
    const isHome = i === 0;
    const rules = [0, 1, 2]
      .map((k) =>
        `<line x1="${x + 6}" y1="${y + 44 + k * 6}" x2="${rtl ? x + 36 : x + (k === 2 ? 46 : 66)}" y2="${y + 44 + k * 6}" stroke="${DIM}" stroke-width="1" opacity="0.45"/>`)
      .join("");
    out += `<g>
      <rect x="${x}" y="${y}" width="72" height="62" fill="${FILL}" stroke="${isHome ? ACCENT : LINE}" stroke-width="1"/>
      <rect x="${x}" y="${y}" width="72" height="10" fill="${isHome ? ACCENT : LINE}" opacity="${isHome ? 0.8 : 0.5}"/>
      <rect x="${rtl ? x + 40 : x + 6}" y="${y + 18}" width="26" height="18" fill="${LINE}" opacity="0.55"/>
      ${rules}
    </g>`;
  }
  out += `<text x="22" y="26" fill="${DIM}" style="font:400 9px var(--font-mono);letter-spacing:2px">11 PAGES · EN / AR</text>`;
  return wrap(out);
}

/* -- bilingual: two full passes; the AR column shows what stayed English -- */
function bilingual() {
  const untranslated = [2, 4, 6];
  let out = "";
  ["EN", "AR"].forEach((lang, c) => {
    const x = c === 0 ? 40 : 218;
    let rows = "";
    for (let r = 0; r < 8; r++) {
      const y = 66 + r * 25;
      const bad = c === 1 && untranslated.includes(r);
      const rtl = c === 1 && !bad;
      const x1 = rtl ? x + 142 - 12 - 96 : x + 12;
      const x2 = rtl ? x + 142 - 12 : x + 12 + 96;
      const flag = bad
        ? `<circle cx="${x + 156}" cy="${y}" r="5" fill="none" stroke="${ACCENT}" stroke-width="1"/>
           <line x1="${x + 156}" y1="${y - 2}" x2="${x + 156}" y2="${y + 1}" stroke="${ACCENT}" stroke-width="1"/>
           <circle cx="${x + 156}" cy="${y + 3}" r="0.6" fill="${ACCENT}"/>`
        : "";
      rows += `<g>
        <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${bad ? ACCENT : DIM}"
          stroke-width="${bad ? 1.5 : 1}" opacity="${bad ? 1 : 0.5}" ${bad ? 'stroke-dasharray="4 3"' : ""}/>
        ${flag}
      </g>`;
    }
    out += `<g>
      <text x="${x}" y="40" fill="${c === 1 ? ACCENT : DIM}" style="font:400 10px var(--font-mono);letter-spacing:3px">${lang}</text>
      <rect x="${x}" y="52" width="142" height="212" fill="${FILL}" stroke="${LINE}" stroke-width="1"/>
      ${rows}
    </g>`;
  });
  out += `<line x1="200" y1="52" x2="200" y2="264" stroke="${LINE}" stroke-width="1" stroke-dasharray="2 4"/>`;
  return wrap(out);
}

/* -- sheet: the content-gap tracking sheet ------------------------------- */
function sheet() {
  const cols = [96, 104, 78, 70];
  const gaps = [1, 3, 4, 7];
  let out = `<text x="26" y="34" fill="${DIM}" style="font:400 9px var(--font-mono);letter-spacing:2px">PAGE · URL · LOCATION · MISSING TEXT</text>`;
  for (let r = 0; r < 9; r++) {
    const y = 50 + r * 26;
    const isHeader = r === 0;
    const gap = gaps.includes(r);
    let x = 26;
    let cells = "";
    cols.forEach((w, c) => {
      const inner = isHeader
        ? ""
        : gap && c === 3
          ? `<rect x="${x + 6}" y="${y + 8}" width="${w - 12}" height="8" fill="none" stroke="${ACCENT}" stroke-width="1" stroke-dasharray="3 2"/>`
          : `<line x1="${x + 6}" y1="${y + 12}" x2="${x + w - (c === 1 ? 10 : 18)}" y2="${y + 12}" stroke="${DIM}" stroke-width="1" opacity="0.4"/>`;
      cells += `<g>
        <rect x="${x}" y="${y}" width="${w}" height="24" fill="${isHeader ? LINE : "none"}"
          opacity="${isHeader ? 0.35 : 1}" stroke="${LINE}" stroke-width="1"/>
        ${inner}
      </g>`;
      x += w;
    });
    out += `<g>${cells}${gap ? `<circle cx="378" cy="${y + 12}" r="3" fill="${ACCENT}"/>` : ""}</g>`;
  }
  return wrap(out);
}

/* -- chat: a messaging thread on the left, the bot's intent tree on the right */
function chat() {
  // Phone frame with an alternating conversation — incoming plain, outgoing
  // accented — so a chatbot project reads as a chatbot at thumbnail size.
  const bubbles = [
    { out: false, w: 74, h: 20 },
    { out: true, w: 58, h: 18 },
    { out: false, w: 84, h: 26 },
    { out: true, w: 66, h: 18 },
    { out: false, w: 70, h: 20 },
  ];
  let y = 74;
  const thread = bubbles
    .map((b) => {
      const x = b.out ? 148 - b.w : 32;
      const g = `<g>
        <rect x="${x}" y="${y}" width="${b.w}" height="${b.h}" rx="6"
          fill="${b.out ? ACCENT : FILL}" opacity="${b.out ? 0.85 : 1}"
          stroke="${b.out ? ACCENT : LINE}" stroke-width="1"/>
        <line x1="${x + 8}" y1="${y + 8}" x2="${x + b.w - 10}" y2="${y + 8}"
          stroke="${b.out ? "var(--ground)" : DIM}" stroke-width="1" opacity="0.55"/>
        ${b.h > 20 ? `<line x1="${x + 8}" y1="${y + 16}" x2="${x + b.w - 24}" y2="${y + 16}" stroke="${DIM}" stroke-width="1" opacity="0.4"/>` : ""}
      </g>`;
      y += b.h + 10;
      return g;
    })
    .join("");

  const phone = `
    <rect x="20" y="40" width="140" height="222" rx="12" fill="none" stroke="${LINE}" stroke-width="1"/>
    <rect x="20" y="40" width="140" height="22" rx="12" fill="${LINE}" opacity="0.4"/>
    <circle cx="34" cy="51" r="5" fill="none" stroke="${DIM}" stroke-width="1"/>
    <line x1="46" y1="51" x2="96" y2="51" stroke="${DIM}" stroke-width="1" opacity="0.6"/>`;

  // Intent tree: one bot node fanning out to the replies it can resolve.
  const leaves = [[300, 118], [300, 168], [300, 218]];
  const edges = leaves
    .map(([x, cy]) => `<path d="M254 168 C 272 168, 272 ${cy}, ${x - 4} ${cy}" fill="none" stroke="${LINE}" stroke-width="1"/>`)
    .join("");
  const boxes = leaves
    .map(([x, cy], i) => `<g>
      <rect x="${x}" y="${cy - 13}" width="72" height="26" fill="${FILL}" stroke="${i === 0 ? ACCENT : LINE}" stroke-width="1"/>
      <line x1="${x + 9}" y1="${cy - 3}" x2="${x + 52}" y2="${cy - 3}" stroke="${DIM}" stroke-width="1" opacity="0.5"/>
      <line x1="${x + 9}" y1="${cy + 4}" x2="${x + 38}" y2="${cy + 4}" stroke="${DIM}" stroke-width="1" opacity="0.35"/>
    </g>`)
    .join("");
  const bot = `
    <circle cx="228" cy="168" r="26" fill="none" stroke="${ACCENT}" stroke-width="1.5"/>
    <rect x="216" y="160" width="24" height="17" rx="4" fill="none" stroke="${ACCENT}" stroke-width="1"/>
    <circle cx="222.5" cy="168.5" r="1.8" fill="${ACCENT}"/>
    <circle cx="233.5" cy="168.5" r="1.8" fill="${ACCENT}"/>
    <line x1="228" y1="153" x2="228" y2="160" stroke="${ACCENT}" stroke-width="1"/>
    <text x="228" y="212" text-anchor="middle" fill="${DIM}" style="font:400 9px var(--font-mono);letter-spacing:2px">BOT</text>`;

  const head = `<text x="196" y="46" fill="${DIM}" style="font:400 9px var(--font-mono);letter-spacing:2px">INTENTS</text>`;
  return wrap(phone + thread + head + edges + bot + boxes);
}

/* -- doc: a requirement list answered response-by-response (RFP, proposals) - */
function doc() {
  let rows = "";
  for (let r = 0; r < 7; r++) {
    const y = 62 + r * 30;
    const answered = r !== 4;
    rows += `<g>
      <text x="26" y="${y + 4}" fill="${DIM}" style="font:400 9px var(--font-mono)">${String(r + 1).padStart(2, "0")}</text>
      <line x1="50" y1="${y}" x2="${150 - (r % 3) * 14}" y2="${y}" stroke="${DIM}" stroke-width="1" opacity="0.45"/>
      <line x1="178" y1="${y}" x2="196" y2="${y}" stroke="${LINE}" stroke-width="1" stroke-dasharray="2 3"/>
      <rect x="206" y="${y - 11}" width="150" height="22" fill="${answered ? FILL : "none"}"
        stroke="${answered ? LINE : ACCENT}" stroke-width="1" ${answered ? "" : 'stroke-dasharray="3 2"'}/>
      <line x1="216" y1="${y}" x2="${330 - (r % 4) * 16}" y2="${y}" stroke="${answered ? DIM : ACCENT}" stroke-width="1" opacity="${answered ? 0.4 : 0.8}"/>
      ${answered
        ? `<path d="M366 ${y - 2} l3 4 6 -8" fill="none" stroke="${ACCENT}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<circle cx="370" cy="${y}" r="4" fill="none" stroke="${ACCENT}" stroke-width="1"/>`}
    </g>`;
  }
  const head = `
    <text x="26" y="34" fill="${DIM}" style="font:400 9px var(--font-mono);letter-spacing:2px">REQUIREMENT</text>
    <text x="206" y="34" fill="${DIM}" style="font:400 9px var(--font-mono);letter-spacing:2px">RESPONSE</text>
    <line x1="26" y1="42" x2="374" y2="42" stroke="${LINE}" stroke-width="1"/>`;
  return wrap(head + rows);
}

/* -- neural: prompt in, layers of reasoning, an answer out (AI work) ------- */
function neural() {
  const layers = [
    { x: 96, ys: [92, 150, 208] },
    { x: 200, ys: [70, 122, 174, 226] },
    { x: 304, ys: [122, 174] },
  ];
  let edges = "";
  for (let l = 0; l < layers.length - 1; l++) {
    for (const y1 of layers[l].ys) {
      for (const y2 of layers[l + 1].ys) {
        edges += `<line x1="${layers[l].x}" y1="${y1}" x2="${layers[l + 1].x}" y2="${y2}"
          stroke="${LINE}" stroke-width="1" opacity="0.5"/>`;
      }
    }
  }
  const dots = layers
    .map((L, l) => L.ys
      .map((y) => `<circle cx="${L.x}" cy="${y}" r="7" fill="${FILL}"
        stroke="${l === layers.length - 1 ? ACCENT : DIM}" stroke-width="1"/>`)
      .join(""))
    .join("");
  const io = `
    <rect x="18" y="136" width="56" height="28" fill="none" stroke="${ACCENT}" stroke-width="1"/>
    <line x1="27" y1="146" x2="65" y2="146" stroke="${ACCENT}" stroke-width="1" opacity="0.7"/>
    <line x1="27" y1="154" x2="52" y2="154" stroke="${ACCENT}" stroke-width="1" opacity="0.4"/>
    <line x1="74" y1="150" x2="89" y2="150" stroke="${LINE}" stroke-width="1"/>
    <text x="18" y="128" fill="${DIM}" style="font:400 9px var(--font-mono);letter-spacing:2px">PROMPT</text>
    <line x1="311" y1="148" x2="330" y2="148" stroke="${LINE}" stroke-width="1"/>
    <rect x="330" y="134" width="52" height="28" fill="${FILL}" stroke="${LINE}" stroke-width="1"/>
    <line x1="339" y1="144" x2="373" y2="144" stroke="${DIM}" stroke-width="1" opacity="0.5"/>
    <line x1="339" y1="152" x2="362" y2="152" stroke="${DIM}" stroke-width="1" opacity="0.35"/>
    <text x="330" y="126" fill="${DIM}" style="font:400 9px var(--font-mono);letter-spacing:2px">OUTPUT</text>`;
  return wrap(edges + dots + io);
}

const ARTWORKS = { crawl, score, pages, bilingual, sheet, chat, doc, neural };
export const ART_NAMES = Object.keys(ARTWORKS);

// ── Subject matching ────────────────────────────────────────────────────────
// A project's drawing should describe the project, not a hash of its name — a
// WhatsApp chatbot must not get the bilingual-translation diagram. Each entry
// maps an artwork to the words that mean it; the first artwork whose words
// appear in the project's title / type / category / tools wins, and anything
// unmatched still falls back to the stable hash pick below.
// Order matters: the most specific subjects are tested first.
const SUBJECTS = [
  ["chat", ["whatsapp", "chatbot", "chat bot", "chatbots", "bot", "kiosk", "conversation",
            "conversational", "messaging", "messenger", "assistant", "live chat", "support agent"]],
  ["neural", ["ai", "a.i.", "artificial intelligence", "llm", "gpt", "chatgpt", "claude", "gemini",
              "prompt", "prompt engineering", "machine learning", "automation", "agent"]],
  ["bilingual", ["translation", "translate", "translated", "localization", "localisation",
                 "localized", "bilingual", "multilingual", "multi-language", "arabic", "rtl"]],
  ["doc", ["rfp", "rfi", "rfq", "tender", "vendor response", "proposal", "bid", "documentation",
           "annual report", "whitepaper", "case study", "policy"]],
  ["sheet", ["content gap", "gap analysis", "qa", "quality assurance", "testing", "test pass",
             "audit", "spreadsheet", "excel", "tracking", "content analysis", "review"]],
  ["crawl", ["crawler", "crawl", "sitemap", "seo", "broken link", "broken links", "indexing",
             "site map", "scraper", "scraping"]],
  ["score", ["health", "monitor", "monitoring", "scanner", "performance", "page speed",
             "pagespeed", "dashboard", "analytics", "metrics", "security"]],
  ["pages", ["website", "web site", "web design", "wordpress", "landing page", "brand site",
             "front-end", "frontend", "ui", "ux", "ui/ux", "figma", "web development",
             "microsite", "portfolio", "responsive"]],
];

// Pre-compiled so matching costs nothing per card. Word boundaries keep short
// keywords honest — "ai" must not match "email", "qa" must not match "aqua".
const SUBJECT_RES = SUBJECTS.map(([name, words]) => [
  name,
  new RegExp(`(^|[^a-z0-9])(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})([^a-z0-9]|$)`, "i"),
]);

/** The artwork name whose subject matches this text, or "" when none does. */
function subjectArtwork(text) {
  const hay = String(text || "").toLowerCase();
  if (!hay.trim()) return "";
  for (const [name, re] of SUBJECT_RES) if (re.test(hay)) return name;
  return "";
}

/** Everything about a project that hints at what it is, as one search string. */
function projectSubjectText(project = {}) {
  const names = (list) => (list || []).map((x) => (typeof x === "string" ? x : x && (x.name || x.title))).filter(Boolean);
  return [
    project.title,
    project.project_type,
    project.short_description,
    project.slug,
    ...names(project.cats || project.categories),
    ...names(project.tools || project.technologies),
  ].filter(Boolean).join(" ");
}

/** Render one artwork by name. Unknown names fall back to "crawl". */
export function artwork(name) {
  return (ARTWORKS[name] || ARTWORKS.crawl)();
}

/** Stable per-project pick for text that names no known subject, so a project
 *  without a recognisable topic still keeps the same drawing between loads and
 *  wherever it appears. FNV-1a — a plain sum spreads short titles badly and
 *  gave every project the same drawing. */
function hashArtworkName(key = "") {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return ART_NAMES[h % ART_NAMES.length];
}

/** Drawing for a piece of text — matched on subject first, hashed only when
 *  nothing in it is recognisable. Accepts a project object or a plain string. */
export function artworkFor(key = "") {
  const text = typeof key === "string" ? key : projectSubjectText(key);
  return artwork(subjectArtwork(text) || hashArtworkName(text));
}

/**
 * The visual for a project tile: its cover image when the CMS has one, and a
 * diagram of the project's own subject when it does not.
 */
export function projectVisual(project) {
  const src = project.cover_image;
  if (src) {
    const alt = project.cover_alt || project.title || "";
    return `<img src="${String(src).replace(/"/g, "&quot;")}" alt="${String(alt).replace(/"/g, "&quot;")}" loading="lazy" />`;
  }
  return `<span class="art">${artworkFor(project)}</span>`;
}
