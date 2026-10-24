import { orbitFrame } from '../lib/orbit-layout.mjs';

export interface OrbitPreview {
  time: number;
  ownedByRenderer: boolean;
  draw: () => void;
}

// An orthographic sketch of the same starting pose, independent of the Three.js bundle.
export function createOrbitPreview(host: HTMLElement, signal: AbortSignal): OrbitPreview | undefined {
  const canvas = host.querySelector<HTMLCanvasElement>('.glass-orbit-preview');
  const ctx = canvas?.getContext('2d');
  const hero = host.closest<HTMLElement>('.study-hero');
  const portrait = hero?.querySelector<HTMLElement>('.portrait-link');
  if (!canvas || !ctx || !hero || !portrait) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const moving = () => document.body.dataset.motion === 'on' && !reduced.matches;
  let layout = { width: 1, top: 0, bottom: 1, centerX: 0, centerY: 0, avatarRadius: 72, compact: false };
  let height = 1;
  let ratio = 1;
  let frame = 0;
  let last = 0;
  let visible = true;
  let readyAt = 0;
  let detailTime = 0;
  const state: OrbitPreview = { time: 0, ownedByRenderer: false, draw };
  const smooth = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t * t * (3 - 2 * t); };

  function draw() {
    if (signal.aborted || (host.dataset.glassState === 'ready' && readyAt && performance.now() - readyAt > 750)) return;
    ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx!.clearRect(0, 0, layout.width, height);
    const detail = moving() ? smooth((detailTime - .3) / 1.2) : 1;
    const glass = moving() ? smooth((detailTime - 1) / 1.2) : 1;
    const poses = orbitFrame(layout, state.time).sort((a, b) => a.z - b.z);
    for (const pose of poses) {
      const { rotationX: x, rotationY: y, rotationZ: z } = pose;
      const cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
      ctx!.save();
      ctx!.translate(pose.x, pose.y);
      // Project Three.js XYZ Euler rotation onto the screen, whose Y axis points down.
      ctx!.transform(cy * cz, -(cx * sz + sx * sy * cz), cy * sz, cx * cz - sx * sy * sz, 0, 0);
      const w = pose.size, h = w * 1.56;
      ctx!.lineWidth = .8;
      ctx!.strokeStyle = '#f5e4ba';
      ctx!.globalAlpha = .6;
      ctx!.beginPath();
      ctx!.roundRect(-w / 2, -h / 2, w, h, w * .055);
      ctx!.stroke();
      ctx!.globalAlpha = glass * .12;
      ctx!.fillStyle = '#e4eee9';
      ctx!.fill();
      ctx!.globalAlpha = detail * .65;
      ctx!.beginPath();
      ctx!.roundRect(-w * .44, -h * .45, w * .88, h * .9, w * .035);
      ctx!.stroke();
      ctx!.globalAlpha = detail * .42;
      ctx!.beginPath();
      ctx!.ellipse(0, 0, w * .195, h * .19, 0, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.globalAlpha = detail * .8;
      ctx!.beginPath();
      for (let point = 0; point < 8; point++) {
        const angle = point * Math.PI / 4 - Math.PI / 2;
        const r = w * .143 * (point % 2 ? .2 : 1);
        const px = Math.cos(angle) * r, py = Math.sin(angle) * r * 1.3;
        if (!point) ctx!.moveTo(px, py); else ctx!.lineTo(px, py);
      }
      ctx!.closePath();
      ctx!.stroke();
      ctx!.restore();
    }
  }

  function resize() {
    const bounds = hero!.getBoundingClientRect();
    const identity = portrait!.getBoundingClientRect();
    const name = hero!.querySelector<HTMLElement>('.hero-name')!;
    const index = hero!.querySelector('.hero-index')!.getBoundingClientRect();
    height = bounds.height;
    layout = { width: bounds.width, top: index.bottom - bounds.top + 8, bottom: name.offsetTop - 14,
      centerX: identity.left + identity.width / 2 - bounds.left,
      centerY: identity.top + identity.height / 2 - bounds.top,
      avatarRadius: identity.width / 2, compact: bounds.width <= 700 };
    ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas!.width = Math.round(bounds.width * ratio);
    canvas!.height = Math.round(height * ratio);
    draw();
  }

  function tick(now: number) {
    frame = 0;
    if (signal.aborted || document.hidden || !visible) return;
    if (host.dataset.glassState === 'ready') {
      readyAt ||= now;
      if (now - readyAt > 750) return;
    } else { readyAt = 0; state.ownedByRenderer = false; }
    const delta = last ? Math.min((now - last) / 1000, .05) : 0;
    last = now;
    const opening = document.documentElement.dataset.opening === 'on';
    const reveal = !opening || now - Number(document.documentElement.dataset.openingStarted || 0) > 1050;
    if (moving() && reveal) {
      detailTime += delta;
      if (!state.ownedByRenderer) state.time += delta;
    }
    draw();
    if (moving() || readyAt) frame = requestAnimationFrame(tick);
  }
  function resume() {
    cancelAnimationFrame(frame);
    last = 0;
    frame = requestAnimationFrame(tick);
  }
  const size = new ResizeObserver(resize);
  size.observe(hero);
  size.observe(portrait);
  size.observe(hero.querySelector('.hero-person')!);
  const changes = new MutationObserver(resume);
  changes.observe(document.body, { attributes: true, attributeFilter: ['data-motion'] });
  changes.observe(host, { attributes: true, attributeFilter: ['data-glass-state'] });
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; resume(); });
  intersection.observe(hero);
  document.addEventListener('visibilitychange', resume, { signal });
  reduced.addEventListener('change', resume, { signal });
  signal.addEventListener('abort', () => {
    cancelAnimationFrame(frame);
    size.disconnect(); changes.disconnect(); intersection.disconnect();
  }, { once: true });
  resize();
  resume();
  return state;
}
