import { dayKey, activityWindow } from '../src/lib/activity.mjs';
export async function activityAPI(request, env, allowedPaths, now = new Date()) {
  const url = new URL(request.url), origin=request.headers.get('Origin');
  const allowedOrigin = !origin || origin === url.origin || origin === 'https://aurorasgod.github.io';
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
  if(origin && allowedOrigin) headers['Access-Control-Allow-Origin']=origin;
  const reply=(body,status=200)=>Response.json(body,{status,headers});
  if(!allowedOrigin) return reply({error:'origin_not_allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
  if(url.pathname==='/api/activity' && request.method==='GET'){
    const start=activityWindow(now)[0].date, today=dayKey(now);
    const result=await env.DB.prepare('SELECT day AS date, visits FROM daily_visits WHERE day >= ? AND day <= ? ORDER BY day').bind(start,today).all();
    const first=await env.DB.prepare('SELECT MIN(day) AS day FROM daily_visits').first();
    return reply({days:result.results,trackingSince:first?.day||null,timeZone:'Asia/Shanghai'});
  }
  if(url.pathname==='/api/visit' && request.method==='POST'){
    if(!origin)return reply({error:'origin_required'},403);
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'json_required'},415);
    if(/bot|crawler|spider|headless/i.test(request.headers.get('User-Agent')||'') || /prefetch/i.test(request.headers.get('Purpose')||request.headers.get('Sec-Purpose')||''))return reply({counted:false});
    if(Number(request.headers.get('Content-Length')||0)>1024)return reply({error:'body_too_large'},413);
    let data;
    try{const text=await request.text();if(text.length>1024)return reply({error:'body_too_large'},413);data=JSON.parse(text);}catch{return reply({error:'invalid_json'},400);}
    // GitHub can publish new articles independently of this Worker deployment.
    const githubArticle=origin==='https://aurorasgod.github.io' && /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(data.path||'') && data.path.length<=88;
    if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(data.eventId||'') || (!allowedPaths.has(data.path)&&!githubArticle))return reply({error:'invalid_visit'},400);
    const timestamp=now.getTime(), day=dayKey(now);
    // A transactional batch makes retries idempotent and concurrent increments atomic.
    const results=await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO visit_events (id, created_at) VALUES (?, ?)').bind(data.eventId,timestamp),
      env.DB.prepare('INSERT INTO daily_visits (day, visits) SELECT ?, 1 WHERE changes() > 0 ON CONFLICT(day) DO UPDATE SET visits = visits + 1').bind(day),
      env.DB.prepare('DELETE FROM visit_events WHERE created_at < ?').bind(timestamp-86400000),
    ]);
    return reply({counted:results[0].meta.changes===1,day});
  }
  return reply({error:'not_found'},404);
}
