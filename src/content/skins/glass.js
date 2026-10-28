(() => {
  const NMP = (globalThis.__NMP ||= {});
  const SKINS = (NMP.skins ||= {});
  const { hash } = NMP.util;

SKINS.glass = { label: 'Glassware', tpl: () => `
  <div class="gl-glow" aria-hidden="true"></div><canvas class="gl-rib" data-viz="rib" aria-hidden="true"></canvas>
  <div class="gl-wrap">
    <div class="gl-cov" aria-hidden="true"></div>
    <div class="gl-meta"><div class="gl-title" data-t="title"></div><div class="gl-artist" data-t="artist"></div></div>
    <div class="gl-chips"><button data-act="hide" title="Ocultar" aria-label="Ocultar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg></button></div>
    <div class="gl-prog"><span class="gl-t" data-v="cur">0:00</span><div class="gl-bar" role="slider" tabindex="0" data-bar aria-label="Progreso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><span class="gl-t r" data-v="dur">0:00</span></div>
    <div class="gl-ctl">
      <button class="gl-b pv" data-act="prev" title="Anterior" aria-label="Anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 5.5v13" /><path d="M19 6v12l-9.5-6z" fill="currentColor"/></svg></button>
      <button class="gl-b bk" data-act="back" title="Retroceder 10 s" aria-label="Retroceder 10 segundos"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g transform="matrix(-1 0 0 1 24 0)"><path d="M4 12a8 8 0 1 1 8 8"/><path d="M12 17l-3.4 3 3.4 3z" fill="currentColor" stroke-width="1"/></g><text class="gl-t10" data-skn="" x="12" y="14.6" text-anchor="middle" stroke="none">10</text></svg></button>
      <button class="gl-b pl" data-act="play" title="Pausar" aria-label="Pausar"><span class="ic ic-pause"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.4" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.4" fill="currentColor"/></svg></span><span class="ic ic-play"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span></button>
      <button class="gl-b fw" data-act="fwd" title="Avanzar 10 s" aria-label="Avanzar 10 segundos"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 1 8 8"/><path d="M12 17l-3.4 3 3.4 3z" fill="currentColor" stroke-width="1"/><text class="gl-t10" data-skn="" x="12" y="14.6" text-anchor="middle" stroke="none">10</text></svg></button>
      <button class="gl-b nx" data-act="next" title="Siguiente" aria-label="Siguiente"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 5.5v13" /><path d="M5 6v12l9.5-6z" fill="currentColor"/></svg></button>
    </div>
    <div class="gl-ext"><button class="gl-b vl" data-act="mute" title="Silenciar" aria-label="Silenciar o activar sonido"><span class="ic ic-vol"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg></span><span class="ic ic-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg></span></button></div>
  </div>` };
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
SKINS.glass.viz = {
  // Tres cintas de color con curvas suaves, mezcladas en aditivo; cada una sigue otro tramo del espectro.
  rib(g, w, h, V, card) {
    const pal = [card.style.getPropertyValue('--c1') || '#ffb36b', card.style.getPropertyValue('--c2') || '#e0475b', card.style.getPropertyValue('--c3') || '#7c5cff'].map((c) => c.trim());
    const n = Math.max(8, Math.min(28, Math.round(w / 22))), N = V.N; g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const pts = []; for (let i = 0; i <= n; i++) { const f = i / n, bi = Math.min(N - 1, Math.floor(((f * .8 + k * .09) % 1) * (N - 1))); const v = V.b[bi] * .75 + V.b[Math.min(N - 1, bi + 1)] * .25; const drift = .04 * Math.sin(V.t * (.9 + k * .35) + i * .8 + k);
        pts.push([f * w, h - (h * (.04 + .025 * k) + h * (.6 - .1 * k) * (v + drift) * Math.sin(Math.PI * (.12 + f * .76)))]); }
      const y0 = Math.min(...pts.map((p) => p[1])), gr = g.createLinearGradient(0, y0, 0, h); gr.addColorStop(0, hexA(pal[k], .62)); gr.addColorStop(1, hexA(pal[k], .02));
      g.beginPath(); g.moveTo(0, h); g.lineTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
      g.lineTo(w, pts[n][1]); g.lineTo(w, h); g.closePath(); g.fillStyle = gr; g.fill();
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
      g.lineTo(w, pts[n][1]); g.strokeStyle = 'rgba(255,255,255,' + (.5 - k * .12) + ')'; g.lineWidth = 1.2; g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
  },
};

  SKINS.glass.css = `
/* ============================================================
   GLASSWARE. Cristal esmerilado con borde de luz, grano, el color de la carátula filtrándose por detrás y cintas de
   color que respiran con el audio. Botones circulares de cristal y un play blanco brillante.
   ============================================================ */
.sk-glass { --w2: rgba(255,255,255,.76); --w3: rgba(255,255,255,.5); font-family: "Figtree", system-ui, sans-serif; color: #fff;
  border-radius: var(--r, 26px);
  background: linear-gradient(150deg, rgba(255,255,255,.27), rgba(255,255,255,.07) 55%, rgba(255,255,255,.15));
  -webkit-backdrop-filter: blur(28px) saturate(1.7); backdrop-filter: blur(28px) saturate(1.7);
  box-shadow: 0 26px 60px rgba(8,10,40,.5), 0 2px 6px rgba(8,10,40,.25), inset 0 1px 0 rgba(255,255,255,.6), inset 0 -1px 0 rgba(255,255,255,.1); }
.sk-glass::before { content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1px; z-index: 5; pointer-events: none;
  background: linear-gradient(140deg, rgba(255,255,255,.8), rgba(255,255,255,.08) 38%, rgba(255,255,255,.04) 62%, rgba(255,255,255,.55));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); }
.sk-glass::after { content: ""; position: absolute; inset: 0; z-index: 4; pointer-events: none; opacity: .16; mix-blend-mode: overlay;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E"); }
.gl-glow { position: absolute; inset: -25%; z-index: 0; background: var(--art) center / cover; filter: blur(38px) saturate(1.9); opacity: calc(.16 + var(--lvl, 0) * .42); mix-blend-mode: soft-light; transform: scale(calc(1 + var(--kick, 0) * .05)); transition: opacity .25s; }
.paused .gl-glow { opacity: .1; }
.gl-rib { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 50%; z-index: 1; pointer-events: none; }
.gl-wrap { position: absolute; inset: 0; z-index: 2; display: grid; --pad: 14px; --bs: 34px; padding: var(--pad); gap: 8px 12px; min-width: 0; min-height: 0; align-content: space-between; }
.gl-wrap > * { min-width: 0; min-height: 0; }
.gl-wrap svg { width: 56%; height: 56%; display: block; }
.gl-cov { position: absolute; left: 0; top: 0; width: var(--cw); height: 100%; z-index: 0; background: var(--art) center / cover; transform-origin: left center; transform: scale(calc(1 + var(--kick, 0) * .015));
  -webkit-mask-image: linear-gradient(90deg, #000 58%, rgba(0,0,0,.55) 82%, transparent 100%); mask-image: linear-gradient(90deg, #000 58%, rgba(0,0,0,.55) 82%, transparent 100%); transition: filter .3s; }
.gl-cov::after { content: ""; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,.34), rgba(255,255,255,0) 40%), linear-gradient(0deg, rgba(0,0,0,.16), transparent 45%); }
.paused .gl-cov { filter: saturate(.55) brightness(.85); }
.gl-meta { grid-area: meta; align-self: center; padding-right: 58px; }
.gl-title { font: 700 15px/1.2 "Figtree", sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 8px rgba(0,0,0,.3); letter-spacing: -.005em; }
.gl-artist { font: 500 12px/1.3 "Figtree", sans-serif; color: var(--w2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gl-chips { grid-area: meta; justify-self: end; align-self: start; display: flex; gap: 2px; margin: -6px -6px 0 0; z-index: 3; }
.gl-chips button { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; color: var(--w2); }
.gl-chips button:hover { background: rgba(255,255,255,.22); color: #fff; }
.gl-chips svg { width: 14px; height: 14px; }
.gl-prog { grid-area: prog; display: flex; align-items: center; gap: 8px; font: 500 10.5px/1 "Figtree", sans-serif; color: var(--w2); font-variant-numeric: tabular-nums; }
.gl-t { flex: none; min-width: 30px; } .gl-t.r { text-align: right; }
.gl-bar { position: relative; flex: 1; height: 18px; cursor: pointer; touch-action: none; }
.gl-bar::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 4px; margin-top: -2px; border-radius: 4px; background: rgba(255,255,255,.26); box-shadow: inset 0 1px 1px rgba(0,0,0,.2); }
.gl-bar i { position: absolute; left: 0; top: 50%; height: 4px; margin-top: -2px; width: calc(var(--p, 0) * 100%); border-radius: 4px; background: linear-gradient(90deg, rgba(255,255,255,.7), #fff); box-shadow: 0 0 12px rgba(255,255,255,.7); }
.gl-bar::after { content: ""; position: absolute; top: 50%; left: calc(var(--p, 0) * 100%); width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.35), 0 0 0 3px rgba(255,255,255,.22); transform: scale(.8); transition: transform var(--dur-fast); }
.gl-bar:hover::after, .gl-bar:focus-visible::after, .gl-bar.drag::after { transform: scale(1.15); }
.live-badge .gl-bar { pointer-events: none; } .live-badge .gl-bar::after { display: none; } .live-badge .gl-bar i { width: 100%; animation: glpulse 1.6s ease-in-out infinite; }
@keyframes glpulse { 50% { opacity: .35; } }
.gl-ctl { grid-area: ctl; display: flex; align-items: center; justify-content: center; gap: 6px; }
.gl-b { width: var(--bs); height: var(--bs); flex: none; border-radius: 50%; display: grid; place-items: center; color: #fff; transition: background var(--dur-fast), transform .12s; }
.gl-b:hover { background: rgba(255,255,255,.2); }
.gl-b:active { transform: scale(var(--press-scale)); }
.gl-b[disabled] { opacity: var(--opacity-disabled); pointer-events: none; }
.gl-b.pl { width: calc(var(--bs) * 1.2); height: calc(var(--bs) * 1.2); background: linear-gradient(180deg, #fff, #dde5f6); color: #1b1f3a;
  box-shadow: 0 8px 20px rgba(0,0,0,.35), inset 0 -3px 6px rgba(110,125,210,.3), inset 0 1px 0 #fff; }
.gl-b.pl:hover { background: linear-gradient(180deg, #fff, #eef2ff); }
.gl-b.pl svg { width: 46%; height: 46%; }
.gl-t10 { font: 700 8.2px "Figtree", sans-serif; fill: currentColor; }
.gl-ext { grid-area: ext; display: none; align-items: center; justify-content: center; }

/* COMPACTO (base): la portada va a sangre en el borde izquierdo y se funde con el cristal */
.gl-wrap { --cw: min(100cqh, 34cqw); --bs: min(36px, calc((100cqw - var(--cw) - 2 * var(--pad) - 4 * 6px) / 5.2));
  grid-template-columns: calc(var(--cw) - var(--pad)) minmax(0, 1fr); grid-template-rows: auto 18px 44px; grid-template-areas: "cov meta" "cov prog" "cov ctl"; }
.gl-ctl { justify-content: flex-start; }
@container (width < 300px) { .gl-b.bk, .gl-b.fw { display: none; } .gl-wrap { --bs: min(36px, calc((100cqw - var(--cw) - 2 * var(--pad) - 2 * 6px) / 3.4)); } }
@container (width < 270px) { .gl-t.r { display: none; } }

/* PASTILLA */
@container (height < 64px) {
  .gl-wrap { --pad: 5px; --cw: 100cqh; --bs: 28px; padding: 0 8px 0 var(--pad); gap: 0 8px; align-content: stretch; grid-template-columns: calc(var(--cw) - var(--pad)) minmax(0, 1fr) auto; grid-template-rows: minmax(0, 1fr) 8px; grid-template-areas: "cov meta ctl" "prog prog prog"; }
  .gl-cov { -webkit-mask-image: linear-gradient(90deg, #000 55%, transparent); mask-image: linear-gradient(90deg, #000 55%, transparent); }
  .gl-meta { padding: 0; } .gl-title { font-size: 13px; } .gl-artist, .gl-chips, .gl-t { display: none; }
  .gl-ctl { gap: 1px; justify-content: center; } .gl-bar { height: 8px; margin: 0 -8px 0 -5px; } .gl-bar::before, .gl-bar i { height: 3px; margin-top: -1.5px; border-radius: 0; } .gl-bar::after { display: none; }
  .gl-rib { height: 100%; opacity: .7; }
}
@container (height < 64px) and (width < 340px) { .gl-b.bk, .gl-b.fw { display: none; } }
@container (height < 64px) and (width < 264px) { .gl-b.pv, .gl-b.nx { display: none; } }

/* FILA */
@container (64px <= height < 140px) {
  .gl-wrap { --pad: 10px; --cw: min(100cqh, 104px, 30cqw); --bs: min(38px, calc(100cqh - 2 * var(--pad) - 4px)); padding-left: var(--pad); gap: 4px 12px; align-content: stretch; grid-template-columns: calc(var(--cw) - var(--pad)) minmax(0, 1fr) auto; grid-template-rows: minmax(0, 1fr) 18px; grid-template-areas: "cov meta ctl" "cov prog ctl"; }
  .gl-chips { display: none; } .gl-meta { padding: 0; align-self: end; }
  .gl-prog { align-self: start; } .gl-b.bk, .gl-b.fw { display: none; } .gl-rib { height: 42%; }
}
@container (64px <= height < 140px) and (width >= 540px) { .gl-b.bk, .gl-b.fw { display: grid; } }
@container (64px <= height < 140px) and (width < 460px) { .gl-t { display: none; } }
@container (64px <= height < 84px) { .gl-artist { display: none; } }
@container (64px <= height < 140px) and (width < 330px) { .gl-b.pv, .gl-b.nx { display: none; } }

/* PANORÁMICO */
@container (height >= 140px) and (width >= 400px) and (aspect-ratio > 21 / 10) {
  .gl-wrap { --pad: 16px; --cw: min(100cqh * 1.18, 38cqw); --bs: clamp(32px, min(calc(100cqh - 2 * var(--pad) - 44px - 18px - 36px), 42px), 42px); grid-template-columns: calc(var(--cw) - var(--pad)) minmax(0, 1fr) auto; grid-template-rows: auto 18px auto; align-content: space-between; column-gap: 18px; grid-template-areas: "cov meta meta" "cov prog prog" "cov ctl ext"; }
  .gl-title { font-size: clamp(16px, 8cqh, 24px); } .gl-artist { font-size: 13px; }
  .gl-ctl { justify-content: flex-start; } .gl-meta { align-self: start; }
}
@container (height >= 140px) and (width >= 600px) and (aspect-ratio > 21 / 10) { .gl-ext { display: flex; } }
@container (height >= 140px) and (width >= 400px) and (width < 480px) and (aspect-ratio > 21 / 10) { .gl-b.bk, .gl-b.fw { display: none; } }

/* PORTADA: la portada ocupa todo el ancho y el borde superior, y se funde hacia abajo */
@container (height >= 280px) and (aspect-ratio < 23 / 20) {
  .gl-wrap { --pad: 16px; --ch: calc(100cqh - 166px); --bs: min(46px, calc((100cqw - 2 * var(--pad) - 4 * 6px) / 5.3)); padding-top: 0; gap: 8px; align-content: start; grid-template-columns: minmax(0, 1fr); grid-template-rows: var(--ch) auto 18px auto; grid-template-areas: "cov" "meta" "prog" "ctl"; }
  .gl-cov { width: 100%; height: var(--ch); transform-origin: center top; -webkit-mask-image: linear-gradient(180deg, #000 55%, rgba(0,0,0,.5) 82%, transparent 100%); mask-image: linear-gradient(180deg, #000 55%, rgba(0,0,0,.5) 82%, transparent 100%); }
  .gl-chips { grid-area: cov; margin: 12px 12px 0 0; } .gl-chips button { background: rgba(10,12,30,.42); color: #fff; -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
  .gl-meta { padding: 0; margin-top: -18px; position: relative; } .gl-title { font-size: clamp(18px, 7.2cqw, 24px); } .gl-artist { font-size: 14px; margin-top: 2px; }
  .gl-ctl { justify-content: space-between; } .gl-b.bk, .gl-b.fw { display: grid; }
  .gl-rib { height: 40%; }
}
@container (height >= 400px) and (aspect-ratio < 23 / 20) {
  .gl-wrap { --ch: calc(100cqh - 208px); grid-template-rows: var(--ch) auto 18px auto auto; grid-template-areas: "cov" "meta" "prog" "ctl" "ext"; }
  .gl-ext { display: flex; justify-content: center; margin-top: -2px; }
}
@media (prefers-reduced-motion: reduce) { .gl-glow { transition: none; } .live-badge .gl-bar i { animation: none; } .gl-cov, .gl-b { transition: none; } }
`;
})();
