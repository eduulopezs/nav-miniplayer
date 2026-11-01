(() => {
  const NMP = (globalThis.__NMP ||= {});
  const SKINS = (NMP.skins ||= {});

  const ico = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const btn = (cls, act, title, label, body) => `<button class="mn-b ${cls}" data-act="${act}" title="${title}" aria-label="${label}">${body}</button>`;
  const skip = (flip) => ico(`<g${flip ? ' transform="matrix(-1 0 0 1 24 0)"' : ''}><path d="M4 12a8 8 0 1 1 8 8"/><path d="M12 17l-3.4 3 3.4 3z" fill="currentColor" stroke-width="1"/></g><text class="mn-t10" data-skn="" x="12" y="14.6" text-anchor="middle" stroke="none">10</text>`);

SKINS.minimal = { get label() { return NMP.t('themeMinimal'); }, tpl: () => `
  <div class="mn-wrap">
    <button class="mn-cov" data-act="cover" aria-pressed="false" aria-label="${NMP.t('cover')}" title="${NMP.t('cover')}"></button>
    <div class="mn-meta"><div class="mn-title" data-t="title"></div><div class="mn-artist" data-t="artist"></div></div>
    <div class="mn-chips"><button data-act="hide" title="${NMP.t('hide')}" aria-label="${NMP.t('hide')}">${ico('<path d="M7 7l10 10M17 7L7 17"/>')}</button></div>
    <div class="mn-prog"><span class="mn-t" data-v="cur">0:00</span><div class="mn-bar" role="slider" tabindex="0" data-bar aria-label="${NMP.t('progress')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><span class="mn-t r" data-v="dur">0:00</span></div>
    <div class="mn-ctl">
      ${btn('pv', 'prev', NMP.t('prev'), NMP.t('prev'), ico('<path d="M6 5.5v13" /><path d="M19 6v12l-9.5-6z" fill="currentColor"/>'))}
      ${btn('bk', 'back', NMP.t('backTitle', '10'), NMP.t('backLabel', '10'), skip(true))}
      ${btn('pl', 'play', NMP.t('pause'), NMP.t('pause'), `<span class="ic ic-pause">${ico('<rect x="6.5" y="5" width="4" height="14" rx="1.4" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.4" fill="currentColor"/>')}</span><span class="ic ic-play">${ico('<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>')}</span>`)}
      ${btn('fw', 'fwd', NMP.t('fwdTitle', '10'), NMP.t('fwdLabel', '10'), skip(false))}
      ${btn('nx', 'next', NMP.t('next'), NMP.t('next'), ico('<path d="M18 5.5v13" /><path d="M5 6v12l9.5-6z" fill="currentColor"/>'))}
    </div>
    <div class="mn-ext">${btn('vl', 'mute', NMP.t('mute'), NMP.t('muteLabel'), `<span class="ic ic-vol">${ico('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>')}</span><span class="ic ic-mute">${ico('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>')}</span>`)}<input type="range" class="vol-r" data-vol min="0" max="100" step="1" value="100" aria-label="${NMP.t('volume')}"></div>
  </div>` };

  SKINS.minimal.css = `
/* ============================================================
   MINIMAL. Superficie plana y sin efectos: sin desenfoque, sin brillos, sin sombras de color. Sigue el tema claro u oscuro del
   sistema (prefers-color-scheme). Los pares de color se declaran como --mn-* y scripts/contrast.mjs los lee para comprobar AA.
   ============================================================ */
.card.sk-minimal { --mn-bg: #fafafa; --mn-fg: #17181b; --mn-mute: #595e66; --mn-track: #868b94; --mn-line: #d9dbe0; --mn-hover: rgba(23,24,27,.08);
  --focus: var(--mn-fg); --vol-c: var(--mn-fg); color-scheme: light dark;
  font-family: "Figtree", system-ui, sans-serif; color: var(--mn-fg); border-radius: var(--r, 18px); background: var(--mn-bg);
  box-shadow: 0 0 0 1px var(--mn-line), 0 8px 24px rgba(0,0,0,.14); }
@media (prefers-color-scheme: dark) {
  .card.sk-minimal { --mn-bg: #17181b; --mn-fg: #f2f3f5; --mn-mute: #a4a9b2; --mn-track: #6b7079; --mn-line: #2e3036; --mn-hover: rgba(242,243,245,.1); }
}
.mn-wrap { position: absolute; inset: 0; display: grid; --pad: 14px; --bs: 34px; padding: var(--pad); gap: 8px 12px; min-width: 0; min-height: 0; align-content: space-between; }
.mn-wrap > * { min-width: 0; min-height: 0; }
.mn-wrap svg { width: 56%; height: 56%; display: block; }
.mn-cov { grid-area: cov; align-self: center; width: 100%; height: 100%; max-height: 100%; aspect-ratio: 1; border-radius: 10px; background: var(--art) var(--mn-line) center / cover; box-shadow: inset 0 0 0 1px var(--mn-line); transition: filter .3s; }
.paused .mn-cov { filter: saturate(.5); }
.mn-meta { grid-area: meta; align-self: center; padding-right: 34px; }
.mn-title { font: 700 15px/1.2 "Figtree", sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -.005em; }
.mn-artist { font: 500 12px/1.3 "Figtree", sans-serif; color: var(--mn-mute); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mn-chips { grid-area: meta; justify-self: end; align-self: start; display: flex; margin: -6px -6px 0 0; z-index: 3; }
.mn-chips button { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; color: var(--mn-mute); }
.mn-chips button:hover { background: var(--mn-hover); color: var(--mn-fg); }
.mn-chips svg { width: 14px; height: 14px; }
.mn-prog { grid-area: prog; display: flex; align-items: center; gap: 8px; font: 500 10.5px/1 "Figtree", sans-serif; color: var(--mn-mute); font-variant-numeric: tabular-nums; }
.mn-t { flex: none; min-width: 30px; } .mn-t.r { text-align: right; }
.mn-bar { position: relative; flex: 1; height: 18px; cursor: pointer; touch-action: none; }
.mn-bar::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 3px; margin-top: -1.5px; border-radius: 3px; background: var(--mn-track); }
.mn-bar i { position: absolute; left: 0; top: 50%; height: 3px; margin-top: -1.5px; width: calc(var(--p, 0) * 100%); border-radius: 3px; background: var(--mn-fg); }
.mn-bar::after { content: ""; position: absolute; top: 50%; left: calc(var(--p, 0) * 100%); width: 11px; height: 11px; margin: -5.5px 0 0 -5.5px; border-radius: 50%; background: var(--mn-fg); transform: scale(.8); transition: transform var(--dur-fast); }
.mn-bar:hover::after, .mn-bar:focus-visible::after, .mn-bar.drag::after { transform: scale(1.15); }
.live-badge .mn-bar { pointer-events: none; } .live-badge .mn-bar::after { display: none; } .live-badge .mn-bar i { width: 100%; animation: mnpulse 1.6s ease-in-out infinite; }
@keyframes mnpulse { 50% { opacity: .35; } }
.mn-ctl { grid-area: ctl; display: flex; align-items: center; justify-content: flex-start; gap: 6px; }
.mn-b { width: var(--bs); height: var(--bs); flex: none; border-radius: 50%; display: grid; place-items: center; color: var(--mn-fg); transition: background var(--dur-fast), transform .12s; }
.mn-b:hover { background: var(--mn-hover); }
.mn-b:active { transform: scale(var(--press-scale)); }
.mn-b[disabled] { opacity: var(--opacity-disabled); pointer-events: none; }
.mn-b.pl { width: calc(var(--bs) * 1.2); height: calc(var(--bs) * 1.2); background: var(--mn-fg); color: var(--mn-bg); }
.mn-b.pl:hover { background: var(--mn-fg); opacity: .85; }
.mn-b.pl svg { width: 46%; height: 46%; }
.mn-t10 { font: 700 8.2px "Figtree", sans-serif; fill: currentColor; }
.mn-ext { grid-area: ext; display: none; align-items: center; justify-content: center; gap: 6px; }

/* COMPACTO (base) */
.mn-wrap { --cw: min(100cqh - 2 * var(--pad), 34cqw); --bs: min(36px, calc((100cqw - var(--cw) - 3 * var(--pad) - 4 * 6px) / 5.2));
  grid-template-columns: var(--cw) minmax(0, 1fr); grid-template-rows: auto 18px 44px; grid-template-areas: "cov meta" "cov prog" "cov ctl"; }
@container (width < 300px) { .mn-b.bk, .mn-b.fw { display: none; } .mn-wrap { --bs: min(36px, calc((100cqw - var(--cw) - 3 * var(--pad) - 2 * 6px) / 3.4)); } }
@container (width < 270px) { .mn-t.r { display: none; } }

/* PASTILLA */
@container (height < 64px) {
  .mn-wrap { --pad: 6px; --cw: calc(100cqh - 2 * var(--pad)); --bs: 28px; padding: var(--pad) 8px var(--pad) var(--pad); gap: 0 8px; align-content: stretch; grid-template-columns: var(--cw) minmax(0, 1fr) auto; grid-template-rows: minmax(0, 1fr) 6px; grid-template-areas: "cov meta ctl" "prog prog prog"; }
  .mn-cov { border-radius: 8px; }
  .mn-meta { padding: 0; } .mn-title { font-size: 13px; } .mn-artist, .mn-chips, .mn-t { display: none; }
  .mn-ctl { gap: 1px; justify-content: center; } .mn-bar { height: 6px; margin: 0 -8px 0 -6px; } .mn-bar::before, .mn-bar i { height: 3px; margin-top: -1.5px; border-radius: 0; } .mn-bar::after { display: none; }
}
@container (height < 64px) and (width < 340px) { .mn-b.bk, .mn-b.fw { display: none; } }
@container (height < 64px) and (width < 264px) { .mn-b.pv, .mn-b.nx { display: none; } }

/* FILA */
@container (64px <= height < 140px) {
  .mn-wrap { --pad: 10px; --cw: min(100cqh - 2 * var(--pad), 96px, 30cqw); --bs: min(38px, calc(100cqh - 2 * var(--pad) - 4px)); gap: 4px 12px; align-content: stretch; grid-template-columns: var(--cw) minmax(0, 1fr) auto; grid-template-rows: minmax(0, 1fr) 18px; grid-template-areas: "cov meta ctl" "cov prog ctl"; }
  .mn-chips { display: none; } .mn-meta { padding: 0; align-self: end; }
  .mn-prog { align-self: start; } .mn-b.bk, .mn-b.fw { display: none; }
}
@container (64px <= height < 140px) and (width >= 540px) { .mn-b.bk, .mn-b.fw { display: grid; } }
@container (64px <= height < 140px) and (width < 460px) { .mn-t { display: none; } }
@container (64px <= height < 140px) and (width >= 640px) { .mn-wrap { grid-template-columns: var(--cw) minmax(0, 1fr) auto auto; grid-template-areas: "cov meta ctl ext" "cov prog ctl ext"; } .mn-ext { display: flex; } }
@container (64px <= height < 84px) { .mn-artist { display: none; } }
@container (64px <= height < 140px) and (width < 330px) { .mn-b.pv, .mn-b.nx { display: none; } }

/* PANORÁMICO */
@container (height >= 140px) and (width >= 400px) and (aspect-ratio > 21 / 10) {
  .mn-wrap { --pad: 16px; --cw: min(100cqh - 2 * var(--pad), 38cqw); --bs: clamp(32px, min(calc(100cqh - 2 * var(--pad) - 44px - 18px - 36px), 42px), 42px); grid-template-columns: var(--cw) minmax(0, 1fr) auto; grid-template-rows: auto 18px auto; align-content: space-between; column-gap: 18px; grid-template-areas: "cov meta meta" "cov prog prog" "cov ctl ext"; }
  .mn-cov { grid-row: 1 / -1; }
  .mn-title { font-size: clamp(16px, 8cqh, 24px); } .mn-artist { font-size: 13px; } .mn-meta { align-self: start; }
}
@container (height >= 140px) and (width >= 600px) and (aspect-ratio > 21 / 10) { .mn-ext { display: flex; } }
@container (height >= 140px) and (width >= 400px) and (width < 480px) and (aspect-ratio > 21 / 10) { .mn-b.bk, .mn-b.fw { display: none; } }

/* PORTADA: la portada ocupa el ancho y el borde superior */
@container (height >= 280px) and (aspect-ratio < 23 / 20) {
  .mn-wrap { --pad: 16px; --ch: calc(100cqh - 166px); --bs: min(46px, calc((100cqw - 2 * var(--pad) - 4 * 6px) / 5.3)); gap: 8px; align-content: start; grid-template-columns: minmax(0, 1fr); grid-template-rows: var(--ch) auto 18px auto; grid-template-areas: "cov" "meta" "prog" "ctl"; }
  .mn-cov { aspect-ratio: auto; border-radius: 12px; }
  .mn-chips { grid-area: cov; margin: 8px 8px 0 0; } .mn-chips button { background: var(--mn-bg); color: var(--mn-fg); }
  .mn-meta { padding: 0; } .mn-title { font-size: clamp(18px, 7.2cqw, 24px); } .mn-artist { font-size: 14px; margin-top: 2px; }
  .mn-ctl { justify-content: space-between; } .mn-b.bk, .mn-b.fw { display: grid; }
}
@container (height >= 400px) and (aspect-ratio < 23 / 20) {
  .mn-wrap { --ch: calc(100cqh - 208px); grid-template-rows: var(--ch) auto 18px auto auto; grid-template-areas: "cov" "meta" "prog" "ctl" "ext"; }
  .mn-ext { display: flex; justify-content: center; margin-top: -2px; }
}
@media (prefers-reduced-motion: reduce) { .live-badge .mn-bar i { animation: none; } .mn-cov, .mn-b, .mn-bar::after { transition: none; } }
`;
})();
