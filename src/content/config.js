(() => {
  const NMP = (globalThis.__NMP ||= {});

  // Constantes compartidas por todos los módulos del content script.
  NMP.cfg = {
    SKIP: 10, // s que saltan los botones ±10
    MIN_DURATION: 30, // s; ignora sonidos/clips cortos
    MARGIN: 24,
    EDGE: 8, // px de borde que actúan como barra de progreso arrastrable
    POS_KEY: 'mp_pos',
    SIZE_KEY: 'mp_size',
    THEME_KEY: 'mp_theme', // desarrollo: 'glass' | 'brutal' | 'pixel' | 'retro'
    MODE_KEY: 'mp_mode', // 'pip' (vídeo, sin marco) | 'win' (ventana con controles propios) | 'card' (en la página)
    SLIM: { w: 380, h: 56 }, SLIM_BELOW: 84,
    DESIGN: { w: 312, h: 126 }, // tamaño base; el contenido se reescala a partir de él
    MIN: { w: 240, h: 44 }, MAX: { w: 800, h: 420 },
    CW: 320, CH: 80, // lienzo de la ventana Mini
    DPR0: 0.5, // el PiP se abre con el tamaño real del vídeo (160x40, el navegador lo ajusta a su mínimo); ya abierto, se sube la resolución sin cambiar la proporción
    FONT: '"Segoe UI Variable Text","Segoe UI",system-ui,sans-serif',
    SITE_BUTTONS: {
      prev: ['.ytp-prev-button', '[data-testid="control-button-skip-back"]'],
      next: ['.ytp-next-button', '[data-testid="control-button-skip-forward"]'],
    },
  };
})();
