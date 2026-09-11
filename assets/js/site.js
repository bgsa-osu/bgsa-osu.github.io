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

// Anchor jumps (/#events, /#gallery, ...) are handled natively by the browser:
// `scroll-behavior: smooth` in CSS does the animation, and the `scroll-margin-top`
// on `section[id]` lands each heading just below the fixed header. Nothing to do
// in JS -- the old watchdog that re-scrolled every 250ms fought the browser and
// made the page bounce.
