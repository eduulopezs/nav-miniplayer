(() => {
  const NMP = (globalThis.__NMP ||= {});
  const SKINS = (NMP.skins ||= {});

  const btn = (cls, act, title, label, inner) => `<button class="an-b ${cls}" data-act="${act}" title="${title}" aria-label="${label}">${inner}</button>`;

SKINS.ansi = { get label() { return NMP.t('themeAnsi'); }, tpl: () => `
  <div class="an-wrap">
    <button class="an-cov" data-act="cover" aria-pressed="false" aria-label="${NMP.t('cover')}" title="${NMP.t('cover')}"></button>
    <div class="an-meta">
      <div class="an-ps" aria-hidden="true"><span class="g">nav@mini</span>:<span class="c">~</span>$ now-playing</div>
      <div class="an-title"><span class="y" aria-hidden="true">&gt; </span><span data-t="title"></span></div>
      <div class="an-artist"><span class="d" aria-hidden="true"># </span><span data-t="artist"></span></div>
    </div>
    <div class="an-chips"><button data-act="hide" title="${NMP.t('hide')}" aria-label="${NMP.t('hide')}"><span aria-hidden="true">x</span></button></div>
    <canvas class="an-spec" data-viz="spec" aria-hidden="true"></canvas>
    <div class="an-prog"><span class="an-t" data-v="cur">0:00</span><div class="an-bar" role="slider" tabindex="0" data-bar aria-label="${NMP.t('progress')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><span class="an-t r" data-v="dur">0:00</span></div>
    <div class="an-ctl">
      ${btn('pv', 'prev', NMP.t('prev'), NMP.t('prev'), '<span aria-hidden="true">|&lt;</span>')}
      ${btn('bk', 'back', NMP.t('backTitle', '10'), NMP.t('backLabel', '10'), '<span aria-hidden="true" data-skn="-">-10</span>')}
      ${btn('pl', 'play', NMP.t('pause'), NMP.t('pause'), '<span class="ic ic-pause" aria-hidden="true">||</span><span class="ic ic-play" aria-hidden="true">&gt;</span>')}
      ${btn('fw', 'fwd', NMP.t('fwdTitle', '10'), NMP.t('fwdLabel', '10'), '<span aria-hidden="true" data-skn="+">+10</span>')}
      ${btn('nx', 'next', NMP.t('next'), NMP.t('next'), '<span aria-hidden="true">&gt;|</span>')}
    </div>
    <div class="an-ext">${btn('vl', 'mute', NMP.t('mute'), NMP.t('muteLabel'), '<span class="ic ic-vol" aria-hidden="true">vol</span><span class="ic ic-mute" aria-hidden="true">mut</span>')}<input type="range" class="vol-r" data-vol min="0" max="100" step="1" value="100" aria-label="${NMP.t('volume')}"></div>
  </div>` };

SKINS.ansi.viz = {
  // Espectro en celdas de bloque, como un analizador en una terminal: verde abajo, amarillo en medio, rojo arriba.
  spec(g, w, h, V) {
    const cw = h < 40 ? 4 : 6, ch = 4, cols = Math.max(4, Math.floor(w / (cw + 1))), rows = Math.max(2, Math.floor(h / (ch + 1))), N = V.N;
    const x0 = Math.floor((w - (cols * (cw + 1) - 1)) / 2);
    for (let c = 0; c < cols; c++) {
      const bi = (c / (cols - 1)) * (N - 1) * .86, i0 = Math.floor(bi), i1 = Math.min(N - 1, i0 + 1), v = V.b[i0] + (V.b[i1] - V.b[i0]) * (bi - i0), n = Math.round(v * rows);
      for (let r = 0; r < n; r++) {
        const f = r / (rows - 1);
        g.fillStyle = f < .6 ? '#16c60c' : f < .85 ? '#f9f1a5' : '#e74856';
        g.fillRect(x0 + c * (cw + 1), h - (r + 1) * (ch + 1) + 1, cw, ch);
      }
    }
  },
};

  SKINS.ansi.css = `
/* ============================================================
   TERMINAL ANSI. Una terminal moderna: fondo casi negro, texto monoespaciado, los 16 colores ANSI y botones entre corchetes que se
   invierten al pasar el ratón. Los pares de color se declaran como --an-* y scripts/contrast.mjs los lee para comprobar AA.
   ============================================================ */
.card.sk-ansi { --an-bg: #0c0c0c; --an-fg: #cccccc; --an-dim: #8a8a8a; --an-green: #16c60c; --an-cyan: #61d6d6; --an-yellow: #f9f1a5; --an-track: #767676; --an-line: #3a3a3a;
  --focus: #f2f2f2; --vol-c: var(--an-green);
  font-family: "JetBrains Mono", ui-monospace, Consolas, monospace; color: var(--an-fg); border-radius: var(--r, 8px); background: var(--an-bg);
  box-shadow: 0 0 0 1px var(--an-line), 0 10px 28px rgba(0,0,0,.5); }
.an-wrap { position: absolute; inset: 0; display: grid; --pad: 12px; --bs: 30px; padding: var(--pad); gap: 6px 12px; min-width: 0; min-height: 0; align-content: space-between; font-size: 12px; }
.an-wrap > * { min-width: 0; min-height: 0; }
.an-wrap .g, .an-wrap .y, .an-wrap .c, .an-wrap .d { font-weight: 700; }
.an-wrap .g { color: var(--an-green); } .an-wrap .c { color: var(--an-cyan); } .an-wrap .y { color: var(--an-yellow); } .an-wrap .d { color: var(--an-dim); }
.an-cov { grid-area: cov; align-self: center; width: 100%; height: 100%; max-height: 100%; aspect-ratio: 1; background: var(--art) var(--an-line) center / cover; image-rendering: pixelated; box-shadow: 0 0 0 1px var(--an-dim); transition: filter .3s; }
.paused .an-cov { filter: grayscale(1) brightness(.7); }
.an-meta { grid-area: meta; align-self: center; padding-right: 22px; }
.an-ps { display: none; color: var(--an-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
.an-title { font-weight: 700; font-size: 13px; line-height: 1.3; color: #f2f2f2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.an-artist { color: var(--an-cyan); line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.an-chips { grid-area: meta; justify-self: end; align-self: start; margin: -4px -4px 0 0; z-index: 3; }
.an-chips button { width: 22px; height: 22px; display: grid; place-items: center; color: var(--an-dim); font-weight: 700; }
.an-chips button:hover { background: var(--an-fg); color: var(--an-bg); }
.an-spec { grid-area: spec; display: none; width: 100%; height: 100%; }
.an-prog { grid-area: prog; display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--an-dim); font-variant-numeric: tabular-nums; }
.an-t { flex: none; min-width: 30px; } .an-t.r { text-align: right; }
.an-bar { position: relative; flex: 1; height: 18px; cursor: pointer; touch-action: none; }
.an-bar::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 8px; margin-top: -4px; border: 1px solid var(--an-track);
  background: repeating-linear-gradient(90deg, transparent 0 5px, var(--an-bg) 5px 6px); }
.an-bar i { position: absolute; left: 2px; top: 50%; height: 4px; margin-top: -2px; max-width: calc(100% - 4px); width: calc(var(--p, 0) * (100% - 4px)); background: var(--an-green);
  -webkit-mask: repeating-linear-gradient(90deg, #000 0 5px, transparent 5px 6px); mask: repeating-linear-gradient(90deg, #000 0 5px, transparent 5px 6px); }
.an-bar:hover::before, .an-bar:focus-visible::before, .an-bar.drag::before { border-color: var(--an-fg); }
.live-badge .an-bar { pointer-events: none; } .live-badge .an-bar i { width: calc(100% - 4px); animation: anblink 1.2s steps(2, jump-none) infinite; }
@keyframes anblink { 50% { opacity: .3; } }
.an-ctl { grid-area: ctl; display: flex; align-items: center; justify-content: flex-start; gap: 2px; }
.an-b { height: var(--bs); min-width: var(--bs); flex: none; padding: 0 3px; display: inline-flex; align-items: center; justify-content: center; color: var(--an-fg); font: 700 12px "JetBrains Mono", ui-monospace, Consolas, monospace; transition: background var(--dur-fast), color var(--dur-fast), transform .12s; }
.an-b::before { content: "["; color: var(--an-dim); margin-right: 3px; font-weight: 400; } .an-b::after { content: "]"; color: var(--an-dim); margin-left: 3px; font-weight: 400; }
.an-b:hover { background: var(--an-fg); color: var(--an-bg); } .an-b:hover::before, .an-b:hover::after { color: var(--an-bg); }
.an-b:active { transform: scale(var(--press-scale)); }
.card:not(.paused) .an-b .ic-play, .card.paused .an-b .ic-pause, .card:not(.muted) .an-b .ic-mute, .card.muted .an-b .ic-vol { display: none; }
.an-b[disabled] { opacity: var(--opacity-disabled); pointer-events: none; }
.an-b.pl { color: var(--an-green); } .an-b.pl:hover { color: var(--an-bg); }
.an-ext { grid-area: ext; display: none; align-items: center; justify-content: center; gap: 6px; }

/* COMPACTO (base) */
.an-wrap { --cw: min(100cqh - 2 * var(--pad), 30cqw); --bs: 30px;
  grid-template-columns: var(--cw) minmax(0, 1fr); grid-template-rows: auto 18px 36px; grid-template-areas: "cov meta" "cov prog" "cov ctl"; }
@container (width < 380px) { .an-b.bk, .an-b.fw { display: none; } }
@container (width < 270px) { .an-t.r { display: none; } }

/* PASTILLA */
@container (height < 64px) {
  .an-wrap { --pad: 6px; --cw: calc(100cqh - 2 * var(--pad)); --bs: 26px; padding: var(--pad) 6px var(--pad) var(--pad); gap: 0 8px; align-content: stretch; grid-template-columns: var(--cw) minmax(0, 1fr) auto; grid-template-rows: minmax(0, 1fr) 6px; grid-template-areas: "cov meta ctl" "prog prog prog"; }
  .an-meta { padding: 0; } .an-artist, .an-chips, .an-t { display: none; }
  .an-ctl { gap: 0; justify-content: center; } .an-b { padding: 0 3px; } .an-bar { height: 6px; margin: 0 -6px 0 -6px; } .an-bar::before { height: 4px; margin-top: -2px; border: 0; background: var(--an-line); } .an-bar i { height: 4px; margin-top: -2px; left: 0; width: calc(var(--p, 0) * 100%); max-width: 100%; }
}
@container (height < 64px) and (width < 400px) { .an-b.bk, .an-b.fw { display: none; } }
@container (height < 64px) and (width < 300px) { .an-b.pv, .an-b.nx { display: none; } }

/* FILA */
@container (64px <= height < 140px) {
  .an-wrap { --pad: 10px; --cw: min(100cqh - 2 * var(--pad), 90px, 28cqw); gap: 4px 12px; align-content: stretch; grid-template-columns: var(--cw) minmax(0, 1fr) auto; grid-template-rows: minmax(0, 1fr) 18px; grid-template-areas: "cov meta ctl" "cov prog ctl"; }
  .an-chips { display: none; } .an-meta { padding: 0; align-self: end; } .an-prog { align-self: start; } .an-b.bk, .an-b.fw { display: none; }
}
@container (64px <= height < 140px) and (width >= 560px) { .an-b.bk, .an-b.fw { display: inline-flex; } }
@container (64px <= height < 140px) and (width < 460px) { .an-t { display: none; } }
@container (64px <= height < 140px) and (width >= 660px) { .an-wrap { grid-template-columns: var(--cw) minmax(0, 1fr) auto auto; grid-template-areas: "cov meta ctl ext" "cov prog ctl ext"; } .an-ext { display: flex; } }
@container (64px <= height < 84px) { .an-artist { display: none; } }
@container (64px <= height < 140px) and (width < 380px) { .an-b.pv, .an-b.nx { display: none; } }

/* PANORÁMICO */
@container (height >= 140px) and (width >= 400px) and (aspect-ratio > 21 / 10) {
  .an-wrap { --pad: 14px; --cw: min(100cqh - 2 * var(--pad), 32cqw); grid-template-columns: var(--cw) minmax(0, 1fr) auto; grid-template-rows: auto minmax(0, 1fr) 18px auto; column-gap: 16px; grid-template-areas: "cov meta meta" "cov spec spec" "cov prog prog" "cov ctl ext"; }
  .an-cov { grid-row: 1 / -1; } .an-meta { align-self: start; } .an-ps { display: block; } .an-spec { display: block; }
}
@container (height >= 140px) and (width >= 600px) and (aspect-ratio > 21 / 10) { .an-ext { display: flex; } }
@container (height >= 140px) and (width >= 400px) and (width < 500px) and (aspect-ratio > 21 / 10) { .an-b.bk, .an-b.fw { display: none; } }

/* PORTADA */
@container (height >= 280px) and (aspect-ratio < 23 / 20) {
  .an-wrap { --pad: 14px; --ch: calc(100cqh - 214px); gap: 8px; align-content: start; grid-template-columns: minmax(0, 1fr); grid-template-rows: var(--ch) auto 28px 18px auto; grid-template-areas: "cov" "meta" "spec" "prog" "ctl"; }
  .an-cov { aspect-ratio: auto; } .an-spec { display: block; } .an-ps { display: block; }
  .an-chips { grid-area: cov; margin: 6px 6px 0 0; } .an-chips button { background: var(--an-bg); color: var(--an-fg); }
  .an-meta { padding: 0; } .an-title { font-size: 15px; }
  .an-ctl { justify-content: space-between; } .an-b.bk, .an-b.fw { display: inline-flex; }
}
@container (height >= 400px) and (aspect-ratio < 23 / 20) {
  .an-wrap { --ch: calc(100cqh - 256px); grid-template-rows: var(--ch) auto 28px 18px auto auto; grid-template-areas: "cov" "meta" "spec" "prog" "ctl" "ext"; }
  .an-ext { display: flex; justify-content: center; }
}
@media (prefers-reduced-motion: reduce) { .live-badge .an-bar i { animation: none; } .an-cov, .an-b { transition: none; } }
`;
})();
