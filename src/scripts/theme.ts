import { palettes } from '../data/palette';
import { onPageLoad } from './page-lifecycle';

const systemTheme = matchMedia('(prefers-color-scheme: dark)');
const currentTheme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
function readingTheme() {
  try { const saved = localStorage.getItem('field-notes-theme'); if (saved === 'dark' || saved === 'light') return saved; } catch {}
  return systemTheme.matches ? 'dark' : 'light';
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
onPageLoad(() => {
  refreshTheme();
  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('field-notes-theme', next); } catch {}
    refreshTheme();
  });
});
