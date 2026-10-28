(() => {
  const NMP = (globalThis.__NMP ||= {});
  const SKINS = (NMP.skins ||= {});
  const { hash } = NMP.util;

SKINS.crt = { label: 'Terminal CRT', tpl: () => `
  <div class="cr-wrap">
    <div class="cr-head"><span class="tag">NTT-7 MEDIA</span><span class="idx" data-t="idx">01/04</span><i class="rule"></i><span class="cr-state"></span>
      <button class="cr-hb" data-act="mode" title="Pasar a Mini" aria-label="Pasar a Mini"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><rect x="3" y="5" width="18" height="14"/><rect x="12" y="11" width="6" height="5" fill="currentColor"/></svg></button><button class="cr-hb" data-act="hide" title="Ocultar" aria-label="Ocultar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="cr-art" aria-hidden="true"><canvas class="cr-scr" data-viz="scr"></canvas><div class="cr-corners"></div></div>
    <div class="cr-meta">
      <div class="cr-kv ttl"><b>TRK</b><span data-t="title"></span></div>
      <div class="cr-kv art"><b>ART</b><span data-t="artist"></span></div>
      <div class="cr-kv time"><b>T+</b><span data-v="cur2">00:00</span><em data-v="rem2">-00:00</em><span class="pct" data-v="pct">0%</span></div>
    </div>
    <div class="cr-bar" role="slider" tabindex="0" data-bar aria-label="Progreso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>
    <div class="cr-ctl">
      <button class="cr-b pv" data-act="prev" title="Anterior" aria-label="Anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M6 5v14M19 5.5v13L9 12z"/></svg></button>
      <button class="cr-b bk" data-act="back" title="Retroceder 10 s" aria-label="Retroceder 10 segundos"><span data-skn="-">-10</span></button>
      <button class="cr-b pl" data-act="play" title="Pausar" aria-label="Pausar"><span class="ic ic-pause"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke-width="3.4"/></svg></span><span class="ic ic-play"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M7 4.5v15L20 12z" fill="currentColor"/></svg></span></button>
      <button class="cr-b fw" data-act="fwd" title="Avanzar 10 s" aria-label="Avanzar 10 segundos"><span data-skn="+">+10</span></button>
      <button class="cr-b nx" data-act="next" title="Siguiente" aria-label="Siguiente"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M18 5v14M5 5.5v13L15 12z"/></svg></button>
    </div>
    <div class="cr-ext">
      <button class="cr-b vl" data-act="mute" title="Silenciar" aria-label="Silenciar o activar sonido"><span class="cr-vol"><span class="ic ic-vol"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg></span><span class="ic ic-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg></span><i></i><i></i><i></i><i></i><i></i><i></i></span></button>
    </div>
  </div>` };
SKINS.crt.viz = {
  // Pantalla: graticula punteada, osciloscopio con persistencia (4 trazos que se apagan) y espectro de LED segmentados con pico.
  scr(g, w, h, V, card, cv) {
    const small = h < 56 || w < 56, am = '#ffae2c', hot = '#ff5a1f', pale = '#ffe3a8';
    // graticula
    if (!small) { g.fillStyle = 'rgba(255,174,44,.2)'; for (let i = 1; i < 8; i++) for (let j = 1; j < 6; j++) g.fillRect(Math.round(w * i / 8), Math.round(h * j / 6), 1, 1); g.fillStyle = 'rgba(255,174,44,.28)'; g.fillRect(0, Math.round(h * (h > w * .8 ? .27 : .5)), w, 1); }
    // espectro de LED
    const top = small ? 2 : (h > w * .8 ? h * .5 : h * .22), bh = h - top - 3, seg = 3, gp = 1, rows = Math.max(2, Math.floor(bh / (seg + gp)));
    const bw = small ? 3 : w < 140 ? 4 : 6, cols = Math.max(4, Math.floor((w - 6) / (bw + 1))), x0 = Math.floor((w - cols * (bw + 1) + 1) / 2), N = V.N;
    for (let c = 0; c < cols; c++) {
      const bi = (c / (cols - 1)) * (N - 1) * .86, i0 = Math.floor(bi), i1 = Math.min(N - 1, i0 + 1), v = V.b[i0] + (V.b[i1] - V.b[i0]) * (bi - i0), n = Math.round(v * rows), pr = Math.round(V.pk[Math.round(bi)] * rows);
      const x = x0 + c * (bw + 1);
      for (let r = 0; r < rows; r++) {
        const y = h - 3 - (r + 1) * (seg + gp) + gp;
        if (r < n) { g.fillStyle = r > rows * .82 ? hot : r > rows * .6 ? '#ffc65a' : am; g.fillRect(x, y, bw, seg); }
        else if (r === pr - 1 && pr > n) { g.fillStyle = pale; g.fillRect(x, y, bw, seg); }
        else { g.fillStyle = 'rgba(255,174,44,.07)'; g.fillRect(x, y, bw, seg); }
      }
    }
    // osciloscopio
    if (!small) {
      const tr = cv._tr || (cv._tr = []); tr.unshift(Float32Array.from(V.w)); if (tr.length > 4) tr.pop();
      const cy = h > w * .8 ? h * .27 : h * .5, amp = (h > w * .8 ? h * .22 : h * .4), pad = 4;
      for (let k = tr.length - 1; k >= 0; k--) {
        g.beginPath(); for (let i = 0; i < 96; i++) { const x = pad + (w - 2 * pad) * i / 95, y = cy - tr[k][i] * amp; i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.strokeStyle = k === 0 ? pale : 'rgba(255,174,44,' + (.4 / (k + 1)) + ')'; g.lineWidth = k === 0 ? 1.4 : 1; g.shadowColor = am; g.shadowBlur = k === 0 ? 7 : 0; g.stroke(); g.shadowBlur = 0;
      }
      if (w >= 90) { g.font = '10px VT323, monospace'; g.fillStyle = 'rgba(255,200,110,.85)'; g.fillText('CH1', 6, 11); g.textAlign = 'right'; g.fillText((-30 + V.lvl * 28).toFixed(1) + ' dB', w - 6, 11); g.textAlign = 'left'; }
    }
  },
};
SKINS.crt.viz.scr.always = false;
// Curvatura de pantalla: un filtro SVG con mapa de desplazamiento de barril (el centro se abomba y los bordes se comprimen).
(() => {
  let MAP = null, N = 0;
  const map = () => { if (MAP) return MAP; const z = 96, cv = document.createElement('canvas'); cv.width = cv.height = z; const g = cv.getContext('2d'), im = g.createImageData(z, z);
    for (let y = 0; y < z; y++) for (let x = 0; x < z; x++) { const nx = (x + .5) / z * 2 - 1, ny = (y + .5) / z * 2 - 1, r2 = nx * nx + ny * ny, i = (y * z + x) * 4; im.data[i] = 128 + 127 * nx * r2 / 2; im.data[i + 1] = 128 + 127 * ny * r2 / 2; im.data[i + 2] = 128; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0); return (MAP = cv.toDataURL()); };
  SKINS.crt.setup = (c) => {
    const NS = 'http://www.w3.org/2000/svg', id = 'crtb' + (++N), svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true'); svg.style.cssText = 'position:absolute;pointer-events:none';
    svg.innerHTML = `<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="300" height="150" color-interpolation-filters="sRGB"><feImage href="${map()}" x="0" y="0" width="300" height="150" preserveAspectRatio="none" result="m"/><feDisplacementMap in="SourceGraphic" in2="m" scale="8" xChannelSelector="R" yChannelSelector="G"/></filter>`;
    c.card.appendChild(svg);
    const f = svg.firstChild, im = f.querySelector('feImage'), dm = f.querySelector('feDisplacementMap'), wrap = c.card.querySelector('.cr-wrap');
    const upd = () => { const w = c.card.clientWidth, h = c.card.clientHeight; if (!w || !h) return; [f, im].forEach((e) => { e.setAttribute('width', w); e.setAttribute('height', h); }); dm.setAttribute('scale', (Math.min(w, h) * .075).toFixed(1)); };
    wrap.style.filter = `url(#${id})`; upd();
    c._ro = new ResizeObserver(upd); c._ro.observe(c.card);
  };
})();

  SKINS.crt.css = `
/* ============================================================
   TERMINAL CRT HUD (referencia: terminal naranja NTT, UI de diagnóstico). Pantalla de fósforo ámbar: máscara de líneas,
   viñeta, reflejo en el cristal, parpadeo, halo y franjas cromáticas en el texto. El visualizador es un osciloscopio con
   persistencia sobre un espectro de LED segmentados, con la carátula como imagen de fósforo de fondo.
   ============================================================ */
.sk-crt { --m: #ffae2c; --m2: #b9791a; --mdim: rgba(255,174,44,.4); --txt: #ffd9a0; --pk: #ff5a1f; --bg: #0b0603;
  font-family: "JetBrains Mono", ui-monospace, Consolas, monospace; color: var(--txt); background: var(--bg);
  border-radius: calc(var(--r, 14px) * .55);
  box-shadow: 0 22px 46px rgba(0,0,0,.65), 0 1px 0 rgba(255,255,255,.08), inset 0 0 0 2px #2d1f10, inset 0 0 0 5px #0e0803, inset 0 0 0 6px rgba(255,174,44,.3), inset 0 12px 26px rgba(0,0,0,.9), inset 0 -5px 16px rgba(0,0,0,.65), inset 8px 0 18px rgba(0,0,0,.45), inset -8px 0 18px rgba(0,0,0,.45), inset 0 0 90px rgba(255,130,0,.15); }
.sk-crt::before { content: ""; position: absolute; inset: 0; z-index: 4; pointer-events: none; border-radius: inherit;
  background: radial-gradient(ellipse 60% 34% at 20% 7%, rgba(255,255,255,.14), transparent 72%), radial-gradient(ellipse 120% 105% at 50% 46%, transparent 50%, rgba(0,0,0,.36) 78%, rgba(0,0,0,.85) 100%), linear-gradient(118deg, rgba(255,255,255,.07), transparent 24%), linear-gradient(0deg, rgba(0,0,0,.28), transparent 18%), repeating-linear-gradient(0deg, rgba(0,0,0,.3) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(255,60,0,.05) 0 1px, rgba(0,255,120,.03) 1px 2px, rgba(0,120,255,.05) 2px 3px); }
.sk-crt::after { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 36%; z-index: 4; pointer-events: none; background: linear-gradient(180deg, transparent, rgba(255,174,44,.07) 60%, transparent); animation: crscan 6s linear infinite; }
@keyframes crscan { from { transform: translateY(-100%); } to { transform: translateY(290%); } }
.cr-wrap { text-shadow: 0 0 5px rgba(255,160,30,.5), -.5px 0 rgba(255,60,0,.35), .5px 0 rgba(0,180,255,.16); animation: crflick 5.3s steps(1) infinite; position: absolute; inset: 0; display: grid; --pad: 10px; padding: var(--pad); gap: 6px 10px; min-width: 0; min-height: 0; font-size: 11px; line-height: 1.35; z-index: 1; }
.cr-wrap > * { min-width: 0; min-height: 0; }
.cr-head { grid-area: head; display: flex; align-items: center; gap: 8px; font: 700 9.5px/1 "JetBrains Mono", monospace; letter-spacing: .14em; color: var(--m); white-space: nowrap; }
.cr-head .tag::before { content: "▮ "; font-size: 8px; vertical-align: 1px; }
.cr-head .idx { color: var(--m2); }
.cr-head i.rule { flex: 1; height: 1px; background: repeating-linear-gradient(90deg, var(--mdim) 0 3px, transparent 3px 6px); }
.cr-state::after { content: "PLAY"; }
.paused .cr-state { color: var(--pk); animation: crblink 1s steps(2) infinite; } .paused .cr-state::after { content: "HALT"; }
.live-badge .cr-state { color: var(--pk); } .live-badge .cr-state::after { content: "LIVE"; }
@keyframes crflick { 0%, 93%, 100% { opacity: 1; } 94% { opacity: .93; } 96% { opacity: 1; } 97% { opacity: .9; } }
@keyframes crblink { 50% { opacity: .35; } }
.cr-mini { display: flex; gap: 2px; align-items: flex-end; height: 9px; }
.cr-mini i { width: 2px; height: 100%; background: var(--m); transform-origin: bottom; animation: creq .9s ease-in-out infinite; }
.cr-mini i:nth-child(2) { animation-duration: .6s; animation-delay: -.3s; } .cr-mini i:nth-child(3) { animation-duration: 1.1s; animation-delay: -.6s; } .cr-mini i:nth-child(4) { animation-duration: .75s; animation-delay: -.1s; }
@keyframes creq { 0%, 100% { transform: scaleY(.2); } 50% { transform: scaleY(1); } }
.paused .cr-mini i, .paused .cr-spec i { animation-play-state: paused; }
.cr-hb { width: 24px; height: 24px; margin: -5px -3px; display: grid; place-items: center; color: var(--m); }
.cr-hb:hover { background: rgba(255,174,44,.16); }
.cr-hb svg { width: 11px; height: 11px; }
.cr-art { grid-area: art; position: relative; overflow: hidden; background: #140b03; box-shadow: inset 0 0 0 1px var(--mdim), inset 0 0 18px rgba(255,140,0,.18); width: var(--as); height: var(--as); align-self: start; }
.cr-art::before { content: ""; position: absolute; inset: 0; background: var(--art) center / cover; filter: grayscale(1) contrast(1.5) sepia(1) hue-rotate(-12deg) saturate(3.5) brightness(.8); opacity: .34; mix-blend-mode: screen; }
.paused .cr-art::before { opacity: .12; }
.cr-scr { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; }
.cr-corners { z-index: 2; position: absolute; inset: 3px; pointer-events: none; z-index: 2;
  background: linear-gradient(var(--m), var(--m)) 0 0 / 7px 1px no-repeat, linear-gradient(var(--m), var(--m)) 0 0 / 1px 7px no-repeat, linear-gradient(var(--m), var(--m)) 100% 0 / 7px 1px no-repeat, linear-gradient(var(--m), var(--m)) 100% 0 / 1px 7px no-repeat, linear-gradient(var(--m), var(--m)) 0 100% / 7px 1px no-repeat, linear-gradient(var(--m), var(--m)) 0 100% / 1px 7px no-repeat, linear-gradient(var(--m), var(--m)) 100% 100% / 7px 1px no-repeat, linear-gradient(var(--m), var(--m)) 100% 100% / 1px 7px no-repeat; }
.cr-meta { grid-area: meta; align-self: start; display: grid; gap: 1px; }
.cr-kv { display: flex; gap: 8px; white-space: nowrap; min-width: 0; }
.cr-kv b { flex: none; width: 4ch; color: var(--m2); font-weight: 700; letter-spacing: .06em; }
.cr-kv span { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.cr-kv.ttl span { color: #ffe9bf; font: 400 19px/1 "VT323", monospace; letter-spacing: .02em; text-shadow: 0 0 8px rgba(255,174,44,.7); }
.cr-kv.time span { font-variant-numeric: tabular-nums; color: var(--m); }
.cr-kv.time em { font-style: normal; color: var(--m2); margin-left: 6px; }
.cr-kv.time .pct { margin-left: auto; color: var(--txt); }
.cr-cursor::after { content: ""; display: inline-block; width: .55em; height: 1em; margin-left: 4px; background: var(--m); vertical-align: -2px; animation: crblink 1s steps(2) infinite; }
.cr-bar { grid-area: bar; position: relative; height: 14px; align-self: center; cursor: pointer; touch-action: none; }
.cr-bar::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 7px; margin-top: -3.5px;
  background: linear-gradient(var(--m), var(--m)) 0 0 / 1px 100% no-repeat, linear-gradient(var(--m), var(--m)) 100% 0 / 1px 100% no-repeat,
    repeating-linear-gradient(90deg, var(--m) 0 3px, transparent 3px 5px) 3px 1px / calc(var(--p, 0) * (100% - 6px)) calc(100% - 2px) no-repeat,
    repeating-linear-gradient(90deg, rgba(255,174,44,.2) 0 3px, transparent 3px 5px) 3px 1px / calc(100% - 6px) calc(100% - 2px) no-repeat;
  filter: drop-shadow(0 0 3px rgba(255,174,44,.55)); }
.cr-bar::after { content: ""; position: absolute; top: 0; bottom: 0; left: calc(3px + var(--p, 0) * (100% - 6px) - 1px); width: 2px; background: #fff; box-shadow: 0 0 8px var(--m); }
.live-badge .cr-bar { pointer-events: none; } .live-badge .cr-bar::after { display: none; } .live-badge .cr-bar::before { animation: crblink 1s steps(2) infinite; }
.cr-ctl { grid-area: ctl; display: flex; align-items: center; justify-content: center; gap: 6px; }
.cr-b { width: var(--bs); height: var(--bs); flex: none; display: grid; place-items: center; color: var(--m); box-shadow: inset 0 0 0 1px var(--mdim); font: 700 10px/1 "JetBrains Mono", monospace; letter-spacing: .02em; transition: background .1s; }
.cr-b:hover { background: rgba(255,174,44,.16); box-shadow: inset 0 0 0 1px var(--m); }
.cr-b:active { transform: translateY(var(--press-shift)); }
.cr-b[disabled] { opacity: var(--opacity-disabled); pointer-events: none; }
.cr-b svg { width: 52%; height: 52%; }
.cr-b.pl { background: var(--m); color: var(--bg); box-shadow: none; clip-path: polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px); width: calc(var(--bs) * 1.35); }
.cr-b.pl:hover { background: #ffd48a; }
.cr-ext { grid-area: ext; display: none; align-items: center; justify-content: flex-end; gap: 8px; }
.cr-ext .cr-b { width: auto; min-width: var(--bs); padding: 0 8px; }
.cr-vol { display: flex; gap: 2px; align-items: center; }
.cr-vol i { width: 4px; height: 10px; background: var(--m); } .cr-vol i:nth-child(n+5) { background: rgba(255,174,44,.2); } .muted .cr-vol i { background: rgba(255,174,44,.2); }
.cr-vol svg { width: 12px; height: 12px; margin-right: 4px; }
.card:not(.muted) .cr-vol .ic-mute svg, .card.muted .cr-vol .ic-vol svg { position: absolute; }
.cr-wrap { --bs: 30px; }

/* COMPACTO (base) */
.cr-wrap { --as: clamp(40px, calc(100cqh - 2 * var(--pad) - 14px - 14px - 30px - 18px), 120px); grid-template-columns: auto minmax(0, 1fr); grid-template-rows: 14px minmax(0, 1fr) 14px auto; grid-template-areas: "head head" "art meta" "bar bar" "ctl ctl"; }
.cr-head .cr-mini { display: flex; }
@container (width < 300px) { .cr-b.bk, .cr-b.fw { display: none; } }
@container (width < 270px) { .cr-head .idx { display: none; } }

/* PASTILLA */
@container (height < 64px) {
  .cr-wrap { --pad: 6px; --bs: 28px; --cv: calc(100cqh - 2 * var(--pad) - 6px); padding: 6px 8px 0 6px; gap: 0 8px; grid-template-columns: var(--cv) minmax(0, 1fr) auto; grid-template-rows: minmax(0, 1fr) 10px; grid-template-areas: "art meta ctl" "bar bar bar"; }
  .cr-head, .cr-kv.art, .cr-kv.time { display: none; }
  .cr-art { --as: var(--cv); align-self: center; } .cr-corners { display: none; }
  .cr-meta { align-self: center; } .cr-kv b { display: none; }
  .cr-ctl { gap: 3px; } .cr-b.bk, .cr-b.fw { display: grid; } .cr-b.pl { width: var(--bs); clip-path: polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px); }
  .cr-bar { height: 10px; margin: 0 -8px 0 -6px; align-self: end; } .cr-bar::before { height: 3px; margin-top: -1.5px; left: 0; right: 0; background: repeating-linear-gradient(90deg, var(--m) 0 3px, transparent 3px 5px) 0 0 / calc(var(--p, 0) * 100%) 100% no-repeat, repeating-linear-gradient(90deg, rgba(255,174,44,.2) 0 3px, transparent 3px 5px); filter: none; } .cr-bar::after { display: none; }
}
@container (height < 64px) and (width < 340px) { .cr-b.bk, .cr-b.fw { display: none; } }
@container (height < 64px) and (width < 264px) { .cr-b.pv, .cr-b.nx { display: none; } }

/* FILA */
@container (64px <= height < 140px) {
  .cr-wrap { --pad: 8px; --bs: min(38px, calc(100cqh - 2 * var(--pad))); --cv: min(calc(100cqh - 2 * var(--pad)), 76px); grid-template-columns: var(--cv) minmax(0, 1fr) auto; grid-template-rows: minmax(0, 1fr) 14px; grid-template-areas: "art meta ctl" "art bar ctl"; gap: 2px 12px; }
  .cr-head, .cr-kv.time { display: none; }
  .cr-art { --as: var(--cv); align-self: center; grid-row: 1 / 3; } .cr-corners { display: none; }
  .cr-meta { align-self: end; } .cr-bar { align-self: start; }
  .cr-b.bk, .cr-b.fw { display: none; }
}
@container (64px <= height < 140px) and (width >= 520px) { .cr-b.bk, .cr-b.fw { display: grid; } }
@container (64px <= height < 140px) and (width < 330px) { .cr-b.pv, .cr-b.nx { display: none; } }
@container (64px <= height < 140px) and (width < 300px) { .cr-b.pl { width: var(--bs); clip-path: polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px); } }

/* PANORÁMICO */
@container (height >= 140px) and (width >= 400px) and (aspect-ratio > 21 / 10) {
  .cr-wrap { --pad: 12px; --extw: 0px; --as: min(calc(100cqh - 2 * var(--pad)), 30cqw); --bs: clamp(30px, min(calc(100cqh - 2 * var(--pad) - 14px - 14px - 54px - 18px), calc((100cqw - 2 * var(--pad) - var(--as) - 16px - var(--extw) - 24px) / 4.35)), 40px); grid-template-columns: var(--as) minmax(0, 1fr) auto; grid-template-rows: 14px minmax(0, 1fr) 14px auto; grid-template-areas: "art head head" "art meta meta" "art bar bar" "art ctl ext"; column-gap: 16px; }
  .cr-art { grid-row: 1 / 5; align-self: stretch; height: auto; }
    .cr-meta { font-size: 12px; align-self: center; }
  .cr-ctl { justify-content: flex-start; }
}
@container (height >= 140px) and (width >= 400px) and (width < 480px) and (aspect-ratio > 21 / 10) { .cr-head .idx, .cr-mini { display: none; } }
@container (height >= 140px) and (width >= 600px) and (aspect-ratio > 21 / 10) { .cr-wrap { --extw: 170px; } .cr-ext { display: flex; } }

/* PORTADA */
@container (height >= 280px) and (aspect-ratio < 23 / 20) {
  .cr-wrap { --pad: 14px; --bs: 44px; grid-template-columns: 1fr; grid-template-rows: 14px minmax(0, 1fr) auto 14px auto; grid-template-areas: "head" "art" "meta" "bar" "ctl"; }
  .cr-art { width: 100%; height: 100%; align-self: stretch; }
  .cr-meta { font-size: 12px; margin-top: 2px; } .cr-kv.ttl span { font-size: 22px; }
  .cr-ctl { justify-content: space-between; } 
}
@container (height >= 350px) and (aspect-ratio < 23 / 20) {
  .cr-wrap { grid-template-rows: 14px minmax(0, 1fr) auto 14px auto auto; grid-template-areas: "head" "art" "meta" "bar" "ctl" "ext"; }
  .cr-ext { display: flex; justify-content: flex-end; }
}
@media (prefers-reduced-motion: reduce) { .sk-crt::after, .cr-wrap, .cr-mini i, .cr-cursor::after, .paused .cr-state, .live-badge .cr-bar::before { animation: none; } }
`;
})();
