const body = document.body;
const motion = document.querySelector<HTMLInputElement>('[data-study-motion]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function applyMotion() {
  body.dataset.motion = motion?.checked && !reducedMotion.matches ? 'on' : 'off';
  if (body.dataset.motion === 'off') finishOpening();
}

if (motion) {
  try { motion.checked = localStorage.getItem('home-study-motion') !== 'off' && !reducedMotion.matches; } catch { motion.checked = !reducedMotion.matches; }
  motion.addEventListener('change', () => {
    try { localStorage.setItem('home-study-motion', motion.checked ? 'on' : 'off'); } catch { /* Storage is optional. */ }
    applyMotion();
  });
}
reducedMotion.addEventListener('change', () => {
  if (motion && reducedMotion.matches) motion.checked = false;
  applyMotion();
});
applyMotion();

function finishOpening() {
  document.documentElement.dataset.opening = 'done';
  try { sessionStorage.setItem('laplace-intro-v2', 'seen'); } catch {}
}
document.querySelector('[data-skip-intro]')?.addEventListener('click', finishOpening);
document.querySelector('.intro-sequence')?.addEventListener('animationend', event => {
  if ((event as AnimationEvent).animationName === 'intro-finish') finishOpening();
});
let openingTimeout = window.setTimeout(finishOpening, 3000);
document.querySelector('[data-replay-intro]')?.addEventListener('click', () => {
  if (reducedMotion.matches) return;
  if (motion && !motion.checked) { motion.checked = true; applyMotion(); }
  document.querySelector<HTMLButtonElement>('[data-music-close]')?.click();
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.documentElement.dataset.opening = 'done';
  requestAnimationFrame(() => {
    document.documentElement.dataset.openingStarted = String(performance.now());
    document.documentElement.dataset.opening = 'on';
    window.clearTimeout(openingTimeout);
    openingTimeout = window.setTimeout(finishOpening, 3000);
  });
});
if (reducedMotion.matches || body.dataset.motion !== 'on') finishOpening();
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) finishOpening(); });
const updateHeader = () => document.querySelector('.study-header')?.classList.toggle('is-scrolled', scrollY > 30);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

const revealElements = document.querySelectorAll<HTMLElement>('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    });
  }, { threshold: .08 });
  revealElements.forEach(element => observer.observe(element));
} else revealElements.forEach(element => element.classList.add('is-visible'));

const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-now-tab]')];
const panels = [...document.querySelectorAll<HTMLElement>('[data-now-panel]')];
function updateTabIndicator() {
  const current = tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
  const list = current?.parentElement;
  if (!current || !list) return;
  list.style.setProperty('--tab-left', `${current.offsetLeft}px`);
  list.style.setProperty('--tab-width', `${current.offsetWidth}px`);
}
function selectTab(tab: HTMLButtonElement) {
  tabs.forEach(item => {
    item.setAttribute('aria-selected', String(item === tab));
    item.tabIndex = item === tab ? 0 : -1;
  });
  panels.forEach(panel => { panel.hidden = panel.dataset.nowPanel !== tab.dataset.nowTab; });
  updateTabIndicator();
}
const tabResize = new ResizeObserver(updateTabIndicator);
tabs.forEach(tab => tabResize.observe(tab));
updateTabIndicator();
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault(); selectTab(tabs[next]); tabs[next].focus();
  });
});

const clock = document.querySelector<HTMLTimeElement>('[data-study-clock]');
function updateClock() {
  if (!clock) return;
  const now = new Date();
  clock.textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  clock.dateTime = now.toISOString();
}
updateClock();
setInterval(updateClock, 60_000);

const menu = document.querySelector<HTMLButtonElement>('[data-study-menu]');
const nav = document.querySelector<HTMLElement>('#study-nav');
function closeMenu() {
  menu?.setAttribute('aria-expanded', 'false');
  menu?.setAttribute('aria-label', '展开导航');
  nav?.classList.remove('is-open');
}
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? '收起导航' : '展开导航');
  nav?.classList.toggle('is-open', open);
});
document.addEventListener('click', event => {
  if (event.target instanceof Node && !menu?.contains(event.target) && !nav?.contains(event.target)) closeMenu();
});
window.matchMedia('(min-width: 701px)').addEventListener('change', closeMenu);

const dialog = document.querySelector<HTMLDialogElement>('.study-search');
const input = document.querySelector<HTMLInputElement>('[data-study-query]');
const results = [...document.querySelectorAll<HTMLElement>('[data-study-result]')];
const searchStatus = document.querySelector<HTMLElement>('.study-search-status');
const openSearch = () => { closeMenu(); dialog?.showModal(); input?.focus(); };
document.querySelector('[data-study-search]')?.addEventListener('click', openSearch);
document.querySelector('[data-study-close]')?.addEventListener('click', () => dialog?.close());
dialog?.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') finishOpening();
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
  if (event.key === 'Escape' && dialog?.open) { event.preventDefault(); dialog.close(); }
  if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); }
});
input?.addEventListener('input', () => {
  const terms = input.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  let count = 0;
  for (const result of results) {
    const tags: string[] = JSON.parse(result.dataset.tags || '[]');
    const text = `${result.dataset.title} ${result.dataset.description} ${tags.join(' ')}`;
    const matches = terms.every(term => term.startsWith('#') ? tags.includes(term.slice(1)) : text.includes(term));
    result.hidden = !matches;
    if (matches) count++;
  }
  if (searchStatus) searchStatus.textContent = count ? `${count} 篇文章` : '没有找到相关笔记';
});
