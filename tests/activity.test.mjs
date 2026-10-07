import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { activityAPI } from '../worker/activity.mjs';
import { activityWindow, dayKey, contentActivity, activityLevel } from '../src/lib/activity.mjs';
function database(){
  const db=new DatabaseSync(':memory:');
  for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql'))) db.exec(readFileSync(`drizzle/${file}`,'utf8'));
  const prepare=sql=>({bind(...args){this.args=args;return this;},async all(){return {results:db.prepare(sql).all(...this.args)};},async first(){return db.prepare(sql).get(...(this.args||[]));},run(){const result=db.prepare(sql).run(...(this.args||[]));return {meta:{changes:Number(result.changes)}};}});
  return {prepare,async batch(statements){db.exec('BEGIN');try{const results=statements.map(s=>s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}};
}
const origin='https://field-notes-research.gptplus6267.chatgpt.site';
const paths=new Set(['/','/blog/vla/']);
const visit=(eventId=crypto.randomUUID(),path='/',requestOrigin=origin)=>new Request(`${origin}/api/visit`,{method:'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json'},body:JSON.stringify({eventId,path})});
test('Shanghai midnight and complete square calendar week layout',()=>{
  assert.equal(dayKey(new Date('2026-10-06T16:00:00Z')),'2026-10-07');
  const w=activityWindow(new Date('2026-10-07T00:00:00Z'));
  assert.equal(w.length,182);assert.equal(new Date(w[0].date).getUTCDay(),0);
  assert.equal(w.filter(d=>d.future).length,3);
});
test('Publish and revision count per article per date, logarithmic visits',()=>{
  assert.deepEqual(contentActivity([{data:{pubDate:new Date('2026-10-05'),updatedDate:new Date('2026-10-05')}}]),{'2026-10-05':1});
  assert.equal(activityLevel(0,0),0);assert.equal(activityLevel(1,0),3);assert.equal(activityLevel(0,1),1);
  assert.equal(activityLevel(0,100000),4);
});
test('Atomic daily totals, retry idempotency, midnight boundary and all-reader aggregation',async()=>{
  const env={DB:database()}, id=crypto.randomUUID();
  const now=new Date('2026-10-06T15:59:59Z');
  assert.equal((await (await activityAPI(visit(id),env,paths,now)).json()).counted,true);
  assert.equal((await (await activityAPI(visit(id),env,paths,now)).json()).counted,false);
  await activityAPI(visit(),env,paths,new Date('2026-10-06T16:00:00Z'));
  await Promise.all(Array.from({length:10},()=>activityAPI(visit(),env,paths,new Date('2026-10-07T00:00:00Z'))));
  const data=await (await activityAPI(new Request(`${origin}/api/activity`),env,paths,new Date('2026-10-07T00:00:00Z'))).json();
  assert.deepEqual(data.days,[{date:'2026-10-06',visits:1},{date:'2026-10-07',visits:11}]);
  assert.equal(data.trackingSince,'2026-10-06');
});
test('Reject other origins and unknown pages; permit configured GitHub Pages origin',async()=>{
  const env={DB:database()};
  assert.equal((await activityAPI(visit(undefined,'/','https://evil.test'),env,paths)).status,403);
  assert.equal((await activityAPI(visit(undefined,'/not-a-page/'),env,paths)).status,400);
  assert.equal((await activityAPI(visit(undefined,'/','https://aurorasgod.github.io'),env,paths)).status,200);
  assert.equal((await activityAPI(visit(undefined,'/blog/my-new-post/','https://aurorasgod.github.io'),env,paths)).status,200);
  assert.equal((await activityAPI(visit(undefined,'/blog/my-new-post/'),env,paths)).status,400);
  assert.equal((await activityAPI(visit(undefined,'/blog/../private/','https://aurorasgod.github.io'),env,paths)).status,400);
  const response=await activityAPI(new Request(`${origin}/api/visit`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{'}),env,paths);
  assert.equal(response.status,400);
});
