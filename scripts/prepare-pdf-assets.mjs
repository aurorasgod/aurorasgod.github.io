import { cp, mkdir } from 'node:fs/promises';
const target = new URL('../public/vendor/pdfjs/', import.meta.url);
const source = new URL('../node_modules/pdfjs-dist/', import.meta.url);
await mkdir(target, { recursive: true });
for (const directory of ['cmaps', 'standard_fonts', 'wasm']) {
  await cp(new URL(directory, source), new URL(directory, target), { recursive: true });
}
await cp(new URL('LICENSE', source), new URL('LICENSE', target));
