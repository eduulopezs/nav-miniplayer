(() => {
  const NMP = (globalThis.__NMP ||= {});
  const SKINS = (NMP.skins ||= {});
  const { hash } = NMP.util;

SKINS.metal = { label: 'Liquid Metal', tpl: () => `
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="lmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#cfd3da"/><stop offset="1" stop-color="#8e949f"/></linearGradient></defs></svg>
  <canvas class="lm-mer" data-viz="mer" aria-hidden="true"></canvas>
  <div class="lm-wrap">
    <div class="lm-orb" aria-hidden="true"><div class="lm-cov"></div></div>
    <div class="lm-meta"><div class="lm-title" data-t="title"></div><div class="lm-artist" data-t="artist"></div></div>
    <div class="lm-chips"><button data-act="mode" title="Pasar a Mini" aria-label="Pasar a Mini"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><rect x="12" y="11" width="6" height="5" rx="1.2" fill="currentColor" stroke="none"/></svg></button><button data-act="hide" title="Ocultar" aria-label="Ocultar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg></button></div>
    <div class="lm-time"><span data-v="cur">0:00</span><i data-v="dur">0:00</i></div>
    <div class="lm-bar" role="slider" tabindex="0" data-bar aria-label="Progreso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
    <div class="lm-ctl">
      <button class="lm-b pv" data-act="prev" title="Anterior" aria-label="Anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 5.5v13"/><path d="M19 6.2v11.6L9.8 12z" fill="currentColor"/></svg></button>
      <button class="lm-b bk" data-act="back" title="Retroceder 10 s" aria-label="Retroceder 10 segundos">-10</button>
      <button class="lm-b pl" data-act="play" title="Pausar" aria-label="Pausar"><span class="ic ic-pause"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.2" y="5" width="4.2" height="14" rx="1.6" fill="currentColor" stroke="none"/><rect x="13.6" y="5" width="4.2" height="14" rx="1.6" fill="currentColor" stroke="none"/></svg></span><span class="ic ic-play"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.2 5.6v12.8a.8.8 0 0 0 1.2.7l10.2-6.4a.8.8 0 0 0 0-1.4L9.4 4.9a.8.8 0 0 0-1.2.7z" fill="currentColor" stroke="none"/></svg></span></button>
      <button class="lm-b fw" data-act="fwd" title="Avanzar 10 s" aria-label="Avanzar 10 segundos">+10</button>
      <button class="lm-b nx" data-act="next" title="Siguiente" aria-label="Siguiente"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 5.5v13"/><path d="M5 6.2v11.6L14.2 12z" fill="currentColor"/></svg></button>
    </div>
    <div class="lm-ext"><button class="lm-b vl" data-act="mute" title="Silenciar" aria-label="Silenciar o activar sonido"><span class="ic ic-vol"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg></span><span class="ic ic-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg></span></button></div>
  </div>` };
SKINS.metal.viz = {
  // Mercurio de fondo: campo de metaballs a baja resolución que se mueve despacio; el audio solo hincha un poco las gotas.
  mer(g, w, h, V, card, cv) {
    const C = 4, gw = Math.min(180, Math.ceil(w / C)), gh = Math.min(180, Math.ceil(h / C)); if (gw < 4 || gh < 4) return;
    let o = cv._o; if (!o || o.width !== gw || o.height !== gh) { o = cv._o = document.createElement('canvas'); o.width = gw; o.height = gh; cv._im = o.getContext('2d').createImageData(gw, gh); cv._F = new Float32Array(gw * gh); }
    const im = cv._im, d = im.data, F = cv._F, t = V.t, asp = gw / gh, boost = 1 + V.lvl * .22 + V.kick * .06;
    const B = [];
    for (let k = 0; k < 6; k++) B.push([.5 + .46 * Math.sin(t * (.05 + k * .013) + k * 2.1) , .5 + .44 * Math.cos(t * (.043 + k * .011) + k * 1.3), (.2 + .05 * (k % 3)) * boost]);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const px = x / gw, py = y / gh; let f = 0;
      for (let k = 0; k < 6; k++) { const dx = (px - B[k][0]) * asp, dy = py - B[k][1], r = B[k][2]; f += r * r / (dx * dx + dy * dy + 1e-4); }
      F[y * gw + x] = f;
    }
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const i = y * gw + x, f = F[i], p = i * 4;
      if (f < .9) { d[p + 3] = 0; continue; }
      const fx = (F[y * gw + Math.min(gw - 1, x + 1)] - F[y * gw + Math.max(0, x - 1)]), fy = (F[Math.min(gh - 1, y + 1) * gw + x] - F[Math.max(0, y - 1) * gw + x]);
      let nx = -fx * .6, ny = -fy * .6, nz = 1; const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
      const key = Math.max(0, nx * -.45 + ny * -.65 + nz * .6), hl = Math.pow(key, 7), fr = Math.pow(1 - nz, 1.6), sky = .5 - ny * .5;
      const base = .07 + .16 * Math.pow(sky, 2) + .55 * hl + .3 * fr + .12 * Math.pow(Math.max(0, ny * .9 + .1), 3);
      d[p] = Math.min(255, 255 * base * .95); d[p + 1] = Math.min(255, 255 * base); d[p + 2] = Math.min(255, 255 * base * 1.1 + 6);
      const e = Math.min(1, (f - .9) / .06); d[p + 3] = 255 * e * .5;
    }
    const og = cv._o.getContext('2d'); og.putImageData(im, 0, 0);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(cv._o, 0, 0, w, h);
  },
};
SKINS.metal.viz.mer.always = true;

  SKINS.metal.css = `
/* ============================================================
   LIQUID METAL (referencias: botones de "cristal líquido" con aro de dispersión, burbujas con reflejos prismáticos, Y2K cromado).
   Superficie negra de grafito en capas, aros iridiscentes (el color solo aparece en el borde, como en un prisma), botones de vidrio
   y una lente de cristal con un líquido que chapotea: el menisco se parte en RGB y la burbuja se deforma con el audio.
   ============================================================ */
.sk-metal { --ink: #f2f4f7; --ink2: #9aa0ab; --rim: conic-gradient(from var(--spin, 200deg), #eef0f3 0 7%, #4aa3ff 11%, #ff7a2f 15%, #ffe36a 18%, #eef0f3 24% 50%, #ff4ca8 55%, #7a5cff 59%, #33d6ff 63%, #eef0f3 68% 86%, #ffb24a 90%, #ff4a3a 94%, #eef0f3 100%);
  font-family: "Montserrat", "Figtree", system-ui, sans-serif; color: var(--ink); border-radius: calc(var(--r, 22px) * .95);
  background: radial-gradient(90% 120% at 12% 0%, #2a2c2d 0%, transparent 55%), radial-gradient(70% 90% at 100% 100%, rgba(110,86,255,.14), transparent 60%), linear-gradient(180deg, #131417, #08090b);
  box-shadow: 0 28px 56px rgba(0,0,0,.65), 0 2px 6px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.2), inset 0 0 0 1px rgba(255,255,255,.07); }
.sk-metal::before { content: ""; position: absolute; inset: 5px; z-index: 0; border-radius: calc(var(--r, 22px) * .95 - 5px); pointer-events: none; box-shadow: inset 0 0 0 1px rgba(255,255,255,.07), inset 0 1px 0 rgba(255,255,255,.12), inset 0 -14px 26px rgba(0,0,0,.35); background: linear-gradient(180deg, rgba(255,255,255,.035), transparent 40%); }
.sk-metal::after { content: ""; position: absolute; inset: 0; z-index: 4; pointer-events: none; border-radius: inherit; background: radial-gradient(60% 40% at 18% -4%, rgba(255,255,255,.14), transparent 70%); }
.lm-wrap { position: absolute; inset: 0; z-index: 2; display: grid; --pad: 14px; --bs: 30px; padding: var(--pad); gap: 6px 12px; min-width: 0; min-height: 0; align-content: space-between; }
.lm-wrap > * { min-width: 0; min-height: 0; }
.lm-wrap svg { width: 50%; height: 50%; display: block; }
/* aro iridiscente: un anillo con degradado cónico enmascarado; gira despacio mientras suena */
.lm-orb, .lm-b.pl, .lm-b:hover { --spin: 200deg; }
.lm-orb { grid-area: orb; position: relative; width: var(--os); height: var(--os); align-self: center; border-radius: 22%; box-shadow: 0 10px 28px rgba(0,0,0,.6), 0 0 0 7px rgba(255,255,255,.035), 0 0 0 8px rgba(255,255,255,.06); }
.lm-orb::after, .lm-b.pl::after { content: ""; position: absolute; inset: 0; border-radius: 50%; padding: 2.5px; pointer-events: none; z-index: 3; background: var(--rim); filter: saturate(1.25) brightness(calc(1 + var(--lvl, 0) * .35));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); animation: lmspin 22s linear infinite; }
.lm-orb::after { border-radius: 22%; }
.paused .lm-orb::after, .paused .lm-b.pl::after { animation-play-state: paused; filter: saturate(.9) brightness(.75); }
@property --spin { syntax: "<angle>"; inherits: true; initial-value: 200deg; }
@keyframes lmspin { to { --spin: 560deg; } }
.lm-cov { position: absolute; inset: 3px; border-radius: calc(22% - 3px); overflow: hidden; background: var(--art) center / cover; box-shadow: inset 0 0 0 1px rgba(0,0,0,.6); }
.lm-cov::before { content: ""; position: absolute; inset: 0; background: linear-gradient(160deg, rgba(255,255,255,.1), transparent 40%, rgba(0,0,0,.35)); }
.lm-mer { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; border-radius: inherit; pointer-events: none; }
.paused .lm-cov { filter: grayscale(.7); }
.lm-meta { grid-area: meta; align-self: start; padding-right: 54px; }
.lm-title { font: 300 15px/1.2 "Montserrat", sans-serif; letter-spacing: .012em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ink); text-shadow: 0 0 14px rgba(255,255,255,.12); }
.lm-artist { font: 400 11px/1.35 "Montserrat", sans-serif; letter-spacing: .02em; color: var(--ink2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lm-chips { grid-area: meta; justify-self: end; align-self: start; display: flex; gap: 3px; margin: -5px -5px 0 0; z-index: 3; }
.lm-chips button { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; color: #c9ced6; box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
.lm-chips button:hover { background: rgba(255,255,255,.1); color: #fff; }
.lm-chips svg { width: 12px; height: 12px; }
.lm-time { grid-area: time; display: flex; gap: 6px; align-items: baseline; font: 400 11px/1 "Montserrat", sans-serif; letter-spacing: .04em; color: #e6e9ee; font-variant-numeric: tabular-nums; white-space: nowrap; }
.lm-time i { font-style: normal; color: var(--ink2); }
.live-badge .lm-time i { display: none; }
.lm-bar { grid-area: bar; position: relative; height: 16px; cursor: pointer; touch-action: none; }
.lm-bar::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 3px; margin-top: -1.5px; border-radius: 3px; background: rgba(255,255,255,.12); box-shadow: inset 0 1px 1px rgba(0,0,0,.6); }
.lm-bar i { position: absolute; left: 0; top: 50%; height: 3px; margin-top: -1.5px; width: calc(var(--p, 0) * 100%); border-radius: 3px; background: linear-gradient(90deg, rgba(238,240,243,.55), #eef0f3 82%, #ffe36a 90%, #ff7a2f); box-shadow: 0 0 10px rgba(255,255,255,.28); }
.lm-bar::after { content: ""; position: absolute; top: 50%; left: calc(var(--p, 0) * (100% - 13px)); width: 13px; height: 13px; margin-top: -6.5px; border-radius: 50%; background: radial-gradient(circle at 50% 40%, #2a2d31, #0c0d10 70%); box-shadow: 0 2px 5px rgba(0,0,0,.6), 0 0 0 1.5px #e9ecf0, 0 0 0 2.5px rgba(74,163,255,.5), 0 0 6px rgba(255,122,47,.45); transform: scale(.85); transition: transform .15s; }
.lm-bar:hover::after, .lm-bar:focus-visible::after, .lm-bar.drag::after { transform: scale(1.12); }
.live-badge .lm-bar { pointer-events: none; } .live-badge .lm-bar::after { display: none; } .live-badge .lm-bar i { width: 100%; animation: lmblink 1.4s ease-in-out infinite; }
@keyframes lmblink { 50% { opacity: .35; } }
.lm-ctl { grid-area: ctl; display: flex; align-items: center; gap: 5px; }
.lm-b { position: relative; width: var(--bs); height: var(--bs); flex: none; border-radius: 50%; display: grid; place-items: center; color: #f1f3f6;
  background: linear-gradient(180deg, rgba(255,255,255,.1), rgba(255,255,255,.025)); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.2), inset 0 1px 0 rgba(255,255,255,.38), inset 0 -6px 10px rgba(0,0,0,.28), 0 6px 14px rgba(0,0,0,.5); font: 700 9px/1 "Syne", sans-serif; letter-spacing: .03em; transition: transform .1s, background .15s; }
.lm-b:hover { background: linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.05)); }
.lm-b:hover::after { content: ""; position: absolute; inset: 0; border-radius: 50%; padding: 1.5px; pointer-events: none; background: var(--rim); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); }
.lm-b:active { transform: scale(.93); }
.lm-b[disabled] { opacity: .35; pointer-events: none; }
.lm-b svg { filter: drop-shadow(0 1px 1px rgba(0,0,0,.5)); }
.lm-b.pl { width: calc(var(--bs) * 1.32); height: calc(var(--bs) * 1.32); background: radial-gradient(circle at 36% 26%, #3a3d42, #0d0e11 72%); box-shadow: inset 0 0 0 1px rgba(0,0,0,.7), 0 8px 18px rgba(0,0,0,.6), 0 0 calc(8px + var(--lvl, 0) * 24px) rgba(140,170,255,calc(.1 + var(--lvl, 0) * .35)); transform: scale(calc(1 + var(--kick, 0) * .04)); -webkit-backdrop-filter: none; backdrop-filter: none; }
.lm-b.pl svg { width: 40%; height: 40%; filter: none; color: transparent; }
.lm-b.pl svg path, .lm-b.pl svg rect { fill: url(#lmg); }
.lm-b.pl:hover::after { content: ""; padding: 2.5px; background: var(--rim); }
.lm-ext { grid-area: ext; display: none; align-items: center; justify-content: flex-end; }
.lm-b.vl svg { width: 52%; height: 52%; }

/* COMPACTO (base): orbe a la izquierda, datos y controles a la derecha */
.lm-wrap { --os: min(calc(100cqh - 2 * var(--pad)), 38cqw); --bs: min(30px, calc((100cqw - 2 * var(--pad) - var(--os) - 12px - 4 * 5px) / 5.3));
  grid-template-columns: var(--os) minmax(0, 1fr); grid-template-rows: auto auto 16px auto; grid-template-areas: "orb meta" "orb time" "orb bar" "orb ctl"; }
.lm-orb { grid-row: 1 / 5; }
@container (width < 320px) { .lm-b.bk, .lm-b.fw { display: none; } .lm-wrap { --bs: min(30px, calc((100cqw - 2 * var(--pad) - var(--os) - 22px) / 3.4)); } }
@container (width < 270px) { .lm-time i { display: none; } }

/* PASTILLA */
@container (height < 64px) {
  .lm-wrap { --pad: 5px; --os: calc(100cqh - 2 * var(--pad)); --bs: 28px; padding: var(--pad) 8px 0 var(--pad); gap: 0 8px; align-content: stretch; grid-template-columns: var(--os) minmax(0, 1fr) auto; grid-template-rows: minmax(0, 1fr) 8px; grid-template-areas: "orb meta ctl" "bar bar bar"; }
  .lm-orb { grid-row: 1; } 
  .lm-meta { padding: 0; align-self: center; } .lm-title { font-size: 12px; } .lm-artist, .lm-chips, .lm-time { display: none; }
  .lm-ctl { gap: 2px; } .lm-b.pl { width: var(--bs); height: var(--bs); }
  .lm-bar { height: 8px; margin: 0 -8px 0 -5px; } .lm-bar::before { height: 4px; margin-top: -2px; border-radius: 0; } .lm-bar i { height: 2px; margin-top: -1px; border-radius: 0; left: 0; } .lm-bar::after { display: none; }
}
@container (height < 64px) and (width < 340px) { .lm-b.bk, .lm-b.fw { display: none; } }
@container (height < 64px) and (width < 264px) { .lm-b.pv, .lm-b.nx { display: none; } }

/* FILA */
@container (64px <= height < 140px) {
  .lm-wrap { --pad: 8px; --os: min(calc(100cqh - 2 * var(--pad)), 84px); --bs: min(34px, calc(100cqh - 2 * var(--pad) - 8px)); gap: 2px 10px; align-content: stretch; grid-template-columns: var(--os) minmax(0, 1fr) auto; grid-template-rows: minmax(0, 1fr) 16px; grid-template-areas: "orb meta ctl" "orb bar ctl"; }
  .lm-orb { grid-row: 1 / 3; } .lm-time, .lm-chips { display: none; } .lm-meta { align-self: end; padding: 0; } .lm-bar { align-self: start; }
  .lm-b.bk, .lm-b.fw { display: none; }
}
@container (64px <= height < 140px) and (width >= 520px) { .lm-b.bk, .lm-b.fw { display: grid; } }
@container (64px <= height < 140px) and (width < 330px) { .lm-b.pv, .lm-b.nx { display: none; } }

/* PANORÁMICO */
@container (height >= 140px) and (width >= 400px) and (aspect-ratio > 21 / 10) {
  .lm-wrap { --pad: 14px; --os: min(calc(100cqh - 2 * var(--pad)), 34cqw); --bs: clamp(30px, min(calc(100cqh - 2 * var(--pad) - 36px - 16px - 16px - 18px), 40px), 40px); column-gap: 20px; grid-template-columns: var(--os) minmax(0, 1fr) auto; grid-template-rows: auto auto 16px auto; grid-template-areas: "orb meta meta" "orb time time" "orb bar bar" "orb ctl ext"; }
  .lm-title { font-size: clamp(15px, 8.2cqh, 24px); } .lm-artist { font-size: 12.5px; } .lm-time { font-size: 12px; margin-top: 2px; }
}
@container (height >= 140px) and (width >= 600px) and (aspect-ratio > 21 / 10) { .lm-ext { display: flex; } }
@container (height >= 140px) and (width >= 400px) and (width < 480px) and (aspect-ratio > 21 / 10) { .lm-b.bk, .lm-b.fw { display: none; } }

/* PORTADA */
@container (height >= 280px) and (aspect-ratio < 23 / 20) {
  .lm-wrap { --pad: 16px; --bs: min(44px, calc((100cqw - 2 * var(--pad) - 4 * 6px) / 5.4)); gap: 8px; align-content: stretch; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto 16px auto auto; grid-template-areas: "orb" "meta" "bar" "time" "ctl"; }
  .lm-orb { grid-row: 1; width: auto; height: 100%; aspect-ratio: 1; max-width: 100%; justify-self: center; }
  .lm-meta { text-align: center; padding: 0; } .lm-title { font-size: clamp(17px, 6.6cqw, 24px); } .lm-artist { font-size: 13px; }
  .lm-chips { grid-area: orb; align-self: start; margin: -2px -2px 0 0; }
  .lm-time { justify-content: space-between; font-size: 12px; } .lm-time i { margin-left: auto; }
  .lm-ctl { justify-content: space-between; } .lm-b.bk, .lm-b.fw { display: grid; }
}
@container (height >= 400px) and (aspect-ratio < 23 / 20) {
  .lm-wrap { grid-template-rows: minmax(0, 1fr) auto 16px auto auto auto; grid-template-areas: "orb" "meta" "bar" "time" "ctl" "ext"; }
  .lm-ext { display: flex; justify-content: center; }
}
@media (prefers-reduced-motion: reduce) { .lm-orb::after, .lm-b.pl::after, .live-badge .lm-bar i { animation: none; } .lm-b { transition: none; } }
`;
})();
