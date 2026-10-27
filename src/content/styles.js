(() => {
  const NMP = (globalThis.__NMP ||= {});

  NMP.css = `
  ${NMP.tokens.css}
  :host { all: initial; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .card {
    --art: none;
    /* Colores y motion salen de los tokens (design/tokens.json): Glass en .card y los demás diseños en .card[data-theme]. */
    position: relative; width: 312px; height: 126px; padding: 0;
    border-radius: var(--r, 22px); overflow: hidden; color: var(--text);
    font-family: var(--font-sans);
    background: linear-gradient(145deg, var(--sheen-a), var(--sheen-b)), var(--surface);
    -webkit-backdrop-filter: blur(28px) saturate(185%); backdrop-filter: blur(28px) saturate(185%);
    box-shadow: 0 18px 48px var(--shadow-1), 0 2px 8px var(--shadow-2), inset 0 1px 0 var(--edge-hi), inset 0 -1px 0 var(--edge-lo);
    user-select: none; -webkit-user-select: none; touch-action: none; cursor: grab;
    opacity: 0; transform: translateY(8px) scale(.96); pointer-events: none;
    transition: opacity var(--dur-out) ease-in, transform var(--dur-out) ease-in; /* salir es más rápido que entrar */
  }
  .card.show { opacity: 1; transform: none; pointer-events: auto; transition: opacity var(--dur-in) var(--ease-out), transform var(--dur-in) var(--ease-out); }
  .card.dragging { cursor: grabbing; transition: opacity var(--dur-in) var(--ease-out); }
  .card.edge { cursor: pointer; }
  /* En pausa el fondo se calma y la carátula pierde color; cargando, el botón de play late. */
  .card.paused .glow { opacity: .2; }
  .card.paused .art { filter: saturate(.5) brightness(.85); }
  .art { transition: filter .3s; }
  .card.loading .play { animation: pulse 1s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: .55; transform: scale(.94); } }
  .glow {
    position: absolute; inset: -40px; z-index: 0; background: var(--art) center/cover;
    filter: blur(36px) saturate(1.6); opacity: .42; transition: opacity .4s; pointer-events: none;
  }
  .ring { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 3; pointer-events: none; overflow: visible; }
  .ring rect { x: 1.25px; y: 1.25px; width: calc(100% - 2.5px); height: calc(100% - 2.5px); rx: calc(var(--r, 22px) - 1.25px); fill: none; stroke-width: 2.5; }
  .ring .track { stroke: var(--track); }
  .ring .bar { stroke: url(#g); stroke-linecap: round; stroke-dasharray: 0 100; transition: stroke-dasharray .3s linear; filter: drop-shadow(0 0 4px var(--bar-glow)); }
  .top, .controls { position: relative; z-index: 2; }
  .top { display: flex; align-items: center; gap: 12px; }
  .art {
    flex: none; width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center;
    background: var(--art) center/cover, linear-gradient(135deg, var(--art-a), var(--art-b));
    box-shadow: 0 4px 14px var(--shadow-art), inset 0 0 0 1px var(--art-ring);
  }
  .art svg { width: 22px; height: 22px; opacity: .85; }
  .art.has-img svg { display: none; }
  .meta { flex: 1; min-width: 0; }
  .title { color: var(--title); font-size: 13.5px; font-weight: 600; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 6px var(--text-shadow); }
  .hint { display: none; }
  .card.pending .hint { display: block; }
  .card.pending .artist:not(.hint) { display: none; }
  .card.pending .mode { animation: pulse 1.4s ease-in-out infinite; }
  .scroll > span { display: inline-block; animation: marquee var(--t, 6s) ease-in-out infinite alternate; }
  @keyframes marquee { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(var(--d)); } }
  .scroll { text-overflow: clip !important; }
  .artist { font-size: 12px; color: var(--text-2); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .controls { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
  .time { width: 38px; font-size: 11px; font-variant-numeric: tabular-nums; color: var(--text-3); }
  .time.end { text-align: right; }
  .buttons { display: flex; align-items: center; gap: 2px; }
  button {
    all: unset; box-sizing: border-box; display: grid; place-items: center; cursor: pointer;
    width: 32px; height: 32px; border-radius: 50%; color: var(--btn);
    transition: background .15s, transform .12s, opacity .15s;
  }
  button svg { width: 20px; height: 20px; }
  button:hover { background: var(--hover-bg); color: var(--text); }
  button:active { transform: scale(.9); }
  button:focus-visible, .card:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
  button[disabled] { opacity: .32; pointer-events: none; }
  .play { width: 44px; height: 44px; margin: 0 4px; background: var(--play-bg); color: var(--play-fg); box-shadow: 0 4px 16px var(--shadow-play); }
  .play:hover { background: var(--play-hover-bg); transform: scale(1.06); color: var(--play-hover-fg); }
  .play:active { transform: scale(.95); }
  .play svg { width: 22px; height: 22px; }
  .side { flex: none; display: flex; flex-direction: column; gap: 2px; }
  .side button { width: 24px; height: 24px; opacity: .85; }
  .side button:hover { opacity: 1; }
  .side .close { opacity: .7; }
  .close svg { width: 12px; height: 12px; }
  .mode svg { width: 14px; height: 14px; }
  .card.pip { width: 100% !important; height: 100% !important; cursor: default; box-shadow: none; border-radius: 0; background: linear-gradient(145deg, var(--bg-a), var(--bg-b)); -webkit-backdrop-filter: none; backdrop-filter: none; }
  .card.pip .grip:not(.br) { display: none; }
  .card.pip .grip.br { right: 0; bottom: 0; }
  .inner { position: relative; z-index: 2; display: flex; flex-direction: column; justify-content: space-between; padding: 16px 18px 14px; }
  .grip { position: absolute; width: 18px; height: 18px; z-index: 4; opacity: 0; transition: opacity .15s; }
  .grip::after { content: ''; position: absolute; width: 8px; height: 8px; border: 0 solid var(--grip); }
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
    --inset: inset 0 0 0 1px var(--line); --outer: 0 0 0 0 transparent;
    background: radial-gradient(circle at 1px 1px, var(--dot) 1px, transparent 1.3px) 0 0 / 9px 9px, linear-gradient(160deg, var(--bg-a), var(--bg-b));
    font-family: "Cascadia Mono", Consolas, "Lucida Console", monospace;
  }
  .card[data-theme=brutal] .glow { display: none; }
  .card[data-theme=brutal]::before { content: 'ACTIVE'; position: absolute; z-index: 4; right: 38px; top: 5px; padding: 0 4px; pointer-events: none;
    font: 700 8px/11px "Cascadia Mono", Consolas, monospace; letter-spacing: .08em; color: var(--ink); background: var(--ac); }
  .card[data-theme=brutal]::after { content: '+'; position: absolute; z-index: 4; left: 4px; bottom: 1px; pointer-events: none; font: 400 12px/1 "Cascadia Mono", Consolas, monospace; color: var(--ac); }
  .card[data-theme=brutal] .ring .bar { stroke: var(--bar); stroke-linecap: butt; filter: none; stroke-width: 2; }
  .card[data-theme=brutal] .ring .track { stroke-width: 1; }
  .card[data-theme=brutal] .title { font-weight: 700; letter-spacing: .05em; text-shadow: none; }
  .card[data-theme=brutal] .artist { opacity: .7; color: var(--ac); letter-spacing: .08em; }
  .card[data-theme=brutal] .time { font-size: 10px; letter-spacing: .04em; }
  .card[data-theme=brutal] .art { background: var(--art) center/cover, var(--art-bg); outline: 1px solid var(--ac); outline-offset: 2px; filter: grayscale(1) sepia(1) hue-rotate(205deg) saturate(1.6) brightness(.95); }
  .card[data-theme=brutal] .art svg { color: var(--ac); }
  .card[data-theme=brutal] button:hover { background: var(--ac); color: var(--ink); }
  .card[data-theme=brutal] .play { background: var(--play-bg); color: var(--ink); }
  .card[data-theme=brutal] .play:hover { background: var(--play-hover-bg); }

  /* Pixel art: paleta de dos verdes y crema sobre negro verdoso, marcos de línea doble */
  .card[data-theme=pixel] {
    --inset: inset 0 0 0 2px var(--frame), inset 0 0 0 4px var(--frame-gap), inset 0 0 0 5px var(--frame-2); --outer: 0 0 0 0 transparent;
    background: var(--bg-a); font-family: "Lucida Console", "Courier New", monospace; font-weight: 700;
    clip-path: polygon(0 3px, 3px 3px, 3px 0, calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px));
  }
  .card[data-theme=pixel] .glow { display: none; }
  .card[data-theme=pixel] svg { shape-rendering: crispEdges; }
  .card[data-theme=pixel] .ring .bar { stroke: var(--bar); stroke-linecap: butt; filter: none; stroke-width: 3; shape-rendering: crispEdges; }
  .card[data-theme=pixel] .title { font-size: 13px; letter-spacing: .02em; text-shadow: 1px 1px 0 var(--text-shadow); }
  .card[data-theme=pixel] .artist { color: var(--fg-2); opacity: 1; }
  .card[data-theme=pixel] .art { background: var(--art) center/cover, var(--art-bg); image-rendering: pixelated; box-shadow: 0 0 0 2px var(--frame), 0 0 0 4px var(--frame-gap), 0 0 0 5px var(--frame-2); filter: grayscale(1) sepia(1) hue-rotate(40deg) saturate(2.2) contrast(1.1); }
  .card[data-theme=pixel] button { background: transparent; box-shadow: inset 0 0 0 1px var(--frame); }
  .card[data-theme=pixel] button:hover { background: var(--hover-bg); }
  .card[data-theme=pixel] button:active { background: var(--play-bg); color: var(--ink); }
  .card[data-theme=pixel] .play { background: var(--play-bg); color: var(--ink); box-shadow: inset 0 0 0 1px var(--frame), inset 0 -3px 0 var(--play-inset); }
  .card[data-theme=pixel] .play:hover { background: var(--play-hover-bg); }
  .card[data-theme=pixel] .side button { box-shadow: none; background: transparent; }

  /* Retro Cyber: terminal de fósforo verde con tubo CRT, barrido de líneas y brillo */
  .card[data-theme=retro] {
    --r: 16px !important;
    --inset: inset 0 0 0 2px var(--line), inset 0 0 26px var(--crt-shade); --outer: 0 0 0 0 transparent;
    background: radial-gradient(ellipse at 50% 45%, var(--tube-a) 0%, var(--tube-b) 60%, var(--bg-b) 100%);
    font-family: "Lucida Console", Consolas, monospace;
  }
  .card[data-theme=retro] .glow { display: none; }
  .card[data-theme=retro]::after { content: ''; position: absolute; inset: 0; z-index: 4; pointer-events: none;
    background: repeating-linear-gradient(0deg, var(--scan) 0 1px, transparent 1px 3px); border-radius: 16px; }
  .card[data-theme=retro]::before { content: ''; position: absolute; inset: 0; z-index: 3; pointer-events: none; border-radius: 16px;
    box-shadow: inset 0 0 22px var(--glow-inset); }
  .card[data-theme=retro] .ring .bar { stroke: var(--bar); stroke-width: 2.5; filter: drop-shadow(0 0 4px var(--glow)); }
  .card[data-theme=retro] .title { letter-spacing: .06em; text-shadow: 0 0 6px var(--glow-text); }
  .card[data-theme=retro] .title::before { content: '> '; }
  .card[data-theme=retro] .artist { color: var(--fg-2); opacity: .9; letter-spacing: .08em; text-shadow: 0 0 5px var(--glow-text-2); }
  .card[data-theme=retro] .time { text-shadow: 0 0 5px var(--glow-time); }
  .card[data-theme=retro] .art { outline: 1px solid var(--fg-2); filter: grayscale(1) sepia(1) hue-rotate(75deg) saturate(2.6) brightness(.9); }
  .card[data-theme=retro] .art svg { color: var(--ac); }
  .card[data-theme=retro] button:hover { background: var(--hover-bg); }
  .card[data-theme=retro] .play { background: var(--play-bg); color: var(--ink); box-shadow: 0 0 12px var(--play-glow); border-radius: 3px; }
  .card[data-theme=retro] .play:hover { background: var(--play-hover-bg); }
  @media (prefers-reduced-motion: reduce) {
    .card, .card.show, .ring .bar, button { transition: none; }
    .card { transform: none; }
    .card.loading .play, .card.pending .mode { animation: none; }
    .scroll > span { animation: none; display: inline; }
    .scroll { text-overflow: ellipsis !important; }
  }
`;
})();
