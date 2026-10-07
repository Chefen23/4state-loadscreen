'use strict';
window.LoadingScreenConfig = Object.freeze({
  // Direct MP4 hosted as a GitHub Release asset. No YouTube player is used.
  videoUrl: 'https://github.com/Chefen23/4state-loadscreen/releases/download/v1/loading.mp4',
  defaultVolume: 0.25,     // 0.0 to 1.0. Players can adjust it.
  startMuted: false,       // Keep false to attempt autoplay WITH sound.
  rememberVolume: true,   // Remember volume/mute on each player's PC.
  progressBarColor: '#3b82f6',
});
