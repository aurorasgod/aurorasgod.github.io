import { activityWindow, activityLevel } from '../lib/activity.mjs';
const api = (import.meta.env.PUBLIC_ACTIVITY_API || '').replace(/\/$/, '');
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
  let lastMonth = '';
  window.filter((_,i)=>i%7===0).forEach(day=>{
    const month = day.date.slice(0,7), label = document.createElement('span');
    label.textContent = month !== lastMonth ? `${Number(day.date.slice(5,7))}月` : '';
    months.append(label); lastMonth=month;
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
async function refresh() {
  if(!map) return;
  try {
    const response=await fetch(`${api}/api/activity`,{cache:'no-store',signal:AbortSignal.timeout(7000)});
    if(!response.ok) throw new Error('unavailable');
    const data=await response.json();
    visits=Object.fromEntries(data.days.map((d:{date:string;visits:number})=>[d.date,d.visits]));
    available=true;
    trackingSince=data.trackingSince||null;
    map.dataset.trackingSince=trackingSince||'';
  } catch {available=false;}
  loaded=true;
  render();
}
if(map) {
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
let sent=false;
async function track() {
  if(sent || document.visibilityState!=='visible') return;
  sent=true;
  const key=`laplace-pageview:${location.pathname}`;
  try {const last=Number(sessionStorage.getItem(key));if(Date.now()-last<30000){await refresh();return;}}catch{}
  const eventId=crypto.randomUUID();
  const base=document.body.dataset.base||'/';
  const pagePath=location.pathname.startsWith(base)?`/${location.pathname.slice(base.length)}`:location.pathname;
  for(let attempt=0;attempt<2;attempt++){
    try {
      const response=await fetch(`${api}/api/visit`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId,path:pagePath}),keepalive:true,signal:AbortSignal.timeout(7000)});
      if(!response.ok)throw new Error('unavailable');
      try{sessionStorage.setItem(key,String(Date.now()));}catch{}
      break;
    }catch{if(attempt===0) await new Promise(resolve=>setTimeout(resolve,1500));}
  }
  await refresh();
}
void track();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(!sent)void track();else void refresh();}});
