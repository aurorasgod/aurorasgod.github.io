const header = document.querySelector<HTMLElement>('[data-site-header]')!;
const nav = header.querySelector<HTMLElement>('.chrome-nav')!;
const menu = header.querySelector<HTMLButtonElement>('[data-header-menu]')!;
const links = [...nav.querySelectorAll<HTMLAnchorElement>('[data-nav-id]')];
function closeMenu() {
  nav.classList.remove('is-open');
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', '展开导航');
  menu.title = '展开导航';
}
function updateIndicator() {
  const active = links.find(link => link.hasAttribute('aria-current'));
  if (!active || !nav.offsetWidth) return;
  nav.style.setProperty('--nav-left', `${active.offsetLeft}px`);
  nav.style.setProperty('--nav-width', `${active.offsetWidth}px`);
}
function updateHeader() {
  const section = document.body.dataset.section || 'home';
  header.dataset.section = section;
  links.forEach(link => {
    if (link.dataset.navId === section) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  header.classList.toggle('is-scrolled', scrollY > 30);
  updateIndicator();
}
menu.addEventListener('click', () => {
  const open = !nav.classList.contains('is-open');
  nav.classList.toggle('is-open', open);
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? '收起导航' : '展开导航');
  menu.title = open ? '收起导航' : '展开导航';
  updateIndicator();
});
header.querySelector('[data-header-search]')?.addEventListener('click', () => {
  closeMenu();
  document.dispatchEvent(new Event('site:search'));
});
document.addEventListener('click', event => { if (event.target instanceof Node && !header.contains(event.target)) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
document.addEventListener('site:close-menu', closeMenu);
document.addEventListener('astro:before-swap', closeMenu);
document.addEventListener('astro:after-swap', updateHeader);
document.addEventListener('astro:page-load', updateHeader);
window.addEventListener('scroll', () => header.classList.toggle('is-scrolled', scrollY > 30), { passive: true });
matchMedia('(min-width:701px)').addEventListener('change', closeMenu);
const resize = new ResizeObserver(updateIndicator);
resize.observe(nav);
void document.fonts.ready.then(updateIndicator);
updateHeader();
