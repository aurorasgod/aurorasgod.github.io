// Cache only the five public, static navigation pages for this tab's current visit.
const paths = new Set([...document.querySelectorAll<HTMLAnchorElement>('[data-nav-id]')].map(link => new URL(link.href).pathname));
const pages = new Map<string, { document: Document; expires: number }>();
const pending = new Map<string, Promise<Document | undefined>>();
const resources = new Map<string, Promise<boolean>>();
const lifetime = 60_000;
function keyFor(url: URL) {
  return url.origin === location.origin && !url.search && paths.has(url.pathname) ? url.origin + url.pathname : undefined;
}
function cached(key: string) {
  const entry = pages.get(key);
  if (entry && entry.expires > Date.now()) return entry.document;
  pages.delete(key);
}
function preload(href: string, module: boolean) {
  const address = new URL(href, location.origin).href;
  const previous = resources.get(address);
  if (previous) return previous;
  const loaded = new Promise<boolean>(resolve => {
    const link = document.createElement('link');
    link.rel = module ? 'modulepreload' : 'preload';
    if (!module) link.as = 'style';
    link.href = address;
    const finish = (ok: boolean) => { clearTimeout(timer); if (!ok) resources.delete(address); resolve(ok); };
    const timer = setTimeout(() => finish(false), 6000);
    link.addEventListener('load', () => finish(true), { once: true });
    link.addEventListener('error', () => finish(false), { once: true });
    document.head.append(link);
  });
  resources.set(address, loaded);
  return loaded;
}
async function warm(key: string): Promise<Document | undefined> {
  const ready = cached(key);
  if (ready) return ready;
  if (pending.has(key)) return pending.get(key);
  const request = (async () => {
    try {
      const response = await fetch(key, { signal: AbortSignal.timeout(6000) });
      if (!response.ok || response.redirected || !response.headers.get('content-type')?.includes('text/html')) return;
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (!doc.querySelector('[name="astro-view-transitions-enabled"]') || doc.querySelector('astro-island[client="only"]')) return;
      doc.querySelectorAll('noscript').forEach(node => node.remove());
      doc.querySelectorAll<HTMLScriptElement>('script[type=module][src]').forEach(script => { void preload(script.getAttribute('src')!, true); });
      const styles = await Promise.all([...doc.querySelectorAll<HTMLLinkElement>('link[rel=stylesheet]')].map(link => preload(link.getAttribute('href')!, false)));
      if (!styles.every(Boolean)) return;
      pages.set(key, { document: doc, expires: Date.now() + lifetime });
      return doc;
    } catch { return; }
    finally { pending.delete(key); }
  })();
  pending.set(key, request);
  return request;
}
document.addEventListener('astro:before-preparation', event => {
  const key = keyFor(event.to);
  if (!key || event.formData || import.meta.env.DEV) return;
  const original = event.loader;
  event.loader = async () => {
    // Reuse prepared HTML through Astro's loader hook; Astro still owns routing and history.
    const doc = cached(key) || await pending.get(key);
    if (event.signal.aborted) return;
    if (doc) { event.newDocument = doc.cloneNode(true) as Document; return; }
    await original();
    if (!event.defaultPrevented && !event.signal.aborted && keyFor(event.to) === key) {
      pages.set(key, { document: event.newDocument.cloneNode(true) as Document, expires: Date.now() + lifetime });
    }
  };
});
function canWarm() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !import.meta.env.DEV && !connection?.saveData && !/(^|-)2g$/.test(connection?.effectiveType || '');
}
const warmIntent = (event: Event) => {
  if (!canWarm() || !(event.target instanceof Element)) return;
  const link = event.target.closest<HTMLAnchorElement>('a[data-nav-id]');
  if (!link) return;
  const address = new URL(link.href);
  const key = keyFor(address);
  if (key && address.pathname !== location.pathname) void warm(key);
};
document.addEventListener('pointerover', warmIntent, { passive: true });
document.addEventListener('touchstart', warmIntent, { passive: true });
document.addEventListener('focusin', warmIntent);

let loadingTimer: ReturnType<typeof setTimeout>;
function finishLoading() {
  clearTimeout(loadingTimer);
  document.querySelector('[data-site-header]')?.removeAttribute('data-loading');
}
document.addEventListener('astro:before-preparation', event => {
  finishLoading();
  loadingTimer = setTimeout(() => document.querySelector('[data-site-header]')?.setAttribute('data-loading', 'true'), 180);
  event.signal.addEventListener('abort', finishLoading, { once: true });
});
document.addEventListener('astro:after-swap', finishLoading);
document.addEventListener('astro:page-load', finishLoading);
