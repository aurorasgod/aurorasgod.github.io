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
