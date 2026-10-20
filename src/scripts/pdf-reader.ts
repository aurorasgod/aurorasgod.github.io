import { onPageLoad } from './page-lifecycle';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

onPageLoad(({ signal, cleanup }) => {
  const root = document.querySelector<HTMLElement>('[data-pdf-reader]');
  if (!root) return;
  const container = root.querySelector<HTMLDivElement>('[data-pdf-scroll]')!;
  const pages = root.querySelector<HTMLDivElement>('[data-pdf-pages]')!;
  const status = root.querySelector<HTMLElement>('[data-pdf-status]')!;
  const statusText = root.querySelector<HTMLElement>('[data-pdf-status-text]')!;
  const retry = root.querySelector<HTMLButtonElement>('[data-pdf-retry]')!;
  const previous = root.querySelector<HTMLButtonElement>('[data-pdf-prev]')!;
  const next = root.querySelector<HTMLButtonElement>('[data-pdf-next]')!;
  const pageNumber = root.querySelector<HTMLInputElement>('[data-pdf-page]')!;
  const total = root.querySelector<HTMLElement>('[data-pdf-total]')!;
  const zoom = root.querySelector<HTMLSelectElement>('[data-pdf-zoom]')!;
  const rotate = root.querySelector<HTMLButtonElement>('[data-pdf-rotate]')!;
  const find = root.querySelector<HTMLElement>('[data-pdf-find]')!;
  const query = root.querySelector<HTMLInputElement>('[data-pdf-query]')!;
  const findToggle = root.querySelector<HTMLButtonElement>('[data-pdf-find-toggle]')!;
  const matches = root.querySelector<HTMLElement>('[data-pdf-matches]')!;
  const fullscreen = root.querySelector<HTMLButtonElement>('[data-pdf-fullscreen]')!;

  void (async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const { PDFViewer, PDFLinkService, PDFFindController, EventBus } = await import('pdfjs-dist/legacy/web/pdf_viewer.mjs');
    if (signal.aborted) return;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const eventBus = new EventBus();
    const linkService = new PDFLinkService({ eventBus, externalLinkTarget: 2, externalLinkRel: 'noopener noreferrer' });
    const findController = new PDFFindController({ eventBus, linkService });
    const viewerOptions = { container, viewer: pages, eventBus, linkService, findController, maxCanvasPixels: 8_000_000, annotationMode: 1, abortSignal: signal };
    const viewer = new PDFViewer(viewerOptions);
    linkService.setViewer(viewer);
    let task: ReturnType<typeof pdfjs.getDocument> | undefined;
    let generation = 0;
    const updatePage = () => {
      pageNumber.value = String(viewer.currentPageNumber);
      previous.disabled = viewer.currentPageNumber <= 1;
      next.disabled = viewer.currentPageNumber >= viewer.pagesCount;
    };
    eventBus.on('pagesinit', () => {
      viewer.currentScaleValue = zoom.value;
      const initialPage = Number(new URLSearchParams(location.hash.slice(1)).get('page'));
      if (initialPage >= 1 && initialPage <= viewer.pagesCount) viewer.currentPageNumber = initialPage;
      updatePage();
    });
    eventBus.on('pagechanging', updatePage);
    eventBus.on('pagerendered', ({ error }: { error?: unknown }) => {
      if (error) { status.hidden = false; statusText.textContent = '页面渲染失败，可下载 PDF 阅读'; retry.hidden = false; return; }
      status.hidden = true;
      root.dataset.pdfState = 'ready';
    });
    eventBus.on('updatefindmatchescount', ({ matchesCount }: { matchesCount: { current: number; total: number } }) => { matches.textContent = `${matchesCount.current} / ${matchesCount.total}`; });
    eventBus.on('updatefindcontrolstate', ({ state }: { state: number }) => { if (state === 1) matches.textContent = '未找到'; });
    async function load() {
      const current = ++generation;
      status.hidden = false;
      retry.hidden = true;
      statusText.textContent = '正在加载 PDF…';
      root!.dataset.pdfState = 'loading';
      await task?.destroy();
      if (signal.aborted) return;
      viewer.setDocument(null);
      task = pdfjs.getDocument({ url: root!.dataset.pdfSrc, cMapUrl: `${root!.dataset.pdfAssets}cmaps/`, cMapPacked: true, standardFontDataUrl: `${root!.dataset.pdfAssets}standard_fonts/`, wasmUrl: `${root!.dataset.pdfAssets}wasm/`, disableAutoFetch: true, disableStream: true });
      task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => { if (total > 0 && !signal.aborted) statusText.textContent = `正在加载 PDF · ${Math.min(100, Math.round(loaded / total * 100))}%`; };
      try {
        const document = await task.promise;
        if (signal.aborted || generation !== current) return;
        viewer.setDocument(document);
        linkService.setDocument(document);
        total.textContent = `/ ${document.numPages}`;
        pageNumber.max = String(document.numPages);
        pageNumber.disabled = zoom.disabled = rotate.disabled = false;
      } catch {
        if (signal.aborted || generation !== current) return;
        root!.dataset.pdfState = 'error';
        statusText.textContent = 'PDF 加载失败';
        retry.hidden = false;
      }
    }
    previous.addEventListener('click', () => { viewer.currentPageNumber--; });
    next.addEventListener('click', () => { viewer.currentPageNumber++; });
    pageNumber.addEventListener('change', () => { viewer.currentPageNumber = Math.max(1, Math.min(viewer.pagesCount, Number(pageNumber.value) || 1)); updatePage(); });
    zoom.addEventListener('change', () => { viewer.currentScaleValue = zoom.value; });
    rotate.addEventListener('click', () => { viewer.pagesRotation = (viewer.pagesRotation + 90) % 360; });
    const search = (again = false, backwards = false) => eventBus.dispatch('find', { source: root, type: again ? 'again' : '', query: query.value, phraseSearch: true, caseSensitive: false, entireWord: false, highlightAll: true, findPrevious: backwards, matchDiacritics: false });
    const closeFind = () => { find.hidden = true; findToggle.setAttribute('aria-expanded', 'false'); eventBus.dispatch('findbarclose', { source: root }); findToggle.focus(); };
    findToggle.addEventListener('click', () => { if (!find.hidden) { closeFind(); return; } find.hidden = false; findToggle.setAttribute('aria-expanded', 'true'); query.focus(); });
    query.addEventListener('input', () => search());
    query.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); search(true, event.shiftKey); } else if (event.key === 'Escape') closeFind(); });
    root.querySelector('[data-pdf-find-next]')?.addEventListener('click', () => search(true));
    root.querySelector('[data-pdf-find-prev]')?.addEventListener('click', () => search(true, true));
    root.querySelector('[data-pdf-find-close]')?.addEventListener('click', closeFind);
    fullscreen.disabled = !root.requestFullscreen;
    fullscreen.addEventListener('click', () => { const promise = window.document.fullscreenElement ? window.document.exitFullscreen() : root.requestFullscreen(); void promise.catch(() => {}); });
    retry.addEventListener('click', () => { void load(); });
    const resize = new ResizeObserver(() => { if (viewer.pagesCount && ['page-width', 'page-fit'].includes(zoom.value)) viewer.currentScaleValue = zoom.value; });
    resize.observe(container);
    cleanup(() => { generation++; resize.disconnect(); viewer.setDocument(null); linkService.setDocument(null); void task?.destroy(); });
    await load();
  })().catch(() => { if (!signal.aborted) { root.dataset.pdfState = 'error'; statusText.textContent = '阅读器加载失败，可下载 PDF 阅读'; } });
});
