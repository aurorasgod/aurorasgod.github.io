import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root=resolve(process.env.STATIC_DIR || 'dist/client');
const prefix=(process.env.BASE_PATH||'/').replace(/\/?$/,'/');
async function files(dir){const entries=await readdir(dir,{withFileTypes:true});return(await Promise.all(entries.map(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]))).flat();}
const all=await files(root);
const htmlFiles=all.filter(p=>p.endsWith('.html'));
const errors=[];
for(const file of htmlFiles){const html=await readFile(file,'utf8');assert.ok(html.includes('lang="zh-CN"'),`missing language: ${file}`);assert.ok(/<h1[\s>]/.test(html),`missing page heading: ${file}`);for(const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)){const target=match[1].replaceAll('&amp;','&');if(!target.startsWith('/'))continue;const path=decodeURIComponent(target.split(/[?#]/)[0]);if(!path.startsWith(prefix)){errors.push(`${file}: wrong base path ${path}`);continue;}let local=join(root,path.slice(prefix.length));try{const s=await stat(local);if(s.isDirectory())local=join(local,'index.html');await stat(local);}catch{errors.push(`${file}: missing ${path}`);}}}
const search=JSON.parse(await readFile(join(root,'search-index.json'),'utf8'));
assert.ok(Array.isArray(search),'invalid search index');
for(const entry of search){assert.ok(entry.title&&entry.text&&entry.url,'incomplete search entry');await stat(join(root,entry.url.slice(prefix.length),'index.html'));}
const rss=await readFile(join(root,'rss.xml'),'utf8');
assert.equal((rss.match(/<item>/g)||[]).length,search.length,'feed and index counts differ');
assert.ok(await stat(join(root,'avatar.jpg')),'missing avatar');
assert.ok(await stat(join(root,'sitemap-index.xml')),'missing sitemap');
const home=await readFile(join(root,'index.html'),'utf8');
assert.ok(home.includes('Personal Blog')&&home.includes('ZJU电力电子硕士在读'),'missing personal identity');
for(const category of ['具身智能','电力电子','个人经历'])assert.ok(home.includes(category),'missing category '+category);
assert.ok(!home.includes('学习工具')&&!home.includes('world-model')&&!home.includes('个人笔记'),'outdated home labels');
for(const entry of search){const article=await readFile(join(root,entry.url.slice(prefix.length),'index.html'),'utf8');assert.ok(article.includes('mobile-toc'),'missing article TOC');}
for(const file of all){if(/\.(html|json|xml|txt)$/.test(file)){const text=await readFile(file,'utf8');assert.ok(!text.includes('PRIVATE_PUBLICATION_TEST_MARKER'),'draft leaked to build output');}}
assert.deepEqual(errors,[]);
console.log(`PASS: ${htmlFiles.length} pages, ${search.length} articles, internal links/assets, RSS, identity/categories, publication filtering.`);
