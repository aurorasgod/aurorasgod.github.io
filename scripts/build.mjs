import { spawnSync } from 'node:child_process';
import { rm, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
function run(args){const p=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});if(p.status!==0)process.exit(p.status||1);}
await rm('dist',{recursive:true,force:true});
run(['node_modules/astro/bin/astro.mjs','build','--outDir','.astro-static']);
async function pages(dir){return(await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?pages(join(dir,e.name)):e.name==='index.html'?[join(dir,e.name).replace(/^\.astro-static/,'').replace(/index\.html$/,'')]:[]))).flat();}
await writeFile('.astro-static/routes.json',JSON.stringify(await pages('.astro-static')));
run(['node_modules/vite/bin/vite.js','build']);
