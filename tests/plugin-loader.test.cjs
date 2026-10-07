'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
const code=fs.readFileSync(path.join(__dirname,'../integrations/obsidian/laplace-blog-publisher/main.js'),'utf8');
test('The installed bundle loads under application-rooted require and registers the native view/commands/settings',async()=>{
 class Base{};
 class Plugin{async loadData(){return {drafts:{old:{title:'Saved draft'}},publications:{}};}registerView(type,create){this.viewType=type;this.create=create;}addRibbonIcon(){}addCommand(command){(this.commands??=[]).push(command);}addSettingTab(){}registerEvent(){}registerObsidianProtocolHandler(){}}
 const api=new Proxy({Plugin},{get:(obj,key)=>obj[key]||Base});const appRequire=createRequire('/Applications/Obsidian.app/Contents/Resources/app.asar/main.js');
 const context={require:id=>id==='obsidian'?api:appRequire(id),module:{exports:{}},Buffer,process,console};vm.runInNewContext(code,context);
 assert.equal(typeof context.module.exports,'function');assert.ok(!/require\(['"]\.\.?\//.test(code));
 const plugin=new context.module.exports();plugin.app={workspace:{getActiveFile:()=>({extension:'pdf'}),on:()=>({})},vault:{on:()=>({})}};await plugin.onload();assert.equal(plugin.viewType,'laplace-blog-publisher');assert.equal(plugin.lastNote,null);assert.equal(plugin.commands.length,2);assert.equal(plugin.settings.drafts.old.title,'Saved draft');
});
test('View rejects a file path as a web identifier before accessing the filesystem and migrates old note drafts',async()=>{
 class Base{};class TFile{constructor(file){this.path=file;this.extension='md';this.basename='我的笔记';}}
 class ItemView{constructor(leaf){this.app=leaf.app;}}
 const api=new Proxy({TFile,ItemView},{get:(obj,key)=>obj[key]||Base});
 const context={require:id=>id==='obsidian'?api:require(id),module:{exports:{}},Buffer,process,console,Date,Intl};vm.runInNewContext(code,context);
 const {PublisherView,DEFAULT}=context.module.exports._test,app={metadataCache:{getFileCache:()=>({frontmatter:{}})},vault:{read:async()=> '我的正文'}};
 const plugin={app,settings:{...DEFAULT,repoPath:'/path/that/does/not/exist',drafts:{},publications:{}},save:async()=>{}};
 const view=new PublisherView({app},plugin);view.draft={title:'标题',description:'摘要',slug:'/Users/example/note.md',category:'personal',tags:'',pubDate:'2026-01-01',body:'正文'};
 await assert.rejects(view.prepare(),/网页标识.*不用填写文件路径/);
 const file=new TFile('博客/我的笔记.md');plugin.settings.drafts[file.path]={...view.draft};view.render=async()=>{};await view.select(file);
 assert.match(view.draft.slug,/^post-[a-f0-9]{8}$/);assert.equal(view.draft.body,'正文');assert.equal(view.draft.description,'摘要');
});
