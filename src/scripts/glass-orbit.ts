import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { orbitFrame } from '../lib/orbit-layout.mjs';

function roundedCard(width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function cardEtching() {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = '#f7e6ba';
  ctx.fillStyle = '#f2e2bd';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(17, 17, 350, 566, 13);
  ctx.stroke();
  ctx.globalAlpha = .38;
  ctx.beginPath();
  ctx.roundRect(25, 25, 334, 550, 8);
  ctx.stroke();

  const star = (x: number, y: number, radius: number) => {
    ctx.beginPath();
    for (let point = 0; point < 8; point++) {
      const angle = point * Math.PI / 4 - Math.PI / 2;
      const distance = point % 2 ? radius * .2 : radius;
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance * 1.3;
      if (point === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  };

  ctx.globalAlpha = .8;
  star(192, 300, 57);
  ctx.globalAlpha = .42;
  ctx.beginPath();
  ctx.ellipse(192, 300, 78, 115, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(192, 300, 69, 102, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = .7;
  star(192, 88, 12);
  star(192, 512, 12);
  for (const y of [142, 458]) {
    ctx.beginPath();
    ctx.moveTo(149, y);
    ctx.quadraticCurveTo(192, y + (y < 300 ? 23 : -23), 235, y);
    ctx.stroke();
  }
  for (const [x, y] of [[44, 44], [340, 44], [44, 556], [340, 556]]) {
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export async function createGlassOrbit(host: HTMLElement) {
  const canvas = host.querySelector<HTMLCanvasElement>('canvas');
  const hero = host.closest<HTMLElement>('.study-hero');
  const portrait = hero?.querySelector<HTMLElement>('.portrait-link');
  const avatar = portrait?.querySelector<HTMLImageElement>('.study-avatar');
  const portraitMark = portrait?.querySelector<HTMLElement>('.portrait-mark');
  if (!canvas || !hero || !portrait || !avatar || !portraitMark) return;
  const context = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'high-performance' });
  if (!context) { host.dataset.glassState = 'fallback'; return; }

  const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2500);
  camera.position.z = 1000;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();

  const key = new THREE.DirectionalLight('#fff1d1', 2.8);
  key.position.set(-350, 450, 550);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#d8e9ff', 1.8);
  rim.position.set(450, 120, -50);
  scene.add(rim, new THREE.HemisphereLight('#eff6ef', '#25392e', 1.1));

  const geometry = new THREE.ExtrudeGeometry(roundedCard(1, 1.56, .055), {
    depth: .028, bevelEnabled: true, bevelSegments: 4, steps: 1,
    bevelSize: .012, bevelThickness: .012, curveSegments: 12,
  });
  geometry.center();
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#f8fbfa', metalness: 0, roughness: .28,
    transmission: 1, thickness: .16, ior: 1.46,
    clearcoat: .4, clearcoatRoughness: .23, envMapIntensity: .35,
    specularIntensity: .5,
  });
  const etching = cardEtching();
  etching.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const etchingMaterial = new THREE.MeshBasicMaterial({
    map: etching, transparent: true, opacity: .9, depthWrite: false,
    side: THREE.FrontSide, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const etchingGeometry = new THREE.PlaneGeometry(.96, 1.51);
  const cards = Array.from({ length: 8 }, () => {
    const group = new THREE.Group();
    const face = new THREE.Mesh(etchingGeometry, etchingMaterial);
    // Separate the etching from the bevel; an intersecting outline caused moving-edge flicker.
    face.position.z = .04;
    group.add(new THREE.Mesh(geometry, glass), face);
    scene.add(group);
    return group;
  });

  // The same photograph is rendered inside WebGL so transmission refracts the real backdrop.
  const backdropCanvas = document.createElement('canvas');
  const backdropContext = backdropCanvas.getContext('2d')!;
  let backdrop = new THREE.CanvasTexture(backdropCanvas);
  backdrop.colorSpace = THREE.SRGBColorSpace;
  scene.background = backdrop;
  const photo = new Image();
  photo.src = host.dataset.background || '';

  // Put the portrait in the same depth buffer so glass can pass in front and behind.
  const portraitCanvas = document.createElement('canvas');
  portraitCanvas.width = portraitCanvas.height = 512;
  const portraitTexture = new THREE.CanvasTexture(portraitCanvas);
  portraitTexture.colorSpace = THREE.SRGBColorSpace;
  const portraitGeometry = new THREE.CircleGeometry(1, 96);
  const portraitMaterial = new THREE.MeshBasicMaterial({ map: portraitTexture, toneMapped: false });
  const portraitMesh = new THREE.Mesh(portraitGeometry, portraitMaterial);
  const markCanvas = document.createElement('canvas');
  markCanvas.width = markCanvas.height = 256;
  const markTexture = new THREE.CanvasTexture(markCanvas);
  markTexture.colorSpace = THREE.SRGBColorSpace;
  const markMaterial = new THREE.MeshBasicMaterial({ map: markTexture, toneMapped: false });
  const markMesh = new THREE.Mesh(portraitGeometry, markMaterial);
  const portraitGroup = new THREE.Group();
  portraitGroup.add(portraitMesh, markMesh);
  scene.add(portraitGroup);

  let width = 1;
  let height = 1;
  let anchorX = 0;
  let anchorY = 0;
  let avatarRadius = 72;
  let orbitTop = 0;
  let orbitBottom = 1;
  let compact = false;
  let elapsed = 0;
  let lastFrame = 0;
  let frame = 0;
  let visible = true;
  let disposed = false;
  let ready = false;
  let lost = false;
  let backdropWidth = 0;
  let backdropHeight = 0;
  const pointer = new THREE.Vector2();
  const smoothedPointer = new THREE.Vector2();
  let pointerActivity = 0;
  let smoothedActivity = 0;
  let portraitHovered = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motionEnabled = () => document.body.dataset.motion === 'on' && !reducedMotion.matches;

  function drawPortrait() {
    const ctx = portraitCanvas.getContext('2d')!;
    const edge = 4 / (avatarRadius * 2) * 512;
    const ratio = Math.max(512 / avatar!.naturalWidth, 512 / avatar!.naturalHeight);
    const w = avatar!.naturalWidth * ratio;
    const h = avatar!.naturalHeight * ratio;
    ctx.clearRect(0, 0, 512, 512);
    ctx.drawImage(avatar!, (512 - w) / 2, (512 - h) / 2, w, h);
    ctx.strokeStyle = '#d0ddcc';
    ctx.lineWidth = edge;
    ctx.beginPath();
    ctx.arc(256, 256, 256 - edge / 2, 0, Math.PI * 2);
    ctx.stroke();
    portraitTexture.needsUpdate = true;

    const markStyle = getComputedStyle(portraitMark!);
    const markWidth = portraitMark!.offsetWidth;
    const markRatio = 256 / markWidth;
    const markCtx = markCanvas.getContext('2d')!;
    markCtx.fillStyle = markStyle.backgroundColor;
    markCtx.fillRect(0, 0, 256, 256);
    markCtx.strokeStyle = markStyle.borderTopColor;
    markCtx.lineWidth = markRatio;
    markCtx.beginPath();
    markCtx.arc(128, 128, 128 - markRatio / 2, 0, Math.PI * 2);
    markCtx.stroke();
    markCtx.font = `${markStyle.fontStyle} ${markStyle.fontWeight} ${parseFloat(markStyle.fontSize) * markRatio}px ${markStyle.fontFamily}`;
    markCtx.textAlign = 'center';
    markCtx.fillStyle = markStyle.color;
    const label = portraitMark!.textContent?.trim() || 'L.';
    const metrics = markCtx.measureText(label);
    markCtx.fillText(label, 128, 128 + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2);
    markTexture.needsUpdate = true;
    markMesh.scale.setScalar(markWidth / 2);
    markMesh.position.set(avatarRadius - markWidth / 2, -avatarRadius + markWidth / 2, .1);
  }

  function drawBackdrop() {
    const nextWidth = Math.min(1920, Math.round(width * 1.25));
    const nextHeight = Math.round(nextWidth * height / width);
    if (nextWidth === backdropWidth && nextHeight === backdropHeight) return;
    backdropWidth = nextWidth;
    backdropHeight = nextHeight;
    backdropCanvas.width = nextWidth;
    backdropCanvas.height = nextHeight;
    const w = backdropCanvas.width;
    const h = backdropCanvas.height;
    const scale = Math.max(w / photo.naturalWidth, h / photo.naturalHeight) * 1.035;
    const imageWidth = photo.naturalWidth * scale;
    const imageHeight = photo.naturalHeight * scale;
    backdropContext.filter = 'saturate(65%)';
    backdropContext.drawImage(photo, (w - imageWidth) / 2, (h - imageHeight) * .64, imageWidth, imageHeight);
    backdropContext.filter = 'none';
    backdropContext.fillStyle = '#12251c7d';
    backdropContext.fillRect(0, 0, w, h);
    const shade = backdropContext.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, '#14201b12');
    shade.addColorStop(.45, '#14201b08');
    shade.addColorStop(1, '#14201bb0');
    backdropContext.fillStyle = shade;
    backdropContext.fillRect(0, 0, w, h);
    // GPU texture storage cannot change dimensions via needsUpdate alone.
    backdrop.dispose();
    backdrop = new THREE.CanvasTexture(backdropCanvas);
    backdrop.colorSpace = THREE.SRGBColorSpace;
    scene.background = backdrop;
  }

  function poseCards() {
    const poses = orbitFrame({ width, top: orbitTop, bottom: orbitBottom, centerX: anchorX + width / 2, centerY: height / 2 - anchorY, avatarRadius, compact }, elapsed, {
      x: (smoothedPointer.x + 1) * width / 2,
      y: (1 - smoothedPointer.y) * height / 2,
      active: smoothedActivity,
    });
    const opening = document.documentElement.dataset.opening === 'on';
    const openingTime = (performance.now() - Number(document.documentElement.dataset.openingStarted || 0)) / 1000;
    cards.forEach((card, index) => {
      const pose = poses[index];
      card.visible = Boolean(pose);
      if (!pose) return;
      card.position.set(pose.x - width / 2, height / 2 - pose.y, pose.z);
      card.scale.setScalar(pose.size);
      card.rotation.set(pose.rotationX, pose.rotationY, pose.rotationZ);
      if (opening && motionEnabled()) {
        const side = index % 2 === 0 ? -1 : 1;
        const progress = THREE.MathUtils.smootherstep(openingTime, 1.1 + index * .045, 2.55);
        card.position.z -= (1 - progress) * 25;
        card.rotation.y += (1 - progress) * side * .5;
        card.rotation.z += (1 - progress) * side * .18;
        card.scale.multiplyScalar(.65 + .35 * progress);
      }
    });
  }

  function render() {
    if (!ready || disposed || lost) return;
    poseCards();
    renderer.render(scene, camera);
    if (host.dataset.glassState !== 'ready') host.dataset.glassState = 'ready';
  }

  function tick(timestamp: number) {
    frame = 0;
    if (!ready || disposed || lost || !visible || document.hidden || !motionEnabled()) return;
    const delta = lastFrame ? Math.min((timestamp - lastFrame) / 1000, .05) : 0;
    lastFrame = timestamp;
    elapsed += delta;
    smoothedPointer.lerp(pointer, 1 - Math.exp(-10 * delta));
    smoothedActivity += (pointerActivity - smoothedActivity) * (1 - Math.exp(-6 * delta));
    portraitGroup.rotation.z += ((portraitHovered ? Math.PI / 60 : 0) - portraitGroup.rotation.z) * (1 - Math.exp(-10 * delta));
    // Follow display refresh directly; skipping RAFs creates uneven cadence on high-Hz screens.
    render();
    frame = requestAnimationFrame(tick);
  }

  function syncMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    if (!motionEnabled()) portraitGroup.rotation.z = 0;
    render();
    if (ready && !disposed && !lost && visible && !document.hidden && motionEnabled()) frame = requestAnimationFrame(tick);
  }

  function resize() {
    if (!ready || disposed) return;
    const bounds = hero!.getBoundingClientRect();
    const identity = portrait!.getBoundingClientRect();
    const name = hero!.querySelector<HTMLElement>('.hero-name')!;
    const index = hero!.querySelector('.hero-index')!.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    compact = width <= 700;
    anchorX = identity.left + identity.width / 2 - bounds.left - width / 2;
    anchorY = height / 2 - (identity.top + identity.height / 2 - bounds.top);
    avatarRadius = identity.width / 2;
    portraitGroup.position.set(anchorX, anchorY, 0);
    portraitMesh.scale.setScalar(avatarRadius);
    drawPortrait();
    orbitTop = index.bottom - bounds.top + 8;
    // Layout offsets exclude the temporary text transform used during the opening.
    orbitBottom = name.offsetTop - 14;
    host.dataset.cardCount = compact ? '6' : '8';
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    const ratio = Math.max(1, Math.min(devicePixelRatio, 1.5, Math.sqrt(2_000_000 / (width * height))));
    const renderWidth = Math.round(width * ratio);
    const renderHeight = Math.round(height * ratio);
    // Keep all transmission buffers on integer pixels, including fractional OS scaling.
    if (canvas!.width !== renderWidth || canvas!.height !== renderHeight) renderer.setSize(renderWidth, renderHeight, false);
    drawBackdrop();
    render();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(hero);
  resizeObserver.observe(portrait);
  resizeObserver.observe(hero.querySelector('.hero-person')!);
  const motionObserver = new MutationObserver(syncMotion);
  motionObserver.observe(document.body, { attributes: true, attributeFilter: ['data-motion'] });
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncMotion(); });
  intersection.observe(hero);
  const move = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !motionEnabled()) return;
    pointerActivity = 1;
    const bounds = hero!.getBoundingClientRect();
    pointer.set(THREE.MathUtils.clamp((event.clientX - bounds.left) / width * 2 - 1, -1, 1), THREE.MathUtils.clamp(1 - (event.clientY - bounds.top) / height * 2, -1, 1));
  };
  const leave = () => { pointerActivity = 0; pointer.set(0, 0); };
  const portraitEnter = () => { portraitHovered = true; };
  const portraitLeave = () => { portraitHovered = false; };
  const contextLost = (event: Event) => { event.preventDefault(); lost = true; host.dataset.glassState = 'fallback'; cancelAnimationFrame(frame); };
  const contextRestored = () => { lost = false; syncMotion(); };
  hero.addEventListener('pointermove', move);
  hero.addEventListener('pointerleave', leave);
  portrait.addEventListener('pointerenter', portraitEnter);
  portrait.addEventListener('pointerleave', portraitLeave);
  canvas.addEventListener('webglcontextlost', contextLost);
  canvas.addEventListener('webglcontextrestored', contextRestored);
  document.addEventListener('visibilitychange', syncMotion);
  reducedMotion.addEventListener('change', syncMotion);

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    motionObserver.disconnect();
    intersection.disconnect();
    hero!.removeEventListener('pointermove', move);
    hero!.removeEventListener('pointerleave', leave);
    portrait!.removeEventListener('pointerenter', portraitEnter);
    portrait!.removeEventListener('pointerleave', portraitLeave);
    canvas!.removeEventListener('webglcontextlost', contextLost);
    canvas!.removeEventListener('webglcontextrestored', contextRestored);
    document.removeEventListener('visibilitychange', syncMotion);
    reducedMotion.removeEventListener('change', syncMotion);
    window.removeEventListener('pagehide', pageHide);
    window.removeEventListener('pageshow', syncMotion);
    geometry.dispose();
    glass.dispose();
    etching.dispose();
    etchingGeometry.dispose();
    etchingMaterial.dispose();
    backdrop.dispose();
    portraitGeometry.dispose();
    portraitMaterial.dispose();
    portraitTexture.dispose();
    markMaterial.dispose();
    markTexture.dispose();
    environment.dispose();
    renderer.dispose();
  }
  function pageHide(event: PageTransitionEvent) {
    if (event.persisted) cancelAnimationFrame(frame); else dispose();
  }
  window.addEventListener('pagehide', pageHide);
  window.addEventListener('pageshow', syncMotion);
  if (import.meta.hot) import.meta.hot.dispose(dispose);

  try {
    await Promise.all([photo.decode(), avatar.decode(), document.fonts.ready]);
    if (disposed) return;
    ready = true;
    resize();
    syncMotion();
  } catch {
    host.dataset.glassState = 'fallback';
    dispose();
  }
}
