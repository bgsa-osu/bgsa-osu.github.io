/* ============================
   HAMBURGER MENU FUNCTIONALITY
   ============================ */

const hamBtn = document.querySelector('.header__main-ham-menu-cont');
const overlay = document.getElementById('mobile-overlay');

hamBtn.addEventListener('click', () => {
  overlay.style.display = "flex";
});

// close when clicking any link
document.querySelectorAll('#mobile-overlay a').forEach(link => {
  link.addEventListener('click', () => {
    overlay.style.display = "none";
  });
});