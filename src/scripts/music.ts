import type { Soundtrack } from '../data/home';

const player = document.querySelector<HTMLElement>('[data-music-player]');
if (player) {
  const audio = player.querySelector<HTMLAudioElement>('[data-music-audio]')!;
  const play = player.querySelector<HTMLButtonElement>('[data-music-play]')!;
  const previous = player.querySelector<HTMLButtonElement>('[data-music-previous]')!;
  const next = player.querySelector<HTMLButtonElement>('[data-music-next]')!;
  const seek = player.querySelector<HTMLInputElement>('[data-music-seek]')!;
  const volume = player.querySelector<HTMLInputElement>('[data-music-volume]')!;
  const mute = player.querySelector<HTMLButtonElement>('[data-music-mute]')!;
  const repeat = player.querySelector<HTMLButtonElement>('[data-music-repeat]')!;
  const listToggle = player.querySelector<HTMLButtonElement>('[data-music-list]')!;
  const list = player.querySelector<HTMLOListElement>('.music-playlist')!;
  const trackButtons = [...player.querySelectorAll<HTMLButtonElement>('[data-music-track]')];
  const title = player.querySelector<HTMLElement>('[data-music-title]')!;
  const version = player.querySelector<HTMLElement>('[data-music-version]')!;
  const credit = player.querySelector<HTMLElement>('[data-music-credit]')!;
  const author = player.querySelector<HTMLAnchorElement>('[data-music-author]')!;
  const license = player.querySelector<HTMLAnchorElement>('[data-music-license]')!;
  const position = player.querySelector<HTMLElement>('[data-music-position]')!;
  const status = player.querySelector<HTMLElement>('[data-music-status]')!;
  const current = player.querySelector<HTMLElement>('[data-music-current]')!;
  const duration = player.querySelector<HTMLElement>('[data-music-duration]')!;
  const popup = player.querySelector<HTMLElement>('#music-popover')!;
  const trigger = player.querySelector<HTMLButtonElement>('[data-music-trigger]')!;
  const tracks: Soundtrack[] = JSON.parse(player.dataset.playlist || '[]');
  const nativePopover = typeof popup.showPopover === 'function';
  const isPopupOpen = () => nativePopover ? popup.matches(':popover-open') : popup.dataset.open === 'true';
  const resumeKey = 'laplace-music-session';
  let index = 0;
  let pendingTime = 0;
  let resumePlaying = false;
  let wantsPlayback = false;
  let playbackRequest = 0;
  let lastSaved = 0;
  let leaving = false;
  let returnFocus = false;
  let movingBetweenPages = false;
  let continueAfterSwap = false;
  const track = () => tracks[index];
  const format = (seconds: number) => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}` : '--:--';

  function updateProgress() {
    current.textContent = format(audio.readyState ? audio.currentTime : pendingTime);
    duration.textContent = format(audio.duration);
    seek.disabled = !Number.isFinite(audio.duration) || audio.duration <= 0;
    seek.value = String(!seek.disabled ? audio.currentTime / audio.duration * 100 : 0);
    seek.style.setProperty('--progress', `${seek.value}%`);
  }
  function updatePlayback() {
    const playing = !audio.paused && !audio.ended;
    player!.dataset.playing = String(playing);
    play.setAttribute('aria-label', playing ? '暂停' : '播放');
    play.title = playing ? '暂停' : '播放';
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }
  function updateVolume() {
    const muted = audio.muted || audio.volume === 0;
    player!.dataset.muted = String(muted);
    mute.setAttribute('aria-pressed', String(muted));
    mute.setAttribute('aria-label', muted ? '取消静音' : '静音');
    mute.title = muted ? '取消静音' : '静音';
    volume.style.setProperty('--progress', `${audio.volume * 100}%`);
  }
  function savePlayback() {
    if (!track()) return;
    try { sessionStorage.setItem(resumeKey, JSON.stringify({ trackId: track().id, source: track().src, time: audio.readyState ? audio.currentTime : pendingTime, playing: wantsPlayback, muted: audio.muted, savedAt: Date.now() })); } catch {}
  }
  async function startPlayback(blockedMessage = '暂时无法播放，请重试') {
    if (!track()) return;
    const request = ++playbackRequest;
    wantsPlayback = true;
    status.textContent = '加载中';
    if (audio.error) { pendingTime = audio.currentTime || pendingTime; audio.load(); }
    try { await audio.play(); }
    catch {
      // A later selection owns the player; ignore an old play() rejection.
      if (request !== playbackRequest || !wantsPlayback) return;
      wantsPlayback = false;
      updatePlayback();
      status.textContent = blockedMessage;
      savePlayback();
    }
  }
  function pausePlayback() {
    playbackRequest++;
    wantsPlayback = false;
    audio.pause();
    updatePlayback();
    status.textContent = '已暂停';
    savePlayback();
  }
  function selectTrack(nextIndex: number, autoplay = wantsPlayback || !audio.paused, time = 0) {
    if (!tracks.length) return;
    playbackRequest++;
    audio.pause();
    index = (nextIndex % tracks.length + tracks.length) % tracks.length;
    pendingTime = time;
    wantsPlayback = autoplay;
    audio.preload = autoplay || isPopupOpen() ? 'metadata' : 'none';
    audio.src = track().src;
    audio.load();
    title.textContent = track().title;
    version.textContent = track().version;
    const attribution = track().credit;
    credit.hidden = !attribution;
    if (attribution) {
      author.textContent = attribution.artist;
      author.href = attribution.source;
      license.textContent = attribution.license;
      license.href = attribution.licenseUrl;
    }
    position.textContent = `${index + 1} / ${tracks.length}`;
    player!.dataset.trackId = track().id;
    trackButtons.forEach(button => {
      if (button.dataset.musicTrack === track().id) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    play.disabled = false;
    previous.disabled = next.disabled = tracks.length < 2;
    status.textContent = autoplay ? '加载中' : '已暂停';
    updatePlayback();
    current.textContent = format(pendingTime);
    duration.textContent = '--:--';
    seek.disabled = true;
    seek.value = '0';
    seek.style.setProperty('--progress', '0%');
    if ('mediaSession' in navigator && 'MediaMetadata' in window) navigator.mediaSession.metadata = new MediaMetadata({ title: track().title, album: track().version, artist: track().credit?.artist || '' });
    savePlayback();
    if (autoplay) void startPlayback();
  }
  function positionPopup() {
    const anchor = trigger.getBoundingClientRect();
    const width = Math.min(340, innerWidth - 24);
    const top = Math.min(Math.max(12, anchor.bottom + 12), Math.max(12, innerHeight - 340));
    popup.style.setProperty('--music-top', `${top}px`);
    popup.style.setProperty('--music-left', `${Math.max(12, Math.min(anchor.right - width, innerWidth - width - 12))}px`);
  }
  function preparePopup(opening: boolean) {
    trigger.setAttribute('aria-expanded', String(opening));
    if (opening) {
      positionPopup();
      if (track() && audio.paused && audio.readyState === 0) { audio.preload = 'metadata'; audio.load(); }
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

  try {
    const savedVolume = Number(localStorage.getItem('laplace-volume') ?? .5);
    audio.volume = Number.isFinite(savedVolume) ? Math.max(0, Math.min(1, savedVolume)) : .5;
    audio.loop = localStorage.getItem('laplace-loop') === 'on';
  } catch { audio.volume = .5; }
  volume.value = String(audio.volume);
  repeat.setAttribute('aria-pressed', String(audio.loop));
  repeat.title = audio.loop ? '单曲循环' : '列表循环';
  updateVolume();
  try {
    const saved = JSON.parse(sessionStorage.getItem(resumeKey) || 'null');
    const savedId = tracks.findIndex(item => item.id === saved?.trackId);
    const restored = savedId >= 0 ? savedId : tracks.findIndex(item => item.src === saved?.source);
    if (restored >= 0 && Number.isFinite(saved.time) && saved.time >= 0) {
      index = restored;
      pendingTime = saved.time;
      audio.muted = saved.muted === true;
      resumePlaying = saved.playing === true && Date.now() - saved.savedAt < 30_000;
      updateVolume();
    }
  } catch {}
  selectTrack(index, false, pendingTime);

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
  const followMusicLink = () => {
    if (location.hash === '#listening') { openPopup(); history.replaceState(history.state, '', location.pathname + location.search); }
  };
  followMusicLink();
  document.addEventListener('astro:before-swap', () => {
    continueAfterSwap = wantsPlayback;
    movingBetweenPages = true;
    closePopup();
  });
  document.addEventListener('astro:after-swap', () => {
    movingBetweenPages = false;
    if (continueAfterSwap && audio.paused) void startPlayback('点击继续播放');
    positionPopup();
  });
  document.addEventListener('astro:page-load', followMusicLink);

  play.addEventListener('click', () => { if (wantsPlayback || !audio.paused) pausePlayback(); else void startPlayback(); });
  previous.addEventListener('click', () => selectTrack(index - 1));
  next.addEventListener('click', () => selectTrack(index + 1));
  listToggle.addEventListener('click', () => {
    list.hidden = !list.hidden;
    listToggle.setAttribute('aria-expanded', String(!list.hidden));
  });
  trackButtons.forEach(button => button.addEventListener('click', () => {
    const chosen = tracks.findIndex(item => item.id === button.dataset.musicTrack);
    if (chosen < 0) return;
    if (chosen === index) void startPlayback(); else selectTrack(chosen, true);
  }));
  audio.addEventListener('play', () => {
    if (audio.paused) return;
    wantsPlayback = true;
    updatePlayback();
    status.textContent = '正在播放';
    savePlayback();
  });
  audio.addEventListener('pause', () => {
    if (leaving || movingBetweenPages || !audio.paused || (wantsPlayback && audio.readyState === 0)) return;
    wantsPlayback = false;
    updatePlayback();
    status.textContent = audio.ended ? '播放结束' : '已暂停';
    savePlayback();
  });
  audio.addEventListener('ended', () => { if (!audio.loop) selectTrack(index + 1, true); });
  audio.addEventListener('error', () => {
    if (!audio.error) return;
    wantsPlayback = false;
    updatePlayback();
    status.textContent = '音频加载失败';
    play.setAttribute('aria-label', '重试播放');
    play.title = '重试播放';
    savePlayback();
  });
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
    audio.loop = !audio.loop;
    repeat.setAttribute('aria-pressed', String(audio.loop));
    repeat.title = audio.loop ? '单曲循环' : '列表循环';
    try { localStorage.setItem('laplace-loop', audio.loop ? 'on' : 'off'); } catch {}
  });
  if ('mediaSession' in navigator) {
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => { void startPlayback(); }], ['pause', pausePlayback],
      ['previoustrack', () => selectTrack(index - 1)], ['nexttrack', () => selectTrack(index + 1)],
      ['seekto', event => { if (event.seekTime !== undefined && Number.isFinite(audio.duration)) { audio.currentTime = Math.min(audio.duration, Math.max(0, event.seekTime)); updateProgress(); savePlayback(); } }],
    ];
    handlers.forEach(([action, handler]) => { try { navigator.mediaSession.setActionHandler(action, handler); } catch {} });
  }
  if (track() && resumePlaying) {
    audio.preload = 'metadata';
    void startPlayback('点击继续播放');
  }
  window.addEventListener('pagehide', () => { savePlayback(); leaving = true; });
  window.addEventListener('pageshow', () => { leaving = false; });
}
