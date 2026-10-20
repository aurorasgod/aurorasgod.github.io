import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const script = fileURLToPath(new URL('../scripts/onedrive-papers.mjs', import.meta.url));
test('Refreshing shared PDFs preserves approved links and does not add unapproved files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'laplace-papers-'));
  try {
    const vault = join(root, 'Robotics');
    const config = join(vault, '.obsidian/plugins/remotely-save');
    await mkdir(config, { recursive: true });
    await writeFile(join(config, 'data.json'), JSON.stringify({ serviceType: 'onedrive', onedrive: { accessToken: 'test-token' } }));
    const output = join(root, 'papers.json');
    const shared = 'https://1drv.ms/b/approved-test-link';
    await writeFile(output, JSON.stringify({ provider: 'OneDrive', access: 'anonymous-view', papers: [{ id: 'approved', url: shared, slug: 'approved', localUrl: 'papers/approved.pdf', sha256: 'fixture-hash' }] }));
    const loader = join(root, 'mock-graph.mjs');
    await writeFile(loader, `
      import assert from 'node:assert/strict';
      const folders = {root:[{id:'vault',name:'Robotics',folder:{}}],vault:[{id:'attachments',name:'附件',folder:{}}],attachments:[{id:'papers',name:'论文',folder:{}}],papers:[
        {id:'approved',name:'Approved.pdf',file:{},webUrl:'https://onedrive.live.com/private-approved',size:123},
        {id:'unapproved',name:'Unapproved.pdf',file:{},webUrl:'https://onedrive.live.com/private-unapproved',size:456},
        {id:'note',name:'Private.md',file:{},webUrl:'https://onedrive.live.com/private-note',size:789}
      ]};
      globalThis.fetch = async (address, options) => {
        const url = new URL(address);
        assert.equal(url.origin,'https://graph.microsoft.com');
        assert.ok(!options.method || options.method === 'GET');
        if(url.pathname.endsWith('/approot'))return Response.json({id:'root',name:'App'});
        const id = url.pathname.split('/').at(-2);
        assert.ok(folders[id], 'Unexpected Graph request');
        return Response.json({value:folders[id]});
      };
    `);
    await run(process.execPath, ['--import', pathToFileURL(loader).href, script, vault, output]);
    const result = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(result.access, 'anonymous-view');
    assert.equal(result.papers.length, 1);
    assert.equal(result.papers[0].id, 'approved');
    assert.equal(result.papers[0].url, shared);
    assert.equal(result.papers[0].bytes, 123);
    assert.equal(result.papers[0].localUrl, 'papers/approved.pdf');
    assert.equal(result.papers[0].slug, 'approved');
    assert.equal(result.papers[0].sha256, 'fixture-hash');
  } finally {
    assert.ok(root.startsWith(join(tmpdir(), 'laplace-papers-')));
    await rm(root, { recursive: true, force: true });
  }
});
