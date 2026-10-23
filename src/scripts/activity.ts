import { activityWindow, activityMonths, activityLevel } from '../lib/activity.mjs';
import { createVisitDelivery } from '../lib/visit-delivery.mjs';
import { onPageLoad } from './page-lifecycle';
onPageLoad(({ signal, cleanup }) => {
const api = (import.meta.env.PUBLIC_ACTIVITY_API || '').replace(/\/$/, '');
const localPreview = import.meta.env.DEV && !api;
const map = document.querySelector<HTMLElement>('[data-activity-map]');
let visits:Record<string,number> = {};
let available = false;
let loaded = false;
let trackingSince:string|null = null;
const updates:Record<string,number> = map ? JSON.parse(map.dataset.updates || '{}') : {};
function render() {
  if (!map) return;
  const grid = map.querySelector<HTMLElement>('.activity-grid')!;
  const window = activityWindow();
  const months = map.querySelector<HTMLElement>('.activity-months')!;
  months.replaceChildren();
  activityMonths(window).forEach(month=>{
    const label = document.createElement('span');
    label.textContent = month.label;
    label.style.gridColumn = `${month.start + 1} / span ${month.span}`;
    label.style.textAlign = month.align;
    months.append(label);
  });
  const cells = [...grid.querySelectorAll<HTMLElement>('.activity-cell')];
  let totalUpdates=0, totalVisits=0;
  cells.forEach((cell,i)=>{
    const {date,future} = window[i];
    const u=updates[date]||0, v=visits[date]||0;
    cell.dataset.date=date; cell.dataset.level=String(activityLevel(u,v));
    cell.toggleAttribute('data-future',future);
    cell.tabIndex=-1;
    const detail=`${date} · ${u} 次更新 · ${available?(trackingSince && date>=trackingSince?`${v} 次访问`:'访问未统计'):(loaded?'访问量暂不可用':'访问量正在加载')}`;
    cell.setAttribute('aria-label',detail);
    cell.title=detail;
    if (!future) {totalUpdates+=u;totalVisits+=v;}
  });
  const today = cells.filter(c=>!c.hasAttribute('data-future')).at(-1);
  if(today) today.tabIndex=0;
  map.querySelector('.activity-summary')!.textContent = `${totalUpdates} 次更新 · ${available?`${totalVisits} 次访问`:(loaded?'访问量暂不可用':'正在加载访问量…')}`;
}
let refreshing = false;
let refreshQueued = false;
async function refresh() {
  if(!map || signal.aborted) return;
  // A visit acknowledged during a read needs a fresh read after that one ends.
  if(refreshing) { refreshQueued = true; return; }
  if(localPreview) { loaded=true; render(); return; }
  refreshing = true;
  try {
    const response=await fetch(`${api}/api/activity`,{cache:'no-store',signal:AbortSignal.any([signal, AbortSignal.timeout(15000)])});
    if(!response.ok) throw new Error('unavailable');
    const data=await response.json();
    if (signal.aborted) return;
    visits=Object.fromEntries(data.days.map((d:{date:string;visits:number})=>[d.date,d.visits]));
    available=true;
    trackingSince=data.trackingSince||null;
    map.dataset.trackingSince=trackingSince||'';
  } catch {
    // Keep the last successful server totals during a temporary network failure.
  } finally { refreshing = false; }
  if (signal.aborted) return;
  loaded=true;
  render();
  if (refreshQueued) {
    refreshQueued = false;
    void refresh();
  }
}
if(map) {
  const fitCalendar = () => {
    const style = getComputedStyle(map);
    const labelWidth = parseFloat(style.getPropertyValue('--activity-label-width')) + parseFloat(style.getPropertyValue('--activity-label-gap'));
    const ratio = Math.round((window.devicePixelRatio || 1) * 10_000) / 10_000;
    // Snap both cell size and pitch to physical pixels instead of distributing fractional tracks.
    const gap = Math.round(2 * ratio) / ratio;
    const available = (map.getBoundingClientRect().width - labelWidth - 25 * gap) / 26;
    const size = Math.max(1, Math.floor(Math.floor(Math.min(12, available)) * ratio)) / ratio;
    map.style.setProperty('--activity-cell', `${size}px`);
    map.style.setProperty('--activity-gap', `${gap}px`);
  };
  fitCalendar();
  const resize = new ResizeObserver(fitCalendar);
  resize.observe(map);
  cleanup(() => resize.disconnect());
  window.addEventListener('resize', fitCalendar, { signal });
  render();
  const detail=map.querySelector('.activity-detail')!;
  const show=(target:EventTarget|null)=>{
    if(target instanceof HTMLElement && target.matches('.activity-cell:not([data-future])')) detail.textContent=target.getAttribute('aria-label');
  };
  map.addEventListener('pointerover',e=>show(e.target));
  map.addEventListener('focusin',e=>show(e.target));
  map.addEventListener('pointerleave',()=>{if(!map.contains(document.activeElement))detail.textContent='移到日期上查看 · 更新与访问';});
  map.addEventListener('keydown',e=>{
    const cells=[...map.querySelectorAll<HTMLElement>('.activity-cell:not([data-future])')];
    const i=cells.indexOf(e.target as HTMLElement);
    const delta=({ArrowRight:7,ArrowLeft:-7,ArrowDown:1,ArrowUp:-1} as Record<string,number>)[e.key];
    if(i<0||!delta)return;
    e.preventDefault(); const next=cells[Math.max(0,Math.min(cells.length-1,i+delta))];
    cells[i].tabIndex=-1;next.tabIndex=0;next.focus();
  });
}
// Browser storage only suppresses rapid reloads; all totals live in server D1.
const key = `laplace-pageview:${location.pathname}`;
const eventId = crypto.randomUUID();
const base = document.body.dataset.base || '/';
const pagePath = location.pathname.startsWith(base) ? `/${location.pathname.slice(base.length)}` : location.pathname;
const delivery = createVisitDelivery(async () => {
  try {
    const last = Number(sessionStorage.getItem(key));
    if (Date.now() - last < 30000) return;
  } catch {}
  const response = await fetch(`${api}/api/visit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, path: pagePath }), keepalive: true,
    // Let keepalive finish a real page view even if navigation swaps the page.
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('visit_unavailable');
  try { sessionStorage.setItem(key, String(Date.now())); } catch {}
});
async function track() {
  if (localPreview || signal.aborted || document.visibilityState !== 'visible' || delivery.delivered) return;
  try { if (await delivery.run()) await refresh(); } catch {}
}
function resume() {
  if (signal.aborted || document.visibilityState !== 'visible') return;
  // Reading existing totals must not wait for a slow or failed visit report.
  void refresh();
  void track();
}
void refresh();
void track();
document.addEventListener('visibilitychange', resume, { signal });
window.addEventListener('online', resume, { signal });
const retry = window.setInterval(resume, 30000);
cleanup(() => window.clearInterval(retry));
});
