(() => {
  const NMP = (globalThis.__NMP ||= {});

  // Constantes compartidas por todos los módulos del content script.
  NMP.cfg = {
    SKIP: 10, // s que saltan los botones ±10
    MIN_DURATION: 30, // s; ignora sonidos/clips cortos
    MARGIN: 24,
    POS_KEY: 'mp_pos',
    SIZE_KEY: 'mp_size',
    THEME_KEY: 'mp_theme', // desarrollo: 'glass' | 'noir' | 'crt' | 'metal'
    PREFS_KEY: 'mp_prefs', // { skip, autoshow, autohide }
    VOL_KEY: 'mp_vol', // volumen recordado por sitio
    MODE_KEY: 'mp_mode', // 'pip' (vídeo, sin marco) | 'win' (ventana con controles propios) | 'card' (en la página)
    MIN: { w: 240, h: 48 }, MAX: { w: 800, h: 480 },
    CW: 320, CH: 80, // lienzo de la ventana Mini
    DPR0: 0.5, // el PiP se abre con el tamaño real del vídeo (160x40, el navegador lo ajusta a su mínimo); ya abierto, se sube la resolución sin cambiar la proporción
    FONT: '"Segoe UI Variable Text","Segoe UI",system-ui,sans-serif',
    SITE_BUTTONS: {
      prev: ['.ytp-prev-button', '[data-testid="control-button-skip-back"]'],
      next: ['.ytp-next-button', '[data-testid="control-button-skip-forward"]'],
    },
  };
})();
