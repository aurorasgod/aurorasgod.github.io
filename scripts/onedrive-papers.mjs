import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const [vaultPath, outputPath = 'output/cloud/papers.json'] = process.argv.slice(2);
if (!vaultPath) throw new Error('Usage: node scripts/onedrive-papers.mjs <Obsidian vault> [output.json]');
const raw = JSON.parse(await readFile(resolve(vaultPath, '.obsidian/plugins/remotely-save/data.json'), 'utf8'));
const settings = raw.d ? JSON.parse(Buffer.from([...raw.d].reverse().join(''), 'base64url').toString('utf8')) : raw;
if (settings.serviceType !== 'onedrive' || !settings.onedrive?.accessToken) throw new Error('This vault has no connected OneDrive account.');
if (settings.password) throw new Error('Encrypted sync files cannot be used as browser-readable PDFs.');
const token = settings.onedrive.accessToken;
const graph = 'https://graph.microsoft.com/v1.0/';

async function get(path) {
  const endpoint = new URL(path, graph);
  if (endpoint.origin !== 'https://graph.microsoft.com') throw new Error('Unexpected Graph host.');
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`OneDrive request failed (${response.status}). Reconnect Remotely Save if authentication expired.`);
  return response.json();
}

async function children(id) {
  let page = `me/drive/items/${encodeURIComponent(id)}/children?$select=id,name,folder,file,webUrl,size&$top=200`;
  const items = [];
  while (page) {
    const result = await get(page);
    items.push(...(result.value || []));
    page = result['@odata.nextLink'];
  }
  return items;
}

const root = await get('me/drive/special/approot?$select=id,name');
const vaultName = settings.onedrive.remoteBaseDir || basename(resolve(vaultPath));
let folder = root;
for (const name of [vaultName, '附件', '论文']) {
  folder = (await children(folder.id)).find(item => item.folder && item.name === name);
  if (!folder) throw new Error(`The cloud paper folder is missing: ${vaultName}/附件/论文`);
}

const papers = [];
async function walk(id, relative = '') {
  for (const item of await children(id)) {
    if (item.folder) await walk(item.id, `${relative}${item.name}/`);
    else if (item.file && /\.pdf$/i.test(item.name)) {
      const link = new URL(item.webUrl);
      if (link.protocol !== 'https:') throw new Error('Unexpected file link protocol.');
      papers.push({ id: item.id, title: item.name.replace(/\.pdf$/i, '').replaceAll('_', ' '), fileName: item.name, folder: relative.replace(/\/$/, ''), vault: vaultName, url: link.href, bytes: item.size });
    }
  }
}
await walk(folder.id);
papers.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
const destination = resolve(outputPath);
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, JSON.stringify({ provider: 'OneDrive', access: 'existing-permissions', papers }, null, 2) + '\n');
console.log(`Resolved ${papers.length} PDF references from ${vaultName}. No sharing permissions were changed.`);
