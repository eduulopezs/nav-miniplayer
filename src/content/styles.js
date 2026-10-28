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
    opacity: 0; transform: translateY(8px) scale(.96); pointer-events: none;
    transition: opacity .18s ease-in, transform .18s ease-in; /* salir es más rápido que entrar */
  }
  .card.show { opacity: 1; transform: none; pointer-events: auto; transition: opacity .32s cubic-bezier(.22, 1, .36, 1), transform .32s cubic-bezier(.22, 1, .36, 1); }
  .card.dragging { cursor: grabbing; transition: opacity .32s cubic-bezier(.22, 1, .36, 1); }
  .card:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  :where(.card) button { all: unset; box-sizing: border-box; cursor: pointer; }
  :where(.card) button:focus-visible { outline: 2px solid #fff; outline-offset: -3px; }
  [data-bar] { cursor: pointer; touch-action: none; }
  [data-bar]:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  .probe { position: absolute; width: 0; height: 0; overflow: hidden; visibility: hidden; }
  .probe::after { content: "Compacto"; }
  @container (height < 64px) { .probe::after { content: "Pastilla"; } }
  @container (64px <= height < 140px) { .probe::after { content: "Fila"; } }
  @container (height >= 140px) and (width >= 400px) and (aspect-ratio > 21 / 10) { .probe::after { content: "Panorámico"; } }
  @container (height >= 280px) and (aspect-ratio < 23 / 20) { .probe::after { content: "Portada"; } }
  /* Iconos que alternan con el estado: play/pausa y sonido/silencio. */
  .ic { display: contents; }
  .ic-play, .ic-mute { display: none; }
  .paused .ic-play, .muted .ic-mute { display: contents; }
  .paused .ic-pause, .muted .ic-vol { display: none; }
  /* Ventana con marco (Document PiP): la tarjeta llena la ventana. */
  .card.pip { width: 100% !important; height: 100% !important; cursor: default; border-radius: 0 !important; box-shadow: none; }
  .card.pip .grip:not(.br) { display: none; }
  .card.pip .grip.br { right: 0; bottom: 0; }
  /* Esquinas para cambiar el tamaño. */
  .grip { position: absolute; width: 18px; height: 18px; z-index: 8; opacity: 0; transition: opacity .15s; }
  .grip::after { content: ''; position: absolute; width: 8px; height: 8px; border: 0 solid #fff; mix-blend-mode: difference; }
  .grip.br { right: 3px; bottom: 3px; cursor: nwse-resize; } .grip.br::after { right: 3px; bottom: 3px; border-width: 0 2px 2px 0; }
  .grip.bl { left: 3px; bottom: 3px; cursor: nesw-resize; } .grip.bl::after { left: 3px; bottom: 3px; border-width: 0 0 2px 2px; }
  .grip.tr { right: 3px; top: 3px; cursor: nesw-resize; } .grip.tr::after { right: 3px; top: 3px; border-width: 2px 2px 0 0; }
  .grip.tl { left: 3px; top: 3px; cursor: nwse-resize; } .grip.tl::after { left: 3px; top: 3px; border-width: 2px 0 0 2px; }
  .card:hover .grip { opacity: .5; } .grip:hover { opacity: 1 !important; }
  /* Cargando: el botón de play late. A la espera de un gesto para abrir la ventana: aviso arriba y el botón de Mini late. */
  .card.loading [data-act=play] { animation: nmpulse 1s ease-in-out infinite; }
  .card.pending [data-act=mode] { animation: nmpulse 1.4s ease-in-out infinite; }
  @keyframes nmpulse { 50% { opacity: .55; } }
  .hint { display: none; position: absolute; left: 50%; top: 6px; transform: translateX(-50%); z-index: 9; max-width: calc(100% - 16px); padding: 3px 10px; border-radius: 999px; pointer-events: none;
    font: 600 11px/1.3 system-ui, sans-serif; color: #fff; background: rgba(8, 8, 12, .78); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .card.pending .hint { display: block; }
  .toast { display: none; position: absolute; left: 50%; bottom: 6px; transform: translateX(-50%); z-index: 9; padding: 3px 10px; border-radius: 999px; pointer-events: none; white-space: nowrap;
    font: 600 11px/1.3 "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif; color: #fff; background: rgba(0, 0, 0, .72); }
  .card.tst .toast { display: block; }
  @media (prefers-reduced-motion: reduce) {
    .card, .card.show { transition: none; }
    .card { transform: none; }
    .card.loading [data-act=play], .card.pending [data-act=mode] { animation: none; }
  }
  ${Object.values(NMP.skins).map((s) => s.css).join('\n')}
  `;
})();
