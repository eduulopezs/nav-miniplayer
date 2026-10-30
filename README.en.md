# Nav Miniplayer

**English** · [Español](README.md)

[![CI](https://github.com/eduulopezs/nav-miniplayer/actions/workflows/ci.yml/badge.svg)](https://github.com/eduulopezs/nav-miniplayer/actions/workflows/ci.yml)
[![CodeQL](https://github.com/eduulopezs/nav-miniplayer/actions/workflows/codeql.yml/badge.svg)](https://github.com/eduulopezs/nav-miniplayer/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4)
![Chrome 116+](https://img.shields.io/badge/Chrome-%E2%89%A5%20116-brightgreen)

A floating mini player for the audio and video of any Chrome or Edge tab, always on top of your other windows.
Play/pause, ±10 s, previous and next track, a progress bar and four designs, without leaving what you are doing.

<p align="center">
  <img src="docs/screenshots/glass.png" width="340" alt="Glassware design: translucent glass card with colour ribbons and playback controls">
  <img src="docs/screenshots/noir.png" width="340" alt="Noir design: black and signal red with black-and-white cover art">
  <img src="docs/screenshots/crt.png" width="340" alt="Terminal CRT design: amber phosphor with scanlines">
  <img src="docs/screenshots/metal.png" width="340" alt="Liquid Metal design: chrome metal with a colour ring">
</p>

## Install
Same code for Chrome and Edge (version 116 or later).

**From GitHub Releases** (once a release is published):
1. Download the `.zip` of the latest version from [Releases](https://github.com/eduulopezs/nav-miniplayer/releases) and unzip it.
2. Open `chrome://extensions` (or `edge://extensions`), turn on **Developer mode** and click **Load unpacked**.
3. Pick the unzipped folder (the one containing `manifest.json`).

**From source:**
```
git clone https://github.com/eduulopezs/nav-miniplayer.git
cd nav-miniplayer
npm run zip        # optional: builds dist/nav-miniplayer-<version>.zip
```
Load the repository folder as described above. Using it needs no build step and no dependencies.

The first time, **Settings** opens: turn on **Site access** so the player loads by itself on every page (optional permission; open tabs get it as soon as you grant it). Without that access, clicking the icon or using a shortcut loads it in the active tab, but previous/next may not work on sites that register their controls earlier. While audio/video plays, click the extension icon to open the mini player.

## Usage
- Play/pause, ±10 s, previous/next (uses the site's Media Session; works on YouTube/Spotify Web).
- Detects the page's `<audio>`/`<video>`, detached `new Audio()` and media inside shadow DOM (open or closed), whether `play()` is called or they start on their own with `autoplay`. If several are playing it picks the one with sound, then the last one that played, then the longest; muted looping background videos are ignored. Iframe media (including detached) is supported too, through a headless agent in every subframe. Out of scope: Media Session inside an iframe, and media created in a foreign document (`createElement` of another `document`).
- Each design's progress bar seeks on click or drag and shows the time under the pointer.
- **Right-click on the card**: menu with volume, speed (0.5x to 3x), skip step (5, 10, 15 or 30 s), design and copy the link at the current time (timestamped on YouTube and Vimeo; the page link elsewhere). The **mouse wheel** over the card changes volume in 5 % steps, and volume is remembered per site. Volume and speed only act on DOM media (not on iframe or detached media). The framed floating window has no menu.
- **Blurred cover**: one click on the cover art blurs it (another click restores it; Enter or Space also work) and the preference is remembered. Medium and large layouts also get a **volume slider** next to the mute button, using the same per-site volume.
- **Hover thumbnail on the bar** (YouTube): the video's storyboard thumbnail and its time appear over the progress bar when the card has room. The service worker downloads the sheets, only from ytimg.com.
- **Shortcuts** (changeable at `chrome://extensions/shortcuts`): Alt+Shift+M show/hide, Alt+Shift+P play/pause, Alt+Shift+, and Alt+Shift+. rewind and forward; previous and next track have no default key.
- Size: resize the window from any edge or corner; the content adapts in real time (pill, row, compact, cover or wide depending on the space).
- It only appears when you click the extension icon (left click; another click closes it): a framed floating window (Document Picture-in-Picture, Chrome/Edge 116+; the native title bar cannot be removed from an extension), always on top even if you minimise the browser, with the full card and its buttons. If the browser does not allow document PiP, the separate window opens as a fallback.
- Keyboard: Tab focuses the player; **Space** or **K** play/pause, **←/→** ±10 s, **Esc** hides it. Progress and track are announced to screen readers, and with "reduce motion" enabled long titles are truncated instead of scrolling.

### Separate window (all tabs)
Right-click the icon → **Open separate window (all tabs)** (or the "Open the separate window with all tabs" shortcut, no default key). It is an extension window that needs neither a gesture on the page nor Picture-in-Picture, with the same designs and layouts: at the top there is one pill per tab with sound (icon and title), the ↗ button takes you to the chosen tab, and the controls, progress bar and keyboard (Space, ←/→) act on it. By default it shows the one that is playing. It remembers its position and size. While it is closed, tabs report nothing.

### Designs
Right-click the icon → **Design** to switch the look live (applied to the open window):
- **Glassware**: translucent glass with colour ribbons that follow the music and a palette taken from the cover art.
- **Noir**: black and signal red, black-and-white cover, barcode and spectrum relief.
- **Terminal CRT**: amber phosphor with tube curvature, scanlines and a text equaliser.
- **Liquid Metal**: chrome metal with moving mercury and a colour ring.

For the visualizer to follow the tab's real audio, tick **Visualizer with the tab's real audio** in the icon menu; capture starts with the click on the icon and the browser shows its indicator. Without it, the visualizer is simulated.

The card adapts to its size (pill, row, compact, cover, wide) with container queries. Fonts are loaded from the extension itself. The interface is available in Spanish and English (`_locales/`).

## Compatibility

✅ tested by hand (the card appears, play/pause and ±10 s act on the media) · ☑️ assumed, not tested yet.

| Site | Status | Notes |
|---|---|---|
| YouTube | ✅ | With an ad in front, the card follows whichever media is playing at that moment. |
| YouTube Music | ☑️ | Rejects automated Chromium; must be tried in a regular Chrome. |
| Spotify Web | ☑️ | Needs a session and DRM. |
| SoundCloud | ☑️ | |
| Twitch | ☑️ | |
| Embedded Vimeo | ☑️ | Iframe; covered by the e2e tests with local iframes. |
| News video | ☑️ | |

## Permissions and privacy
The extension has no server of its own and no telemetry. Settings and per-site volume are stored in `chrome.storage.local`.

| Permission | Why |
|---|---|
| `activeTab`, `scripting` | Load the player in the active tab when you click the icon or use a shortcut. |
| `storage` | Save settings, design and per-site volume. |
| `contextMenus` | The icon menu (design, separate window, visualizer). |
| `tabCapture`, `offscreen` | Only if you enable the real-audio visualizer; audio keeps playing as usual and the browser shows its capture indicator. |
| `<all_urls>` (optional) | Site access, only if you grant it in **Settings**, to load the player automatically on every page. |

The only network requests are made by the service worker: cover art (public `http(s)` URLs only, no cookies, size-capped) and YouTube thumbnail sheets. Details in [SECURITY.md](SECURITY.md) (threat model and known limits; in Spanish) and [PRIVACY.md](PRIVACY.md).

## Structure
```
manifest.json
_locales/                        strings in es and en
design/tokens.json               single source of tokens (primitives and per-design semantics)
src/
  background/
    service-worker.js            icon click, context menu, cover download and iframe message relay
    sessions.js                  sessions of all tabs, separate-window commands and opening
    injection.js                 dynamic registration and injection of the content scripts
    migrate.js                   storage migration between schema versions
    net-guard.js                 network rules for cover art (allowed URLs, image detection by bytes)
  page/media-session-bridge.js   page world: captures Media Session handlers and watches detached or shadow-DOM media
  content/
    config.js                    constants and storage keys
    util.js                      clamp and time formatting
    media.js                     remote media (from the bridge and iframes) and selection policy
    frame-agent.js               headless agent in each iframe: reports to the top frame and runs its commands
    tokens.js                    GENERATED from design/tokens.json (CSS variables and palette colours)
    styles.js                    player CSS; only uses var(--token)
    fonts.js                     loading of the bundled fonts
    viz.js                       visualizer engine (spectrum and waveform)
    menu.js                      right-click menu on the card
    storyboard.js                hover thumbnail on the bar (YouTube)
    skins/                       the four designs: glass, noir, crt, metal
    player.js                    DOM, state, framed window and keyboard
  offscreen/                     document that analyses the captured audio
  options/                       Settings page
  window/                        separate window (all tabs)
  fonts/                         woff2 fonts and LICENSES.txt
scripts/                         zip.mjs, build-tokens.mjs, contrast.mjs, check.mjs, security.mjs and smoke.mjs
tests/e2e/                       Playwright e2e tests
docs/screenshots/                screenshots used by this README
```
The `content/` modules load in the order set by `injection.js` and share the `__NMP` namespace.

### Design tokens
Colours live in `design/tokens.json` in three layers: **primitives** (`lavender-300`), **per-design semantics** (`ac`, `fg`, `track`, `play-bg`…) and, in the CSS, the components that consume them with `var(--token)`. Values accept `{primitive}` or `{primitive}@alpha`.

- `npm run tokens` regenerates `src/content/tokens.js` (do not edit it by hand; `npm test` fails if it is stale).
- `npm run contrast` audits the WCAG text/background contrast of each design; `npm test` runs it with `--strict`, so a token dropping below its minimum breaks the check (Glass is approximate: its background is translucent).

## Development
Requires Node 22 or later.
- `npm test`: fast check with no browser (manifest, syntax, tokens, contrast, security and smoke).
- `npm run e2e`: tests in Chromium with the extension loaded. First time: `npm ci` and `npx playwright install chromium`. Design screenshots land in `tests/e2e/__shots__/` (git-ignored); the ones in this README are copies in `docs/screenshots/`.
- `npm run zip`: builds `dist/nav-miniplayer-<version>.zip`.
- GitHub Actions (`.github/workflows/ci.yml`) runs two separate jobs on every PR: the quick checks (`npm test` and `npm run zip`, which uploads the zip as an artifact) and the e2e tests in Chromium.

The version lives only in the `version` field of `manifest.json`.

## Contributing
Contributions are welcome: read [CONTRIBUTING.md](CONTRIBUTING.md). Changes per release are in [CHANGELOG.md](CHANGELOG.md). To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License and credits
[MIT](LICENSE). The bundled fonts (JetBrains Mono, Archivo Narrow, Space Mono, Figtree, Syne, VT323 and Montserrat) are distributed under the SIL Open Font License 1.1 and keep their original copyright; see [src/fonts/LICENSES.txt](src/fonts/LICENSES.txt).
