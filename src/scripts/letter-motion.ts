/** Small, local interactions for the letter preview; nothing runs while it is hidden. */
const motionStorageKey = 'laplace-lab:motion';

function initializeLetterMotion(canvas: HTMLElement): void {
  const html = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clocks = [...canvas.querySelectorAll<HTMLElement>('[data-letter-clock]')];
  const reveals = [...canvas.querySelectorAll<HTMLElement>('[data-letter-reveal]')];
  const landscapes = [...canvas.querySelectorAll<HTMLElement>('[data-letter-landscape]')];
  const motionButtons = [...document.querySelectorAll<HTMLButtonElement>('button[data-letter-motion]')];
  const progressBars = [...canvas.querySelectorAll<HTMLElement>('[data-letter-page-progress]')];
  const links = [...canvas.querySelectorAll<HTMLAnchorElement>('[data-letter-section-link]')];
  const sections = new Map<HTMLElement, HTMLAnchorElement[]>();
  const timeFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  let savedMotion: 'on' | 'off' | null = readMotionPreference();
  let motionEnabled = false;
  let active = false;
  let pagePaused = false;
  let clockTimer: number | undefined;
  let scrollFrame: number | undefined;
  let revealObserver: IntersectionObserver | undefined;
  let currentSection: HTMLElement | undefined;
  let previousProgress = '';

  for (const link of links) {
    if (!link.hash) continue;
    const section = document.getElementById(link.hash.slice(1));
    if (!(section instanceof HTMLElement) || !canvas.contains(section)) continue;
    const existing = sections.get(section) ?? [];
    existing.push(link);
    sections.set(section, existing);
  }

  function readMotionPreference(): 'on' | 'off' | null {
    try {
      const value = window.localStorage.getItem(motionStorageKey);
      return value === 'on' || value === 'off' ? value : null;
    } catch {
      return null;
    }
  }

  function revealAll(): void {
    revealObserver?.disconnect();
    revealObserver = undefined;
    for (const element of reveals) element.classList.add('is-revealed');
  }

  function observeReveals(): void {
    if (!motionEnabled || !('IntersectionObserver' in window)) {
      revealAll();
      return;
    }
    if (!active) return;
    revealObserver ??= new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
    for (const element of reveals) {
      if (!element.classList.contains('is-revealed')) revealObserver.observe(element);
    }
  }

  function tickClock(): void {
    clockTimer = undefined;
    if (!active || clocks.length === 0) return;
    const now = new Date();
    const time = timeFormat.format(now);
    for (const clock of clocks) {
      if (clock.textContent !== time) clock.textContent = time;
    }
    // Align to the next second without waking more often than necessary.
    clockTimer = window.setTimeout(tickClock, 1015 - (now.getTime() % 1000));
  }

  function updateScrollFeedback(): void {
    scrollFrame = undefined;
    if (!active) return;

    const triggerLine = Math.min(window.innerHeight * 0.32, 240);
    let selected: HTMLElement | undefined;
    let earliestTop = Number.POSITIVE_INFINITY;
    let latestReachedTop = Number.NEGATIVE_INFINITY;
    for (const section of sections.keys()) {
      if (section.hidden) continue;
      const top = section.getBoundingClientRect().top;
      if (top <= triggerLine && top >= latestReachedTop) {
        selected = section;
        latestReachedTop = top;
      } else if (latestReachedTop === Number.NEGATIVE_INFINITY && top < earliestTop) {
        selected = section;
        earliestTop = top;
      }
    }
    if (selected !== currentSection) {
      currentSection = selected;
      for (const [section, sectionLinks] of sections) {
        for (const link of sectionLinks) {
          if (section === selected) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        }
      }
    }

    const scrollRoot = document.scrollingElement ?? html;
    const available = Math.max(0, scrollRoot.scrollHeight - window.innerHeight);
    const percentage = available > 0
      ? Math.max(0, Math.min(100, (window.scrollY / available) * 100))
      : 0;
    const width = `${percentage.toFixed(2)}%`;
    if (width !== previousProgress) {
      previousProgress = width;
      for (const progress of progressBars) {
        progress.style.width = width;
        if (progress.getAttribute('role') === 'progressbar') {
          progress.setAttribute('aria-valuenow', String(Math.round(percentage)));
        }
      }
    }
  }

  function requestScrollFeedback(): void {
    if (!active || scrollFrame !== undefined) return;
    scrollFrame = window.requestAnimationFrame(updateScrollFeedback);
  }

  const landscapeHandlers = landscapes.map((landscape) => {
    let frame: number | undefined;
    let pointerX = 0;
    let pointerY = 0;

    const reset = (): void => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      frame = undefined;
      landscape.style.setProperty('--letter-x', '0px');
      landscape.style.setProperty('--letter-y', '0px');
    };

    const draw = (): void => {
      frame = undefined;
      if (!active || !motionEnabled) return;
      const bounds = landscape.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) return;
      const x = Math.max(-1, Math.min(1, ((pointerX - bounds.left) / bounds.width) * 2 - 1));
      const y = Math.max(-1, Math.min(1, ((pointerY - bounds.top) / bounds.height) * 2 - 1));
      landscape.style.setProperty('--letter-x', `${(x * 4).toFixed(2)}px`);
      landscape.style.setProperty('--letter-y', `${(y * 4).toFixed(2)}px`);
    };

    const move = (event: PointerEvent): void => {
      if (!active || !motionEnabled || event.pointerType === 'touch') return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (frame === undefined) frame = window.requestAnimationFrame(draw);
    };

    return { landscape, move, reset };
  });

  function bindLandscapes(enabled: boolean): void {
    for (const { landscape, move, reset } of landscapeHandlers) {
      landscape.removeEventListener('pointermove', move);
      landscape.removeEventListener('pointerleave', reset);
      landscape.removeEventListener('pointercancel', reset);
      reset();
      if (!enabled) continue;
      landscape.addEventListener('pointermove', move, { passive: true });
      landscape.addEventListener('pointerleave', reset, { passive: true });
      landscape.addEventListener('pointercancel', reset, { passive: true });
    }
  }

  function applyMotionPreference(): void {
    motionEnabled = !reducedMotion.matches && savedMotion !== 'off';
    html.dataset.letterMotion = motionEnabled ? 'on' : 'off';
    for (const button of motionButtons) {
      button.disabled = reducedMotion.matches;
      button.setAttribute('aria-pressed', String(motionEnabled));
      const label = reducedMotion.matches
        ? '已跟随系统减少动态'
        : motionEnabled ? '关闭动态效果' : '开启动态效果';
      button.setAttribute('aria-label', label);
      button.title = label;
      const labelElement = button.querySelector<HTMLElement>('[data-letter-motion-label]');
      if (labelElement) labelElement.textContent = label;
      else button.textContent = label;
    }
    bindLandscapes(active && motionEnabled);
    if (!motionEnabled) revealAll();
    else observeReveals();
  }

  function refreshActivity(): void {
    const visible = !pagePaused
      && document.visibilityState !== 'hidden'
      && canvas.isConnected
      && !canvas.closest('[hidden], [aria-hidden="true"]')
      && canvas.getClientRects().length > 0;
    if (visible === active) return;
    active = visible;

    if (active) {
      tickClock();
      observeReveals();
      window.addEventListener('scroll', requestScrollFeedback, { passive: true });
      window.addEventListener('resize', requestScrollFeedback, { passive: true });
      requestScrollFeedback();
    } else {
      if (clockTimer !== undefined) window.clearTimeout(clockTimer);
      clockTimer = undefined;
      if (scrollFrame !== undefined) window.cancelAnimationFrame(scrollFrame);
      scrollFrame = undefined;
      revealObserver?.disconnect();
      revealObserver = undefined;
      window.removeEventListener('scroll', requestScrollFeedback);
      window.removeEventListener('resize', requestScrollFeedback);
    }
    bindLandscapes(active && motionEnabled);
  }

  for (const button of motionButtons) {
    button.addEventListener('click', () => {
      if (reducedMotion.matches) return;
      savedMotion = motionEnabled ? 'off' : 'on';
      try { window.localStorage.setItem(motionStorageKey, savedMotion); } catch { /* Session preference still applies. */ }
      applyMotionPreference();
    });
  }

  reducedMotion.addEventListener('change', applyMotionPreference);
  document.addEventListener('visibilitychange', refreshActivity);
  window.addEventListener('pagehide', () => { pagePaused = true; refreshActivity(); });
  window.addEventListener('pageshow', () => { pagePaused = false; refreshActivity(); });
  window.addEventListener('storage', (event) => {
    if (event.key !== motionStorageKey && event.key !== null) return;
    savedMotion = readMotionPreference();
    applyMotionPreference();
  });

  // Observe only scheme visibility and the design switch, never per-frame style writes.
  const activityObserver = new MutationObserver(refreshActivity);
  activityObserver.observe(html, { attributes: true, attributeFilter: ['data-lab-design'] });
  for (let ancestor: HTMLElement | null = canvas; ancestor && ancestor !== html; ancestor = ancestor.parentElement) {
    activityObserver.observe(ancestor, { attributes: true, attributeFilter: ['hidden', 'aria-hidden'] });
  }

  applyMotionPreference();
  refreshActivity();
}

const letterCanvas = document.querySelector<HTMLElement>('.lab-letter');
if (letterCanvas) initializeLetterMotion(letterCanvas);

export {};
