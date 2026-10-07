(() => {
  'use strict';

  const config = window.LoadingScreenConfig || {};
  const muteButton = document.getElementById('mute');
  const slider = document.getElementById('volume');
  const output = document.getElementById('volume-value');
  const label = document.getElementById('mute-label');
  const message = document.getElementById('message');
  const progress = document.getElementById('loading-progress');

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

  function getYouTubeId(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const raw = value.trim();

    if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;

    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, '').toLowerCase();

      if (host === 'youtu.be') {
        const id = url.pathname.split('/').filter(Boolean)[0];
        return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : null;
      }

      if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
        const watchId = url.searchParams.get('v');
        if (/^[A-Za-z0-9_-]{11}$/.test(watchId || '')) return watchId;

        const parts = url.pathname.split('/').filter(Boolean);
        const marker = parts[0];
        if (['embed', 'shorts', 'live'].includes(marker)) {
          const id = parts[1];
          return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : null;
        }
      }
    } catch (_) {}

    return null;
  }

  const videoId = getYouTubeId(config.videoUrl);
  if (!videoId) {
    showMessage('Video unavailable. Connecting to the server…');
    console.error('[simple_loadscreen] Invalid YouTube URL in config.js.');
    return;
  }

  const storageKey = 'simple-loadscreen-audio-v2';
  const clamp = (value, fallback) => typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value)) : fallback;

  let volume = clamp(config.defaultVolume, 0.25);
  let muted = config.startMuted === true;
  let lastAudibleVolume = volume > 0 ? volume : 0.25;
  let player = null;
  let playerReady = false;

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

  function showMessage(text) {
    message.textContent = text;
    message.hidden = false;
  }

  function hideMessage() {
    message.hidden = true;
  }

  function syncControls() {
    const silent = muted || volume === 0;
    slider.value = String(Math.round(volume * 100));
    slider.setAttribute('aria-valuetext', `${slider.value} percent${silent ? ', muted' : ''}`);
    output.textContent = `${slider.value}%`;
    label.textContent = silent ? 'Unmute' : 'Mute';
    muteButton.setAttribute('aria-label', silent ? 'Unmute sound' : 'Mute sound');
    muteButton.setAttribute('aria-pressed', String(silent));
    document.getElementById('sound-waves').toggleAttribute('hidden', silent);
    document.getElementById('sound-off').toggleAttribute('hidden', !silent);

    if (!playerReady || !player) return;

    try {
      player.setVolume(Math.round(volume * 100));
      if (silent) player.mute();
      else player.unMute();
    } catch (_) {}
  }

  function startPlayback() {
    if (!playerReady || !player) return;

    try {
      // Muted autoplay is the most reliable in Chromium/CEF.
      player.mute();
      player.setVolume(Math.round(volume * 100));
      player.playVideo();

      // Restore the configured sound state after playback has started.
      window.setTimeout(() => {
        if (!playerReady || !player) return;
        try {
          if (muted || volume === 0) player.mute();
          else player.unMute();
          player.setVolume(Math.round(volume * 100));
        } catch (_) {}
      }, 600);
    } catch (_) {}
  }

  muteButton.addEventListener('click', () => {
    if (muted || volume === 0) {
      if (volume === 0) volume = lastAudibleVolume;
      muted = false;
    } else {
      muted = true;
    }
    syncControls();
    save();
    startPlayback();
  });

  slider.addEventListener('input', () => {
    volume = clamp(Number(slider.value) / 100, volume);
    muted = volume === 0;
    if (volume > 0) lastAudibleVolume = volume;
    syncControls();
    save();
    startPlayback();
  });

  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player('youtube-player', {
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        loop: 1,
        modestbranding: 1,
        playsinline: 1,
        playlist: videoId,
        rel: 0
      },
      events: {
        onReady: () => {
          playerReady = true;
          syncControls();
          startPlayback();
        },
        onStateChange: event => {
          if (event.data === YT.PlayerState.PLAYING) hideMessage();
          if (event.data === YT.PlayerState.ENDED) {
            try { player.playVideo(); } catch (_) {}
          }
        },
        onError: event => {
          showMessage('Video unavailable. Connecting to the server…');
          console.error('[simple_loadscreen] YouTube player error:', event.data);
        },
        onAutoplayBlocked: () => {
          // The video can still be started from the sound/volume controls.
          showMessage('Click the sound button to start the video.');
        }
      }
    });
  };

  syncControls();

  const api = document.createElement('script');
  api.src = 'https://www.youtube.com/iframe_api';
  api.async = true;
  api.onerror = () => {
    showMessage('Video unavailable. Connecting to the server…');
    console.error('[simple_loadscreen] Could not load the YouTube IFrame API.');
  };
  document.head.appendChild(api);

  window.addEventListener('pagehide', () => {
    playerReady = false;
    if (!player) return;
    try { player.stopVideo(); } catch (_) {}
  });
})();
