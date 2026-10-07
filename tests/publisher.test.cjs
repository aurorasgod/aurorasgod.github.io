'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {prepareArticle,repoState,publishArticle,retryPush,articleHash,run,today}=require('../integrations/obsidian/laplace-blog-publisher/core.cjs');
const meta={title:'我的文章',description:'自己的学习记录。',slug:'my-post',category:'personal',tags:['记录'],pubDate:today()};
const file=reference=>reference==='图.png'?{path:'附件/图.png',resourceURL:'app://image',read:async()=>Buffer.from('image bytes')}:reference==='私密笔记'?{path:'私密笔记.md',read:async()=>{throw Error('Private contents must not be read');}}:null;
const prepare=(text='## 正文\n自己的记录。',options={})=>prepareArticle({text,meta,notePath:'博客/我的文章.md',resolveFile:async r=>file(r),resolvePublished:async()=>null,...options});
test('Selected body and explicit public metadata only; images copied, private frontmatter/comments omitted',async()=>{
 const plan=await prepare('---\nprivate: hidden\n---\n# 我的文章\n\n内容。\n![[图.png]]\n%% private %%\n<!-- secret -->');
 assert.equal(plan.warnings.length,0);assert.equal(plan.assets.length,1);assert.ok(plan.markdown.includes('publish: true'));assert.ok(!plan.markdown.includes('hidden'));assert.ok(!plan.markdown.includes('private'));assert.ok(!plan.markdown.includes('secret'));assert.ok(!plan.body.includes('# 我的文章'));
 assert.ok(plan.body.includes('/images/posts/my-post/'));assert.equal(plan.files.length,2);
});
test('Unpublished note links block; explicit plain-link option only exports visible label, never private note body',async()=>{
 const blocked=await prepare('正文 [[私密笔记|一个想法]]。 ![[私密笔记]]');assert.equal(blocked.warnings.length,2);
 const plain=await prepare('正文 [[私密笔记|一个想法]]。',{plainLinks:true});assert.equal(plain.warnings.length,0);assert.equal(plain.body,'正文 一个想法。');assert.equal(plain.notices.length,1);
 const publicLink=await prepare('[[私密笔记|已公开内容]]',{resolvePublished:async()=>({slug:'public-note'})});assert.ok(publicLink.body.includes('/blog/public-note/'));
});
test('Code examples preserve wiki syntax and comments; missing embeds and local HTML produce blocking warnings',async()=>{
 const code='```markdown\n![[图.png]]\n%% keep %%\n```\n\n`[[私密笔记]]`';const plan=await prepare(code);assert.equal(plan.body,code);assert.equal(plan.assets.length,0);assert.equal(plan.warnings.length,0);
 assert.equal((await prepare('![[missing.png]]')).warnings.length,1);
 assert.equal((await prepare('<img src="local.png">')).warnings.length,1);
});
test('Standard Markdown images, attachment links and HTTPS links work; invalid slug/date/category/empty body rejected',async()=>{
 const plan=await prepare('![示意](图.png) [文件](图.png) [原文](https://example.org/paper)');assert.equal(plan.assets.length,1);assert.equal(plan.warnings.length,0);assert.ok(plan.body.includes('https://example.org/paper'));
 for(const patch of [{slug:'../secret'},{pubDate:'2099-01-01'},{category:'tools'}])await assert.rejects(prepare('正文',{meta:{...meta,...patch}}));
 await assert.rejects(prepare(''));await assert.rejects(prepare('![[图.png]]',{resolveFile:async()=>({path:'x.png',read:async()=>Buffer.alloc(21*1024*1024)})}),/20 MB/);
});
async function fixture(t){
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'laplace-publisher-test-'));t.after(()=>fs.rm(temp,{recursive:true,force:true}));const remote=path.join(temp,'remote.git'),repo=path.join(temp,'repo');
 await fs.mkdir(repo);await run('git',['init','--bare',remote],temp);await run('git',['init','-b','main'],repo);await run('git',['config','user.name','Publisher Test'],repo);await run('git',['config','user.email','test@example.invalid'],repo);
 await fs.mkdir(path.join(repo,'src/content/blog'),{recursive:true});await fs.writeFile(path.join(repo,'src/content/blog/.gitkeep'),'');await run('git',['add','.'],repo);await run('git',['commit','-m','Initial'],repo);await run('git',['remote','add','origin',remote],repo);await run('git',['push','-u','origin','main'],repo);
 return {repo,remote,options:{repo,requiredRemote:remote}};
}
test('Actual Git export, commit and push to isolated local remote; no private/unrelated files included',async t=>{
 const {repo,options}=await fixture(t);const plan=await prepare('正文 ![[图.png]]');let built=false,commit='';
 const result=await publishArticle({...options,plan,build:async()=>{built=true;assert.ok((await fs.readFile(path.join(repo,'src/content/blog/my-post.md'),'utf8')).includes('正文'));},onCommitted:async value=>commit=value});
 assert.equal(result.status,'pushed');assert.ok(built);assert.equal(commit,result.commit);assert.equal((await repoState(repo,'git',options.requiredRemote)).status,'');
 const changed=(await run('git',['show','--pretty=','--name-only','HEAD'],repo)).split('\n');assert.deepEqual(changed.sort(),plan.files.map(f=>f.filePath).sort());
 const expected=await articleHash(repo,'my-post');assert.equal((await publishArticle({...options,plan,expectedArticleHash:expected})).status,'unchanged');
});
test('Failed website build rolls back exported files and stages; unrelated pending edits block publishing',async t=>{
 const {repo,options}=await fixture(t);const plan=await prepare();await assert.rejects(publishArticle({...options,plan,build:async()=>{throw Error('build failed');}}),/build failed/);await assert.rejects(fs.access(path.join(repo,'src/content/blog/my-post.md')));assert.equal((await repoState(repo,'git',options.requiredRemote)).status,'');
 await fs.writeFile(path.join(repo,'private.md'),'private');await assert.rejects(publishArticle({...options,plan}),/未提交/);await run('git',['add','private.md'],repo);await assert.rejects(publishArticle({...options,plan}),/暂存/);
});
test('Rejected push leaves one recoverable commit; retry pushes the same commit and cannot push another HEAD',async t=>{
 const {repo,remote,options}=await fixture(t);const hook=path.join(remote,'hooks/pre-receive');await fs.writeFile(hook,'#!/bin/sh\nexit 1\n',{mode:0o755});const plan=await prepare();let recorded;
 const result=await publishArticle({...options,plan,onCommitted:async value=>recorded=value});assert.equal(result.status,'pending-push');assert.equal(recorded,result.commit);await fs.unlink(hook);
 const retry=await retryPush({...options,commit:result.commit});assert.equal(retry.status,'pushed');assert.equal(await run('git',['rev-parse','HEAD'],repo),result.commit);await assert.rejects(retryPush({...options,commit:'old-commit'}),/其他修改/);
});
test('Preview conflict and symlinked output folders refuse writes',async t=>{
 const {repo,options}=await fixture(t);const plan=await prepare();await fs.writeFile(path.join(repo,'src/content/blog/my-post.md'),'existing');await run('git',['add','.'],repo);await run('git',['commit','-m','User change'],repo);await run('git',['push'],repo);
 await assert.rejects(publishArticle({...options,plan}),/预览后/);
 const symlink=path.join(repo,'public');await fs.symlink(os.tmpdir(),symlink);await run('git',['add','public'],repo);await run('git',['commit','-m','Symlink'],repo);await run('git',['push'],repo);
 const imagePlan=await prepare('![[图.png]]');await assert.rejects(publishArticle({...options,plan:imagePlan,expectedArticleHash:await articleHash(repo,'my-post')}),/符号链接/);
 assert.equal(await fs.readFile(path.join(repo,'src/content/blog/my-post.md'),'utf8'),'existing');
});
test('Concurrent editor changes during build refuse commit and preserve the new user text',async t=>{
 const {repo,options}=await fixture(t);const plan=await prepare();const target=path.join(repo,'src/content/blog/my-post.md');
 await assert.rejects(publishArticle({...options,plan,build:async()=>fs.writeFile(target,'User edit during build')}),/其他操作修改/);
 assert.equal(await fs.readFile(target,'utf8'),'User edit during build');assert.equal(await run('git',['diff','--cached','--name-only'],repo),'');
});

const {readArticle,listArticles,listDeleted,deleteArticle,parseArticle}=require('../integrations/obsidian/laplace-blog-publisher/core.cjs');
const parseYaml=require('yaml').parse;
test('Article list reads repository contents independently of vault publication records, including malformed metadata',async t=>{
 const {repo}=await fixture(t);const plan=await prepare();await fs.writeFile(path.join(repo,'src/content/blog/my-post.md'),plan.markdown);await fs.writeFile(path.join(repo,'src/content/blog/broken.md'),'not frontmatter');
 const items=await listArticles(repo,parseYaml);assert.equal(items.length,2);assert.equal(items.find(a=>a.slug==='my-post').meta.title,meta.title);assert.equal(items.find(a=>a.slug==='my-post').public,true);assert.match(items.find(a=>a.slug==='broken').error,/YAML/);
 await assert.rejects(readArticle(repo,'../../private',parseYaml),/路径/);
});
test('Editing an existing public page preserves its images, supports Markdown revision, and validates missing public assets',async t=>{
 const {repo,options}=await fixture(t);const original=await prepare('原文 ![[图.png]]');await publishArticle({...options,plan:original});const article=await readArticle(repo,'my-post',parseYaml);
 const edited=await prepare(article.body+'\n\n新增记录',{meta:{...article.meta,title:'修改标题',updatedDate:today()},resolvePublicAsset:async url=>{try{await fs.access(path.join(repo,'public'+url));return true;}catch{return false;}}});
 assert.equal(edited.warnings.length,0);assert.equal(edited.assets.length,0);assert.equal(edited.files.length,1);
 await publishArticle({...options,plan:edited,expectedArticleHash:article.hash});const updated=await readArticle(repo,'my-post',parseYaml);assert.equal(updated.meta.title,'修改标题');assert.ok(updated.body.includes('新增记录'));assert.ok(updated.body.includes('/images/posts/my-post/'));
 const missing=await prepare(article.body,{resolvePublicAsset:async()=>false});assert.match(missing.warnings[0],/不存在/);
});
test('Delete commits only the article, preserves attachments and source notes, and creates a recoverable local backup',async t=>{
 const {repo,options}=await fixture(t);const original=await prepare('原文 ![[图.png]]');await publishArticle({...options,plan:original});await fs.writeFile(path.join(repo,'source-note.md'),'my source');await run('git',['add','source-note.md'],repo);await run('git',['commit','-m','Note'],repo);await run('git',['push'],repo);
 const article=await readArticle(repo,'my-post',parseYaml);const result=await deleteArticle({...options,slug:'my-post',parseYaml,expectedArticleHash:article.hash,build:async()=>{await assert.rejects(fs.access(path.join(repo,'src/content/blog/my-post.md')));}});
 assert.equal(result.status,'pushed');assert.equal(await fs.readFile(path.join(repo,'source-note.md'),'utf8'),'my source');await fs.access(path.join(repo,original.assets[0].filePath));assert.equal(await articleHash(repo,'my-post'),null);
 assert.equal(await run('git',['show','--pretty=','--name-only','HEAD'],repo),'src/content/blog/my-post.md');const trash=await listDeleted(repo);assert.equal(trash.length,1);assert.equal(trash[0].markdown,article.markdown);assert.equal(trash[0].id,result.backupId);assert.ok(!(await run('git',['ls-files'],repo)).includes('trash'));
 const restored=parseArticle(trash[0].markdown,trash[0].slug,parseYaml);const plan=await prepare(restored.body,{meta:restored.meta});await publishArticle({...options,plan});assert.equal((await readArticle(repo,'my-post',parseYaml)).body,article.body);
});
test('Failed deletion build restores the article; stale deletion previews cannot remove newer revisions',async t=>{
 const {repo,options}=await fixture(t);const plan=await prepare();await publishArticle({...options,plan});const article=await readArticle(repo,'my-post',parseYaml);
 await assert.rejects(deleteArticle({...options,slug:'my-post',parseYaml,expectedArticleHash:article.hash,build:async()=>{throw Error('broken build');}}),/broken build/);
 assert.equal((await readArticle(repo,'my-post',parseYaml)).hash,article.hash);assert.equal((await listDeleted(repo)).length,0);assert.equal(await run('git',['status','--porcelain'],repo),'');
 await assert.rejects(deleteArticle({...options,slug:'my-post',parseYaml,expectedArticleHash:'old-hash'}),/已修改/);
});
test('Failed deletion push is recoverable with the same commit and no duplicate deletion',async t=>{
 const {repo,remote,options}=await fixture(t);await publishArticle({...options,plan:await prepare()});const article=await readArticle(repo,'my-post',parseYaml);const hook=path.join(remote,'hooks/pre-receive');await fs.writeFile(hook,'#!/bin/sh\nexit 1\n',{mode:0o755});let commit;
 const result=await deleteArticle({...options,slug:'my-post',parseYaml,expectedArticleHash:article.hash,onCommitted:async c=>commit=c});assert.equal(result.status,'pending-push');assert.equal(commit,result.commit);assert.equal((await listDeleted(repo)).length,1);await fs.unlink(hook);await retryPush({...options,commit});assert.equal(await articleHash(repo,'my-post'),null);
});
