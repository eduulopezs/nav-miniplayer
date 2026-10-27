// Se ejecuta en el mundo de la página (MAIN) para capturar los manejadores de
// Media Session que registra el sitio (anterior/siguiente, etc.) y poder invocarlos.
(() => {
  if (window.__glassMiniPlayerHooked || typeof MediaSession === 'undefined') return;
  window.__glassMiniPlayerHooked = true;

  const handlers = new Map();
  const original = MediaSession.prototype.setActionHandler;

  const announce = () => {
    const actions = [...handlers].filter(([, fn]) => fn).map(([name]) => name).join(',');
    document.dispatchEvent(new CustomEvent('__mp_actions', { detail: actions }));
  };

  MediaSession.prototype.setActionHandler = function (action, handler) {
    handlers.set(action, handler);
    announce();
    return original.call(this, action, handler);
  };

  document.addEventListener('__mp_query', announce);
  document.addEventListener('__mp_cmd', (e) => {
    const fn = handlers.get(e.detail);
    if (fn) {
      try { fn({ action: e.detail }); } catch (_) { /* el sitio decide */ }
    }
  });
})();
