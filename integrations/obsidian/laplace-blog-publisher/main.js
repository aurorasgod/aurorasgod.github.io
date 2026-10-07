'use strict';
const {Plugin,ItemView,PluginSettingTab,Setting,Notice,FuzzySuggestModal,Modal,MarkdownRenderer,Component,TFile}=require('obsidian');
const path=require('node:path');
const fs=require('node:fs/promises');
const core=require('./core.cjs');
const VIEW='laplace-blog-publisher';
const NAMES={'embodied-ai':'具身智能','power-electronics':'电力电子','personal':'个人经历'};
const DEFAULT={repoPath:'',gitPath:'/usr/bin/git',nodePath:'/usr/local/bin/node',siteURL:'https://aurorasgod.github.io',activityAPI:'https://field-notes-research.gptplus6267.chatgpt.site',defaultCategory:'embodied-ai',drafts:{},publications:{},pendingCommit:''};
const button=(parent,label,action,primary=false)=>{const el=parent.createEl('button',{text:label,cls:primary?'mod-cta':'',attr:{type:'button'}});el.onclick=()=>Promise.resolve().then(action).catch(error=>new Notice(error.message,10000));return el;};
const dateString=value=>value instanceof Date?value.toISOString().slice(0,10):String(value||'').slice(0,10);
class NotePicker extends FuzzySuggestModal {
 constructor(plugin,choose){super(plugin.app);this.p=plugin;this.choose=choose;this.setPlaceholder('搜索要发布的 Markdown 笔记');}
 getItems(){return this.app.vault.getMarkdownFiles().filter(f=>!/^模板\//.test(f.path));}
 getItemText(file){return file.path;}
 onChooseItem(file){this.choose(file);}
}
class Preview extends Modal {
 constructor(plugin,plan){super(plugin.app);this.p=plugin;this.plan=plan;this.renderComponent=new Component();}
 async onOpen(){
  this.modalEl.addClass('lp-preview-modal');this.titleEl.setText('发布预览');this.renderComponent.load();
  const e=this.contentEl,plan=this.plan;
  e.createEl('h2',{text:plan.meta.title});e.createEl('p',{cls:'lp-muted',text:`${NAMES[plan.meta.category]} · ${plan.meta.pubDate} · /blog/${plan.meta.slug}/`});
  const attachments=e.createDiv({cls:'lp-attachments'});attachments.createEl('h3',{text:`将公开 ${plan.assets.length} 个附件`});
  for(const asset of plan.assets)attachments.createEl('p',{text:`${asset.source} · ${(asset.data.length/1024).toFixed(1)} KB`});
  for(const warning of plan.warnings)e.createEl('p',{cls:'lp-warning',text:warning});
  for(const notice of plan.notices)e.createEl('p',{cls:'lp-muted',text:notice});
  e.createEl('p',{cls:'lp-muted',text:'仅展示转换后的发布稿；公式与代码在网站构建时再检查。'});
  const preview=e.createDiv({cls:'lp-preview markdown-rendered'});let markdown=plan.body;
  for(const asset of plan.assets)if(asset.resourceURL)markdown=markdown.split(asset.url).join(asset.resourceURL);
  await MarkdownRenderer.render(this.app,markdown,preview,this.p.currentNote?.path||'',this.renderComponent);
 }
 onClose(){this.renderComponent.unload();this.contentEl.empty();}
}
class PublisherView extends ItemView {
 constructor(leaf,plugin){super(leaf);this.p=plugin;this.plan=null;this.busy=false;this.expectedHash=null;}
 getViewType(){return VIEW;}
 getDisplayText(){return '博客发布';}
 getIcon(){return 'send';}
 async onOpen(){await this.render();}
 async select(file){
  if(this.busy)return;
  if(!(file instanceof TFile)||file.extension!=='md')throw Error('请选择 Markdown 笔记；PDF 可作为正文中明确引用的附件。');
  this.p.currentNote=file;const cached=this.p.settings.drafts[file.path],published=this.p.settings.publications[file.path];
  const fm=this.app.metadataCache.getFileCache(file)?.frontmatter||{};
  const source=await this.app.vault.read(file);
  this.draft=cached||{title:fm.title||file.basename,description:fm.description||'',slug:published?.slug||fm.blog_slug||'',category:NAMES[fm.category]?fm.category:this.p.settings.defaultCategory,tags:Array.isArray(fm.tags)?fm.tags.join(', '):'',pubDate:dateString(fm.pubDate)||core.today(),updatedDate:published?core.today():'',featured:false,plainLinks:false,body:core.stripFrontmatter(source).trim()};
  if(published){this.draft.pubDate=published.pubDate;this.draft.updatedDate=core.today();}
  this.plan=null;await this.render();
 }
 invalidate(){this.plan=null;if(this.review)this.review.checked=false;if(this.publishButton)this.publishButton.disabled=true;if(this.status)this.status.setText('修改后请重新预览。');}
 field(parent,label,key,multiline=false,type='text'){
  const wrap=parent.createDiv({cls:'lp-field'});wrap.createEl('label',{text:label,attr:{for:`lp-${key}`}});
  const input=wrap.createEl(multiline?'textarea':'input',{attr:{id:`lp-${key}`,type,spellcheck:'false'}});input.value=this.draft[key]||'';
  input.oninput=()=>{this.draft[key]=input.value;this.invalidate();};return input;
 }
 async prepare(){
  if(!this.p.currentNote||!this.draft)throw Error('请先选择一篇笔记。');
  const meta={...this.draft,tags:this.draft.tags.split(/[,，]/).map(s=>s.trim()).filter(Boolean)};
  const own=this.p.settings.publications[this.p.currentNote.path];
  const expected=await core.articleHash(this.p.settings.repoPath,meta.slug);
  if(expected&&own?.slug!==meta.slug)throw Error('这个文章地址已存在，请更换地址，避免覆盖其他文章。');
  const plan=await core.prepareArticle({text:this.draft.body,meta,notePath:this.p.currentNote.path,plainLinks:this.draft.plainLinks,
   resolveFile:async reference=>{let clean=reference.split('#')[0];const destination=this.app.metadataCache.getFirstLinkpathDest(clean,this.p.currentNote.path)||this.app.vault.getAbstractFileByPath(path.posix.normalize(path.posix.join(path.posix.dirname(this.p.currentNote.path),clean)));if(!(destination instanceof TFile))return null;return {path:destination.path,resourceURL:this.app.vault.getResourcePath(destination),read:async()=>Buffer.from(await this.app.vault.readBinary(destination))};},
   resolvePublished:async destination=>{const publication=this.p.settings.publications[destination];return publication?.state==='pushed'?publication:null;}
  });
  this.expectedHash=expected;return plan;
 }
 async saveDraft(){if(!this.p.currentNote)return;this.p.settings.drafts[this.p.currentNote.path]={...this.draft};await this.p.save();new Notice('发布稿已保存，原笔记未修改。');}
 async inspect(){
  const state=await core.repoState(this.p.settings.repoPath,this.p.settings.gitPath);
  await fs.access(path.join(state.root,'node_modules/astro/bin/astro.mjs'));
  this.status.setText(`环境可用 · main · ${state.status?'仓库有未提交修改，请先处理':'仓库干净'}`);
 }
 async preview(){
  this.plan=await this.prepare();this.review.checked=false;this.publishButton.disabled=true;
  this.status.setText(this.plan.warnings.length?`有 ${this.plan.warnings.length} 项需要处理，查看预览中的提示。`:`预览已生成 · ${this.plan.assets.length} 个附件 · 请确认内容可以公开。`);
  new Preview(this.p,this.plan).open();
 }
 async publish(){
  if(this.busy||!this.plan||!this.review.checked)throw Error('请先预览并勾选公开确认。');
  this.busy=true;this.publishButton.disabled=true;for(const b of this.actionButtons)b.disabled=true;
  const original=this.plan,sourcePath=this.p.currentNote.path;
  try {
   const latest=await this.prepare();if(latest.signature!==original.signature)throw Error('正文或附件已变化，请重新预览。');
   await this.saveDraft();
   const result=await core.publishArticle({repo:this.p.settings.repoPath,plan:latest,git:this.p.settings.gitPath,expectedArticleHash:this.expectedHash,
    build:async root=>{await fs.access(path.join(root,'node_modules/astro/bin/astro.mjs'));await core.run(this.p.settings.nodePath,[path.join(root,'node_modules/astro/bin/astro.mjs'),'build'],root,{env:{SITE_URL:this.p.settings.siteURL,BASE_PATH:'/',PUBLIC_ACTIVITY_API:this.p.settings.activityAPI,PATH:path.dirname(this.p.settings.nodePath)+path.delimiter+(process.env.PATH||'')}});},
    onProgress:message=>this.status.setText(message+'…'),
    onCommitted:async commit=>{this.p.settings.pendingCommit=commit;this.p.settings.publications[sourcePath]={slug:latest.meta.slug,title:latest.meta.title,pubDate:latest.meta.pubDate,updatedDate:latest.meta.updatedDate,state:'pending-push',commit};await this.p.save();}
   });
   if(result.status==='pending-push'){this.status.setText('文章已提交，推送失败。点击“重试推送”；无需重复发布。');new Notice(result.error,10000);}
   else if(result.status==='pushed'){this.p.settings.pendingCommit='';this.p.settings.publications[sourcePath].state='pushed';await this.p.save();this.status.setText('已推送到 GitHub。网站正在自动部署，可用“检查部署”查看结果。');new Notice('文章已推送，等待 GitHub Pages 部署。');}
   else this.status.setText('文章与附件没有变化，无需重复提交。');
   this.plan=null;this.review.checked=false;this.updatePublicationList();
  } catch(error){this.status.setText(error.message);throw error;}
  finally{this.busy=false;for(const b of this.actionButtons)b.disabled=false;}
 }
 async retry(){if(!this.p.settings.pendingCommit)throw Error('没有待重试的提交。');this.status.setText('正在重试推送…');const commit=this.p.settings.pendingCommit;await core.retryPush({repo:this.p.settings.repoPath,commit,git:this.p.settings.gitPath});for(const record of Object.values(this.p.settings.publications))if(record.commit===commit)record.state='pushed';this.p.settings.pendingCommit='';await this.p.save();this.status.setText('推送成功，GitHub Pages 正在部署。');this.updatePublicationList();}
 async deployment(){
  const publication=this.p.currentNote&&this.p.settings.publications[this.p.currentNote.path];
  if(!publication?.commit)throw Error('请先发布文章，再检查部署。');
  const {requestUrl}=require('obsidian');
  const response=await requestUrl({url:`https://api.github.com/repos/aurorasgod/aurorasgod.github.io/actions/runs?head_sha=${publication.commit}&per_page=10`,headers:{Accept:'application/vnd.github+json'}});
  const run=response.json.workflow_runs?.find(r=>r.name==='Publish personal site');
  if(!run){this.status.setText('GitHub 尚未创建部署任务，稍后再检查。');return;}
  this.status.setText(run.status==='completed'?(run.conclusion==='success'?'部署成功，文章已上线。':`部署未成功：${run.conclusion}，请查看 GitHub Actions。`):'GitHub 正在构建并部署文章。');
 }
 updatePublicationList(){
  if(!this.publicationList)return;this.publicationList.empty();const records=Object.entries(this.p.settings.publications);
  if(!records.length){this.publicationList.createEl('p',{cls:'lp-muted',text:'尚未通过此插件发布文章。'});return;}
  for(const [source,record] of records){const row=this.publicationList.createDiv({cls:'lp-publication'});row.createEl('strong',{text:record.title});row.createEl('p',{cls:'lp-muted',text:`${source} · ${record.state==='pushed'?'已推送':'待推送'}`});const actions=row.createDiv({cls:'lp-actions'});button(actions,'编辑发布稿',async()=>{const f=this.app.vault.getAbstractFileByPath(source);if(f instanceof TFile)await this.select(f);else throw Error('原笔记已移动，请重新选择笔记。');});button(actions,'查看网页',()=>this.p.openURL(`/blog/${record.slug}/`));}
 }
 async render(){
  const e=this.contentEl;e.empty();e.addClass('lp-publisher');
  const heading=e.createDiv({cls:'lp-heading'});heading.createEl('h2',{text:'博客发布'});heading.createEl('p',{cls:'lp-muted',text:'选笔记 → 编辑发布稿 → 预览 → 发布'});
  const targets=e.createDiv({cls:'lp-target'});targets.createEl('span',{text:'目标：aurorasgod.github.io'});targets.createEl('small',{text:this.p.settings.repoPath||'请在插件设置中选择博客仓库目录'});
  const actions=e.createDiv({cls:'lp-actions'});button(actions,'选择笔记',()=>new NotePicker(this.p,f=>this.select(f)).open());button(actions,'使用当前笔记',async()=>{const file=this.p.lastNote;if(!file)throw Error('先在 Obsidian 打开一篇笔记。');await this.select(file);});button(actions,'新建博客草稿',()=>this.p.createDraft());button(actions,'插件设置',()=>{this.app.setting.open();this.app.setting.openTabById(this.p.manifest.id);});
  if(this.p.currentNote&&!this.draft)return this.select(this.p.currentNote);
  if(this.draft){
   e.createEl('p',{cls:'lp-source',text:'来源：'+this.p.currentNote.path});
   const fields=e.createDiv({cls:'lp-fields'});this.field(fields,'文章标题','title');this.field(fields,'文章地址（如 my-first-post）','slug');this.field(fields,'摘要','description',true);
   const category=fields.createDiv({cls:'lp-field'});category.createEl('label',{text:'分类',attr:{for:'lp-category'}});const select=category.createEl('select',{attr:{id:'lp-category'}});for(const [id,name] of Object.entries(NAMES))select.createEl('option',{text:name,value:id});select.value=this.draft.category;select.onchange=()=>{this.draft.category=select.value;this.invalidate();};
   this.field(fields,'标签（逗号分隔）','tags');this.field(fields,'发布日期','pubDate',false,'date');this.field(fields,'修订日期（可留空）','updatedDate',false,'date');
   const options=e.createDiv({cls:'lp-options'});for(const [key,label] of [['featured','首页置顶'],['plainLinks','未公开笔记的链接转为纯文字（不复制笔记内容）']]){const wrapper=options.createEl('label');const checkbox=wrapper.createEl('input',{type:'checkbox'});checkbox.checked=Boolean(this.draft[key]);wrapper.createSpan({text:label});checkbox.onchange=()=>{this.draft[key]=checkbox.checked;this.invalidate();};}
   const editor=this.field(e,'正文（发布稿；原笔记不会被修改）','body',true);editor.addClass('lp-body-editor');
   const tools=e.createDiv({cls:'lp-actions'});this.actionButtons=[button(tools,'保存发布稿',()=>this.saveDraft()),button(tools,'预览文章与附件',()=>this.preview(),true),button(tools,'检查发布环境',()=>this.inspect()),button(tools,'重新读取原笔记',async()=>{this.draft.body=core.stripFrontmatter(await this.app.vault.read(this.p.currentNote)).trim();this.plan=null;await this.render();})];
   this.status=e.createEl('p',{cls:'lp-status',text:'发布前请检查正文、链接与附件。',attr:{role:'status','aria-live':'polite'}});
   const confirm=e.createEl('label',{cls:'lp-confirm'});this.review=confirm.createEl('input',{type:'checkbox'});confirm.createSpan({text:'我已检查预览及附件，同意将这篇文章公开到博客。'});
   const publishRow=e.createDiv({cls:'lp-actions'});this.publishButton=button(publishRow,'发布到 GitHub',()=>this.publish(),true);this.publishButton.disabled=true;this.review.onchange=()=>this.publishButton.disabled=!this.review.checked||!this.plan||this.plan.warnings.length>0||this.busy;
   this.actionButtons.push(button(publishRow,'重试推送',()=>this.retry()),button(publishRow,'检查部署',()=>this.deployment()),button(publishRow,'打开博客',()=>this.p.openURL('')));
  } else e.createEl('p',{cls:'lp-empty',text:'选择一篇笔记，或新建博客草稿。'});
  e.createEl('h3',{cls:'lp-records-heading',text:'发布记录'});this.publicationList=e.createDiv();this.updatePublicationList();
 }
}
class Settings extends PluginSettingTab {
 constructor(app,plugin){super(app,plugin);this.p=plugin;}
 display(){const e=this.containerEl;e.empty();e.createEl('h2',{text:'博客发布设置'});e.createEl('p',{text:'发布到 aurorasgod.github.io。只会提交选中文章与对应附件；Git 登录沿用本机现有配置。'});
  for(const [key,name,description] of [['repoPath','博客仓库目录','填写 GitHub 克隆目录的绝对路径。'],['gitPath','Git 路径','macOS 通常为 /usr/bin/git。'],['nodePath','Node.js 路径','用于发布前构建验证，需要 Node.js 24。']])new Setting(e).setName(name).setDesc(description).addText(input=>input.setValue(this.p.settings[key]).onChange(async value=>{this.p.settings[key]=value.trim();await this.p.save();}));
  new Setting(e).setName('默认分类').addDropdown(input=>{for(const [id,name] of Object.entries(NAMES))input.addOption(id,name);input.setValue(this.p.settings.defaultCategory).onChange(async value=>{this.p.settings.defaultCategory=value;await this.p.save();});});
 }
}
class Publisher extends Plugin {
 async onload(){this.settings={...DEFAULT,...await this.loadData()};this.currentNote=null;const active=this.app.workspace.getActiveFile();this.lastNote=active?.extension==='md'?active:null;this.registerView(VIEW,leaf=>new PublisherView(leaf,this));
  this.addRibbonIcon('send','博客发布',()=>this.open());this.addCommand({id:'open',name:'打开博客发布',callback:()=>this.open()});this.addCommand({id:'publish-current',name:'编辑当前笔记的发布稿',callback:()=>this.open(this.lastNote)});this.addSettingTab(new Settings(this.app,this));
  this.registerEvent(this.app.workspace.on('file-open',file=>{if(file?.extension==='md')this.lastNote=file;}));
  this.registerEvent(this.app.vault.on('rename',async(file,old)=>{for(const key of ['drafts','publications'])if(this.settings[key][old]){this.settings[key][file.path]=this.settings[key][old];delete this.settings[key][old];}await this.save();}));
  this.registerObsidianProtocolHandler('laplace-blog',()=>this.open());
 }
 async save(){await this.saveData(this.settings);}
 async open(file){let leaf=this.app.workspace.getLeavesOfType(VIEW)[0];if(!leaf){leaf=this.app.workspace.getLeaf('tab');await leaf.setViewState({type:VIEW,active:true});}await this.app.workspace.revealLeaf(leaf);if(file instanceof TFile&&file.extension==='md')await leaf.view.select(file);return leaf;}
 openURL(relative){const {shell}=require('electron');shell.openExternal(this.settings.siteURL.replace(/\/$/,'')+'/'+relative.replace(/^\//,''));}
 async createDraft(){if(!this.app.vault.getAbstractFileByPath('博客'))await this.app.vault.createFolder('博客');let name='博客/博客草稿.md',i=2;while(this.app.vault.getAbstractFileByPath(name))name=`博客/博客草稿 ${i++}.md`;const file=await this.app.vault.create(name,'---\ntype: blog\ntitle: ""\ndescription: ""\ncategory: '+this.settings.defaultCategory+'\nblog_slug: ""\ntags: []\n---\n\n');await this.app.workspace.getLeaf('tab').openFile(file);new Notice('草稿已创建。写好正文后，点击“发布文章”。');}
 onunload(){this.app.workspace.detachLeavesOfType(VIEW);}
}
module.exports=Publisher;
module.exports._test={PublisherView,Preview,DEFAULT};
