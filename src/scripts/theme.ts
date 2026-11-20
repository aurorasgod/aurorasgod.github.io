import { palettes } from '../data/palette';
import { onPageLoad } from './page-lifecycle';

const systemTheme = matchMedia('(prefers-color-scheme: dark)');
const currentTheme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
function readingTheme() {
  try { const saved = localStorage.getItem('field-notes-theme'); if (saved === 'dark' || saved === 'light') return saved; } catch {}
  return systemTheme.matches ? 'dark' : 'light';
}
function motionAllowed() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try { return localStorage.getItem('home-study-motion') !== 'off'; } catch { return true; }
}
function refreshTheme() {
  const mode = currentTheme();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palettes[mode].bg);
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    const label = mode === 'dark' ? '切换到浅色主题' : '切换到深色主题';
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
  });
}
document.addEventListener('astro:before-swap', event => {
  event.newDocument.documentElement.dataset.theme = event.newDocument.documentElement.dataset.pageTheme || readingTheme();
  event.newDocument.documentElement.dataset.opening = 'done';
});
document.addEventListener('astro:after-swap', refreshTheme);
systemTheme.addEventListener('change', event => {
  if (document.documentElement.dataset.pageTheme) return;
  try { if (localStorage.getItem('field-notes-theme')) return; } catch {}
  document.documentElement.dataset.theme = event.matches ? 'dark' : 'light';
  refreshTheme();
});
onPageLoad(({ signal }) => {
  refreshTheme();
  document.querySelector<HTMLElement>('[data-theme-toggle]')?.addEventListener('click', event => {
    const root = document.documentElement;
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    const apply = () => {
      root.dataset.theme = next;
      try { localStorage.setItem('field-notes-theme', next); } catch {}
      refreshTheme();
    };
    if (!document.startViewTransition || !motionAllowed()) { apply(); return; }
    // The new theme spreads out from the button as a growing circle (styles in motion.css).
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = bounds.left + bounds.width / 2, y = bounds.top + bounds.height / 2;
    root.style.setProperty('--theme-x', `${x}px`);
    root.style.setProperty('--theme-y', `${y}px`);
    root.style.setProperty('--theme-r', `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
    root.classList.add('theme-switching');
    document.startViewTransition(apply).finished.finally(() => root.classList.remove('theme-switching'));
  }, { signal });
});
