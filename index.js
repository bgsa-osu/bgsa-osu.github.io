const hamMenuBtn = document.querySelector('.header__main-ham-menu-cont');
const smallMenu = document.querySelector('.header__sm-menu');
const hamOpen = document.querySelector('.header__main-ham-menu');
const hamClose = document.querySelector('.header__main-ham-menu-close');

hamMenuBtn.addEventListener('click', () => {
  smallMenu.classList.toggle('header__sm-menu--active');
  hamOpen.classList.toggle('d-none');
  hamClose.classList.toggle('d-none');
});

document.querySelectorAll('.header__sm-menu-link').forEach(link => {
  link.addEventListener('click', () => {
    smallMenu.classList.remove('header__sm-menu--active');
    hamOpen.classList.remove('d-none');
    hamClose.classList.add('d-none');
  });
});