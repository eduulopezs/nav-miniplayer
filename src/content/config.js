(() => {
  const NMP = (globalThis.__NMP ||= {});

  // Constantes compartidas por todos los módulos del content script.
  NMP.cfg = {
    SKIP: 10, // s que saltan los botones ±10
    MIN_DURATION: 30, // s; ignora sonidos/clips cortos
    THEME_KEY: 'mp_theme', // desarrollo: 'glass' | 'noir' | 'crt' | 'metal' | 'minimal' | 'ansi'
    PREFS_KEY: 'mp_prefs', // { skip }
    REMOTE_KEY: 'mp_remote', // true mientras la ventana aparte está abierta: las pestañas informan de su medio
    VOL_KEY: 'mp_vol', // volumen recordado por sitio
    INPAGE_KEY: 'mp_inpage', // solo pruebas: pinta la tarjeta en la página (en producción solo existe dentro de la ventana con marco)
    SITE_BUTTONS: {
      prev: ['.ytp-prev-button', '[data-testid="control-button-skip-back"]'],
      next: ['.ytp-next-button', '[data-testid="control-button-skip-forward"]'],
    },
  };
})();
