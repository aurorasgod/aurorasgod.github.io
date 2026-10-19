/** Local-only helpers for the design lab. None of these actions publish or alter notes. */
export {};

type LabPost = {
  id: string;
  title: string;
  description: string;
  text: string;
  url: string;
  date: string;
  tags: string[];
  category: string;
};
type LabProject = Omit<LabPost, 'date' | 'category'>;
type SearchEntry = (LabPost | LabProject) & { kind: 'post' | 'project' };
type ReadingPosition = { ratio: number; top: number };

function initLabTools() {
  const dataElement = document.querySelector<HTMLScriptElement>('#lab-content-data');
  if (!dataElement) return;

  const storagePrefix = 'laplace-lab:';
  const toastElement = document.querySelector<HTMLElement>('[data-lab-toast]');
  const searchDialog = document.querySelector<HTMLDialogElement>('#lab-search-dialog');
  const savedDialog = document.querySelector<HTMLDialogElement>('#lab-saved-dialog');
  const toolsDialog = document.querySelector<HTMLDialogElement>('#lab-tools-dialog');
  const readingDialog = document.querySelector<HTMLDialogElement>('#lab-reading-dialog');
  const searchInput = searchDialog?.querySelector<HTMLInputElement>('[data-lab-search]');
  const searchResults = searchDialog?.querySelector<HTMLElement>('[data-lab-search-results]');
  const savedResults = savedDialog?.querySelector<HTMLElement>('[data-lab-saved-results]');
  const readerScroll = readingDialog?.querySelector<HTMLElement>('[data-reader-scroll]');
  const readerContent = readingDialog?.querySelector<HTMLElement>('[data-reader-content]');
  const progress = readingDialog?.querySelector<HTMLElement>('[data-reader-progress]');
  const comfortButton = readingDialog?.querySelector<HTMLButtonElement>('[data-reader-comfort]');
  const dialogs = [searchDialog, savedDialog, toolsDialog, readingDialog]
    .filter((dialog): dialog is HTMLDialogElement => Boolean(dialog));
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let storageAvailable = true;

  function readStored(key: string): string | null {
    try { return localStorage.getItem(storagePrefix + key); }
    catch { storageAvailable = false; return null; }
  }

  function writeStored(key: string, value: string): boolean {
    try { localStorage.setItem(storagePrefix + key, value); return true; }
    catch { storageAvailable = false; return false; }
  }

  function toast(message: string) {
    if (!toastElement) return;
    clearTimeout(toastTimer);
    toastElement.textContent = message;
    toastElement.hidden = false;
    toastElement.classList.add('is-visible');
    toastTimer = setTimeout(() => {
      toastElement.classList.remove('is-visible');
      toastElement.hidden = true;
    }, 3200);
  }

  function safeUrl(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    try {
      const url = new URL(value, location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  }

  function parseEntry(value: unknown): LabPost | null {
    if (!value || typeof value !== 'object') return null;
    const entry = value as Record<string, unknown>;
    const url = safeUrl(entry.url);
    if (typeof entry.id !== 'string' || typeof entry.title !== 'string' || !url) return null;
    return {
      id: entry.id,
      title: entry.title,
      description: typeof entry.description === 'string' ? entry.description : '',
      text: typeof entry.text === 'string' ? entry.text : '',
      url,
      date: typeof entry.date === 'string' ? entry.date : '',
      category: typeof entry.category === 'string' ? entry.category : '',
      tags: Array.isArray(entry.tags) ? entry.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    };
  }

  let posts: LabPost[] = [];
  let projects: LabProject[] = [];
  try {
    const parsed = JSON.parse(dataElement.textContent || '{}');
    posts = (Array.isArray(parsed.posts) ? parsed.posts : []).map(parseEntry).filter(Boolean);
    projects = (Array.isArray(parsed.projects) ? parsed.projects : []).map(parseEntry).filter(Boolean);
  } catch { toast('内容索引暂时无法读取，仍可从文章页浏览。'); }

  const postsById = new Map(posts.map(post => [post.id, post]));
  const entries: SearchEntry[] = [
    ...posts.map(post => ({ ...post, kind: 'post' as const })),
    ...projects.map(project => ({ ...project, kind: 'project' as const })),
  ];
  let saved = new Set<string>();
  function readSaved() {
    try {
      const values = JSON.parse(readStored('saved') || '[]');
      if (Array.isArray(values)) saved = new Set(values.filter((value): value is string => typeof value === 'string'));
    } catch { saved = new Set(); }
  }
  readSaved();

  function syncBookmarks() {
    for (const button of document.querySelectorAll<HTMLButtonElement>("[data-lab-action='bookmark'][data-post-id]")) {
      const post = postsById.get(button.dataset.postId || '');
      const active = Boolean(post && saved.has(post.id));
      const label = `${active ? '取消收藏' : '收藏'}${post ? `：${post.title}` : '文章'}`;
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', label);
      button.title = label;
      button.classList.toggle('is-saved', active);
      const visibleLabel = button.querySelector<HTMLElement>('[data-bookmark-label]');
      if (visibleLabel) visibleLabel.textContent = active ? '已收藏' : '收藏';
    }
    for (const count of document.querySelectorAll<HTMLElement>('[data-lab-saved-count]')) {
      count.textContent = String(posts.filter(post => saved.has(post.id)).length);
    }
  }

  function emptyState(container: HTMLElement, message: string) {
    const paragraph = document.createElement('p');
    paragraph.className = 'lab-empty-state';
    paragraph.textContent = message;
    container.replaceChildren(paragraph);
  }

  function resultLink(entry: SearchEntry, index: number): HTMLAnchorElement {
    const link = document.createElement('a');
    link.className = 'lab-search-result';
    link.id = `lab-result-${entry.kind}-${index}`;
    link.href = entry.url;
    const type = document.createElement('span');
    type.className = 'lab-result-type';
    type.textContent = entry.kind === 'post' ? '文章' : '项目';
    const title = document.createElement('strong');
    title.className = 'lab-result-title';
    title.textContent = entry.title;
    const description = document.createElement('span');
    description.className = 'lab-result-description';
    description.textContent = entry.description;
    link.append(type, title, description);
    if (entry.tags.length) {
      const tags = document.createElement('span');
      tags.className = 'lab-result-tags';
      tags.textContent = entry.tags.map(tag => '#' + tag.replace(/^#+/, '')).join('  ');
      link.append(tags);
    }
    return link;
  }

  function renderSaved() {
    if (!savedResults) return;
    const found = posts.filter(post => saved.has(post.id));
    if (!found.length) {
      emptyState(savedResults, '还没有收藏。点击文章旁的收藏按钮，就可以在这里找到它。收藏只保存在当前浏览器。');
      return;
    }
    savedResults.replaceChildren();
    for (const [index, post] of found.entries()) {
      const row = document.createElement('div');
      row.className = 'lab-saved-row';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.dataset.labAction = 'bookmark';
      remove.dataset.postId = post.id;
      remove.textContent = '移除收藏';
      row.append(resultLink({ ...post, kind: 'post' }, index), remove);
      savedResults.append(row);
    }
    syncBookmarks();
  }

  function normalized(value: string) {
    return value.normalize('NFKC').toLocaleLowerCase().trim();
  }

  let selectedResult = -1;
  function resultLinks() {
    return Array.from(searchResults?.querySelectorAll<HTMLAnchorElement>('.lab-search-result') || []);
  }

  function selectResult(index: number, focus = false) {
    const links = resultLinks();
    selectedResult = Math.max(-1, Math.min(index, links.length - 1));
    links.forEach((link, position) => {
      const active = position === selectedResult;
      link.classList.toggle('is-selected', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    if (focus) links[selectedResult]?.focus();
  }

  function renderSearch() {
    if (!searchResults || !searchInput) return;
    const tokens = normalized(searchInput.value).split(/\s+/).filter(Boolean);
    const found = entries.filter(entry => {
      const text = normalized([entry.title, entry.description, entry.text, 'category' in entry ? entry.category : '', ...entry.tags].join(' '));
      return tokens.every(token => token.startsWith('#')
        ? entry.tags.some(tag => normalized(tag.replace(/^#+/, '')) === token.replace(/^#+/, ''))
        : text.includes(token));
    }).slice(0, 12);
    selectedResult = -1;
    if (!found.length) {
      emptyState(searchResults, tokens.length ? '没有找到相关内容，试试其他关键词或 #标签。' : '暂时没有公开内容。');
      return;
    }
    searchResults.replaceChildren(...found.map(resultLink));
  }

  function openDialog(dialog: HTMLDialogElement | null | undefined) {
    if (!dialog || typeof dialog.showModal !== 'function') return;
    for (const other of dialogs) if (other !== dialog && other.open) {
      if (other === readingDialog) saveReadingPosition();
      other.close();
    }
    if (!dialog.open) dialog.showModal();
  }

  function openSearch() {
    renderSearch();
    openDialog(searchDialog);
    searchInput?.focus();
  }

  searchInput?.addEventListener('input', renderSearch);
  searchDialog?.addEventListener('keydown', event => {
    const links = resultLinks();
    const activeIndex = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === 'ArrowDown' && links.length) {
      event.preventDefault();
      selectResult(activeIndex < 0 ? 0 : (activeIndex + 1) % links.length, true);
    } else if (event.key === 'ArrowUp' && links.length) {
      event.preventDefault();
      if (activeIndex <= 0) { selectResult(-1); searchInput?.focus(); }
      else selectResult(activeIndex - 1, true);
    } else if (event.key === 'Enter' && document.activeElement === searchInput && links.length) {
      event.preventDefault();
      links[Math.max(selectedResult, 0)]?.click();
    }
  });
  searchResults?.addEventListener('focusin', event => {
    if (event.target instanceof HTMLAnchorElement) selectResult(resultLinks().indexOf(event.target));
  });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (searchDialog?.open) searchDialog.close();
      else openSearch();
    }
  }, { capture: true });

  for (const dialog of dialogs) {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
        if (dialog === readingDialog) saveReadingPosition();
        dialog.close();
      }
    });
    // Native <dialog> provides Escape dismissal, focus trapping and focus return.
    if (dialog === readingDialog) dialog.addEventListener('cancel', saveReadingPosition);
  }

  const unitMode = toolsDialog?.querySelector<HTMLSelectElement>('[data-unit-mode]');
  const unitValue = toolsDialog?.querySelector<HTMLInputElement>('[data-unit-value]');
  const unitScale = toolsDialog?.querySelector<HTMLSelectElement>('[data-unit-scale]');
  const unitOutput = toolsDialog?.querySelector<HTMLElement>('[data-unit-output]');
  const unitFormula = toolsDialog?.querySelector<HTMLElement>('[data-unit-formula]');
  const numberFormat = new Intl.NumberFormat('zh-CN', { maximumSignificantDigits: 6 });
  function formatNumber(value: number) {
    return value !== 0 && (Math.abs(value) < 0.000001 || Math.abs(value) >= 1e9)
      ? value.toExponential(4).replace(/\.0+(?=e)/, '')
      : numberFormat.format(value);
  }

  function calculateUnit() {
    if (!unitValue || !unitOutput || !unitFormula) return;
    const isDb = unitMode?.value === 'db';
    if (unitScale) unitScale.disabled = isDb;
    unitValue.setAttribute('aria-label', isDb ? '分贝数 dB，按幅值计算' : '频率数值');
    unitValue.placeholder = isDb ? '例如 20 或 -6' : '例如 1';
    if (isDb) unitValue.removeAttribute('min');
    else unitValue.min = '0';
    unitFormula.textContent = isDb ? '幅值倍率 A₂/A₁ = 10^(dB/20)，适用于相同阻抗下的电压或电流幅值。' : 'T = 1/f；ω = 2πf。';
    const value = Number(unitValue.value);
    if (!unitValue.value.trim() || !Number.isFinite(value)) {
      unitOutput.textContent = '请输入有效数值。';
      unitValue.setAttribute('aria-invalid', 'true');
      return;
    }
    if (isDb) {
      const ratio = 10 ** (value / 20);
      if (!Number.isFinite(ratio) || ratio === 0) {
        unitOutput.textContent = '数值超出可计算范围，请调整 dB 值。';
        unitValue.setAttribute('aria-invalid', 'true');
        return;
      }
      unitOutput.textContent = `${formatNumber(value)} dB → 幅值 ${formatNumber(ratio)} 倍`;
    } else {
      const scale = Number(unitScale?.value || 1000);
      const frequency = value * scale;
      const period = 1 / frequency;
      const angularFrequency = 2 * Math.PI * frequency;
      if (frequency <= 0 || !Number.isFinite(period) || !Number.isFinite(angularFrequency) || !Number.isFinite(scale) || scale <= 0) {
        unitOutput.textContent = '频率需要大于 0，且不能超出可计算范围。';
        unitValue.setAttribute('aria-invalid', 'true');
        return;
      }
      const [timeScale, timeUnit] = period < 1e-6 ? [1e9, 'ns'] : period < 0.001 ? [1e6, 'μs'] : period < 1 ? [1000, 'ms'] : [1, 's'];
      unitOutput.textContent = `周期 ${formatNumber(period * Number(timeScale))} ${timeUnit} · 角频率 ${formatNumber(angularFrequency)} rad/s`;
    }
    unitValue.removeAttribute('aria-invalid');
  }
  unitValue?.addEventListener('input', calculateUnit);
  unitMode?.addEventListener('change', calculateUnit);
  unitScale?.addEventListener('change', calculateUnit);
  if (unitOutput) unitOutput.setAttribute('aria-live', 'polite');
  calculateUnit();

  let currentPost: LabPost | undefined;
  let readerFrame = 0;
  let readerSaveTimer: ReturnType<typeof setTimeout> | undefined;
  let comfortable = readStored('comfortable') === 'true';
  const sessionPositions = new Map<string, ReadingPosition>();

  function storedReadingPosition(id: string): ReadingPosition | undefined {
    const currentSession = sessionPositions.get(id);
    if (currentSession) return currentSession;
    try {
      const stored = JSON.parse(readStored(`reader:${id}`) || 'null');
      if (stored && Number.isFinite(stored.ratio) && Number.isFinite(stored.top)) return stored;
    } catch { /* Invalid or unavailable storage starts a fresh reading session. */ }
    return undefined;
  }

  function syncResumeSummary(position?: ReadingPosition) {
    const firstPost = posts[0];
    const previous = position || (firstPost && storedReadingPosition(firstPost.id));
    const ratio = Math.max(0, Math.min(1, previous?.ratio || 0));
    const percentage = Math.round(ratio * 100);
    for (const label of document.querySelectorAll<HTMLElement>('[data-lab-resume-label]')) {
      label.textContent = ratio > 0 ? `上次读到 ${percentage}%` : '从头开始';
    }
    for (const bar of document.querySelectorAll<HTMLElement>('[data-lab-resume-progress]')) {
      bar.style.width = `${percentage}%`;
    }
    for (const title of document.querySelectorAll<HTMLElement>('[data-lab-resume-title]')) {
      title.textContent = firstPost?.title || '';
    }
  }

  syncResumeSummary();

  function updateComfort() {
    readingDialog?.classList.toggle('comfortable', comfortable);
    readerContent?.classList.toggle('comfortable', comfortable);
    comfortButton?.setAttribute('aria-pressed', String(comfortable));
    comfortButton?.setAttribute('aria-label', comfortable ? '关闭舒适排版' : '开启舒适排版');
  }
  updateComfort();

  function readingPosition(): ReadingPosition {
    if (!readerScroll) return { top: 0, ratio: 0 };
    const max = Math.max(0, readerScroll.scrollHeight - readerScroll.clientHeight);
    return { top: readerScroll.scrollTop, ratio: max ? Math.max(0, Math.min(1, readerScroll.scrollTop / max)) : 0 };
  }

  function saveReadingPosition() {
    if (!currentPost || !readerScroll || !readingDialog?.open) return;
    clearTimeout(readerSaveTimer);
    const position = readingPosition();
    sessionPositions.set(currentPost.id, position);
    writeStored(`reader:${currentPost.id}`, JSON.stringify(position));
    syncResumeSummary(currentPost.id === posts[0]?.id ? position : undefined);
  }

  function updateProgress() {
    if (!readerScroll) return;
    const max = Math.max(0, readerScroll.scrollHeight - readerScroll.clientHeight);
    const percentage = Math.round((max ? readingPosition().ratio : 1) * 100);
    if (progress) {
      progress.style.width = `${percentage}%`;
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-label', '阅读进度');
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', '100');
      progress.setAttribute('aria-valuenow', String(percentage));
    }
    const label = readingDialog?.querySelector<HTMLElement>('[data-reader-progress-label]');
    if (label) label.textContent = `${percentage}%`;
    // Closing the dialog can emit a layout-driven scroll event. Keep its saved
    // resume position rather than treating the now-hidden reader as unread.
    syncResumeSummary(readingDialog?.open && currentPost?.id === posts[0]?.id ? readingPosition() : undefined);
  }

  function restoreReadingPosition(id: string) {
    if (!readerScroll) return;
    const position = storedReadingPosition(id);
    const max = Math.max(0, readerScroll.scrollHeight - readerScroll.clientHeight);
    readerScroll.scrollTop = position ? Math.max(0, Math.min(1, position.ratio)) * max : 0;
    updateProgress();
  }

  function openReading(post: LabPost) {
    if (!readingDialog || !readerScroll) return;
    // Only the first article is embedded in the preview. Other entries open their real page.
    if (readerContent?.dataset.readerPost !== post.id) { location.assign(post.url); return; }
    if (readingDialog.open && currentPost) saveReadingPosition();
    currentPost = post;
    const title = readingDialog.querySelector<HTMLElement>('[data-reader-title]');
    const meta = readingDialog.querySelector<HTMLElement>('[data-reader-meta]');
    if (title) title.textContent = post.title;
    if (meta) meta.textContent = [post.date, ...post.tags.map(tag => '#' + tag.replace(/^#+/, ''))].filter(Boolean).join(' · ');
    openDialog(readingDialog);
    cancelAnimationFrame(readerFrame);
    readerFrame = requestAnimationFrame(() => {
      readerFrame = requestAnimationFrame(() => restoreReadingPosition(post.id));
    });
  }

  readerScroll?.addEventListener('scroll', () => {
    updateProgress();
    clearTimeout(readerSaveTimer);
    readerSaveTimer = setTimeout(saveReadingPosition, 250);
  }, { passive: true });
  window.addEventListener('pagehide', saveReadingPosition);
  window.addEventListener('resize', () => { if (readingDialog?.open) updateProgress(); }, { passive: true });
  comfortButton?.addEventListener('click', () => {
    const ratio = readingPosition().ratio;
    comfortable = !comfortable;
    updateComfort();
    writeStored('comfortable', String(comfortable));
    requestAnimationFrame(() => {
      if (readerScroll) readerScroll.scrollTop = ratio * Math.max(0, readerScroll.scrollHeight - readerScroll.clientHeight);
      updateProgress();
      saveReadingPosition();
    });
  });

  document.addEventListener('click', async event => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest<HTMLElement>('[data-lab-action]');
    if (!trigger || trigger instanceof HTMLButtonElement && trigger.disabled) return;
    const action = trigger.dataset.labAction;
    if (!['search', 'saved', 'tools', 'read', 'bookmark', 'copy', 'close'].includes(action || '')) return;
    event.preventDefault();
    const post = postsById.get(trigger.dataset.postId || '');
    if (action === 'search') openSearch();
    else if (action === 'saved') { renderSaved(); openDialog(savedDialog); }
    else if (action === 'tools') { calculateUnit(); openDialog(toolsDialog); }
    else if (action === 'close') {
      const dialog = trigger.closest('dialog');
      if (dialog === readingDialog) saveReadingPosition();
      dialog?.close();
    }
    else if (action === 'read' && post) openReading(post);
    else if (action === 'bookmark' && post) {
      const adding = !saved.has(post.id);
      if (adding) saved.add(post.id);
      else saved.delete(post.id);
      const persistent = writeStored('saved', JSON.stringify([...saved]));
      syncBookmarks();
      if (savedDialog?.open) renderSaved();
      toast(`${adding ? '已收藏' : '已取消收藏'}${persistent ? '，仅保存在当前浏览器。' : '。浏览器未允许保存，刷新后可能丢失。'}`);
    } else if (action === 'copy' && post) {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(post.url);
        toast('文章链接已复制。');
      } catch { toast('浏览器暂不允许复制，请从文章页复制地址栏链接。'); }
    }
  });

  window.addEventListener('storage', event => {
    if (event.key === storagePrefix + 'saved' || event.key === null) {
      readSaved();
      syncBookmarks();
      if (savedDialog?.open) renderSaved();
    }
  });
  syncBookmarks();
  // Keep this flag local: unavailable storage must never prevent the page tools from working.
  if (!storageAvailable) toast('浏览器未允许本机存储，收藏和阅读位置将仅在本次打开时保留。');
}

initLabTools();
