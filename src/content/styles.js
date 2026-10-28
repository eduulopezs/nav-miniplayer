(() => {
  const NMP = (globalThis.__NMP ||= {});

  // Estilos de la tarjeta: el contenedor (aparición, arrastre, esquinas de tamaño, ventana con marco) y, a continuación, el CSS de cada
  // diseño (skins/*.js). Cada diseño reorganiza la tarjeta en cinco layouts con container queries, así que el tamaño decide la composición.
  NMP.css = `
  :host { all: initial; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .card {
    --art: none;
    position: relative; container-type: size; width: 340px; height: 156px; overflow: hidden;
    user-select: none; -webkit-user-select: none; touch-action: none; cursor: grab;
    opacity: 0; transform: translateY(var(--space-4)) scale(.96); pointer-events: none;
    transition: opacity var(--dur-out) var(--ease-in), transform var(--dur-out) var(--ease-in); /* salir es más rápido que entrar */
  }
  .card.show { opacity: 1; transform: none; pointer-events: auto; transition: opacity var(--dur-in) var(--ease-out), transform var(--dur-in) var(--ease-out); }
  .card:focus-visible { outline: var(--size-ring) solid var(--focus); outline-offset: var(--size-ring); }
  :where(.card) button { all: unset; box-sizing: border-box; cursor: pointer; }
  :where(.card) button:focus-visible { outline: var(--size-ring) solid var(--focus); outline-offset: calc(-1 * var(--size-ring-offset)); }
  [data-bar] { cursor: pointer; touch-action: none; }
  [data-bar]:focus-visible { outline: var(--size-ring) solid var(--focus); outline-offset: var(--size-ring); }
  .probe { position: absolute; width: 0; height: 0; overflow: hidden; visibility: hidden; }
  .probe::after { content: "Compacto"; }
  @container (height < 64px) { .probe::after { content: "Pastilla"; } }
  @container (64px <= height < 140px) { .probe::after { content: "Fila"; } }
  @container (height >= 140px) and (width >= 400px) and (aspect-ratio > 21 / 10) { .probe::after { content: "Panorámico"; } }
  @container (height >= 280px) and (aspect-ratio < 23 / 20) { .probe::after { content: "Portada"; } }
  /* Iconos que alternan con el estado (play/pausa y sonido/silencio): los dos viven apilados en la celda del botón y el activo entra mientras el otro sale girando y encogiéndose. */
  .ic { display: contents; }
  .ic svg { grid-area: 1 / 1; transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-in) var(--ease-out); }
  .card:not(.paused) .ic-play svg, .card.paused .ic-pause svg, .card:not(.muted) .ic-mute svg, .card.muted .ic-vol svg { opacity: 0; transform: rotate(var(--icon-turn)) scale(var(--icon-shrink)); }
  /* Ventana con marco (Document PiP): la tarjeta llena la ventana. */
  .card.pip { width: 100% !important; height: 100% !important; cursor: default; border-radius: 0 !important; box-shadow: none; }
  /* Cargando: el botón de play late. */
  .card.loading [data-act=play] { animation: nmpulse var(--dur-pulse) var(--ease-pulse) infinite; }
  @keyframes nmpulse { 50% { opacity: var(--opacity-pulse); } }
  /* Saltar ±N s: el botón se desplaza un instante hacia donde salta. Carátula nueva: entra con un fundido. */
  [data-act=back].nudge { animation: nmnudge-back var(--dur-nudge) var(--ease-out); }
  [data-act=fwd].nudge { animation: nmnudge-fwd var(--dur-nudge) var(--ease-out); }
  @keyframes nmnudge-back { 30% { transform: translateX(calc(var(--nudge-shift) * -1)); } }
  @keyframes nmnudge-fwd { 30% { transform: translateX(var(--nudge-shift)); } }
  .card.swap :is(.gl-cov, .nr-art, .lm-cov, .cr-art) { animation: nmswap var(--dur-swap) var(--ease-out); }
  @keyframes nmswap { from { opacity: 0; } }
  .toast { display: none; position: absolute; left: 50%; bottom: var(--space-3); transform: translateX(-50%); z-index: 9; padding: var(--space-2) var(--space-5); border-radius: var(--radius-pill); pointer-events: none; white-space: nowrap;
    font: var(--weight-strong) var(--type-xs)/1.3 var(--font-sans); color: var(--on-overlay); background: var(--scrim-toast); }
  .card.tst .toast { display: block; }
  @media (prefers-reduced-motion: reduce) {
    .card, .card.show { transition: none; }
    .card { transform: none; }
    .ic svg { transition: none; }
    .card.loading [data-act=play] { animation: none; }
    [data-act].nudge, .card.swap :is(.gl-cov, .nr-art, .lm-cov, .cr-art) { animation: none; }
  }
  ${Object.values(NMP.skins).map((s) => s.css).join('\n')}
  `;
})();
