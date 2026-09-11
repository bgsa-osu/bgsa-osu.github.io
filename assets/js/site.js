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

// Keep sub-page content below the fixed header, whatever its height
const header = document.querySelector(".header");
function setHeaderHeight() {
  if (header) document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
}
setHeaderHeight();
window.addEventListener("resize", setHeaderHeight);

// About section tabs
document.querySelectorAll(".about-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".about-tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".about-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.target).classList.add("active");
  });
});

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

// Nav jumps (/#events, /#gallery, …): photos loading above a section can push
// it down after the jump. For a few seconds, nudge the page back so the section
// heading stays just below the header. Stops as soon as the visitor scrolls.
let userScrolled = false;
["wheel", "touchstart", "keydown"].forEach(evt =>
  window.addEventListener(evt, () => { userScrolled = true; }, { passive: true })
);

function keepOnTarget(id) {
  const target = document.getElementById(id);
  if (!target) return;
  userScrolled = false;
  let checks = 0;
  const timer = setInterval(() => {
    checks++;
    if (userScrolled || checks > 20) return clearInterval(timer);
    const offset = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    if (Math.abs(target.getBoundingClientRect().top - offset) > 20) target.scrollIntoView();
  }, 250);
}

if (location.hash) {
  window.addEventListener("load", () => keepOnTarget(location.hash.slice(1)));
}
document.addEventListener("click", e => {
  const link = e.target.closest('a[href*="#"]');
  if (link && link.pathname === location.pathname && link.hash.length > 1) {
    keepOnTarget(link.hash.slice(1));
  }
});
