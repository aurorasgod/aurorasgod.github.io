'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');
const { createHash } = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execute = promisify(execFile);
const CATEGORIES = ['embodied-ai', 'power-electronics', 'personal'];
const ASSET_EXTENSIONS = new Set(['png','jpg','jpeg','webp','gif','svg','pdf','mp4','mp3','wav']);
const hash = value => createHash('sha256').update(value).digest('hex');
const stripFrontmatter = text => text.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function dateValid(value) { const date=new Date(value+'T00:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.valueOf()) && date.toISOString().slice(0,10)===value; }
async function replaceAsync(text, pattern, replace) {
  let result='', start=0;
  for(const match of text.matchAll(pattern)){result+=text.slice(start,match.index)+await replace(...match);start=match.index+match[0].length;}
  return result+text.slice(start);
}
function protectedMarkdown(text) {
  const saved=[];const token=value=>`\uE000${saved.push(value)-1}\uE001`;
  const lines=text.split('\n');let fence=null, block=[], output=[];
  for(const line of lines){
    if(fence){block.push(line);const end=line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);if(end&&end[1][0]===fence[0]&&end[1].length>=fence.length){output.push(token(block.join('\n')));block=[];fence=null;}}
    else {const start=line.match(/^ {0,3}(`{3,}|~{3,})/);if(start){fence=start[1];block=[line];}else output.push(line);}
  }
  if(block.length)output.push(token(block.join('\n')));
  const masked=output.join('\n').replace(/(`+)[^`\n]*?\1/g,m=>token(m));
  return {masked,restore:value=>value.replace(/\uE000(\d+)\uE001/g,(_,i)=>saved[Number(i)])};
}
function suggestSlug(title,identity=title){
  const words=path.posix.basename(String(title||'').replace(/\\/g,'/')).replace(/\.md$/i,'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60).replace(/-+$/,'');
  return words||'post-'+hash(String(identity||title||'article')).slice(0,8);
}
function validateMetadata(meta){
  const title=String(meta.title||'').trim(), description=String(meta.description||'').trim();
  if(!title||!description)throw Error('请填写文章标题和摘要。');
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug||'') || meta.slug.length>80)throw Error('网页标识使用小写英文、数字和短横线，例如 my-first-post；不用填写文件路径。可点击“自动生成”。');
  if(!CATEGORIES.includes(meta.category))throw Error('请选择有效的文章分类。');
  if(!dateValid(meta.pubDate)||meta.pubDate>today())throw Error('发布日期必须是有效日期，不能晚于今天。');
  if(meta.updatedDate&&(!dateValid(meta.updatedDate)||meta.updatedDate<meta.pubDate||meta.updatedDate>today()))throw Error('修订日期必须介于发布日期与今天之间。');
  return {...meta,title,description};
}
async function prepareArticle({text,meta,notePath,resolveFile,resolvePublished,resolvePublicAsset,plainLinks=false}) {
  meta=validateMetadata(meta);const {title,description}=meta;
  const assets=new Map(), warnings=[], notices=[];
  const base=`/images/posts/${meta.slug}/`;
  const external=target=>/^(https?:|mailto:|tel:|#)/i.test(target);
  async function asset(reference,embedded,label,original) {
    const file=await resolveFile(reference,notePath);
    if(!file){warnings.push('找不到附件：'+reference);return original;}
    const extension=path.extname(file.path).slice(1).toLowerCase();
    if(!ASSET_EXTENSIONS.has(extension)){warnings.push('不支持嵌入此文件，请改为公开链接：'+reference);return original;}
    const data=Buffer.from(await file.read());
    if(data.byteLength>20*1024*1024)throw Error('附件超过 20 MB：'+reference);
    const name=hash(data).slice(0,16)+'.'+extension;
    const publicPath=base+name;
    assets.set(publicPath,{filePath:`public${publicPath}`,url:publicPath,source:file.path,data,resourceURL:file.resourceURL});
    const alt=String(label||path.basename(file.path)).replace(/[\[\]\n]/g,'');
    return `${embedded&&['png','jpg','jpeg','webp','gif','svg'].includes(extension)?'!':''}[${alt}](${publicPath})`;
  }
  async function link(reference,label,original) {
    if(external(reference))return `[${label}](${reference})`;
    const destination=await resolveFile(reference.split('#')[0],notePath);
    if(destination&&path.extname(destination.path).toLowerCase()!=='.md')return asset(reference,false,label,original);
    const published=destination&&await resolvePublished(destination.path);
    if(published){const anchor=reference.includes('#')?'#'+encodeURIComponent(reference.split('#').slice(1).join('#').toLowerCase().replace(/\s+/g,'-')):'';return `[${label}](/blog/${published.slug}/${anchor})`;}
    if(plainLinks){notices.push('未公开链接已转为文字：'+reference);return label;}
    warnings.push('内部链接尚未公开：'+reference);return original;
  }
  let body=stripFrontmatter(text).trim();
  const first=body.match(/^#\s+(.+)\r?\n/);
  if(first&&(first[1].trim()===title||first[1].trim()===path.basename(notePath,'.md')))body=body.slice(first[0].length).trim();
  const protectedText=protectedMarkdown(body);
  body=protectedText.masked.replace(/%%[\s\S]*?%%/g,'').replace(/<!--[\s\S]*?-->/g,'');
  body=await replaceAsync(body,/(!?)\[\[([^\]\n]+)\]\]/g,async(original,embed,inside)=>{
    const [reference,...alias]=inside.split('|');const target=reference.trim();const label=alias.join('|')||target.split('/').pop().replace(/\.md$/i,'');
    if(embed)return asset(target,true,/^\d+(x\d+)?$/.test(label)?'':label,original);
    return link(target,label,original);
  });
  body=await replaceAsync(body,/(!?)\[([^\]\n]*)\]\((<[^>]+>|[^)\s]+)(\s+(?:"[^"]*"|'[^']*'))?\)/g,async(original,embed,label,destination)=>{
    let reference=destination.replace(/^<|>$/g,'');try{reference=decodeURIComponent(reference);}catch{}
    if(external(reference))return original;
    if(reference.startsWith('/images/posts/')){
      if(!/^\/images\/posts\/[a-z0-9-]+\/[a-f0-9]{16}\.[a-z0-9]+$/.test(reference)){warnings.push('无效的公开附件路径：'+reference);return original;}
      if(assets.has(reference))return original;
      if(resolvePublicAsset&&!await resolvePublicAsset(reference))warnings.push('公开附件不存在：'+reference);
      return original;
    }
    if(reference.startsWith('/blog/'))return original;
    if(embed)return asset(reference,true,label,original);
    return link(reference,label,original);
  });
  if(/<(?:img|video|audio|iframe)\b[^>]*\b(?:src|poster)\s*=\s*["'](?!https?:\/\/)[^"']+/i.test(body))warnings.push('HTML 内的本地附件请改用 Markdown 图片或公开 HTTPS 链接。');
  if(/\]\((?:obsidian:|file:|data:|javascript:)/i.test(body))warnings.push('请移除本地文件、Obsidian 或脚本链接。');
  body=protectedText.restore(body).trim();
  if(!body)throw Error('正文为空，请先写好文章。');
  const tags=Array.isArray(meta.tags)?meta.tags:[];
  const header=['---','title: '+JSON.stringify(title),'description: '+JSON.stringify(description),'pubDate: '+meta.pubDate,...(meta.updatedDate?['updatedDate: '+meta.updatedDate]:[]),'category: '+meta.category,'tags: '+JSON.stringify(tags),'publish: true','draft: false','featured: '+Boolean(meta.featured),'---'];
  const markdown=header.join('\n')+'\n\n'+body+'\n';
  const files=[{filePath:`src/content/blog/${meta.slug}.md`,data:Buffer.from(markdown)},...assets.values()];
  const signature=hash(files.map(f=>f.filePath+':'+hash(f.data)).join('\n'));
  return {meta:{...meta,title,description},body,markdown,assets:[...assets.values()],warnings:[...new Set(warnings)],notices:[...new Set(notices)],files,signature};
}
async function run(binary,args,cwd,options={}){
  const timeout=options.timeout??120000,env={...process.env,GIT_TERMINAL_PROMPT:'0',...options.env};
  // Finder-launched macOS apps normally omit Homebrew/Node from PATH.
  env.PATH=[path.dirname(binary),env.PATH,'/opt/homebrew/bin','/usr/local/bin','/usr/bin','/bin','/usr/sbin','/sbin'].filter(Boolean).join(path.delimiter);
  try{return (await execute(binary,args,{cwd,timeout,maxBuffer:2*1024*1024,env})).stdout.trim();}
  catch(error){
    const redact=text=>String(text).replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/g,'$1[redacted]@').replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g,'[redacted]');
    const label=path.basename(binary)+(path.basename(binary).includes('git')?' '+redact(args.filter((arg,i)=>arg!=='-c'&&args[i-1]!=='-c').join(' ')):'');
    const detail=redact(error.stderr||error.stdout||(!error.killed&&error.code!=='ENOENT'?error.message:'')||'').trim().slice(-2500);
    const reason=error.killed?`命令超时（${Math.round(timeout/1000)} 秒）`:error.code==='ENOENT'?'找不到可执行文件':`命令失败（${error.code??error.signal??'未知错误'}）`;
    throw Error(`${reason}：${label}${detail?'\n'+detail:''}${error.killed?'\n请检查 GitHub 网络连接或插件的 Git 代理设置。':''}`);
  }
}
function normalizeProxy(value){
  const proxy=String(value||'').trim();if(!proxy)return '';
  let url;try{url=new URL(proxy);}catch{throw Error('Git 代理格式无效，例如 http://127.0.0.1:7897。');}
  if(!['http:','https:','socks5:','socks5h:'].includes(url.protocol)||!url.hostname||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw Error('Git 代理只填写 HTTP/HTTPS/SOCKS5 地址和端口，不包含密码或路径。');
  return proxy;
}
async function gitNetwork(git,args,root,{gitProxy='',networkTimeout=60000}={}){
  const proxy=normalizeProxy(gitProxy);
  return run(git,['-c','http.lowSpeedLimit=1','-c','http.lowSpeedTime=20',...(proxy?['-c','http.proxy='+proxy]:[]),...args],root,{timeout:networkTimeout});
}
async function checkConnection({repo,git='git',requiredRemote,gitProxy=''}){
  const state=await repoState(repo,git,requiredRemote);
  const result=await gitNetwork(git,['ls-remote','origin','refs/heads/main'],state.root,{gitProxy});
  if(!/^[a-f0-9]{40,64}\s+refs\/heads\/main$/m.test(result))throw Error('GitHub 仓库没有 main 分支。');
  return state;
}
async function repoState(repo,git='git',requiredRemote='https://github.com/aurorasgod/aurorasgod.github.io.git') {
  const root=await fs.realpath(repo);
  if(await run(git,['rev-parse','--show-toplevel'],root)!==root)throw Error('请设置博客 Git 仓库根目录。');
  await fs.access(path.join(root,'src/content/blog'));
  const remote=await run(git,['remote','get-url','origin'],root);
  const equivalent=remote.replace(/^git@github\.com:/,'https://github.com/').replace(/\.git$/,'');
  if(equivalent!==requiredRemote.replace(/\.git$/,''))throw Error('仓库的 origin 与博客目标不一致。');
  const branch=await run(git,['branch','--show-current'],root);
  if(branch!=='main')throw Error('请切换到 main 分支。');
  const staged=await run(git,['diff','--cached','--name-only'],root);
  if(staged)throw Error('仓库有已暂存的其他修改，请先处理，避免一起发布。');
  return {root,remote,branch,head:await run(git,['rev-parse','HEAD'],root),status:await run(git,['status','--porcelain','--untracked-files=all'],root)};
}
async function safeTarget(root,relative) {
  if(!/^(src\/content\/blog\/[a-z0-9-]+\.md|public\/images\/posts\/[a-z0-9-]+\/[a-f0-9]{16}\.[a-z0-9]+)$/.test(relative))throw Error('无效的导出路径。');
  let current=root;
  for(const segment of relative.split('/')){current=path.join(current,segment);try{if((await fs.lstat(current)).isSymbolicLink())throw Error('导出路径不能包含符号链接。');}catch(e){if(e.code!=='ENOENT')throw e;}}
  return path.join(root,relative);
}
async function articleHash(repo,slug){try{return hash(await fs.readFile(await safeTarget(await fs.realpath(repo),`src/content/blog/${slug}.md`)));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
async function publishArticle({repo,plan,git='git',requiredRemote,gitProxy='',expectedArticleHash=null,build,onProgress=()=>{},onCommitted=async()=>{}}) {
  if(plan.warnings.length)throw Error('请先处理预览中的内部链接或附件问题。');
  const state=await repoState(repo,git,requiredRemote);
  if(state.status)throw Error('博客仓库还有未提交的修改，请先在 GitHub Desktop 处理。');
  const gitdir=path.resolve(state.root,await run(git,['rev-parse','--git-dir'],state.root)), lock=path.join(gitdir,'laplace-blog-publisher.lock');
  try{await fs.mkdir(lock);}catch(e){if(e.code==='EEXIST')throw Error('另一项发布正在进行，请稍后再试。');throw e;}
  const backups=[];let committed=false;
  try {
    onProgress('检查远程仓库');await gitNetwork(git,['fetch','origin','main'],state.root,{gitProxy});
    const behind=Number(await run(git,['rev-list','--count','HEAD..origin/main'],state.root)),ahead=Number(await run(git,['rev-list','--count','origin/main..HEAD'],state.root));
    if(behind)throw Error('远程仓库有新提交，请先在 GitHub Desktop 拉取更新。');
    if(ahead)throw Error('仓库有尚未推送的提交，请先在 GitHub Desktop 处理，或使用插件的重试推送。');
    if(await articleHash(state.root,plan.meta.slug)!==expectedArticleHash)throw Error('文章已在预览后被修改，请重新预览。');
    onProgress(plan.operation==='delete'?'移除网页文章':'导出文章与附件');
    for(const file of plan.files){const target=await safeTarget(state.root,file.filePath);let previous=null;try{previous=await fs.readFile(target);}catch(e){if(e.code!=='ENOENT')throw e;}backups.push({target,previous,writtenHash:file.data===null?null:hash(file.data)});await fs.mkdir(path.dirname(target),{recursive:true});if(file.data===null)await fs.unlink(target);else await fs.writeFile(target,file.data);}
    onProgress('检查网站构建');if(build)await build(state.root);
    const paths=plan.files.map(f=>f.filePath);
    // A build hook or external editor must not sneak unrelated changes into this publish.
    const unstaged=await run(git,['diff','--name-only'],state.root);
    const untracked=await run(git,['ls-files','--others','--exclude-standard'],state.root);
    if((unstaged+'\n'+untracked).split('\n').filter(Boolean).some(p=>!paths.includes(p)))throw Error('构建期间仓库出现了其他修改，请检查后重新发布。');
    if(await run(git,['rev-parse','HEAD'],state.root)!==state.head || await run(git,['diff','--cached','--name-only'],state.root))throw Error('构建期间 Git 仓库被其他操作修改，请检查后重新发布。');
    for(const file of plan.files){let current=null;try{current=await fs.readFile(await safeTarget(state.root,file.filePath));}catch(e){if(e.code!=='ENOENT')throw e;}if((current===null?null:hash(current))!==(file.data===null?null:hash(file.data)))throw Error('构建期间发布稿或附件被其他操作修改，请重新预览。');}
    await run(git,['add','--',...paths],state.root);
    if(!(await run(git,['diff','--cached','--name-only'],state.root)))return {status:'unchanged',commit:state.head};
    onProgress('提交文章');await run(git,['commit','-m',`${plan.operation==='delete'?'Delete':'Publish'}: ${plan.meta.title.slice(0,100)}`,'--',...paths],state.root);
    committed=true;const commit=await run(git,['rev-parse','HEAD'],state.root);await onCommitted(commit);
    onProgress('推送到 GitHub');
    try{await gitNetwork(git,['push','origin','main'],state.root,{gitProxy});return {status:'pushed',commit};}
    catch(error){return {status:'pending-push',commit,error:error.message};}
  } catch(error) {
    if(!committed){const paths=plan.files.map(f=>f.filePath);await run(git,['reset','--',...paths],state.root).catch(()=>{});for(const {target,previous,writtenHash} of backups){let current=null;try{current=await fs.readFile(target);}catch(e){if(e.code!=='ENOENT')throw e;}if((current===null?null:hash(current))!==writtenHash)continue;if(previous===null)await fs.unlink(target).catch(()=>{});else await fs.writeFile(target,previous);}}
    throw error;
  } finally {await fs.rmdir(lock);}
}
async function retryPush({repo,commit,git='git',requiredRemote,gitProxy=''}) {
  const state=await repoState(repo,git,requiredRemote);
  if(state.status||state.head!==commit)throw Error('仓库已发生其他修改，请在 GitHub Desktop 处理推送。');
  await gitNetwork(git,['fetch','origin','main'],state.root,{gitProxy});
  if(Number(await run(git,['rev-list','--count','HEAD..origin/main'],state.root)))throw Error('远程已更新，请在 GitHub Desktop 合并后推送。');
  await gitNetwork(git,['push','origin','main'],state.root,{gitProxy});return {status:'pushed',commit};
}
function parseArticle(markdown,slug,parseYaml){
  const match=markdown.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if(!match)throw Error('文章缺少 YAML 属性。');
  const meta=parseYaml(match[1]);if(!meta||typeof meta!=='object'||Array.isArray(meta))throw Error('文章属性格式无效。');
  const date=value=>value instanceof Date?value.toISOString().slice(0,10):String(value||'').slice(0,10);
  return {slug,markdown,hash:hash(markdown),body:stripFrontmatter(markdown).trim(),meta:{title:String(meta.title||slug),description:String(meta.description||''),slug,category:meta.category,tags:Array.isArray(meta.tags)?meta.tags:[],pubDate:date(meta.pubDate),updatedDate:date(meta.updatedDate),featured:!!meta.featured},public:meta.publish===true&&meta.draft!==true};
}
async function readArticle(repo,slug,parseYaml){const root=await fs.realpath(repo),target=await safeTarget(root,`src/content/blog/${slug}.md`);return parseArticle(await fs.readFile(target,'utf8'),slug,parseYaml);}
async function listArticles(repo,parseYaml){
  const root=await fs.realpath(repo),names=await fs.readdir(path.join(root,'src/content/blog')),result=[];
  for(const name of names.filter(n=>/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(n))){const slug=name.slice(0,-3);try{result.push(await readArticle(root,slug,parseYaml));}catch(error){result.push({slug,error:error.message,meta:{title:slug},public:false});}}
  return result.sort((a,b)=>String(b.meta.pubDate||'').localeCompare(String(a.meta.pubDate||''))||a.slug.localeCompare(b.slug));
}
async function trashDirectory(repo,git='git'){const root=await fs.realpath(repo),gitdir=path.resolve(root,await run(git,['rev-parse','--git-dir'],root));const target=path.join(gitdir,'laplace-blog-trash');await fs.mkdir(target,{recursive:true});if((await fs.lstat(target)).isSymbolicLink())throw Error('恢复目录不能是符号链接。');return target;}
async function listDeleted(repo,git='git'){
  const dir=await trashDirectory(repo,git),items=[];
  for(const name of await fs.readdir(dir)){if(!/^[a-z0-9-]+\.json$/.test(name))continue;try{const file=path.join(dir,name);if((await fs.lstat(file)).isSymbolicLink())continue;const item=JSON.parse(await fs.readFile(file,'utf8'));if(item.commit&&typeof item.markdown==='string')items.push(item);}catch{}}
  return items.sort((a,b)=>b.deletedAt.localeCompare(a.deletedAt));
}
async function deleteArticle({slug,parseYaml,...options}){
  const article=await readArticle(options.repo,slug,parseYaml);
  if(article.hash!==options.expectedArticleHash)throw Error('文章已修改，请刷新列表后再删除。');
  const dir=await trashDirectory(options.repo,options.git),id=`${slug}-${Date.now()}-${article.hash.slice(0,8)}`,backup=path.join(dir,id+'.json');
  const record={id,slug,title:article.meta.title,markdown:article.markdown,deletedAt:new Date().toISOString(),commit:''};
  await fs.writeFile(backup,JSON.stringify(record,null,2),{flag:'wx'});
  const plan={operation:'delete',meta:article.meta,warnings:[],files:[{filePath:`src/content/blog/${slug}.md`,data:null}]};
  const result=await publishArticle({...options,plan,onCommitted:async commit=>{record.commit=commit;await fs.writeFile(backup,JSON.stringify(record,null,2));await options.onCommitted?.(commit);}});
  return {...result,backupId:id};
}
module.exports={CATEGORIES,hash,today,stripFrontmatter,suggestSlug,validateMetadata,prepareArticle,repoState,articleHash,publishArticle,retryPush,run,normalizeProxy,gitNetwork,checkConnection,parseArticle,readArticle,listArticles,listDeleted,deleteArticle,safeTarget};
