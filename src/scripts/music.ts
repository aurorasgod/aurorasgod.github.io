const player = document.querySelector<HTMLElement>('[data-music-player]');
if (player) {
  const audio = player.querySelector<HTMLAudioElement>('[data-music-audio]')!;
  const play = player.querySelector<HTMLButtonElement>('[data-music-play]')!;
  const seek = player.querySelector<HTMLInputElement>('[data-music-seek]')!;
  const volume = player.querySelector<HTMLInputElement>('[data-music-volume]')!;
  const mute = player.querySelector<HTMLButtonElement>('[data-music-mute]')!;
  const repeat = player.querySelector<HTMLButtonElement>('[data-music-repeat]')!;
  const status = player.querySelector<HTMLElement>('[data-music-status]')!;
  const current = player.querySelector<HTMLElement>('[data-music-current]')!;
  const duration = player.querySelector<HTMLElement>('[data-music-duration]')!;
  const source = player.dataset.audioSrc;
  const popup = player.querySelector<HTMLElement>('#music-popover')!;
  const trigger = player.querySelector<HTMLButtonElement>('[data-music-trigger]')!;
  const nativePopover = typeof popup.showPopover === 'function';
  const isPopupOpen = () => nativePopover ? popup.matches(':popover-open') : popup.dataset.open === 'true';
  const resumeKey = 'laplace-music-session';
  let pendingTime = 0;
  let resumePlaying = false;
  let lastSaved = 0;
  let leaving = false;
  let returnFocus = false;
  const format = (seconds: number) => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}` : '--:--';
  function updateProgress() {
    current.textContent = format(audio.currentTime);
    duration.textContent = format(audio.duration);
    seek.disabled = !Number.isFinite(audio.duration);
    seek.value = String(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration * 100 : 0);
    seek.style.setProperty('--progress', `${seek.value}%`);
  }
  function updateVolume() {
    const muted = audio.muted || audio.volume === 0;
    player!.dataset.muted = String(muted);
    mute.setAttribute('aria-pressed', String(muted));
    mute.setAttribute('aria-label', muted ? '取消静音' : '静音');
    mute.title = muted ? '取消静音' : '静音';
    volume.style.setProperty('--progress', `${audio.volume * 100}%`);
  }
  try {
    const saved = Number(localStorage.getItem('laplace-volume') ?? .5);
    audio.volume = Number.isFinite(saved) ? Math.max(0, Math.min(1, saved)) : .5;
    audio.loop = localStorage.getItem('laplace-loop') !== 'off';
  } catch { audio.volume = .5; }
  volume.value = String(audio.volume);
  repeat.setAttribute('aria-pressed', String(audio.loop));
  updateVolume();
  if (source) { audio.src = source; play.disabled = false; status.textContent = '已暂停'; }
  try {
    const saved = JSON.parse(sessionStorage.getItem(resumeKey) || 'null');
    if (saved?.source === source && Number.isFinite(saved.time) && saved.time >= 0) {
      pendingTime = saved.time;
      audio.muted = saved.muted === true;
      resumePlaying = saved.playing === true && Date.now() - saved.savedAt < 30_000;
      current.textContent = format(pendingTime);
      updateVolume();
    }
  } catch {}
  function savePlayback() {
    try { sessionStorage.setItem(resumeKey, JSON.stringify({ source, time: audio.readyState ? audio.currentTime : pendingTime, playing: !audio.paused && !audio.ended, muted: audio.muted, savedAt: Date.now() })); } catch {}
  }
  function positionPopup() {
    const anchor = trigger.getBoundingClientRect();
    const width = Math.min(340, innerWidth - 24);
    const top = Math.min(Math.max(12, anchor.bottom + 12), Math.max(12, innerHeight - 280));
    popup.style.setProperty('--music-top', `${top}px`);
    popup.style.setProperty('--music-left', `${Math.max(12, Math.min(anchor.right - width, innerWidth - width - 12))}px`);
  }
  function preparePopup(opening: boolean) {
    trigger.setAttribute('aria-expanded', String(opening));
    if (opening) {
      positionPopup();
      if (source && audio.paused && audio.readyState === 0) { audio.preload = 'metadata'; audio.load(); }
    } else returnFocus = popup.contains(document.activeElement);
  }
  function focusPopup(opening: boolean) {
    if (opening) play.focus({ preventScroll: true });
    else if (returnFocus && (document.activeElement === document.body || popup.contains(document.activeElement))) trigger.focus({ preventScroll: true });
  }
  function openPopup() {
    if (nativePopover) { popup.showPopover(); return; }
    preparePopup(true);
    popup.dataset.open = 'true';
    focusPopup(true);
  }
  function closePopup() {
    if (!isPopupOpen()) return;
    if (nativePopover) { popup.hidePopover(); return; }
    preparePopup(false);
    popup.dataset.open = 'false';
    focusPopup(false);
  }
  if (nativePopover) {
    popup.addEventListener('beforetoggle', event => preparePopup((event as ToggleEvent).newState === 'open'));
    popup.addEventListener('toggle', event => focusPopup((event as ToggleEvent).newState === 'open'));
  } else {
    popup.removeAttribute('popover');
    trigger.addEventListener('click', () => isPopupOpen() ? closePopup() : openPopup());
    player.querySelector('[data-music-close]')?.addEventListener('click', closePopup);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closePopup(); });
  }
  window.addEventListener('resize', positionPopup);
  window.addEventListener('scroll', () => { if (isPopupOpen()) positionPopup(); }, { passive: true });
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('[data-open-search],[data-study-search],[data-menu-toggle],[data-study-menu]')
      || (!nativePopover && !popup.contains(event.target) && !trigger.contains(event.target))) closePopup();
  });
  if (location.hash === '#listening') { openPopup(); history.replaceState(history.state, '', location.pathname + location.search); }
  play.addEventListener('click', async () => {
    if (!source) return;
    if (!audio.paused) { audio.pause(); return; }
    status.textContent = '加载中';
    try { await audio.play(); } catch { status.textContent = '暂时无法播放，请重试'; }
  });
  audio.addEventListener('play', () => {
    player.dataset.playing = 'true';
    play.setAttribute('aria-label', '暂停'); play.title = '暂停'; status.textContent = '正在播放';
    savePlayback();
  });
  audio.addEventListener('pause', () => {
    player.dataset.playing = 'false';
    play.setAttribute('aria-label', '播放'); play.title = '播放'; status.textContent = audio.ended ? '播放结束' : '已暂停';
    if (!leaving) savePlayback();
  });
  audio.addEventListener('ended', () => { player.dataset.playing = 'false'; play.setAttribute('aria-label', '播放'); play.title = '播放'; status.textContent = '播放结束'; });
  audio.addEventListener('error', () => { status.textContent = '音频加载失败'; player.dataset.playing = 'false'; play.setAttribute('aria-label', '重试播放'); });
  audio.addEventListener('loadedmetadata', () => {
    if (pendingTime > 0 && Number.isFinite(audio.duration)) { audio.currentTime = Math.min(pendingTime, Math.max(0, audio.duration - .1)); pendingTime = 0; }
    updateProgress();
  });
  audio.addEventListener('timeupdate', () => {
    updateProgress();
    if (Date.now() - lastSaved > 1000) { savePlayback(); lastSaved = Date.now(); }
  });
  audio.addEventListener('durationchange', updateProgress);
  seek.addEventListener('input', () => {
    if (Number.isFinite(audio.duration)) { audio.currentTime = Number(seek.value) / 100 * audio.duration; updateProgress(); savePlayback(); }
  });
  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value); audio.muted = false; updateVolume();
    try { localStorage.setItem('laplace-volume', volume.value); } catch {}
  });
  mute.addEventListener('click', () => { audio.muted = !audio.muted; updateVolume(); savePlayback(); });
  repeat.addEventListener('click', () => {
    audio.loop = !audio.loop; repeat.setAttribute('aria-pressed', String(audio.loop));
    try { localStorage.setItem('laplace-loop', audio.loop ? 'on' : 'off'); } catch {}
  });
  if (source && resumePlaying) {
    audio.preload = 'metadata';
    void audio.play().catch(() => { status.textContent = '点击继续播放'; });
  }
  window.addEventListener('pagehide', () => { savePlayback(); leaving = true; });
  window.addEventListener('pageshow', () => { leaving = false; });
}
