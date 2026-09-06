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

const ARTWORKS = { crawl, score, pages, bilingual, sheet };
export const ART_NAMES = Object.keys(ARTWORKS);

/** Render one artwork by name. Unknown names fall back to "crawl". */
export function artwork(name) {
  return (ARTWORKS[name] || ARTWORKS.crawl)();
}

/** Stable per-project pick, so a project's drawing never changes between loads
 *  and is the same wherever that project appears. FNV-1a — a plain sum spreads
 *  short titles badly and gave every project the same drawing. */
export function artworkFor(key = "") {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return artwork(ART_NAMES[h % ART_NAMES.length]);
}

/**
 * The visual for a project tile: its cover image when the CMS has one, and a
 * generated diagram when it does not.
 */
export function projectVisual(project) {
  const src = project.cover_image || project.client_logo;
  if (src) {
    const alt = project.cover_alt || project.title || "";
    return `<img src="${String(src).replace(/"/g, "&quot;")}" alt="${String(alt).replace(/"/g, "&quot;")}" loading="lazy" />`;
  }
  return `<span class="art">${artworkFor(project.slug || project.title || "")}</span>`;
}
