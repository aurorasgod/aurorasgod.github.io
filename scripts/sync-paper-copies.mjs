import { readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const vault = process.argv[2];
if (!vault) throw new Error('Usage: node scripts/sync-paper-copies.mjs <Robotics vault>');
const manifestPath = resolve('src/data/papers.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
assert.equal(manifest.access, 'anonymous-view', 'Only approved public PDFs may be copied.');
const sourceRoot = resolve(vault, '附件', '论文');
const destinationRoot = resolve('public/papers');
for (const paper of manifest.papers) {
  assert.match(paper.localUrl, /^papers\/[a-z0-9-]+\.pdf$/);
  const source = resolve(sourceRoot, paper.folder, paper.fileName);
  const destination = resolve('public', paper.localUrl);
  assert.ok(source.startsWith(sourceRoot + sep) && destination.startsWith(destinationRoot + sep));
  assert.equal((await stat(source)).size, paper.bytes, `Local/cloud size differs: ${paper.fileName}`);
  const bytes = await readFile(source);
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', `Invalid PDF: ${paper.fileName}`);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
  paper.sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(createHash('sha256').update(await readFile(destination)).digest('hex'), paper.sha256);
  console.log(`Verified copy: ${paper.fileName}`);
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
