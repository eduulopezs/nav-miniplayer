(() => {
  if (window.top !== window || window.__glassMiniPlayer) return;
  window.__glassMiniPlayer = true;

  const SKIP = 10;
  const MIN_DURATION = 30; // s; ignora sonidos/clips cortos
  const MARGIN = 24;
  const EDGE = 8; // px de borde que actúan como barra de progreso arrastrable
  const POS_KEY = 'mp_pos';
  const SIZE_KEY = 'mp_size';
  const THEME_KEY = 'mp_theme'; // desarrollo: 'glass' | 'brutal' | 'pixel' | 'retro'
  const MODE_KEY = 'mp_mode'; // 'pip' (vídeo, sin marco) | 'win' (ventana con controles propios) | 'card' (en la página)
  const SLIM = { w: 380, h: 56 }, SLIM_BELOW = 84;
  const DESIGN = { w: 312, h: 126 }; // tamaño base; el contenido se reescala a partir de él
  const MIN = { w: 240, h: 44 }, MAX = { w: 800, h: 420 };

  const SITE_BUTTONS = {
    prev: ['.ytp-prev-button', '[data-testid="control-button-skip-back"]'],
    next: ['.ytp-next-button', '[data-testid="control-button-skip-forward"]'],
  };

  const icons = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="2.4" height="14" rx="1.1"/><path d="M19 6.1v11.8a.9.9 0 0 1-1.4.75L9.3 12.75a.9.9 0 0 1 0-1.5l8.3-5.9a.9.9 0 0 1 1.4.75z"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="16.6" y="5" width="2.4" height="14" rx="1.1"/><path d="M5 6.1v11.8a.9.9 0 0 0 1.4.75l8.3-5.9a.9.9 0 0 0 0-1.5L6.4 5.35A.9.9 0 0 0 5 6.1z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5a8 8 0 1 1-7.6 5.5"/><path d="M12 1.5 8.8 4.5 12 7.5"/><text x="12" y="15.2" text-anchor="middle" font-size="7.4" font-weight="700" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">10</text></svg>',
    fwd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5a8 8 0 1 0 7.6 5.5"/><path d="m12 1.5 3.2 3-3.2 3"/><text x="12" y="15.2" text-anchor="middle" font-size="7.4" font-weight="700" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">10</text></svg>',
    pip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><rect x="12" y="11.5" width="7" height="5" rx="1" fill="currentColor" stroke="none"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3v11.3A3.5 3.5 0 1 1 15 11V6.2L9 7.5v9.8A3.5 3.5 0 1 1 7 14V5.6a1 1 0 0 1 .8-1l8.2-1.7A1 1 0 0 1 17 3z"/></svg>',
  };

  // ---------- DOM ----------
  const host = document.createElement('div');
  host.id = 'glass-mini-player-host';
  host.style.cssText = 'all:initial;position:fixed;left:0;top:0;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'open' });

  root.innerHTML = `
<style>
  :host { all: initial; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .card {
    --art: none;
    position: relative; width: 312px; height: 126px; padding: 0;
    border-radius: var(--r, 22px); overflow: hidden; color: #fff;
    font-family: "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
    background: linear-gradient(145deg, rgba(255,255,255,.20), rgba(255,255,255,.05)), rgba(22,22,28,.46);
    -webkit-backdrop-filter: blur(28px) saturate(185%); backdrop-filter: blur(28px) saturate(185%);
    box-shadow: 0 18px 48px rgba(0,0,0,.38), 0 2px 8px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.38), inset 0 -1px 0 rgba(255,255,255,.06);
    user-select: none; -webkit-user-select: none; touch-action: none; cursor: grab;
    opacity: 0; transform: translateY(8px) scale(.96); pointer-events: none;
    transition: opacity .25s ease, transform .25s ease;
  }
  .card.show { opacity: 1; transform: none; pointer-events: auto; }
  .card.dragging { cursor: grabbing; transition: opacity .25s ease; }
  .card.edge { cursor: pointer; }
  .glow {
    position: absolute; inset: -40px; z-index: 0; background: var(--art) center/cover;
    filter: blur(36px) saturate(1.6); opacity: .42; transition: opacity .4s; pointer-events: none;
  }
  .ring { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 3; pointer-events: none; overflow: visible; }
  .ring rect { x: 1.25px; y: 1.25px; width: calc(100% - 2.5px); height: calc(100% - 2.5px); rx: calc(var(--r, 22px) - 1.25px); fill: none; stroke-width: 2.5; }
  .ring .track { stroke: rgba(255,255,255,.14); }
  .ring .bar { stroke: url(#g); stroke-linecap: round; stroke-dasharray: 0 100; transition: stroke-dasharray .3s linear; filter: drop-shadow(0 0 4px rgba(150,190,255,.7)); }
  .top, .controls { position: relative; z-index: 2; }
  .top { display: flex; align-items: center; gap: 12px; }
  .art {
    flex: none; width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center;
    background: var(--art) center/cover, linear-gradient(135deg, #7c8cff, #c77dff);
    box-shadow: 0 4px 14px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.2);
  }
  .art svg { width: 22px; height: 22px; opacity: .85; }
  .art.has-img svg { display: none; }
  .meta { flex: 1; min-width: 0; }
  .title { font-size: 13.5px; font-weight: 600; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 6px rgba(0,0,0,.35); }
  .scroll > span { display: inline-block; animation: marquee var(--t, 6s) ease-in-out infinite alternate; }
  @keyframes marquee { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(var(--d)); } }
  .scroll { text-overflow: clip !important; }
  .artist { font-size: 12px; opacity: .68; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .controls { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
  .time { width: 38px; font-size: 11px; font-variant-numeric: tabular-nums; opacity: .62; }
  .time.end { text-align: right; }
  .buttons { display: flex; align-items: center; gap: 2px; }
  button {
    all: unset; box-sizing: border-box; display: grid; place-items: center; cursor: pointer;
    width: 32px; height: 32px; border-radius: 50%; color: rgba(255,255,255,.88);
    transition: background .15s, transform .12s, opacity .15s;
  }
  button svg { width: 20px; height: 20px; }
  button:hover { background: rgba(255,255,255,.16); color: #fff; }
  button:active { transform: scale(.9); }
  button:focus-visible { outline: 2px solid rgba(255,255,255,.8); outline-offset: 1px; }
  button[disabled] { opacity: .32; pointer-events: none; }
  .play { width: 44px; height: 44px; margin: 0 4px; background: #fff; color: #15151b; box-shadow: 0 4px 16px rgba(0,0,0,.3); }
  .play:hover { background: #fff; transform: scale(1.06); color: #000; }
  .play:active { transform: scale(.95); }
  .play svg { width: 22px; height: 22px; }
  .side { flex: none; display: flex; flex-direction: column; gap: 2px; }
  .side button { width: 22px; height: 22px; opacity: .7; }
  .side button:hover { opacity: 1; }
  .side .close { opacity: .45; }
  .close svg { width: 12px; height: 12px; }
  .mode svg { width: 14px; height: 14px; }
  .card.pip { width: 100% !important; height: 100% !important; cursor: default; box-shadow: none; border-radius: 0; background: linear-gradient(145deg, #3a3a52, #1b1b24); -webkit-backdrop-filter: none; backdrop-filter: none; }
  .card.pip .grip:not(.br) { display: none; }
  .card.pip .grip.br { right: 0; bottom: 0; }
  .inner { position: relative; z-index: 2; display: flex; flex-direction: column; justify-content: space-between; padding: 16px 18px 14px; }
  .grip { position: absolute; width: 18px; height: 18px; z-index: 4; opacity: 0; transition: opacity .15s; }
  .grip::after { content: ''; position: absolute; width: 8px; height: 8px; border: 0 solid #fff; }
  .grip.br { right: calc(var(--r, 22px) * .25); bottom: calc(var(--r, 22px) * .25); cursor: nwse-resize; } .grip.br::after { right: 3px; bottom: 3px; border-width: 0 2px 2px 0; border-bottom-right-radius: 5px; }
  .grip.bl { left: calc(var(--r, 22px) * .25); bottom: calc(var(--r, 22px) * .25); cursor: nesw-resize; } .grip.bl::after { left: 3px; bottom: 3px; border-width: 0 0 2px 2px; border-bottom-left-radius: 5px; }
  .grip.tr { right: calc(var(--r, 22px) * .25); top: calc(var(--r, 22px) * .25); cursor: nesw-resize; } .grip.tr::after { right: 3px; top: 3px; border-width: 2px 2px 0 0; border-top-right-radius: 5px; }
  .grip.tl { left: calc(var(--r, 22px) * .25); top: calc(var(--r, 22px) * .25); cursor: nwse-resize; } .grip.tl::after { left: 3px; top: 3px; border-width: 2px 0 0 2px; border-top-left-radius: 5px; }
  .card:hover .grip { opacity: .5; } .grip:hover { opacity: 1 !important; }
  .card.pip .close, .card.pip .mode { display: none; }
  .inner.slim { flex-direction: row; align-items: center; gap: 10px; padding: 0 18px; }
  .slim .top { flex: 1; min-width: 0; gap: 10px; }
  .slim .art { width: 36px; height: 36px; border-radius: 10px; }
  .slim .art svg { width: 18px; height: 18px; }
  .slim .controls { flex: none; margin-top: 0; }
  .slim .time { display: none; }
  .slim .buttons button { width: 28px; height: 28px; }
  .slim .buttons svg { width: 18px; height: 18px; }
  .slim .play { width: 36px; height: 36px; margin: 0 2px; }
  .slim .play svg { width: 20px; height: 20px; }
  .slim .side { flex-direction: row; gap: 0; }
  .live .time { visibility: hidden; }

  /* ---- Diseños (desarrollo): .card[data-theme] ---- */
  .card[data-theme] { --r: 0px !important; box-shadow: var(--inset), var(--outer); -webkit-backdrop-filter: none; backdrop-filter: none; }
  .card.pip[data-theme] { box-shadow: var(--inset); }
  .card[data-theme] .grip::after { border-color: var(--ac); border-radius: 0; }
  .card[data-theme] .ring .track { stroke: var(--track); }
  .card[data-theme] button { border-radius: 0; color: var(--fg); }
  .card[data-theme] .art { border-radius: 0; box-shadow: none; }
  .card[data-theme] .title, .card[data-theme] .artist, .card[data-theme] .time { text-transform: uppercase; }
  .card[data-theme] .time { opacity: 1; color: var(--ac); }

  /* Cyber Brutalismo / Micrographics: gráficos técnicos en lavanda sobre violeta casi negro */
  .card[data-theme=brutal] {
    --ac: #b8aaf0; --fg: #cfc4fa; --track: rgba(184,170,240,.22);
    --inset: inset 0 0 0 1px rgba(184,170,240,.7); --outer: 0 0 0 0 transparent;
    background: radial-gradient(circle at 1px 1px, rgba(184,170,240,.16) 1px, transparent 1.3px) 0 0 / 9px 9px, linear-gradient(160deg, #1b1727, #121019);
    font-family: "Cascadia Mono", Consolas, "Lucida Console", monospace;
  }
  .card[data-theme=brutal] .glow { display: none; }
  .card[data-theme=brutal]::before { content: 'ACTIVE'; position: absolute; z-index: 4; right: 38px; top: 5px; padding: 0 4px; pointer-events: none;
    font: 700 8px/11px "Cascadia Mono", Consolas, monospace; letter-spacing: .08em; color: #15111f; background: #b8aaf0; }
  .card[data-theme=brutal]::after { content: '+'; position: absolute; z-index: 4; left: 4px; bottom: 1px; pointer-events: none; font: 400 12px/1 "Cascadia Mono", Consolas, monospace; color: #b8aaf0; }
  .card[data-theme=brutal] .ring .bar { stroke: #cfc4fa; stroke-linecap: butt; filter: none; stroke-width: 2; }
  .card[data-theme=brutal] .ring .track { stroke-width: 1; }
  .card[data-theme=brutal] .title { font-weight: 700; letter-spacing: .05em; text-shadow: none; }
  .card[data-theme=brutal] .artist { opacity: .65; color: #b8aaf0; letter-spacing: .08em; }
  .card[data-theme=brutal] .time { font-size: 10px; letter-spacing: .04em; }
  .card[data-theme=brutal] .art { background: var(--art) center/cover, #2a2440; outline: 1px solid #b8aaf0; outline-offset: 2px; filter: grayscale(1) sepia(1) hue-rotate(205deg) saturate(1.6) brightness(.95); }
  .card[data-theme=brutal] .art svg { color: #b8aaf0; }
  .card[data-theme=brutal] button:hover { background: #b8aaf0; color: #15111f; }
  .card[data-theme=brutal] .play { background: #b8aaf0; color: #15111f; }
  .card[data-theme=brutal] .play:hover { background: #e4dcff; }

  /* Pixel art: paleta de dos verdes y crema sobre negro verdoso, marcos de línea doble */
  .card[data-theme=pixel] {
    --ac: #a4d65e; --fg: #e6e2b8; --track: #2d3a26;
    --inset: inset 0 0 0 2px #e6e2b8, inset 0 0 0 4px #10160f, inset 0 0 0 5px #6db33f; --outer: 0 0 0 0 transparent;
    background: #10160f; font-family: "Lucida Console", "Courier New", monospace; font-weight: 700;
    clip-path: polygon(0 3px, 3px 3px, 3px 0, calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px));
  }
  .card[data-theme=pixel] .glow { display: none; }
  .card[data-theme=pixel] svg { shape-rendering: crispEdges; }
  .card[data-theme=pixel] .ring .bar { stroke: #6db33f; stroke-linecap: butt; filter: none; stroke-width: 3; shape-rendering: crispEdges; }
  .card[data-theme=pixel] .title { font-size: 13px; letter-spacing: .02em; text-shadow: 1px 1px 0 #000; }
  .card[data-theme=pixel] .artist { color: #8fcf55; opacity: 1; }
  .card[data-theme=pixel] .art { background: var(--art) center/cover, #2d5a27; image-rendering: pixelated; box-shadow: 0 0 0 2px #e6e2b8, 0 0 0 4px #10160f, 0 0 0 5px #6db33f; filter: grayscale(1) sepia(1) hue-rotate(40deg) saturate(2.2) contrast(1.1); }
  .card[data-theme=pixel] button { background: transparent; box-shadow: inset 0 0 0 1px #e6e2b8; }
  .card[data-theme=pixel] button:hover { background: #2d5a27; }
  .card[data-theme=pixel] button:active { background: #6db33f; color: #10160f; }
  .card[data-theme=pixel] .play { background: #6db33f; color: #10160f; box-shadow: inset 0 0 0 1px #e6e2b8, inset 0 -3px 0 #2d5a27; }
  .card[data-theme=pixel] .play:hover { background: #8fcf55; }
  .card[data-theme=pixel] .side button { box-shadow: none; background: transparent; }

  /* Retro Cyber: terminal de fósforo verde con tubo CRT, barrido de líneas y brillo */
  .card[data-theme=retro] {
    --r: 16px !important; --ac: #4dffb0; --fg: #4dffb0; --track: rgba(77,255,176,.22);
    --inset: inset 0 0 0 2px #1d5a3c, inset 0 0 26px rgba(0,0,0,.65); --outer: 0 0 0 0 transparent;
    background: radial-gradient(ellipse at 50% 45%, #0e3a27 0%, #082016 60%, #03100a 100%);
    font-family: "Lucida Console", Consolas, monospace;
  }
  .card[data-theme=retro] .glow { display: none; }
  .card[data-theme=retro]::after { content: ''; position: absolute; inset: 0; z-index: 4; pointer-events: none;
    background: repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 1px, transparent 1px 3px); border-radius: 16px; }
  .card[data-theme=retro]::before { content: ''; position: absolute; inset: 0; z-index: 3; pointer-events: none; border-radius: 16px;
    box-shadow: inset 0 0 22px rgba(77,255,176,.14); }
  .card[data-theme=retro] .ring .bar { stroke: #4dffb0; stroke-width: 2.5; filter: drop-shadow(0 0 4px #2dff9c); }
  .card[data-theme=retro] .title { letter-spacing: .06em; text-shadow: 0 0 6px rgba(77,255,176,.8); }
  .card[data-theme=retro] .title::before { content: '> '; }
  .card[data-theme=retro] .artist { color: #2fd88c; opacity: .9; letter-spacing: .08em; text-shadow: 0 0 5px rgba(77,255,176,.5); }
  .card[data-theme=retro] .time { text-shadow: 0 0 5px rgba(77,255,176,.7); }
  .card[data-theme=retro] .art { outline: 1px solid #2fd88c; filter: grayscale(1) sepia(1) hue-rotate(75deg) saturate(2.6) brightness(.9); }
  .card[data-theme=retro] .art svg { color: #4dffb0; }
  .card[data-theme=retro] button:hover { background: rgba(77,255,176,.2); }
  .card[data-theme=retro] .play { background: rgba(77,255,176,.85); color: #03100a; box-shadow: 0 0 12px rgba(77,255,176,.55); border-radius: 3px; }
  .card[data-theme=retro] .play:hover { background: #7dffc8; }
  @media (prefers-reduced-motion: reduce) { .card, .ring .bar { transition: none; } }
</style>
<div class="card" role="region" aria-label="Minirreproductor">
  <div class="glow"></div>
  <svg class="ring" aria-hidden="true">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8ec5ff"/><stop offset=".5" stop-color="#c9a7ff"/><stop offset="1" stop-color="#ffb0e0"/>
      </linearGradient>
    </defs>
    <rect class="track" pathLength="100"/>
    <rect class="bar" pathLength="100"/>
  </svg>
  <div class="inner">
  <div class="top">
    <div class="art">${icons.note}</div>
    <div class="meta"><div class="title"></div><div class="artist"></div></div>
    <div class="side">
    <button class="mode" title="Pasar a Mini" aria-label="Pasar a Mini"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><rect x="12" y="11" width="6" height="5" rx="1.5" fill="currentColor"/></svg></button>
    <button class="close" title="Ocultar" aria-label="Ocultar">${icons.close}</button>
    </div>
  </div>
  <div class="controls">
    <span class="time cur">0:00</span>
    <div class="buttons">
      <button class="prev" title="Anterior" aria-label="Anterior">${icons.prev}</button>
      <button class="back" title="Retroceder ${SKIP} s" aria-label="Retroceder ${SKIP} segundos">${icons.back}</button>
      <button class="play" title="Reproducir / pausa" aria-label="Reproducir o pausar">${icons.play}</button>
      <button class="fwd" title="Avanzar ${SKIP} s" aria-label="Avanzar ${SKIP} segundos">${icons.fwd}</button>
      <button class="next" title="Siguiente" aria-label="Siguiente">${icons.next}</button>
    </div>
    <span class="time end dur">0:00</span>
  </div>
  </div>
  <div class="grip tl"></div><div class="grip tr"></div><div class="grip bl"></div><div class="grip br"></div>
</div>`;

  const $ = (s) => root.querySelector(s);
  const inner = $('.inner'), grips = root.querySelectorAll('.grip');
  const card = $('.card'), bar = $('.bar'), art = $('.art');
  const titleEl = $('.title'), artistEl = $('.artist'), curEl = $('.cur'), durEl = $('.dur');
  const btn = { prev: $('.prev'), back: $('.back'), play: $('.play'), fwd: $('.fwd'), next: $('.next'), close: $('.close'), mode: $('.mode') };

  // ---------- Estado ----------
  let modeSwitch = false; // cambiando de tipo de ventana: cerrar la anterior no debe ocultar el reproductor
  let media = null, lastPlayed = null, dismissed = true, actions = new Set();
  let lastKey = '', lastPlaying = null, pip = false, curTitle = '', curArtist = '', curImg = '';
  let fm = 'pip';
  let theme = 'glass';
  const applyTheme = (t) => { theme = TH[t] ? t : 'glass'; if (theme === 'glass') delete card.dataset.theme; else card.dataset.theme = theme; vp.bgImg = undefined; };
  const setMode = (v) => { fm = v; try { chrome.storage.local.set({ [MODE_KEY]: v }); } catch (_) { /* contexto invalidado */ } };

  document.addEventListener('play', (e) => { if (e.target instanceof HTMLMediaElement) lastPlayed = e.target; }, true);
  document.addEventListener('__mp_actions', (e) => { actions = new Set(String(e.detail).split(',').filter(Boolean)); });
  document.dispatchEvent(new CustomEvent('__mp_query'));

  function pickMedia() {
    const list = [...document.querySelectorAll('video,audio')].filter((m) =>
      m.isConnected && m.readyState > 0 && (m.duration >= MIN_DURATION || m.duration === Infinity) &&
      !(m.tagName === 'VIDEO' && m.muted && m.loop));
    const playing = list.filter((m) => !m.paused && !m.ended);
    if (playing.length) return playing.includes(lastPlayed) ? lastPlayed : playing[0];
    if (lastPlayed && list.includes(lastPlayed)) return lastPlayed;
    return list[0] || null;
  }

  const fmt = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    s = Math.floor(s);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0');
  };

  function bestArtwork(md) {
    if (md && md.artwork && md.artwork.length) {
      const size = (a) => parseInt(String(a.sizes || '').split(/[x\s]/)[0], 10) || 0;
      return [...md.artwork].sort((a, b) => size(b) - size(a))[0].src;
    }
    if (media && media.poster) return media.poster;
    const yt = /[?&]v=([\w-]{11})/.exec(location.href);
    if (yt && /youtube\.com$/.test(location.hostname)) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
    return '';
  }

  function findSiteButton(kind) {
    for (const sel of SITE_BUTTONS[kind]) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) return el;
    }
    return null;
  }

  const send = (name) => document.dispatchEvent(new CustomEvent('__mp_cmd', { detail: name }));

  // ---------- Acciones ----------
  const seekTo = (t) => { if (media && isFinite(media.duration)) media.currentTime = Math.max(0, Math.min(media.duration, t)); };

  btn.play.addEventListener('click', () => { if (!media) return; media.paused ? media.play().catch(() => {}) : media.pause(); });
  btn.back.addEventListener('click', () => media && seekTo(media.currentTime - SKIP));
  btn.fwd.addEventListener('click', () => media && seekTo(media.currentTime + SKIP));
  btn.prev.addEventListener('click', () => {
    if (!media) return;
    if (media.currentTime > 3 || (!actions.has('previoustrack') && !findSiteButton('prev'))) return seekTo(0);
    if (actions.has('previoustrack')) send('previoustrack'); else findSiteButton('prev').click();
  });
  btn.next.addEventListener('click', () => {
    if (actions.has('nexttrack')) send('nexttrack'); else findSiteButton('next')?.click();
  });
  btn.close.addEventListener('click', () => { dismissed = true; render(); });

  // Respaldo: ventana flotante con marco (Document PiP), la abre main.js y mueve aquí el host.
  document.addEventListener('__mp_pip', (e) => {
    const d = String(e.detail);
    if (d === 'open') {
      pip = true;
      host.style.cssText = 'all:initial;position:fixed;inset:0;';
      card.classList.add('pip');
    } else if (d === 'closed') {
      pip = false;
      if (!modeSwitch) dismissed = true;
      card.classList.remove('pip');
      host.style.cssText = 'all:initial;position:fixed;left:0;top:0;z-index:2147483647;';
      (document.body || document.documentElement).append(host);
      applyPos(savedPos);
    }
    render();
  });

  // Texto largo: en vez de "…", se desplaza de lado a lado mostrando todo el nombre.
  function setText(el, text) {
    el.innerHTML = '<span></span>';
    el.firstChild.textContent = text;
    el.title = text;
    fitMarquee(el);
  }
  function fitMarquee(el) {
    el.classList.remove('scroll');
    const d = el.scrollWidth - el.clientWidth;
    if (d > 1) {
      el.style.setProperty('--d', -d + 'px');
      el.style.setProperty('--t', Math.max(4, d / 22 + 3) + 's');
      el.classList.add('scroll');
    }
  }

  // ---------- Ventana flotante sin marco: el reproductor se dibuja en un canvas y se saca con el PiP de vídeo ----------
  const CW = 320, CH = 80;
  const DPR0 = 0.5; // el PiP se abre con el tamaño real del vídeo (160x40, el navegador lo ajusta a su mínimo); ya abierto
  let DPR = DPR0; //, se sube la resolución sin cambiar la proporción
  const FONT = '"Segoe UI Variable Text","Segoe UI",system-ui,sans-serif';
  const vp = { active: false, starting: false, switching: false, video: null, ctx: null, stop: null, img: null, imgSrc: '', bg: null, bgImg: undefined, pausing: 0 };

  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function drawMarquee(c, text, x, y, maxW, size) {
    const tw = c.measureText(text).width;
    c.save(); c.beginPath(); c.rect(x, y - size, maxW, size * 1.4); c.clip();
    let off = 0;
    if (tw > maxW) {
      const d = tw - maxW, dur = d / 45, P = dur + 1.5, m = (performance.now() / 1000) % (2 * P);
      const f = (v) => clamp((v - 0.75) / dur, 0, 1);
      off = (m < P ? f(m) : 1 - f(m - P)) * d;
    }
    c.fillText(text, x - off, y); c.restore();
  }
  // Paletas del canvas de Mini, una por diseño (las mismas ideas que el CSS de la tarjeta).
  const MONO = '"Cascadia Mono",Consolas,"Lucida Console",monospace';
  const TH = {
    glass: { font: FONT, tw: 600, bg: ['#3a3a52', '#1b1b24'], blur: true, veil: true, artR: 13, fg: '#fff', fg2: 'rgba(255,255,255,.68)', time: 'rgba(255,255,255,.7)',
      track: 'rgba(255,255,255,.18)', bar: ['#8ec5ff', '#c9a7ff', '#ffb0e0'], barH: 4, barR: 2, shadow: 'rgba(0,0,0,.35)' },
    brutal: { font: MONO, tw: 700, upper: true, bg: ['#1b1727', '#121019'], artR: 0, artBorder: '#b8aaf0', gray: true, tint: '#b8aaf0', fg: '#cfc4fa', fg2: 'rgba(184,170,240,.65)', time: '#b8aaf0',
      track: 'rgba(184,170,240,.25)', bar: ['#cfc4fa'], barH: 2, barR: 0,
      deco(b) {
        b.fillStyle = 'rgba(184,170,240,.16)';
        for (let x = 1; x < CW; x += 9) for (let y = 1; y < CH; y += 9) b.fillRect(x, y, 1, 1);
        b.strokeStyle = 'rgba(184,170,240,.7)'; b.lineWidth = 1; b.strokeRect(.5, .5, CW - 1, CH - 1);
        b.fillStyle = '#b8aaf0';
        for (let x = 0; x <= 228; x += 6) b.fillRect(80 + x, x % 30 ? 60 : 59, 1, x % 30 ? 2 : 4);
        b.fillRect(CW - 50, 4, 38, 11); b.fillStyle = '#15111f'; b.font = '700 8px ' + MONO; b.textBaseline = 'alphabetic'; b.fillText('ACTIVE', CW - 47, 12.5);
        b.fillStyle = '#b8aaf0'; b.font = '12px ' + MONO; b.fillText('+', 3, CH - 3);
      } },
    pixel: { font: '"Lucida Console","Courier New",monospace', tw: 700, upper: true, bg: ['#10160f', '#10160f'], artR: 0, artBorder: '#e6e2b8', pixelArt: true, gray: true, tint: '#8fcf55', fg: '#e6e2b8', fg2: '#8fcf55', time: '#a4d65e',
      track: '#2d3a26', bar: ['#6db33f'], barH: 6, barR: 0, seg: 5,
      deco(b) {
        b.fillStyle = '#e6e2b8';
        b.fillRect(3, 0, CW - 6, 2); b.fillRect(3, CH - 2, CW - 6, 2); b.fillRect(0, 3, 2, CH - 6); b.fillRect(CW - 2, 3, 2, CH - 6);
        b.fillRect(2, 2, 1, 1); b.fillRect(CW - 3, 2, 1, 1); b.fillRect(2, CH - 3, 1, 1); b.fillRect(CW - 3, CH - 3, 1, 1);
        b.strokeStyle = '#6db33f'; b.lineWidth = 1; b.strokeRect(5.5, 5.5, CW - 11, CH - 11);
        b.fillStyle = '#000'; b.fillRect(0, 0, 3, 3); b.fillRect(CW - 3, 0, 3, 3); b.fillRect(0, CH - 3, 3, 3); b.fillRect(CW - 3, CH - 3, 3, 3);
      } },
    retro: { font: '"Lucida Console",Consolas,monospace', tw: 700, upper: true, prefix: '> ', bg: ['#0a2a1b', '#03100a'], artR: 0, artBorder: '#2fd88c', gray: true, tint: '#3dffa0', fg: '#4dffb0', fg2: '#2fd88c', time: '#4dffb0',
      track: 'rgba(77,255,176,.22)', bar: ['#4dffb0'], barH: 5, barR: 0, glow: '#2dff9c',
      deco(b) {
        const v = b.createRadialGradient(CW / 2, CH / 2, 14, CW / 2, CH / 2, CW * .62);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.62)');
        b.fillStyle = v; b.fillRect(0, 0, CW, CH);
        b.strokeStyle = '#1d5a3c'; b.lineWidth = 2; b.strokeRect(1, 1, CW - 2, CH - 2);
        b.fillStyle = 'rgba(0,0,0,.28)'; for (let y = 0; y < CH; y += 3) b.fillRect(0, y, CW, 1);
      } },
  };
  // El fondo (carátula desenfocada) es caro: se pinta una vez y se reutiliza en cada fotograma.
  function paintBackground() {
    const T = TH[theme] || TH.glass;
    if (!vp.bg) vp.bg = document.createElement('canvas');
    vp.bg.width = CW * DPR; vp.bg.height = CH * DPR;
    const b = vp.bg.getContext('2d');
    b.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g = b.createLinearGradient(0, 0, CW, CH);
    g.addColorStop(0, T.bg[0]); g.addColorStop(1, T.bg[1]);
    b.fillStyle = g; b.fillRect(0, 0, CW, CH);
    if (T.blur && vp.img) { b.save(); b.globalAlpha = 0.45; b.filter = 'blur(14px) saturate(1.7)'; b.drawImage(vp.img, -20, -20 - (CW - CH) / 2, CW + 40, CW + 40); b.restore(); }
    if (T.veil) { b.fillStyle = 'rgba(255,255,255,.05)'; b.fillRect(0, 0, CW, CH); }
    if (T.deco) T.deco(b);
    vp.bgImg = vp.img;
  }
  // La carátula debe cargarse sin "contaminar" el canvas: con CORS, o si falla, descargada por el background.
  function loadArt(src) {
    if (!src) return;
    const set = (im) => { if (vp.imgSrc === src) vp.img = im; };
    const load = (u, cors, fail) => {
      const im = new Image();
      if (cors) im.crossOrigin = 'anonymous';
      im.onload = () => set(im); im.onerror = fail; im.src = u;
    };
    load(src, true, () => {
      try { chrome.runtime.sendMessage({ type: 'img', url: src }, (r) => { if (r && r.data) load(r.data, false, () => {}); }); } catch (_) { /* sin background */ }
    });
  }
  function drawFrame() {
    const c = vp.ctx;
    if (!c) return;
    const T = TH[theme] || TH.glass;
    if (curImg !== vp.imgSrc) {
      vp.imgSrc = curImg; vp.img = null; vp.pix = null;
      loadArt(curImg);
    }
    if (!vp.bg || vp.bgImg !== vp.img) paintBackground();
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.drawImage(vp.bg, 0, 0, CW, CH);
    // carátula
    c.save(); roundRect(c, 12, 12, 56, 56, T.artR); c.clip();
    if (vp.img) {
      let src = vp.img;
      if (T.pixelArt) { // pixelar: se reduce a 14x14 y se amplía sin suavizar
        if (!vp.pix || vp.pixFor !== vp.img) { const p = document.createElement('canvas'); p.width = p.height = 14; p.getContext('2d').drawImage(vp.img, 0, 0, 14, 14); vp.pix = p; vp.pixFor = vp.img; }
        src = vp.pix; c.imageSmoothingEnabled = false;
      }
      if (T.gray) c.filter = 'grayscale(1) contrast(1.25)';
      c.drawImage(src, 12, 12, 56, 56);
      c.filter = 'none';
      if (T.tint) { c.globalCompositeOperation = 'multiply'; c.fillStyle = T.tint; c.fillRect(12, 12, 56, 56); }
    } else { const a = c.createLinearGradient(12, 12, 68, 68); a.addColorStop(0, T.artBorder || '#7c8cff'); a.addColorStop(1, T.artBorder ? T.bg[1] : '#c77dff'); c.fillStyle = a; c.fillRect(12, 12, 56, 56); }
    c.restore();
    if (T.artBorder) { c.strokeStyle = T.artBorder; c.lineWidth = 2; c.strokeRect(12, 12, 56, 56); }
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    const tx = 80, tw = CW - tx - 12;
    const tt = (T.prefix || '') + (T.upper ? curTitle.toUpperCase() : curTitle), ta = T.upper ? curArtist.toUpperCase() : curArtist;
    if (T.shadow || T.glow) { c.shadowColor = T.glow || T.shadow; c.shadowBlur = T.glow ? 8 : 4; }
    c.fillStyle = T.fg; c.font = T.tw + ' 17px ' + T.font;
    drawMarquee(c, tt, tx, 29, tw, 17);
    c.shadowBlur = 0; c.fillStyle = T.fg2; c.font = '13px ' + T.font;
    drawMarquee(c, ta, tx, 47, tw, 13);
    // barra de progreso + tiempos (los controles son los nativos de la ventana)
    const live = media && media.duration === Infinity;
    const p = !media ? 0 : live ? 1 : media.duration > 0 ? Math.min(1, media.currentTime / media.duration) : 0;
    const by = 56, bh = T.barH, R = T.barR;
    c.fillStyle = T.track; roundRect(c, tx, by, tw, bh, R); c.fill();
    if (p > 0) {
      let fill = T.bar[0];
      if (T.bar.length > 1) { fill = c.createLinearGradient(tx, 0, tx + tw, 0); T.bar.forEach((col, i) => fill.addColorStop(i / (T.bar.length - 1), col)); }
      c.fillStyle = fill;
      if (T.glow) { c.shadowColor = T.glow; c.shadowBlur = 6; }
      if (T.seg) { const n = Math.round(tw * p / (T.seg + 2)); for (let i = 0; i < n; i++) c.fillRect(tx + i * (T.seg + 2), by, T.seg, bh); }
      else { roundRect(c, tx, by, Math.max(bh, tw * p), bh, R); c.fill(); }
      c.shadowBlur = 0;
    }
    c.fillStyle = T.time; c.font = '11px ' + T.font;
    c.fillText(media ? fmt(media.currentTime) : '0:00', tx, 73);
    c.textAlign = 'right'; c.fillText(live || !media ? '' : fmt(media.duration), tx + tw, 73); c.textAlign = 'left';
  }
  function vpTick() {
    drawFrame();
    const v = vp.video;
    if (!v || !media) return;
    if (!media.paused && v.paused) v.play().catch(() => {});
    else if (media.paused && !v.paused && !vp.pausing) {
      vp.pausing = setTimeout(() => { vp.pausing = 0; if (media && media.paused) v.pause(); }, 150);
    }
    const now = performance.now();
    if (now - (vp.posAt || 0) < 500) return;
    vp.posAt = now;
    try {
      if (isFinite(media.duration) && media.duration > 0) {
        navigator.mediaSession.setPositionState({ duration: media.duration, position: Math.min(media.currentTime, media.duration), playbackRate: media.playbackRate || 1 });
      }
    } catch (_) { /* estado no válido */ }
  }
  // Una pestaña que reproduce audio/vídeo no se frena, así que un temporizador basta (~30 fps).
  function startTicker(fn) {
    const t = setInterval(fn, 33);
    return () => clearInterval(t);
  }
  const setHandler = (n, f) => { try { navigator.mediaSession.setActionHandler(n, f); } catch (_) { /* no soportada */ } };
  function releaseVideo() {
    if (vp.stop) vp.stop();
    if (vp.video) vp.video.remove();
    vp.stop = vp.video = vp.ctx = null; vp.active = false; DPR = DPR0; vp.bgImg = undefined;
  }
  async function openVideoPip() {
    const cv = document.createElement('canvas');
    cv.width = CW * DPR; cv.height = CH * DPR;
    vp.ctx = cv.getContext('2d');
    drawFrame();
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true;
    v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none;';
    v.srcObject = cv.captureStream(30);
    root.append(v);
    vp.video = v;
    await v.play();
    if (v.readyState < 1) await new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true }));
    const pw = await v.requestPictureInPicture();
    vp.active = true;
    // La ventana ya está abierta a tamaño pequeño: ahora se dibuja a 4x para que se vea nítida.
    const w0 = pw.width;
    DPR = 4; cv.width = CW * DPR; cv.height = CH * DPR; vp.bgImg = undefined;
    setTimeout(() => {
      if (vp.active && pw.width > w0 * 1.5) { DPR = DPR0; cv.width = CW * DPR; cv.height = CH * DPR; vp.bgImg = undefined; } // el navegador la agrandó: deshacer
    }, 600);
    v.addEventListener('leavepictureinpicture', () => { releaseVideo(); if (!modeSwitch) dismissed = true; render(); });
    setHandler('play', () => media && media.play().catch(() => {}));
    setHandler('pause', () => media && media.pause());
    setHandler('seekbackward', () => media && seekTo(media.currentTime - SKIP));
    setHandler('seekforward', () => media && seekTo(media.currentTime + SKIP));
    setHandler('seekto', (d) => seekTo(d.seekTime));
    setHandler('previoustrack', () => btn.prev.click());
    if (actions.has('nexttrack') || findSiteButton('next')) setHandler('nexttrack', () => btn.next.click());
    vp.stop = startTicker(vpTick);
    render();
  }
  async function startFloat() {
    if (fm === 'card' || pip || vp.active || vp.starting || dismissed || !media) return;
    const docFallback = () => { if (actions.has('@pip')) send('__pip'); };
    if (fm === 'win') return docFallback();
    if (!document.pictureInPictureEnabled || !HTMLCanvasElement.prototype.captureStream) return docFallback();
    vp.starting = true;
    try { await openVideoPip(); } catch (err) {
      releaseVideo();
      if (!(err && err.name === 'NotAllowedError')) docFallback();
    } finally { vp.starting = false; }
  }
  // La API exige un gesto del usuario: se abre con el primer clic o tecla en la página.
  ['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, startFloat, true));
  // Alternar entre ventana flotante (PiP) y tarjeta dentro de la página.
  btn.mode.addEventListener('click', () => { setMode('pip'); startFloat(); });
  // Clic izquierdo en el icono: mostrar u ocultar en el modo elegido (la ventana se abre ya, o con el siguiente clic en la página).
  document.addEventListener('__mp_toggle', () => {
    if (vp.active) { document.exitPictureInPicture().catch(() => {}); return; }
    if (pip) { send('__pip'); return; }
    dismissed = !dismissed; render(); startFloat();
  });

  // ---------- Render ----------
  function render() {
    media = pickMedia();
    const fs = !!document.fullscreenElement;
    const visible = !!media && !dismissed && !fs && !vp.active;
    card.classList.toggle('show', visible || pip);
    if (!media) return;

    const md = navigator.mediaSession && navigator.mediaSession.metadata;
    const title = (md && md.title) || document.title || location.hostname;
    const artist = (md && (md.artist || md.album)) || location.hostname.replace(/^www\./, '');
    const img = bestArtwork(md);
    const key = title + '\u0001' + artist + '\u0001' + img;
    if (key !== lastKey) {
      lastKey = key;
      curTitle = title; curArtist = artist; curImg = img;
      setText(titleEl, title); setText(artistEl, artist);
      const url = img ? `url("${img.replace(/"/g, '%22')}")` : 'none';
      card.style.setProperty('--art', url);
      art.classList.toggle('has-img', !!img);
    }

    const live = media.duration === Infinity;
    card.classList.toggle('live', live);
    const dur = media.duration;
    const p = live ? 100 : dur > 0 ? Math.min(100, (media.currentTime / dur) * 100) : 0;
    bar.style.strokeDasharray = p > 0 ? `${p} 100` : '0 100';
    curEl.textContent = fmt(media.currentTime);
    durEl.textContent = live ? '' : fmt(dur);

    const playing = !media.paused && !media.ended;
    if (playing !== lastPlaying) { lastPlaying = playing; btn.play.innerHTML = playing ? icons.pause : icons.play; }
    btn.back.disabled = btn.fwd.disabled = live;
    btn.next.disabled = !(actions.has('nexttrack') || findSiteButton('next'));
  }

  ['timeupdate', 'play', 'pause', 'ended', 'loadedmetadata', 'durationchange'].forEach((ev) => document.addEventListener(ev, render, true));
  setInterval(render, 250);
  render();

  // ---------- Tamaño ----------
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function layout() {
    const w = card.clientWidth, h = card.clientHeight;
    if (!w || !h) return;
    const slim = h < SLIM_BELOW, d = slim ? SLIM : DESIGN;
    const k = clamp(Math.min(w / d.w, h / d.h), 0.5, 4);
    inner.classList.toggle('slim', slim);
    requestAnimationFrame(() => { fitMarquee(titleEl); fitMarquee(artistEl); });
    inner.style.cssText = `width:${w / k}px;height:${h / k}px;zoom:${k}`;
    card.style.setProperty('--r', (pip ? 0 : Math.min(44 * k, h / 2)) + 'px');
  }
  new ResizeObserver(layout).observe(card);

  function setSize(w, h) {
    card.style.width = clamp(w, MIN.w, MAX.w) + 'px';
    card.style.height = clamp(h, MIN.h, MAX.h) + 'px';
    if (host._x != null) place(host._x, host._y);
  }
  let rs = null;
  grips.forEach((g) => {
    const sx = g.classList.contains('tl') || g.classList.contains('bl') ? -1 : 1;
    const sy = g.classList.contains('tl') || g.classList.contains('tr') ? -1 : 1;
    g.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      g.setPointerCapture(e.pointerId);
      const pw = pip ? card.ownerDocument.defaultView : null;
      rs = { pw, sx: e.screenX, sy: e.screenY, ow: pw && pw.outerWidth, oh: pw && pw.outerHeight, x: e.clientX, y: e.clientY, w: card.offsetWidth, h: card.offsetHeight, px: host._x || 0, py: host._y || 0 };
    });
    g.addEventListener('pointermove', (e) => {
      if (!rs) return;
      if (rs.pw) { // ventana flotante: se redimensiona la propia ventana
        try { rs.pw.resizeTo(Math.max(200, rs.ow + e.screenX - rs.sx), Math.max(60, rs.oh + e.screenY - rs.sy)); } catch (_) { /* sin permiso */ }
        return;
      }
      // La esquina opuesta queda fija: hacia fuera de la pantalla no se puede crecer.
      const roomW = sx > 0 ? window.innerWidth - rs.px : rs.px + rs.w;
      const roomH = sy > 0 ? window.innerHeight - rs.py : rs.py + rs.h;
      const w = clamp(rs.w + sx * (e.clientX - rs.x), MIN.w, Math.max(MIN.w, Math.min(MAX.w, roomW)));
      const h = clamp(rs.h + sy * (e.clientY - rs.y), MIN.h, Math.max(MIN.h, Math.min(MAX.h, roomH)));
      card.style.width = w + 'px';
      card.style.height = h + 'px';
      place(sx < 0 ? rs.px + rs.w - w : rs.px, sy < 0 ? rs.py + rs.h - h : rs.py);
    });
    const end = () => {
      if (!rs) return;
      const wasPip = !!rs.pw;
      rs = null;
      if (wasPip) return;
      savePos();
      try { chrome.storage.local.set({ [SIZE_KEY]: { w: card.offsetWidth, h: card.offsetHeight } }); } catch (_) { /* contexto invalidado */ }
    };
    g.addEventListener('pointerup', end);
    g.addEventListener('pointercancel', end);
  });

  // ---------- Arrastre + barra de progreso en el borde ----------
  function edgeFraction(e) {
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top, W = r.width, H = r.height;
    const d = [y, W - x, H - y, x];
    const side = d.indexOf(Math.min(...d));
    const s = [x, W + y, W + H + (W - x), 2 * W + H + (H - y)][side];
    return Math.max(0, Math.min(1, s / (2 * (W + H))));
  }
  const nearEdge = (e) => {
    const r = card.getBoundingClientRect();
    return Math.min(e.clientX - r.left, r.right - e.clientX, e.clientY - r.top, r.bottom - e.clientY) <= EDGE;
  };

  let mode = null, offX = 0, offY = 0;
  card.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    card.setPointerCapture(e.pointerId);
    if (nearEdge(e) && media && isFinite(media.duration)) {
      mode = 'scrub'; seekTo(edgeFraction(e) * media.duration); render();
    } else if (!pip) {
      mode = 'drag';
      const r = host.getBoundingClientRect();
      offX = e.clientX - r.left; offY = e.clientY - r.top;
      card.classList.add('dragging');
    }
  });
  card.addEventListener('pointermove', (e) => {
    if (mode === 'drag') place(e.clientX - offX, e.clientY - offY);
    else if (mode === 'scrub' && media && isFinite(media.duration)) { seekTo(edgeFraction(e) * media.duration); render(); }
    else card.classList.toggle('edge', nearEdge(e));
  });
  const endPointer = () => {
    if (mode === 'drag') savePos();
    mode = null; card.classList.remove('dragging');
  };
  card.addEventListener('pointerup', endPointer);
  card.addEventListener('pointercancel', endPointer);
  card.addEventListener('pointerleave', () => { if (!mode) card.classList.remove('edge'); });

  function place(x, y) {
    if (pip) return;
    const w = card.offsetWidth, h = card.offsetHeight;
    x = Math.max(0, Math.min(window.innerWidth - w, x));
    y = Math.max(0, Math.min(window.innerHeight - h, y));
    host.style.transform = `translate(${x}px, ${y}px)`;
    host._x = x; host._y = y;
  }
  function savePos() {
    const w = card.offsetWidth, h = card.offsetHeight;
    const pos = {
      x: (host._x ?? 0) / Math.max(1, window.innerWidth - w),
      y: (host._y ?? 0) / Math.max(1, window.innerHeight - h),
    };
    try { chrome.storage.local.set({ [POS_KEY]: pos }); } catch (_) { /* contexto invalidado */ }
  }
  function applyPos(pos) {
    const w = card.offsetWidth, h = card.offsetHeight;
    if (!pos) return place(window.innerWidth - w - MARGIN, window.innerHeight - h - MARGIN);
    place(pos.x * (window.innerWidth - w), pos.y * (window.innerHeight - h));
  }
  let savedPos = null;
  window.addEventListener('resize', () => applyPos(savedPos));

  try {
    chrome.storage.local.get([POS_KEY, SIZE_KEY, MODE_KEY, THEME_KEY], (r) => {
      if (r && r[MODE_KEY]) fm = r[MODE_KEY];
      if (r && r[THEME_KEY]) applyTheme(r[THEME_KEY]);
      if (r && r[SIZE_KEY]) setSize(r[SIZE_KEY].w, r[SIZE_KEY].h);
      savedPos = r && r[POS_KEY]; applyPos(savedPos);
    });
    chrome.storage.onChanged.addListener((c) => {
      if (c[MODE_KEY] && c[MODE_KEY].newValue && c[MODE_KEY].newValue !== fm) {
        fm = c[MODE_KEY].newValue;
        if (fm !== 'pip' && vp.active) document.exitPictureInPicture().catch(() => {});
        if (fm !== 'win' && pip) send('__pip');
        modeSwitch = true; dismissed = false; render();
        // Si el navegador no deja abrir la ventana sin un gesto, se ve la tarjeta y se abre con el siguiente clic en la página.
        setTimeout(() => { modeSwitch = false; dismissed = false; render(); startFloat(); }, 400);
      }
      if (c[THEME_KEY] && c[THEME_KEY].newValue) applyTheme(c[THEME_KEY].newValue);
      if (c[SIZE_KEY] && !rs && c[SIZE_KEY].newValue) setSize(c[SIZE_KEY].newValue.w, c[SIZE_KEY].newValue.h);
      if (c[POS_KEY] && mode !== 'drag') { savedPos = c[POS_KEY].newValue; applyPos(savedPos); } });
  } catch (_) { applyPos(null); }

  (document.body || document.documentElement).appendChild(host);
  applyPos(savedPos);
})();
