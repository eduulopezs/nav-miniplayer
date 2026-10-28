(() => {
  const NMP = (globalThis.__NMP ||= {});
  const SKINS = (NMP.skins ||= {});
  const { hash } = NMP.util;

SKINS.noir = { label: 'Noir', tpl: () => `
  <div class="nr-wrap">
    <div class="nr-art" aria-hidden="true"><canvas class="nr-ridge" data-viz="ridge"></canvas></div><div class="nr-shade"></div>
    <div class="nr-no" aria-hidden="true"><small>PISTA</small><span data-t="no">01</span></div>
    <div class="nr-body">
      <div class="nr-stripes" aria-hidden="true"></div>
      <div class="nr-vert" aria-hidden="true">SIGNAL // NAV-MINIPLAYER // ESC 2026</div>
      <div class="nr-meta">
        <div class="nr-cell"><label>Pista</label><b class="nr-title" data-t="title"></b></div>
        <div class="nr-cell"><label>Artista</label><span class="nr-artist" data-t="artist"></span></div>
      </div>
      <div class="nr-chips"><button data-act="hide" title="Ocultar" aria-label="Ocultar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div class="nr-cells"><div class="nr-cell"><label>N°</label><span data-t="idx">01/04</span></div><div class="nr-cell"><label>Restante</label><span data-v="rem2">-00:00</span></div><div class="nr-cell"><label>Avance</label><span data-v="pct">0%</span></div></div>
      <div class="nr-code" role="slider" tabindex="0" data-bar aria-label="Progreso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
      <div class="nr-foot">
        <div class="nr-time"><b data-v="curd">00.00</b><i data-v="durd">/ 0:00</i></div>
        <div class="nr-ctl">
          <button class="nr-b pv" data-act="prev" title="Anterior" aria-label="Anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M6 5v14M19 5.5v13L9 12z"/></svg></button>
          <button class="nr-b bk" data-act="back" title="Retroceder 10 s" aria-label="Retroceder 10 segundos"><span data-skn="-">-10</span></button>
          <button class="nr-b pl" data-act="play" title="Pausar" aria-label="Pausar"><span class="ic ic-pause"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke-width="3.4"/></svg></span><span class="ic ic-play"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M7 4.5v15L20 12z" fill="currentColor"/></svg></span></button>
          <button class="nr-b fw" data-act="fwd" title="Avanzar 10 s" aria-label="Avanzar 10 segundos"><span data-skn="+">+10</span></button>
          <button class="nr-b nx" data-act="next" title="Siguiente" aria-label="Siguiente"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M18 5v14M5 5.5v13L15 12z"/></svg></button>
        </div>
      </div>
      <div class="nr-ext">
        <button class="nr-b vl" data-act="mute" title="Silenciar" aria-label="Silenciar o activar sonido"><span class="nr-vol"><span class="ic ic-vol"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg></span><span class="ic ic-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg></span><em></em></span></button>
      </div>
    </div>
  </div>` };
SKINS.noir.viz = {
  // Cresta de señal (ridgeline) afinada: curvas suaves, perspectiva (las líneas lejanas más bajas y tenues), pico central marcado,
  // línea frontal roja con halo y fantasma cian al golpe de bombo, y lectura de nivel en la esquina.
  ridge(g, w, h, V) {
    const big = h >= 140, rows = h < 60 ? 6 : h < 140 ? 10 : 14, hist = V.hist, x0 = w * .06, x1 = w * .94, pts = Math.min(56, Math.max(16, Math.floor((x1 - x0) / 3.4)));
    const top = big ? h * .16 : h * .08, bot = h * (big ? .76 : .86), gap = (bot - top) / rows, N = V.N, stamp = Math.floor(V.t / .085);
    const samp = (d, f) => { const bi = Math.max(0, Math.min(1, f)) * (N - 1) * .7, i0 = Math.floor(bi), i1 = Math.min(N - 1, i0 + 1); return d[i0] + (d[i1] - d[i0]) * (bi - i0); };
    // resplandor rojo bajo la línea frontal, proporcional al nivel
    const gr = g.createRadialGradient(w / 2, bot, 2, w / 2, bot, w * .6); gr.addColorStop(0, 'rgba(255,42,42,' + (.05 + .3 * V.lvl) + ')'); gr.addColorStop(1, 'rgba(255,42,42,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let k = 0; k < rows; k++) {
      const d = hist[rows - 1 - k] || V.b, base = top + (k + 1) * gap, front = k === rows - 1, depth = (k + 1) / rows, amp = gap * 6.4 * (.55 + .45 * depth), age = stamp - (rows - 1 - k), P = [];
      for (let i = 0; i < pts; i++) {
        const f = i / (pts - 1), env = Math.pow(Math.sin(Math.PI * f), 1.4), v = (samp(d, f - .015) + samp(d, f) * 2 + samp(d, f + .015)) / 4;
        const jit = (hash(i, age) - .5) * .5 * v * env, y = base - amp * env * Math.max(0, Math.pow(v, .9) + jit);
        P.push([x0 + f * (x1 - x0), Math.max(2, y)]);
      }
      const path = (dx) => { g.beginPath(); g.moveTo(P[0][0] + dx, P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0] + dx, P[i][1]); };
      path(0); g.lineTo(x1, h); g.lineTo(x0, h); g.closePath(); g.fillStyle = 'rgba(6,6,7,.97)'; g.fill();
      if (front && V.kick > .3) { path(-3 * V.kick); g.strokeStyle = 'rgba(40,220,255,' + (.8 * V.kick) + ')'; g.lineWidth = 1; g.stroke(); }
      path(0); g.lineJoin = 'round'; g.lineWidth = front ? 1.8 : .8 + .5 * depth; g.strokeStyle = front ? '#ff2a2a' : 'rgba(240,236,224,' + (.22 + .7 * depth) + ')';
      if (front) { g.shadowColor = '#ff2a2a'; g.shadowBlur = 8; } g.stroke(); g.shadowBlur = 0;
    }
    if (w >= 100 && h >= 100) { g.font = '700 7px "Space Mono", monospace'; g.fillStyle = '#ff2a2a'; g.textAlign = 'left'; g.fillText('SIG ' + (V.lvl * 99 | 0).toString().padStart(2, '0'), 8, 12); g.fillStyle = 'rgba(236,232,220,.7)'; g.textAlign = 'right'; g.fillText((-40 + V.lvl * 38).toFixed(1) + ' dB', w - 8, 12); g.textAlign = 'left'; }
  },
};

  SKINS.noir.css = `
/* ============================================================
   NOIR (referencias: póster techno-brutalista, billete "NOBODY 16.20", UI de error en rojo). Composición de billete:
   talón con la carátula en gris, línea de perforación con muescas reales, celdas con rótulo, tiempo en cifras grandes y
   código de barras como barra de progreso (lo reproducido en rojo). Aberración cromática y fallo ocasional.
   ============================================================ */
.sk-noir { --pp: #ece8dc; --rd: #ff2a2a; --gr: #8d897d; --bk: #0b0b0b; --ln: rgba(236,232,220,.34);
  font-family: "Space Mono", ui-monospace, monospace; color: var(--pp); background: transparent; }
.nr-wrap { background: var(--bk); border-radius: 6px; --stub: clamp(64px, 28cqw, 120px);
  -webkit-mask: radial-gradient(circle 7px at var(--stub) 0, #0000 97%, #000 100%), radial-gradient(circle 7px at var(--stub) 100%, #0000 97%, #000 100%);
  -webkit-mask-composite: source-in; mask: radial-gradient(circle 7px at var(--stub) 0, #0000 97%, #000 100%), radial-gradient(circle 7px at var(--stub) 100%, #0000 97%, #000 100%); mask-composite: intersect; }
.nr-wrap { position: absolute; inset: 0; display: grid; grid-template-columns: var(--stub) minmax(0, 1fr); min-width: 0; min-height: 0; }
.nr-wrap::before { content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 5; box-shadow: inset 0 0 0 1px var(--ln); border-radius: 6px; }
.nr-wrap::after { content: ""; position: absolute; left: var(--stub); top: 9px; bottom: 9px; border-left: 1px dashed var(--ln); z-index: 4; pointer-events: none; }
.nr-wrap > * { min-width: 0; min-height: 0; }
.nr-art { position: relative; overflow: hidden; background: linear-gradient(rgba(6,6,7,.66), rgba(6,6,7,.66)), var(--art) center / cover, #888; background-blend-mode: normal, luminosity, normal; }
.nr-ridge { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; }
.nr-art::before, .nr-art::after { content: ""; position: absolute; inset: 0; background: var(--art) center / cover; opacity: 0; mix-blend-mode: screen; }
.nr-art::before { background-color: var(--rd); background-blend-mode: multiply; transform: translateX(-4px); animation: nrgl 5s infinite; }
.nr-art::after { background-color: #28dcff; background-blend-mode: multiply; transform: translateX(4px); animation: nrgl 5s infinite .06s; }
@keyframes nrgl { 0%, 90%, 100% { opacity: 0; clip-path: inset(0); } 91% { opacity: .85; clip-path: inset(10% 0 62% 0); } 93% { opacity: .85; clip-path: inset(58% 0 12% 0); } 95% { opacity: .8; clip-path: inset(30% 0 40% 0); } 97% { opacity: 0; } }
.paused .nr-art { filter: grayscale(1) contrast(1.1) brightness(.5); } .paused .nr-art::before, .paused .nr-art::after { animation: none; }
.nr-shade { position: absolute; left: 0; top: 0; width: var(--stub); bottom: 0; z-index: 1; pointer-events: none; background: linear-gradient(180deg, rgba(11,11,11,.0), rgba(11,11,11,.75)), repeating-linear-gradient(0deg, rgba(0,0,0,.25) 0 1px, transparent 1px 3px); }
.nr-no { position: absolute; left: 7px; bottom: 5px; z-index: 2; font: 700 28px/1 "Archivo Narrow", sans-serif; color: var(--pp); letter-spacing: -.01em; text-shadow: -1px 0 rgba(255,42,42,.85), 1px 0 rgba(40,220,255,.5); }
.nr-no small { display: block; font: 700 7px/1 "Space Mono", monospace; letter-spacing: .24em; color: var(--rd); text-shadow: none; margin-bottom: 3px; }
.nr-body { grid-column: 2; position: relative; display: grid; padding: 10px 12px 10px 20px; gap: 6px 10px; align-content: space-between; min-width: 0; min-height: 0; z-index: 1;
  grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto auto auto; grid-template-areas: "meta chips" "code code" "foot foot"; }
.nr-body > * { min-width: 0; }
.nr-vert { position: absolute; left: 6px; top: 12px; bottom: 12px; writing-mode: vertical-rl; transform: rotate(180deg); font: 700 7px/1 "Space Mono", monospace; letter-spacing: .32em; color: var(--gr); white-space: nowrap; overflow: hidden; }
.nr-meta { grid-area: meta; display: grid; gap: 3px; }
.nr-cell { min-width: 0; }
.nr-cell label { display: block; font: 700 7px/1 "Space Mono", monospace; letter-spacing: .22em; color: var(--rd); margin-bottom: 2px; text-transform: uppercase; }
.nr-title { display: block; font: 700 clamp(15px, 6.4cqw, 21px)/1.02 "Archivo Narrow", sans-serif; text-transform: uppercase; letter-spacing: .005em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: -1px 0 rgba(255,42,42,.7), 1px 0 rgba(40,220,255,.4); }
.nr-artist { display: block; font: 400 10px/1.3 "Space Mono", monospace; color: var(--pp); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: .88; }
.nr-cells { grid-area: cells; display: none; grid-template-columns: repeat(3, auto); justify-content: space-between; gap: 8px; border-top: 1px solid var(--ln); padding-top: 6px; }
.nr-cells span { font: 700 11px/1 "Space Mono", monospace; letter-spacing: .02em; }
.nr-chips { grid-area: chips; display: flex; gap: 3px; align-self: start; margin: -4px -6px 0 0; }
.nr-chips button { width: 26px; height: 26px; display: grid; place-items: center; color: var(--pp); }
.nr-chips button:hover { color: var(--rd); }
.nr-chips svg { width: 12px; height: 12px; }
.nr-code { grid-area: code; position: relative; height: 24px; cursor: pointer; touch-action: none; align-self: center; }
.nr-code::before, .nr-code i { content: ""; position: absolute; inset: 0; -webkit-mask: var(--bars) 0 0 / 100% 100%; mask: var(--bars) 0 0 / 100% 100%; background: rgba(236,232,220,.55); }
.nr-code i { background: var(--rd); clip-path: inset(0 calc((1 - var(--p, 0)) * 100%) 0 0); filter: drop-shadow(0 0 4px rgba(255,42,42,.7)); }
.nr-code::after { content: ""; position: absolute; top: -3px; bottom: -3px; left: calc(var(--p, 0) * 100%); width: 2px; margin-left: -1px; background: var(--pp); box-shadow: 0 0 0 1px var(--bk), 0 0 8px var(--rd); }
.live-badge .nr-code { pointer-events: none; } .live-badge .nr-code::after { display: none; } .live-badge .nr-code i { clip-path: none; animation: nrbl 1s steps(2) infinite; }
@keyframes nrbl { 50% { opacity: .3; } }
.nr-foot { grid-area: foot; display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; min-width: 0; }
.nr-time { display: flex; align-items: baseline; gap: 4px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.nr-time b { font: 700 26px/.9 "Archivo Narrow", sans-serif; letter-spacing: .01em; color: var(--pp); text-shadow: -1px 0 rgba(255,42,42,.8), 1px 0 rgba(40,220,255,.45); }
.nr-time i { font: 400 9px/1 "Space Mono", monospace; font-style: normal; color: var(--gr); }
.nr-ctl { display: flex; align-items: center; gap: 4px; }
.nr-b { width: var(--bs, 30px); height: var(--bs, 30px); flex: none; display: grid; place-items: center; color: var(--pp); box-shadow: inset 0 0 0 1px var(--ln); font: 700 9px/1 "Space Mono", monospace; letter-spacing: .02em; transition: background .1s, color .1s; }
.nr-b:hover { background: rgba(255,42,42,.18); box-shadow: inset 0 0 0 1px var(--rd); }
.nr-b:active { transform: translateY(var(--press-shift)); }
.nr-b[disabled] { opacity: var(--opacity-disabled); pointer-events: none; }
.nr-b svg { width: 50%; height: 50%; }
.nr-b.pl { background: var(--rd); color: var(--bk); box-shadow: none; width: calc(var(--bs, 30px) * 1.3); clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px)); }
.nr-b.pl:hover { background: #ff5a5a; }
.nr-ext { grid-area: ext; display: none; gap: 6px; }
.nr-ext .nr-b { width: auto; min-width: var(--bs, 30px); padding: 0 10px; }
.nr-vol { display: flex; align-items: center; gap: 6px; } .nr-vol svg { width: 13px; height: 13px; }
.card:not(.muted) .nr-vol .ic-mute svg, .card.muted .nr-vol .ic-vol svg { position: absolute; }
.nr-vol em { font-style: normal; width: 34px; height: 4px; background: linear-gradient(90deg, var(--pp) 70%, rgba(236,232,220,.25) 70%); } .muted .nr-vol em { background: rgba(236,232,220,.25); }
.nr-stripes { display: none; position: absolute; top: 0; right: 22%; width: 18%; height: 6px; background: repeating-linear-gradient(135deg, var(--pp) 0 2px, transparent 2px 5px); z-index: 3; }

/* COMPACTO (base) */
.nr-wrap { --bs: 30px; }
.nr-b.bk, .nr-b.fw { display: none; }
@container (width >= 420px) { .nr-b.bk, .nr-b.fw { display: grid; } }
@container (width < 340px) { .nr-time i { display: none; } }
@container (width < 300px) { .nr-time { display: none; } .nr-foot { justify-content: flex-end; } .nr-b { --bs: 28px; } .nr-time b { font-size: 21px; } .nr-vert { display: none; } .nr-body { padding-left: 12px; } }
.nr-stripes { display: block; }

/* PASTILLA */
@container (height < 64px) {
  .nr-wrap { -webkit-mask: none; mask: none; --stub: calc(100cqh - 8px); }
  .nr-wrap { grid-template-columns: calc(100cqh - 8px) minmax(0, 1fr); padding: 4px 0 4px 4px; }
  .nr-wrap::after, .nr-vert, .nr-shade, .nr-no, .nr-stripes, .nr-cell label, .nr-artist, .nr-time, .nr-chips { display: none; }
  .nr-art { width: calc(100cqh - 8px); height: calc(100cqh - 8px); }
  .nr-body { padding: 0 8px 5px 10px; gap: 0 8px; align-content: center; grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: minmax(0, 1fr) 8px; grid-template-areas: "meta foot" "code code"; margin-top: -4px; }
  .nr-wrap { --bs: 28px; }
  .nr-title { font-size: 15px; }
  .nr-foot { align-items: center; gap: 3px; } .nr-ctl { gap: 3px; } .nr-b.bk, .nr-b.fw { display: grid; } .nr-b.pl { clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px)); width: var(--bs); }
  .nr-code { height: 8px; margin: 0 -8px 0 -10px; } .nr-code::after { display: none; }
  .nr-meta { align-self: center; }
}
@container (height < 64px) and (width < 340px) { .nr-b.bk, .nr-b.fw { display: none; } }
@container (height < 64px) and (width < 264px) { .nr-b.pv, .nr-b.nx { display: none; } }

/* FILA */
@container (64px <= height < 140px) {
  .nr-wrap { --stub: min(calc(100cqh - 16px), 76px); }
  .nr-wrap { grid-template-columns: var(--stub) minmax(0, 1fr); padding: 8px 0 8px 8px; }
  .nr-wrap::after { left: calc(var(--stub) + 8px + 6px); top: 3px; bottom: 3px; }
  .nr-art { grid-column: 1; width: var(--stub); height: 100%; } .nr-shade, .nr-vert, .nr-stripes { display: none; } .nr-no { font-size: 20px; left: 5px; bottom: 3px; } .nr-no small { display: none; }
  .nr-body { padding: 0 10px 0 18px; align-content: center; grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto auto; grid-template-areas: "meta foot" "code foot"; gap: 8px 12px; }
  .nr-chips, .nr-time, .nr-cell label { display: none; } .nr-foot { align-self: center; grid-row: 1 / 3; }
  .nr-title { font-size: clamp(16px, 7.6cqh, 22px); } .nr-code { height: 18px; }
  .nr-wrap { --bs: min(36px, calc(100cqh - 24px)); }
  .nr-wrap { -webkit-mask: radial-gradient(circle 6px at calc(var(--stub) + 14px) 0, #0000 97%, #000 100%), radial-gradient(circle 6px at calc(var(--stub) + 14px) 100%, #0000 97%, #000 100%); -webkit-mask-composite: source-in; mask: radial-gradient(circle 6px at calc(var(--stub) + 14px) 0, #0000 97%, #000 100%), radial-gradient(circle 6px at calc(var(--stub) + 14px) 100%, #0000 97%, #000 100%); mask-composite: intersect; }
}
@container (64px <= height < 140px) and (width < 540px) { .nr-b.bk, .nr-b.fw { display: none; } }
@container (64px <= height < 140px) and (width >= 540px) { .nr-b.bk, .nr-b.fw { display: grid; } }
@container (64px <= height < 140px) and (width < 330px) { .nr-b.pv, .nr-b.nx { display: none; } }

/* PANORÁMICO: talón grande a la izquierda y cuerpo con celdas */
@container (height >= 140px) and (width >= 400px) and (aspect-ratio > 21 / 10) {
  .nr-wrap { --stub: min(calc(100cqh * 1.0), 38cqw); }
  .nr-no { font-size: clamp(34px, 24cqh, 60px); left: 12px; bottom: 8px; }
  .nr-body { padding: 14px 14px 14px 22px; grid-template-rows: auto auto auto auto; grid-template-areas: "meta chips" "cells cells" "code code" "foot foot"; align-content: space-between; }
  .nr-title { font-size: clamp(20px, 11cqh, 32px); white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1; }
  .nr-cells { display: grid; }
  .nr-wrap { --bs: 34px; }
  .nr-time b { font-size: clamp(24px, 14cqh, 34px); }
}
@container (height >= 140px) and (width >= 400px) and (width < 560px) and (aspect-ratio > 21 / 10) { .nr-cells { display: none; } }
@container (height >= 140px) and (width >= 400px) and (aspect-ratio > 21 / 10) and (height < 240px) { .nr-cells { display: none; } .nr-title { -webkit-line-clamp: 1; } }
@container (height >= 140px) and (width >= 400px) and (aspect-ratio > 21 / 10) and (height < 190px) { .nr-cell label { display: none; } }
@container (height >= 140px) and (width >= 400px) and (width < 560px) and (aspect-ratio > 21 / 10) { .nr-time { display: none; } .nr-foot { justify-content: flex-end; } }

/* PORTADA: billete vertical con perforación horizontal */
@container (height >= 280px) and (aspect-ratio < 23 / 20) {
  .nr-wrap { --stubh: clamp(96px, 34cqh, 220px);
    -webkit-mask: radial-gradient(circle 7px at 0 var(--stubh), #0000 97%, #000 100%), radial-gradient(circle 7px at 100% var(--stubh), #0000 97%, #000 100%); -webkit-mask-composite: source-in;
    mask: radial-gradient(circle 7px at 0 var(--stubh), #0000 97%, #000 100%), radial-gradient(circle 7px at 100% var(--stubh), #0000 97%, #000 100%); mask-composite: intersect; }
  .nr-wrap { grid-template-columns: 1fr; grid-template-rows: var(--stubh) minmax(0, 1fr); }
  .nr-wrap::after { left: 9px; right: 9px; top: var(--stubh); bottom: auto; border-left: 0; border-top: 1px dashed var(--ln); }
  .nr-shade { width: 100%; height: var(--stubh); bottom: auto; } .nr-vert { display: none; }
  .nr-art { grid-column: 1; grid-row: 1; width: 100%; height: 100%; }
  .nr-no { font-size: clamp(44px, 14cqw, 70px); left: 14px; bottom: calc(100% - var(--stubh) + 12px); }
  .nr-body { grid-column: 1; grid-row: 2; padding: 14px 16px 14px; grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto auto auto auto; grid-template-areas: "meta chips" "cells cells" "code code" "foot foot"; }
  .nr-chips { position: absolute; top: calc(-1 * var(--stubh) + 12px); right: 12px; margin: 0; z-index: 6; } .nr-chips button { background: rgba(11,11,11,.7); }
  .nr-title { font-size: clamp(22px, 8.4cqw, 32px); white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: .98; }
  .nr-cells { display: none; }
  .nr-wrap { --bs: min(42px, calc((100cqw - 32px - 4 * 4px) / 5.3)); }
  .nr-foot { flex-direction: column; align-items: stretch; gap: 8px; }
  .nr-time b { font-size: clamp(28px, 10cqw, 40px); } .nr-time i { font-size: 11px; }
  .nr-ctl { justify-content: space-between; } .nr-b.bk, .nr-b.fw { display: grid; }
  .nr-code { height: 28px; } .nr-stripes { display: block; right: 14%; }
}
@container (height >= 280px) and (height < 376px) and (aspect-ratio < 23 / 20) { .nr-time, .nr-cell label { display: none; } .nr-title { -webkit-line-clamp: 1; } }
@container (height >= 440px) and (aspect-ratio < 23 / 20) { .nr-ext { grid-area: cells; display: flex; justify-content: flex-end; } .nr-ext .nr-b { --bs: 34px; } }
@media (prefers-reduced-motion: reduce) { .nr-art::before, .nr-art::after, .live-badge .nr-code i { animation: none; } }
`;
})();
