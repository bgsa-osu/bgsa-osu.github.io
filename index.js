const ham = document.querySelector('.header__main-ham-menu-cont');
const mobileMenu = document.getElementById('mobile-menu');

ham.addEventListener('click', () => {
  mobileMenu.style.display =
    mobileMenu.style.display === "block" ? "none" : "block";
});