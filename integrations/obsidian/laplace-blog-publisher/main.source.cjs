'use strict';
const {Plugin,ItemView,PluginSettingTab,Setting,Notice,FuzzySuggestModal,Modal,MarkdownRenderer,Component,TFile,parseYaml,requestUrl}=require('obsidian');
const path=require('node:path');
const fs=require('node:fs/promises');
const core=require('./core.cjs');
const VIEW='laplace-blog-publisher';
const NAMES={'embodied-ai':'具身智能','power-electronics':'电力电子','personal':'个人经历'};
const DEFAULT={repoPath:'',gitPath:'/usr/bin/git',nodePath:'/usr/local/bin/node',siteURL:'https://aurorasgod.github.io',activityAPI:'https://field-notes-research.gptplus6267.chatgpt.site',defaultCategory:'embodied-ai',drafts:{},publications:{},pendingCommit:'',pendingAction:null,lastCommit:''};
const button=(parent,label,action,primary=false)=>{const el=parent.createEl('button',{text:label,cls:primary?'mod-cta':'',attr:{type:'button'}});el.onclick=()=>Promise.resolve().then(action).catch(error=>{parent.closest('.lp-publisher')?.querySelector('.lp-status')?.setText(error.message);new Notice(error.message,10000);});return el;};
const dateString=value=>value instanceof Date?value.toISOString().slice(0,10):String(value||'').slice(0,10);
class NotePicker extends FuzzySuggestModal {
 constructor(plugin,choose){super(plugin.app);this.choose=choose;this.setPlaceholder('搜索 Markdown 笔记');}
 getItems(){return this.app.vault.getMarkdownFiles().filter(f=>!/^模板\//.test(f.path));}
 getItemText(file){return file.path;}
 onChooseItem(file){Promise.resolve(this.choose(file)).catch(e=>new Notice(e.message));}
}
class Preview extends Modal {
 constructor(view,plan,source=''){super(view.app);this.view=view;this.p=view.p;this.plan=plan;this.source=source;this.renderComponent=new Component();}
 async onOpen(){
  this.modalEl.addClass('lp-preview-modal');this.titleEl.setText('文章预览');this.renderComponent.load();
  const e=this.contentEl,plan=this.plan;e.createEl('h2',{text:plan.meta.title});e.createEl('p',{cls:'lp-muted',text:`${NAMES[plan.meta.category]} · ${plan.meta.pubDate} · /blog/${plan.meta.slug}/`});
  e.createEl('p',{cls:'lp-muted',text:'保存到：'+path.join(this.p.settings.repoPath,plan.files[0].filePath)});
  const actions=e.createDiv({cls:'lp-actions'});button(actions,'返回编辑',()=>this.close());
  const progress=e.createEl('p',{cls:'lp-muted',attr:{role:'status','aria-live':'polite'}});
  this.confirmButton=button(actions,'确认发布并推送',async()=>{this.confirmButton.disabled=true;progress.setText('正在写入仓库、构建并推送，请稍候…');try{await this.view.publish(plan);this.close();}catch(error){progress.setText(error.message);progress.addClass('lp-warning');this.confirmButton.disabled=!!plan.warnings.length;throw error;}},true);this.confirmButton.disabled=!!plan.warnings.length;
  e.createEl('p',{cls:'lp-muted',text:`新增附件：${plan.assets.length} 个；已有公开附件保留。`});
  for(const asset of plan.assets)e.createEl('p',{cls:'lp-muted',text:`${asset.source} · ${(asset.data.length/1024).toFixed(1)} KB`});
  for(const warning of plan.warnings)e.createEl('p',{cls:'lp-warning',text:warning});
  for(const notice of plan.notices)e.createEl('p',{cls:'lp-muted',text:notice});
  const preview=e.createDiv({cls:'lp-preview markdown-rendered'});let markdown=plan.body;
  for(const asset of plan.assets)if(asset.resourceURL)markdown=markdown.split(asset.url).join(asset.resourceURL);
  markdown=markdown.replace(/(\]\()\/images\/posts\//g,'$1'+this.p.settings.siteURL.replace(/\/$/,'')+'/images/posts/');
  try{await MarkdownRenderer.render(this.app,markdown,preview,this.source,this.renderComponent);}catch(error){this.confirmButton.disabled=true;progress.setText('预览渲染失败：'+error.message);progress.addClass('lp-warning');}
 }
 onClose(){this.renderComponent.unload();this.contentEl.empty();}
}
class DeleteDialog extends Modal {
 constructor(view,article){super(view.app);this.view=view;this.article=article;}
 onOpen(){this.titleEl.setText('删除网页文章');const e=this.contentEl;
  e.createEl('p',{text:`将从博客移除「${this.article.meta.title}」。`});e.createEl('p',{cls:'lp-muted',text:`/blog/${this.article.slug}/`});
  e.createEl('p',{text:'原 Obsidian 笔记和图片附件保留。文章副本会存入本地恢复列表；网站重新部署后，原页面地址将不再显示。'});
  const actions=e.createDiv({cls:'lp-actions'});button(actions,'取消',()=>this.close());const remove=button(actions,'删除并更新网站',async()=>{remove.disabled=true;try{await this.view.remove(this.article);this.close();}catch(e){remove.disabled=false;throw e;}});remove.addClass('mod-warning');
 }
}
class PublisherView extends ItemView {
 constructor(leaf,plugin){super(leaf);this.p=plugin;this.plan=null;this.busy=false;this.target=null;this.filter='';this.listMode='articles';this.expectedHash=null;}
 getViewType(){return VIEW;}
 getDisplayText(){return '网站管理';}
 getIcon(){return 'globe';}
 async onOpen(){await this.render();}
 async leave(){if(this.busy)throw Error('正在更新网站，请稍后。');if(this.draft)await this.saveDraft(false);}
 draftKey(){return this.target?'@web/'+this.target.slug:this.p.currentNote?.path;}
 async select(file){
  await this.leave();if(!(file instanceof TFile)||file.extension!=='md')throw Error('请选择 Markdown 笔记；PDF 可作为正文中明确引用的附件。');
  this.target=null;this.p.currentNote=file;const cached=this.p.settings.drafts[file.path],published=this.p.settings.publications[file.path],fm=this.app.metadataCache.getFileCache(file)?.frontmatter||{};
  this.draft=cached||{title:fm.title||file.basename,description:fm.description||'',slug:published?.slug||fm.blog_slug||'',category:NAMES[fm.category]?fm.category:this.p.settings.defaultCategory,tags:Array.isArray(fm.tags)?fm.tags.join(', '):'',pubDate:dateString(fm.pubDate)||core.today(),updatedDate:published?core.today():'',featured:false,plainLinks:false,body:core.stripFrontmatter(await this.app.vault.read(file)).trim()};
  if(published){this.draft.pubDate=published.pubDate;this.draft.updatedDate=core.today();}
  // Old drafts sometimes put the Obsidian file path into the ambiguous address field.
  if(!this.draft.slug||/^\/.+\.md$/i.test(this.draft.slug)||/^[A-Za-z]:[\\/].+\.md$/i.test(this.draft.slug))this.draft.slug=core.suggestSlug(this.draft.title,file.path);
  this.plan=null;await this.render();
 }
 async editArticle(slug){
  await this.leave();const article=await core.readArticle(this.p.settings.repoPath,slug,parseYaml);this.target=article;this.p.currentNote=null;
  const saved=this.p.settings.drafts['@web/'+slug];this.draft=saved?.baseHash===article.hash?saved:{...article.meta,tags:article.meta.tags.join(', '),body:article.body,plainLinks:false,updatedDate:core.today(),baseHash:article.hash};this.plan=null;await this.render();
 }
 async restore(article){
  await this.leave();if(await core.articleHash(this.p.settings.repoPath,article.slug))throw Error('此地址已有文章。请在文章列表中打开，避免覆盖。');
  const parsed=core.parseArticle(article.markdown,article.slug,parseYaml);this.p.currentNote=null;this.target={...parsed,hash:null,restoring:true};this.draft={...parsed.meta,tags:parsed.meta.tags.join(', '),body:parsed.body,updatedDate:core.today(),plainLinks:false,baseHash:null};this.plan=null;this.listMode='articles';await this.render();new Notice('恢复稿已打开。预览并发布后，网页才会恢复。');
 }
 invalidate(){this.plan=null;this.updateOutputPath();this.status?.setText('编辑稿已修改，发布时会显示最新预览。');}
 updateOutputPath(){const slug=this.draft?.slug||'';this.outputPath?.setText(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)?'保存到：'+path.join(this.p.settings.repoPath,'src/content/blog',slug+'.md'):'填写有效网页标识后，插件会自动生成仓库中的保存位置。');}
 field(parent,label,key,multiline=false,type='text',description=''){
  const row=new Setting(parent).setName(label);if(description)row.setDesc(description);row.settingEl.addClass('lp-field');if(multiline)row.settingEl.addClass('lp-field-wide');let input;
  const configure=c=>{input=c.inputEl;input.id='lp-'+key;input.setAttribute('aria-label',label);input.setAttribute('spellcheck','false');if(!multiline)input.type=type;c.setValue(String(this.draft[key]||'')).onChange(value=>{this.draft[key]=value;this.invalidate();});};
  if(multiline)row.addTextArea(configure);else row.addText(configure);return input;
 }
 async prepare(){
  if(!this.draft)throw Error('请先选择笔记或文章。');const meta={...this.draft,tags:this.draft.tags.split(/[,，]/).map(s=>s.trim()).filter(Boolean)};
  core.validateMetadata(meta); // Validate user input before constructing any filesystem path.
  const source=this.p.currentNote?.path||`src/content/blog/${meta.slug}.md`,own=this.p.currentNote&&this.p.settings.publications[source];
  const expected=await core.articleHash(this.p.settings.repoPath,meta.slug);
  if(this.target&&expected!==this.target.hash)throw Error('文章已被其他操作修改，请刷新文章列表并重新打开。');
  if(expected&&!this.target&&own?.slug!==meta.slug)throw Error('这个文章地址已存在，请从文章列表中打开编辑。');
  const plan=await core.prepareArticle({text:this.draft.body,meta,notePath:source,plainLinks:this.draft.plainLinks,
   resolveFile:async reference=>{if(!this.p.currentNote)return null;const clean=reference.split('#')[0],destination=this.app.metadataCache.getFirstLinkpathDest(clean,source)||this.app.vault.getAbstractFileByPath(path.posix.normalize(path.posix.join(path.posix.dirname(source),clean)));if(!(destination instanceof TFile))return null;return {path:destination.path,resourceURL:this.app.vault.getResourcePath(destination),read:async()=>Buffer.from(await this.app.vault.readBinary(destination))};},
   resolvePublished:async destination=>{const record=this.p.settings.publications[destination];return record?.state==='pushed'?record:null;},
   resolvePublicAsset:async reference=>{try{await fs.access(await core.safeTarget(await fs.realpath(this.p.settings.repoPath),'public'+reference));return true;}catch{return false;}}
  });this.expectedHash=expected;plan.expectedArticleHash=expected;return plan;
 }
 async saveDraft(notify=true){const key=this.draftKey();if(!key||!this.draft)return;this.p.settings.drafts[key]={...this.draft};await this.p.save();if(notify)new Notice('编辑稿已保存到本地。');}
 async inspect(){const state=await core.repoState(this.p.settings.repoPath,this.p.settings.gitPath);await fs.access(path.join(state.root,'node_modules/astro/bin/astro.mjs'));this.status.setText(`环境可用 · main · ${state.status?'仓库有未提交修改，请先处理':'仓库干净'}`);}
 async preview(){if(this.busy)throw Error('正在更新网站，请稍候。');this.setBusy(true);this.status.setText('正在生成预览…');try{this.plan=await this.prepare();await this.saveDraft(false);this.status.setText(this.plan.warnings.length?`有 ${this.plan.warnings.length} 项需要处理，请查看预览。`:'预览已生成，在预览窗口中确认发布并推送。');this.previewModal=new Preview(this,this.plan,this.p.currentNote?.path);this.previewModal.open();return this.previewModal;}catch(error){this.plan=null;this.status.setText(error.message);throw error;}finally{this.setBusy(false);}}
 async build(root){await fs.access(path.join(root,'node_modules/astro/bin/astro.mjs'));await core.run(this.p.settings.nodePath,[path.join(root,'node_modules/astro/bin/astro.mjs'),'build'],root,{env:{SITE_URL:this.p.settings.siteURL,BASE_PATH:'/',PUBLIC_ACTIVITY_API:this.p.settings.activityAPI,PATH:path.dirname(this.p.settings.nodePath)+path.delimiter+(process.env.PATH||'')}});}
 options(){return {repo:this.p.settings.repoPath,git:this.p.settings.gitPath,build:root=>this.build(root),onProgress:message=>this.status?.setText(message+'…')};}
 setBusy(value){this.busy=value;for(const control of this.contentEl.querySelectorAll('input,textarea,select,button'))control.disabled=value;for(const toggle of this.toggles||[])toggle.setDisabled(value);if(!value&&this.target)this.contentEl.querySelector('#lp-slug')?.setAttribute('disabled','');}
 async record(commit,action){this.p.settings.pendingCommit=commit;this.p.settings.lastCommit=commit;this.p.settings.pendingAction=action;if(action.type==='publish'&&action.source)this.p.settings.publications[action.source]={...action.meta,state:'pending-push',commit};await this.p.save();}
 async complete(result,action){
  if(result.status==='pending-push'){this.status?.setText('已提交，推送失败。请点击“重试推送”，无需重复操作。');new Notice(result.error,10000);return;}
  if(result.status==='pushed'){this.p.settings.pendingCommit='';this.p.settings.pendingAction=null;this.p.settings.lastCommit=result.commit;
   if(action.type==='delete'){for(const [key,record] of Object.entries(this.p.settings.publications))if(record.slug===action.slug)delete this.p.settings.publications[key];}
   else if(action.source&&this.p.settings.publications[action.source])this.p.settings.publications[action.source].state='pushed';
   await this.p.save();this.status?.setText('已推送。GitHub Pages 正在部署，可点击“检查部署”。');new Notice('网站更新已推送。');
  }else this.status?.setText('内容没有变化，无需提交。');
 }
 async publish(original){
  if(this.busy||!original||original.warnings.length)throw Error('请先处理预览中提示的问题。');this.setBusy(true);
  try{const latest=await this.prepare();if(latest.signature!==original.signature||latest.expectedArticleHash!==original.expectedArticleHash)throw Error('正文、附件或仓库文件已变化，请重新预览。');await this.saveDraft(false);const action={type:'publish',source:this.p.currentNote?.path||null,slug:latest.meta.slug,meta:latest.meta};
   const result=await core.publishArticle({...this.options(),plan:latest,expectedArticleHash:original.expectedArticleHash,onCommitted:commit=>this.record(commit,action)});await this.complete(result,action);
   if(this.target){this.target.hash=await core.articleHash(this.p.settings.repoPath,latest.meta.slug);this.target.restoring=false;this.draft.baseHash=this.target.hash;await this.saveDraft(false);}this.plan=null;await this.refreshList();return result;
  }catch(e){this.status?.setText(e.message);throw e;}finally{this.setBusy(false);}
 }
 async remove(article){
  if(this.busy)throw Error('正在更新网站，请稍后。');this.setBusy(true);const action={type:'delete',slug:article.slug};
  try{const result=await core.deleteArticle({...this.options(),slug:article.slug,parseYaml,expectedArticleHash:article.hash,onCommitted:commit=>this.record(commit,action)});await this.complete(result,action);if(this.target?.slug===article.slug){delete this.p.settings.drafts['@web/'+article.slug];this.target=null;this.draft=null;this.p.currentNote=null;await this.p.save();}await this.render();}
  catch(e){this.status?.setText(e.message);throw e;}finally{this.setBusy(false);}
 }
 async retry(){if(this.busy)throw Error('正在更新网站。');if(!this.p.settings.pendingCommit)throw Error('没有待重试的提交。');this.setBusy(true);try{const action=this.p.settings.pendingAction||{type:'publish'},result=await core.retryPush({repo:this.p.settings.repoPath,commit:this.p.settings.pendingCommit,git:this.p.settings.gitPath});for(const r of Object.values(this.p.settings.publications))if(r.commit===result.commit)r.state='pushed';await this.complete(result,action);await this.refreshList();}finally{this.setBusy(false);}}
 async deployment(){const commit=this.p.settings.lastCommit||this.p.settings.pendingCommit;if(!commit)throw Error('暂无本插件的部署记录。');const response=await requestUrl({url:`https://api.github.com/repos/aurorasgod/aurorasgod.github.io/actions/runs?head_sha=${encodeURIComponent(commit)}&per_page=10`,headers:{Accept:'application/vnd.github+json'}});const run=response.json.workflow_runs?.find(r=>r.name==='Publish personal site');this.status.setText(!run?'尚未创建部署任务，稍后再检查。':run.status==='completed'?(run.conclusion==='success'?'部署成功，网站已更新。':`部署失败：${run.conclusion}，请查看 GitHub Actions。`):'GitHub 正在构建并部署网站。');}
 async refreshList(){
  if(!this.articleList)return;this.articleList.empty();
  try{const records=this.listMode==='trash'?await core.listDeleted(this.p.settings.repoPath,this.p.settings.gitPath):await core.listArticles(this.p.settings.repoPath,parseYaml);const filtered=records.filter(r=>(r.meta?.title||r.title||r.slug).toLowerCase().includes(this.filter.toLowerCase())||r.slug.includes(this.filter.toLowerCase()));
   this.listCount.setText(`${this.listMode==='trash'?'恢复列表':'文章'} · ${records.length}`);
   if(!filtered.length){this.articleList.createEl('p',{cls:'lp-muted lp-list-empty',text:records.length?'没有匹配的文章。':this.listMode==='trash'?'没有删除记录。':'暂无文章。可从 Obsidian 笔记创建。'});return;}
   for(const article of filtered){const row=this.articleList.createDiv({cls:'lp-article-row'+(this.target?.slug===article.slug?' is-active':'')});const open=button(row,article.meta?.title||article.title,()=>this.listMode==='trash'?this.restore(article):this.editArticle(article.slug));open.addClass('lp-article-title');open.disabled=this.busy||!!article.error;
    row.createEl('small',{cls:'lp-muted',text:article.error||`${this.listMode==='trash'?'已删除 · 可恢复':article.public?'公开':'未公开'} · ${article.meta?.pubDate||article.deletedAt?.slice(0,10)||'未设置日期'}`});
    if(this.listMode==='trash')row.createEl('small',{cls:'lp-muted',text:'点击打开恢复稿'});
   }
  }catch(e){this.listCount.setText('文章');this.articleList.createEl('p',{cls:'lp-muted lp-list-empty',text:'无法读取仓库：'+e.message});}
 }
 async render(){
  const e=this.contentEl;e.empty();e.addClass('lp-publisher');this.toggles=[];this.outputPath=null;
  const toolbar=e.createDiv({cls:'lp-toolbar'});toolbar.createEl('h2',{text:'网站管理'});const tools=toolbar.createDiv({cls:'lp-actions'});
  button(tools,'从笔记新建',()=>new NotePicker(this.p,f=>this.select(f)).open());button(tools,'新建草稿',()=>this.p.createDraft());button(tools,'打开博客',()=>this.p.openURL(''));button(tools,'设置',()=>{this.app.setting.open();this.app.setting.openTabById(this.p.manifest.id);});
  const layout=e.createDiv({cls:'lp-layout'}),sidebar=layout.createDiv({cls:'lp-sidebar'});const tabs=sidebar.createDiv({cls:'lp-list-tabs'});
  for(const [id,label] of [['articles','文章'],['trash','恢复列表']]){const b=button(tabs,label,async()=>{if(this.busy)return;this.listMode=id;for(const el of tabs.querySelectorAll('button'))el.classList.toggle('is-active',el===b);await this.refreshList();});if(id===this.listMode)b.addClass('is-active');}
  const search=sidebar.createEl('input',{cls:'search-input',attr:{type:'search',placeholder:'搜索文章','aria-label':'搜索文章'}});search.value=this.filter;search.oninput=()=>{this.filter=search.value;this.refreshList();};
  const listHeader=sidebar.createDiv({cls:'lp-list-header'});this.listCount=listHeader.createSpan({cls:'lp-muted'});button(listHeader,'刷新',()=>this.refreshList());this.articleList=sidebar.createDiv({cls:'lp-article-list'});
  const editor=layout.createDiv({cls:'lp-editor'});this.status=editor.createEl('p',{cls:'lp-status',text:this.p.settings.pendingCommit?'有提交等待推送，请先重试推送。':'目标：aurorasgod.github.io',attr:{role:'status','aria-live':'polite'}});
  if(this.p.currentNote&&!this.draft)return this.select(this.p.currentNote);
  if(this.draft){
   const head=editor.createDiv({cls:'lp-editor-heading'});head.createEl('h3',{text:this.target?(this.target.restoring?'恢复文章':'编辑文章'):'新建文章'});
   if(this.target&&!this.target.restoring){const actions=head.createDiv({cls:'lp-actions'});button(actions,'查看网页',()=>this.p.openURL(`/blog/${this.target.slug}/`));const remove=button(actions,'删除文章',async()=>{await this.leave();new DeleteDialog(this,await core.readArticle(this.p.settings.repoPath,this.target.slug,parseYaml)).open();});remove.addClass('mod-warning');}
   editor.createEl('p',{cls:'lp-source',text:this.p.currentNote?'来源：'+this.p.currentNote.path:'来源：博客仓库 /blog/'+this.target.slug+'/'});
   const fields=editor.createDiv({cls:'lp-fields'});this.field(fields,'标题','title');const slug=this.field(fields,'网页标识','slug',false,'text','网址中 /blog/ 后面的部分，例如 my-first-post。不用填写笔记或仓库路径。');if(this.target)slug.disabled=true;else button(slug.parentElement,'自动生成',()=>{this.draft.slug=core.suggestSlug(this.draft.title,this.p.currentNote?.path);slug.value=this.draft.slug;this.invalidate();});
   this.outputPath=fields.createEl('p',{cls:'lp-muted lp-output-path'});this.updateOutputPath();this.field(fields,'摘要','description',true);
   new Setting(fields).setName('分类').addDropdown(input=>{input.selectEl.id='lp-category';input.selectEl.setAttribute('aria-label','分类');for(const [id,name] of Object.entries(NAMES))input.addOption(id,name);input.setValue(this.draft.category).onChange(value=>{this.draft.category=value;this.invalidate();});});
   this.field(fields,'标签（逗号分隔）','tags');this.field(fields,'发布日期','pubDate',false,'date');this.field(fields,'修订日期','updatedDate',false,'date');
   for(const [key,label] of [['featured','首页置顶'],['plainLinks','未公开笔记链接转为纯文字']])new Setting(fields).setName(label).addToggle(input=>{this.toggles.push(input);input.setValue(!!this.draft[key]).onChange(value=>{this.draft[key]=value;this.invalidate();});});
   const body=this.field(editor,'正文','body',true);body.addClass('lp-body-editor');
   const actions=editor.createDiv({cls:'lp-actions'});button(actions,'保存编辑稿',()=>this.saveDraft());button(actions,'预览',()=>this.preview());button(actions,this.target?'重新读取网页稿':'重新读取原笔记',async()=>{if(this.target){delete this.p.settings.drafts[this.draftKey()];await this.p.save();this.draft=null;await this.editArticle(this.target.slug);}else{this.draft.body=core.stripFrontmatter(await this.app.vault.read(this.p.currentNote)).trim();this.plan=null;await this.render();}});
   const publishRow=editor.createDiv({cls:'lp-actions'});this.publishButton=button(publishRow,this.target?'发布修改':'发布文章',()=>this.preview(),true);publishRow.createSpan({cls:'lp-muted',text:'点击后预览；确认后写入仓库并推送 GitHub。'});
  }else{this.publishButton=null;editor.createEl('h3',{text:'管理博客文章'});editor.createEl('p',{cls:'lp-muted',text:'在左侧选择文章进行修改或删除，或从 Obsidian 笔记创建新文章。'});button(editor,'使用当前笔记',async()=>{if(!this.p.lastNote)throw Error('请先打开一篇 Markdown 笔记。');await this.select(this.p.lastNote);});}
  const footer=editor.createDiv({cls:'lp-actions lp-footer'});button(footer,'检查环境',()=>this.inspect());button(footer,'重试推送',()=>this.retry());button(footer,'检查部署',()=>this.deployment());
  await this.refreshList();
 }
}
class Settings extends PluginSettingTab {
 constructor(app,plugin){super(app,plugin);this.p=plugin;}
 display(){const e=this.containerEl;e.empty();e.createEl('h2',{text:'网站管理'});e.createEl('p',{text:'管理 aurorasgod.github.io 的文章。Git 登录沿用本机配置，删除文章保留本地恢复副本。'});
  for(const [key,name,description] of [['repoPath','博客仓库目录','GitHub 克隆目录的绝对路径。'],['gitPath','Git 路径','macOS 通常为 /usr/bin/git。'],['nodePath','Node.js 路径','发布前用于构建验证。']])new Setting(e).setName(name).setDesc(description).addText(input=>input.setValue(this.p.settings[key]).onChange(async value=>{this.p.settings[key]=value.trim();await this.p.save();}));
  new Setting(e).setName('默认分类').addDropdown(input=>{for(const [id,name] of Object.entries(NAMES))input.addOption(id,name);input.setValue(this.p.settings.defaultCategory).onChange(async value=>{this.p.settings.defaultCategory=value;await this.p.save();});});
 }
}
class Publisher extends Plugin {
 async onload(){const saved=await this.loadData();this.settings={...DEFAULT,...saved,drafts:saved?.drafts||{},publications:saved?.publications||{}};this.currentNote=null;const active=this.app.workspace.getActiveFile();this.lastNote=active?.extension==='md'?active:null;this.registerView(VIEW,leaf=>new PublisherView(leaf,this));
  this.addRibbonIcon('globe','网站管理',()=>this.open());this.addCommand({id:'open',name:'打开网站管理',callback:()=>this.open()});this.addCommand({id:'publish-current',name:'从当前笔记创建文章',callback:()=>this.open(this.lastNote)});this.addSettingTab(new Settings(this.app,this));
  this.registerEvent(this.app.workspace.on('file-open',file=>{if(file?.extension==='md')this.lastNote=file;}));this.registerEvent(this.app.vault.on('rename',async(file,old)=>{for(const key of ['drafts','publications'])if(this.settings[key][old]){this.settings[key][file.path]=this.settings[key][old];delete this.settings[key][old];}await this.save();}));this.registerObsidianProtocolHandler('laplace-blog',()=>this.open());
 }
 async save(){await this.saveData(this.settings);}
 async open(file){let leaf=this.app.workspace.getLeavesOfType(VIEW)[0];if(!leaf){leaf=this.app.workspace.getLeaf('tab');await leaf.setViewState({type:VIEW,active:true});}await this.app.workspace.revealLeaf(leaf);if(file instanceof TFile&&file.extension==='md')await leaf.view.select(file);return leaf;}
 openURL(relative){require('electron').shell.openExternal(this.settings.siteURL.replace(/\/$/,'')+'/'+relative.replace(/^\//,''));}
 async createDraft(){if(!this.app.vault.getAbstractFileByPath('博客'))await this.app.vault.createFolder('博客');let name='博客/博客草稿.md',i=2;while(this.app.vault.getAbstractFileByPath(name))name=`博客/博客草稿 ${i++}.md`;const file=await this.app.vault.create(name,'---\ntype: blog\ntitle: ""\ndescription: ""\ncategory: '+this.settings.defaultCategory+'\nblog_slug: ""\ntags: []\n---\n\n');await this.app.workspace.getLeaf('tab').openFile(file);await this.open(file);}
 onunload(){this.app.workspace.detachLeavesOfType(VIEW);}
}
module.exports=Publisher;
module.exports._test={PublisherView,Preview,DeleteDialog,DEFAULT,core};
