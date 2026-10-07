(() => {
  'use strict';

  const config = window.LoadingScreenConfig || {};
  const video = document.getElementById('background-video');
  const muteButton = document.getElementById('mute');
  const slider = document.getElementById('volume');
  const output = document.getElementById('volume-value');
  const label = document.getElementById('mute-label');
  const message = document.getElementById('message');
  const progress = document.getElementById('loading-progress');
  const audioControls = document.querySelector('.audio-controls');

  const barColor = config.progressBarColor;
  if (typeof barColor === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(barColor)) {
    progress.style.setProperty('--progress-color', barColor);
  }

  window.addEventListener('message', event => {
    const data = event.data;
    if (!data || data.eventName !== 'loadProgress') return;
    if (typeof data.loadFraction !== 'number' || !Number.isFinite(data.loadFraction)) return;
    progress.value = Math.max(0, Math.min(1, data.loadFraction));
  });

  const isHttpsUrl = value => {
    if (typeof value !== 'string' || !value.trim()) return false;
    try {
      return new URL(value.trim()).protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  function showMessage(text) {
    message.textContent = text;
    message.hidden = false;
  }

  function hideMessage() {
    message.hidden = true;
  }

  if (!isHttpsUrl(config.videoUrl)) {
    showMessage('Video unavailable. Connecting to the server…');
    console.error('[simple_loadscreen] Invalid HTTPS video URL in config.js.');
    return;
  }

  // New key so an old saved YouTube mute state cannot make the first native-video launch muted.
  const storageKey = 'simple-loadscreen-audio-native-v1';
  const clamp = (value, fallback) => typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value)) : fallback;

  let volume = clamp(config.defaultVolume, 0.25);
  let muted = config.startMuted === true;
  let lastAudibleVolume = volume > 0 ? volume : 0.25;
  let autoplayBlocked = false;

  if (config.rememberVolume !== false) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && typeof saved === 'object') {
        volume = clamp(saved.volume, volume);
        if (typeof saved.muted === 'boolean') muted = saved.muted;
        lastAudibleVolume = clamp(saved.lastAudibleVolume, lastAudibleVolume) || 0.25;
      }
    } catch (_) {}
  }

  function save() {
    if (config.rememberVolume === false) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ volume, muted, lastAudibleVolume }));
    } catch (_) {}
  }

  function syncControls() {
    const silent = muted || volume === 0;

    video.volume = volume;
    video.muted = silent;

    slider.value = String(Math.round(volume * 100));
    slider.setAttribute('aria-valuetext', `${slider.value} percent${silent ? ', muted' : ''}`);
    output.textContent = `${slider.value}%`;
    label.textContent = silent ? 'Unmute' : 'Mute';
    muteButton.setAttribute('aria-label', silent ? 'Unmute sound' : 'Mute sound');
    muteButton.setAttribute('aria-pressed', String(silent));
    document.getElementById('sound-waves').toggleAttribute('hidden', silent);
    document.getElementById('sound-off').toggleAttribute('hidden', !silent);
  }

  async function tryPlay() {
    try {
      await video.play();
      autoplayBlocked = false;
      hideMessage();
    } catch (error) {
      autoplayBlocked = true;
      if (error && error.name === 'NotAllowedError') {
        showMessage('Click anywhere to start the video with sound.');
      } else {
        showMessage('Video could not start. Connecting to the server…');
        console.error('[simple_loadscreen] Video playback failed:', error);
      }
    }
  }

  muteButton.addEventListener('click', event => {
    event.stopPropagation();
    if (muted || volume === 0) {
      if (volume === 0) volume = lastAudibleVolume;
      muted = false;
    } else {
      muted = true;
    }
    syncControls();
    save();
    tryPlay();
  });

  slider.addEventListener('input', event => {
    event.stopPropagation();
    volume = clamp(Number(slider.value) / 100, volume);
    muted = volume === 0;
    if (volume > 0) lastAudibleVolume = volume;
    syncControls();
    save();
    tryPlay();
  });

  // If Chromium/FiveM blocks unmuted autoplay, the first user click anywhere starts it with sound.
  document.addEventListener('pointerdown', event => {
    if (!autoplayBlocked || audioControls.contains(event.target)) return;
    tryPlay();
  });

  video.addEventListener('playing', hideMessage);
  video.addEventListener('canplay', tryPlay, { once: true });
  video.addEventListener('error', () => {
    const mediaError = video.error;
    showMessage('External video could not load. Check the GitHub Release asset URL and codec support.');
    console.error('[simple_loadscreen] External video could not load.', mediaError ? mediaError.code : 'unknown');
  });

  video.controls = false;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = config.videoUrl.trim();

  syncControls();
  video.load();
  tryPlay();

  window.addEventListener('pagehide', () => {
    try { video.pause(); } catch (_) {}
    video.removeAttribute('src');
    try { video.load(); } catch (_) {}
  });
})();
