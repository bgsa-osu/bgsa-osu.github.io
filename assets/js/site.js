// Shared behaviour for every page. (The member-database script lives in index.html.)

// Footer year
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Open links to other websites in a new tab
document.querySelectorAll('a[href^="http"]').forEach(link => {
  if (link.hostname !== location.hostname) {
    link.target = "_blank";
    link.rel = "noopener";
  }
});

// Keep content below the fixed header, whatever its height.
// The header used to be measured once at startup, but its height changes
// later: the nav rewraps when the web fonts arrive, and again when a phone is
// rotated. A stale measurement here is what makes an anchor jump land under
// the header, so watch the element instead of measuring it a single time.
const header = document.querySelector(".header");
function setHeaderHeight() {
  if (header) document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
}
setHeaderHeight();
window.addEventListener("resize", setHeaderHeight);
window.addEventListener("load", setHeaderHeight);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(setHeaderHeight);
if (header && "ResizeObserver" in window) new ResizeObserver(setHeaderHeight).observe(header);

// About section tabs. Each one is addressable -- ?about=ec#about -- so a link
// can point at a particular tab instead of just the section. The tab name goes
// in a query parameter because the hash is already used to scroll to #about.
const aboutTabs = document.querySelectorAll(".about-tab");

function aboutTabKey(btn) {
  return btn.dataset.target.replace(/^about-/, "");
}

function showAboutTab(btn) {
  aboutTabs.forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".about-content").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  const panel = document.getElementById(btn.dataset.target);
  if (panel) panel.classList.add("active");
}

aboutTabs.forEach(btn => {
  btn.addEventListener("click", () => {
    showAboutTab(btn);
    try {
      const url = new URL(location.href);
      if (btn === aboutTabs[0]) url.searchParams.delete("about");
      else url.searchParams.set("about", aboutTabKey(btn));
      url.hash = "about";
      history.replaceState(null, "", url);
    } catch (err) {
      /* Some local file:// setups reject replaceState. The tab still works. */
    }
  });
});

if (aboutTabs.length) {
  const asked = new URLSearchParams(location.search).get("about");
  const match = Array.from(aboutTabs).find(b => aboutTabKey(b) === asked);
  if (match) showAboutTab(match);
}

// Homepage slideshow: works with any number of photos from _data/hero.yml.
// Only the first photo loads with the page; each next photo loads one step ahead.
const slides = document.querySelectorAll(".hero-slide");
const SLIDE_SECONDS = 6;

function loadSlide(slide) {
  if (slide && slide.dataset.bg) {
    slide.style.backgroundImage = `url('${slide.dataset.bg}')`;
    delete slide.dataset.bg;
  }
}

if (slides.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let current = 0;
  loadSlide(slides[1]);
  setInterval(() => {
    slides[current].classList.remove("is-active");
    current = (current + 1) % slides.length;
    slides[current].classList.add("is-active");
    loadSlide(slides[(current + 1) % slides.length]);
  }, SLIDE_SECONDS * 1000);
}

// Anchor jumps (/#events, /#gallery, ...) are handled natively by the browser:
// `scroll-behavior: smooth` in CSS animates them, and the `scroll-margin-top`
// on `section[id]` lands each heading below the fixed header.
//
// One safety net, mainly for phones: if something above the target still
// changes size while the jump is in flight, the target drifts down and the
// page stops short of it. This checks ONCE, half a second later, and only
// corrects a drift bigger than 40px. Deliberately not a loop, and never
// smooth -- the earlier version re-scrolled every 250ms and fought the
// browser's own animation, which is what made the page bounce.

function realignOnce(id) {
  const target = document.getElementById(id);
  if (!target) return;

  let moved = false;
  const noteScroll = () => { moved = true; };
  const events = ["wheel", "touchmove", "keydown"];
  events.forEach(e => window.addEventListener(e, noteScroll, { passive: true }));

  setTimeout(() => {
    events.forEach(e => window.removeEventListener(e, noteScroll));
    if (moved) return;
    const offset = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const drift = target.getBoundingClientRect().top - offset;
    if (Math.abs(drift) > 40) window.scrollBy({ top: drift, behavior: "auto" });
  }, 500);
}

if (location.hash.length > 1) {
  window.addEventListener("load", () => realignOnce(location.hash.slice(1)));
}

document.addEventListener("click", e => {
  const link = e.target.closest('a[href*="#"]');
  if (link && link.pathname === location.pathname && link.hash.length > 1) {
    realignOnce(link.hash.slice(1));
  }
});
