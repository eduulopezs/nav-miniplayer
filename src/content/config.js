(() => {
  const NMP = (globalThis.__NMP ||= {});

  // Constantes compartidas por todos los módulos del content script.
  NMP.cfg = {
    SKIPS: [5, 10, 15, 30], // s que pueden saltar los botones ±; migrate.js guarda su propia copia congelada, igual que la de SKINS
    themeKey: (id) => 'theme' + id[0].toUpperCase() + id.slice(1), // clave de idioma de un diseño: themeGlass, themeNoir...
    SKINS: ['glass', 'noir', 'crt', 'metal', 'minimal', 'ansi', 'dynamic'], // diseños, en el orden de menús y ajustes
    CMD: /^(play|pause|toggle|back|fwd|prev|next|mute|seek:(\d{1,9}(?:\.\d+)?))$/, // órdenes de la ventana aparte: las valida el service worker y las ejecuta la pestaña
    LEGACY: { brutal: 'noir', retro: 'crt', pixel: 'glass' }, // nombres antiguos de diseño y el que los sustituye; migrate.js guarda su propia copia congelada
    MIN_DURATION: 30, // s; ignora sonidos/clips cortos
    THEME_KEY: 'mp_theme', // id de uno de SKINS
    PREFS_KEY: 'mp_prefs', // { skip }
    REMOTE_KEY: 'mp_remote', // true mientras la ventana aparte está abierta: las pestañas informan de su medio
    VOL_PREFIX: 'mp_vol:', // + hostname: volumen recordado por sitio, una clave por sitio para que dos pestañas no se pisen
    INPAGE_KEY: 'mp_inpage', // solo pruebas: pinta la tarjeta en la página (en producción solo existe dentro de la ventana con marco)
    SITE_BUTTONS: {
      prev: ['.ytp-prev-button', '[data-testid="control-button-skip-back"]'],
      next: ['.ytp-next-button', '[data-testid="control-button-skip-forward"]'],
    },
  };
})();
