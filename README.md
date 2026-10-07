# 4State FiveM Loading Screen - Native Video

This version uses a normal HTML `<video>` element and streams the MP4 from this GitHub Release asset:

`https://github.com/Chefen23/4state-loadscreen/releases/download/v1/loading.mp4`

There is no YouTube iframe, so there is no YouTube title, channel name, logo, recommendation UI, or player branding.

## GitHub Pages

Upload/replace these files in the ROOT of the `Chefen23/4state-loadscreen` repository:

- `index.html`
- `style.css`
- `config.js`
- `app.js`

Keep GitHub Pages publishing from `main` / root.

## Audio

`startMuted` is set to `false`, so the page attempts autoplay with sound. Chromium may still block unmuted autoplay. If that happens, the first click anywhere on the page starts the video with sound; this version never deliberately falls back to muted autoplay.
