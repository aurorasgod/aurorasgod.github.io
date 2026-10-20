type PageScope = { signal: AbortSignal; cleanup: (callback: () => void) => void };

// Modules run once with ClientRouter; DOM bindings belong to each page visit.
export function onPageLoad(setup: (scope: PageScope) => void) {
  let body: HTMLElement | undefined;
  let controller: AbortController | undefined;
  let cleanups: (() => void)[] = [];
  const dispose = () => {
    controller?.abort();
    cleanups.splice(0).forEach(cleanup => cleanup());
    body = undefined;
  };
  const initialize = () => {
    if (body === document.body) return;
    dispose();
    body = document.body;
    controller = new AbortController();
    setup({ signal: controller.signal, cleanup: callback => cleanups.push(callback) });
  };
  document.addEventListener('astro:before-swap', dispose);
  document.addEventListener('astro:page-load', initialize);
  initialize();
  if (import.meta.hot) import.meta.hot.dispose(() => {
    dispose();
    document.removeEventListener('astro:before-swap', dispose);
    document.removeEventListener('astro:page-load', initialize);
  });
}
