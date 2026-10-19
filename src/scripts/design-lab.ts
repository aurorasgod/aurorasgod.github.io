import './design-lab-tools';
import './letter-motion';

interface Design { id: string; key: string; name: string; en: string; note: string }
const root = document.documentElement;
const designs: Design[] = JSON.parse(document.querySelector('#lab-design-data')?.textContent || '[]');
const switches = [...document.querySelectorAll<HTMLButtonElement>('[data-design-switch]')];
let theme = root.dataset.labTheme === 'dark' ? 'dark' : 'light';

function updateUrl() {
  const next = new URL(location.href);
  next.searchParams.set('style', root.dataset.labDesign || 'editorial');
  next.searchParams.set('theme', theme);
  next.hash = '';
  history.replaceState(null, '', next);
}

function showDesign(id: string, scroll = true) {
  const design = designs.find(d => d.id === id) || designs[0];
  if (!design) return;
  root.dataset.labDesign = design.id;
  document.querySelectorAll<HTMLElement>('[data-lab-scheme]').forEach(el => { el.hidden = el.dataset.labScheme !== design.id; });
  switches.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.designSwitch === design.id)));
  const texts: Record<string,string> = {'[data-design-key]':design.key,'[data-design-name]':`${design.name} · ${design.en}`,'[data-design-note]':design.note};
  for (const [selector,text] of Object.entries(texts)) {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  }
  updateUrl();
  if (scroll) window.scrollTo({top:0,behavior:'instant'});
}

switches.forEach(button => button.addEventListener('click', () => showDesign(button.dataset.designSwitch || 'editorial')));
showDesign(root.dataset.labDesign || 'editorial', false);
const themeButton = document.querySelector<HTMLButtonElement>('[data-lab-theme-toggle]');
function updateTheme() {
  root.dataset.labTheme = theme;
  themeButton?.setAttribute('aria-label', theme === 'dark' ? '切换到浅色预览' : '切换到深色预览');
}
themeButton?.addEventListener('click', () => { theme = theme === 'light' ? 'dark' : 'light'; updateTheme(); updateUrl(); });
updateTheme();

document.addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button');
  if (!button) return;
  if (button.hasAttribute('data-lab-filter')) {
    const canvas = button.closest('[data-lab-scheme]');
    const category = button.dataset.labFilter || 'all';
    let count = 0;
    canvas?.querySelectorAll<HTMLElement>('[data-lab-post]').forEach(post => {
      post.hidden = category !== 'all' && category !== post.dataset.category;
      if (!post.hidden) count++;
    });
    canvas?.querySelectorAll('[data-lab-filter]').forEach(el => el.setAttribute('aria-pressed', String((el as HTMLElement).dataset.labFilter === category)));
    const empty = canvas?.querySelector<HTMLElement>('[data-lab-filter-empty]');
    if (empty) empty.hidden = count > 0;
    const letterExcerpt = canvas?.querySelector<HTMLElement>('.lab-letter-excerpt');
    if (letterExcerpt) letterExcerpt.hidden = count === 0;
  }
  if (button.dataset.labTag) {
    const input = document.querySelector<HTMLInputElement>('[data-lab-search]');
    if (input) { input.value = `#${button.dataset.labTag}`; input.dispatchEvent(new Event('input',{bubbles:true})); }
  }
});

document.querySelectorAll<HTMLElement>('.lab-activity').forEach(calendar => {
  const detail = calendar.querySelector('[data-lab-day-detail]');
  const original = detail?.textContent || '';
  const show = (event: Event) => {
    const day = (event.target as Element).closest<HTMLElement>('[data-lab-day]');
    if (day && detail && !day.hasAttribute('data-future')) detail.textContent = day.dataset.labDay || original;
  };
  calendar.addEventListener('pointerover',show);
  calendar.addEventListener('focusin',show);
  calendar.addEventListener('pointerleave',()=>{ if(detail) detail.textContent=original; });
  calendar.addEventListener('focusout',()=>{ if(detail) detail.textContent=original; });
});

document.querySelector('[data-lab-share]')?.addEventListener('click', async () => {
  const toast = document.querySelector<HTMLElement>('[data-lab-toast]');
  try {
    await navigator.clipboard.writeText(location.href);
    if (toast) { toast.textContent = '已复制当前方案链接'; toast.hidden = false; }
  } catch {
    if (toast) { toast.textContent = '可以直接复制地址栏中的方案链接'; toast.hidden = false; }
  }
  window.setTimeout(()=>{ if(toast) toast.hidden=true; },2600);
});
