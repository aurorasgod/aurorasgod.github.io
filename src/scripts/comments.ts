import { comments, discussionMetadata } from '../lib/comments';

const section = document.querySelector<HTMLElement>('[data-comments]');
if (section) {
  const mount = section.querySelector<HTMLElement>('[data-comments-mount]')!;
  const status = section.querySelector<HTMLElement>('[data-comments-status]')!;
  const statusText = section.querySelector<HTMLElement>('[data-comments-status-text]')!;
  const retry = section.querySelector<HTMLButtonElement>('[data-comments-retry]')!;
  const count = section.querySelector<HTMLElement>('[data-comments-count]')!;
  const link = section.querySelector<HTMLAnchorElement>('[data-discussion-link]')!;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let started = false;
  let lastTheme = '';
  let serviceFailed = false;

  function themeUrl() {
    const mode = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    return new URL(`${section!.dataset.themeBase}${mode}.css`, location.origin).href;
  }
  function syncTheme() {
    const frame = mount.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
    const theme = themeUrl();
    if (!frame?.contentWindow || lastTheme === theme) return;
    frame.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, comments.origin);
    lastTheme = theme;
  }
  function ready() {
    clearTimeout(timer);
    section!.dataset.state = 'ready';
    status.hidden = true;
    retry.hidden = true;
  }
  function fail(message: string) {
    serviceFailed = true;
    clearTimeout(timer);
    section!.dataset.state = 'error';
    statusText.textContent = message;
    status.hidden = false;
    retry.hidden = false;
    mount.hidden = true;
  }
  function load() {
    started = true;
    lastTheme = '';
    serviceFailed = false;
    clearTimeout(timer);
    mount.hidden = false;
    status.hidden = false;
    retry.hidden = true;
    statusText.textContent = '正在加载评论…';
    section!.dataset.state = 'loading';
    timer = setTimeout(() => {
      section!.dataset.state = 'slow';
      statusText.textContent = '评论加载较慢，可以重试或在 GitHub 中查看。';
      status.hidden = false;
      retry.hidden = false;
      // Keep the frame alive: a slow network must not hide a later successful load.
    }, 20000);
    const existingFrame = mount.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
    if (existingFrame) {
      existingFrame.classList.add('giscus-frame--loading');
      existingFrame.src = existingFrame.src;
      return;
    }
    mount.replaceChildren();
    const script = document.createElement('script');
    script.src = `${comments.origin}/client.js`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    const config = {
      repo: comments.repo, 'repo-id': comments.repoId,
      category: comments.category, 'category-id': comments.categoryId,
      mapping: 'specific', term: section!.dataset.term!, strict: '1',
      'reactions-enabled': '0', 'emit-metadata': '1', 'input-position': 'top',
      theme: themeUrl(), lang: 'zh-CN', loading: 'eager',
    };
    for (const [key, value] of Object.entries(config)) script.setAttribute(`data-${key}`, value);
    script.addEventListener('error', () => fail('评论暂时无法加载，可以重试或在 GitHub 中查看。'));
    mount.append(script);
  }
  retry.addEventListener('click', load);
  window.addEventListener('message', event => {
    const frame = mount.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
    if (event.origin !== comments.origin || !frame || event.source !== frame.contentWindow) return;
    const message = event.data?.giscus;
    if (!message || typeof message !== 'object') return;
    // giscus normally reports "Discussion not found" before the first comment.
    if (typeof message.error === 'string' && !/discussion not found|not found.*discussion|unauthorized|bad credentials|invalid.*session|expired.*session/i.test(message.error)) {
      fail(/not installed|installation|bad credentials/i.test(message.error)
        ? '评论服务尚未启用，可先在 GitHub 中查看讨论。'
        : '评论暂时无法加载，可以重试或在 GitHub 中查看。');
      return;
    }
    if (typeof message.resizeHeight === 'number' && message.resizeHeight > 0 && !serviceFailed) {
      ready();
      syncTheme();
    }
    const metadata = discussionMetadata(message);
    if (metadata) {
      ready();
      count.textContent = String(metadata.count);
      count.hidden = false;
      link.href = metadata.url;
    }
  });
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  // Observe the newly mounted frame as well: the site theme may have changed while it loaded.
  new MutationObserver(() => {
    const frame = mount.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
    if (frame && !frame.dataset.themeBound) {
      frame.dataset.themeBound = 'true';
      frame.addEventListener('load', () => {
        lastTheme = '';
        syncTheme();
        if (!serviceFailed) ready();
      });
      frame.title = '文章评论';
    }
    if (frame && !serviceFailed && !frame.classList.contains('giscus-frame--loading') && parseFloat(frame.style.height) > 0) ready();
  }).observe(mount, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && !started) { observer.disconnect(); load(); }
    }, { rootMargin: '300px' });
    observer.observe(section);
  } else load();
}
