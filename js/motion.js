// Motion and pointer behaviour shared by every public page.
//
// All of it is progressive enhancement. `document.documentElement` only gets
// the `js-motion` class once this module runs, and the CSS hides revealable
// content solely under that class — so with JavaScript off, with an old
// browser, or with reduced motion requested, every page renders complete and
// static. Nothing here is required to read the site.

export const REDUCED_MOTION =
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const SUPPORTED = typeof IntersectionObserver === "function";

/** Enable the reveal styles. Called once, before anything is rendered. */
export function armMotion() {
  if (!REDUCED_MOTION && SUPPORTED) document.documentElement.classList.add("js-motion");
}

/* -------------------------------------------------------------------------
   Reveal on scroll
   ---------------------------------------------------------------------- */
let revealObserver = null;
let observerFired = false;
let fallbackBound = false;
let failsafeTimer = 0;
const pending = new Set();

/** Give up on the effect and show everything, permanently. */
function showEverything() {
  document.documentElement.classList.remove("js-motion");
  pending.clear();
}

/** Reveal whatever is currently within the viewport. Used as the fallback when
 *  the observer cannot do its job, and as the safety sweep below. */
function sweep() {
  const vh = window.innerHeight;
  if (!vh) return;
  for (const el of [...pending]) {
    const r = el.getBoundingClientRect();
    if (r.top < vh * 0.96 && r.bottom > 0) {
      el.classList.add("is-in");
      pending.delete(el);
    }
  }
}

function ensureRevealObserver() {
  if (revealObserver) return revealObserver;
  revealObserver = new IntersectionObserver(
    (entries) => {
      observerFired = true;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        pending.delete(e.target);
        revealObserver.unobserve(e.target);   // reveal once, then stop watching
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  return revealObserver;
}

/**
 * Content that starts hidden must never be able to stay hidden. Shortly after
 * the first reveal pass, check that the observer is actually working: a
 * viewport the browser reports as zero-height (an embedded or offscreen frame,
 * for instance) never intersects anything, and would otherwise leave the page
 * blank. In that case the effect is abandoned and everything is shown; if the
 * observer is merely quiet because nothing is in view yet, a scroll-driven
 * sweep is bound alongside it as a second path to the same result.
 */
function armFailsafe() {
  if (failsafeTimer) return;
  failsafeTimer = setTimeout(() => {
    if (!window.innerHeight) return showEverything();
    if (observerFired) return;
    sweep();
    if (!fallbackBound) {
      fallbackBound = true;
      window.addEventListener("scroll", sweep, { passive: true });
      window.addEventListener("resize", sweep, { passive: true });
    }
  }, 1600);
}

/**
 * Reveal every `[data-reveal]` inside `root` as it scrolls into view. Items
 * sharing a parent are staggered by their position, so a grid deals itself in
 * rather than appearing all at once. Already-revealed nodes are skipped, so
 * this is safe to call again after re-rendering part of a page.
 */
export function initReveal(root = document) {
  if (REDUCED_MOTION || !SUPPORTED) return;
  if (!document.documentElement.classList.contains("js-motion")) return;  // already given up
  const io = ensureRevealObserver();
  const groups = new Map();
  root.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => {
    const key = el.parentElement || document.body;
    const i = groups.get(key) || 0;
    groups.set(key, i + 1);
    // Cap the stagger so a long list never leaves the last item waiting.
    el.style.setProperty("--reveal-delay", `${Math.min(i, 8) * 60}ms`);
    pending.add(el);
    io.observe(el);
  });
  armFailsafe();
  if (fallbackBound) sweep();
}

/* -------------------------------------------------------------------------
   Pointer-tracked cards
   ---------------------------------------------------------------------- */
/**
 * Give each matched card a light that follows the pointer and a small tilt
 * towards it. Coordinates are written as CSS custom properties inside one
 * rAF per frame, so the work stays on the compositor and off the layout path.
 * Touch devices never fire pointermove, so they simply keep the flat card.
 */
export function initPointerCards(root = document, selector = "[data-pointer]") {
  if (REDUCED_MOTION) return;
  root.querySelectorAll(selector).forEach((card) => {
    if (card.dataset.pointerBound) return;
    card.dataset.pointerBound = "1";

    let frame = 0;
    const move = (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", `${(x * 100).toFixed(2)}%`);
        card.style.setProperty("--my", `${(y * 100).toFixed(2)}%`);
        card.style.setProperty("--ry", `${((x - 0.5) * 6).toFixed(2)}deg`);
        card.style.setProperty("--rx", `${((0.5 - y) * 6).toFixed(2)}deg`);
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--rx", "0deg");
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
  });
}

/* -------------------------------------------------------------------------
   Counting stats
   ---------------------------------------------------------------------- */
/**
 * Count `[data-count]` elements up to their final value the first time they
 * are seen. The element's text is already the finished figure, so a browser
 * without IntersectionObserver simply shows it.
 */
export function initCounters(root = document) {
  if (REDUCED_MOTION || !SUPPORTED) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        countUp(e.target);
      }
    },
    { threshold: 0.6 }
  );
  root.querySelectorAll("[data-count]").forEach((el) => io.observe(el));
}

function countUp(el) {
  const target = Number(el.dataset.count);
  if (!Number.isFinite(target) || target <= 0) return;
  const suffix = el.dataset.countSuffix || "";
  const DURATION = 900;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / DURATION);
    // easeOutCubic: quick off the mark, settles onto the real number.
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = `${Math.round(target * eased)}${suffix}`;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* -------------------------------------------------------------------------
   Navigation chrome
   ---------------------------------------------------------------------- */
/**
 * A hairline progress bar across the top of the navbar, plus a `scrolled`
 * class once the page leaves the top so the bar can gain its own ground.
 */
export function initScrollChrome() {
  const nav = document.querySelector(".navbar");
  if (!nav) return;

  let bar = nav.querySelector(".nav-progress");
  if (!bar && !REDUCED_MOTION) {
    bar = document.createElement("div");
    bar.className = "nav-progress";
    bar.setAttribute("aria-hidden", "true");
    nav.appendChild(bar);
  }

  let frame = 0;
  const update = () => {
    frame = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
    nav.classList.toggle("scrolled", window.scrollY > 24);
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
}

/* -------------------------------------------------------------------------
   Hero parallax
   ---------------------------------------------------------------------- */
/**
 * Drift the hero artwork a few pixels against the pointer. Small enough to
 * read as depth rather than movement, and skipped entirely on coarse pointers
 * where there is nothing to track.
 */
export function initHeroParallax() {
  if (REDUCED_MOTION) return;
  const hero = document.querySelector(".hero");
  const art = document.getElementById("hero-art");
  if (!hero || !art || !matchMedia("(pointer: fine)").matches) return;

  let frame = 0;
  hero.addEventListener("pointermove", (e) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      art.style.setProperty("--px", `${(x * -14).toFixed(1)}px`);
      art.style.setProperty("--py", `${(y * -14).toFixed(1)}px`);
    });
  });
  hero.addEventListener("pointerleave", () => {
    art.style.setProperty("--px", "0px");
    art.style.setProperty("--py", "0px");
  });
}

/* -------------------------------------------------------------------------
   Marquee
   ---------------------------------------------------------------------- */
const MARQUEE_SPEED = 45;      // pixels per second, whatever the list length

/**
 * Scroll a marquee band smoothly and for ever.
 *
 * The row holds the track twice and is moved by half its width, so one
 * animation carries both copies and the seam cannot drift. It is driven
 * through the Web Animations API rather than a CSS class for two reasons:
 * `updatePlaybackRate` eases into the hover slow-down instead of freezing the
 * row dead, and re-timing on resize can preserve the current position rather
 * than jumping. A browser without `element.animate` falls back to the CSS
 * animation, which does the same thing more bluntly.
 */
export function initMarquee(band) {
  if (!band) return;
  const track = band.querySelector(".marquee-track");
  if (!track || track.dataset.marqueeBound) return;
  track.dataset.marqueeBound = "1";
  if (REDUCED_MOTION) return;                 // keep the single static row

  // The row wrapper is in the markup, but build it if an older cached page
  // put the track straight into the band.
  let row = band.querySelector(".marquee-row");
  if (!row) {
    row = document.createElement("div");
    row.className = "marquee-row";
    track.parentElement.insertBefore(row, track);
    row.appendChild(track);
  }

  const clone = track.cloneNode(true);
  clone.setAttribute("aria-hidden", "true");
  clone.dataset.marqueeBound = "1";
  row.appendChild(clone);

  const durationFor = () => {
    const width = track.getBoundingClientRect().width;
    return width ? Math.max(18000, (width / MARQUEE_SPEED) * 1000) : 0;
  };

  if (typeof row.animate !== "function") {     // fallback: the CSS animation
    const width = track.getBoundingClientRect().width;
    if (width) band.style.setProperty("--marquee-duration", `${(width / MARQUEE_SPEED).toFixed(1)}s`);
    band.classList.add("running");
    return;
  }

  let duration = durationFor();
  if (!duration) return;
  const anim = row.animate(
    [{ transform: "translate3d(0, 0, 0)" }, { transform: "translate3d(-50%, 0, 0)" }],
    { duration, iterations: Infinity, easing: "linear" }
  );

  /** Re-time without moving the row: keep the fraction of the loop already
   *  travelled, so a resize — or the web font finally arriving and changing
   *  the row's width — never shows as a jump. */
  const repace = () => {
    const next = durationFor();
    if (!next || Math.abs(next - duration) < duration * 0.02) return;
    const progress = (Number(anim.currentTime) || 0) / duration;
    anim.effect.updateTiming({ duration: next });
    anim.currentTime = progress * next;
    duration = next;
  };

  // The row is measured before the display font has loaded, so its width — and
  // with it the correct speed — is not final until the font swaps in.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(repace).catch(() => {});
  window.addEventListener("resize", repace, { passive: true });

  // Ease down to a crawl under the pointer instead of stopping dead.
  // `updatePlaybackRate` changes speed without resetting where the row is.
  band.addEventListener("pointerenter", () => anim.updatePlaybackRate(0.12));
  band.addEventListener("pointerleave", () => anim.updatePlaybackRate(1));
}
