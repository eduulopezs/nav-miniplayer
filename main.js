// Se ejecuta en el mundo de la página (MAIN) para capturar los manejadores de
// Media Session que registra el sitio (anterior/siguiente, etc.) y poder invocarlos.
(() => {
  if (window.__glassMiniPlayerHooked || typeof MediaSession === 'undefined') return;
  window.__glassMiniPlayerHooked = true;

  const handlers = new Map();
  const original = MediaSession.prototype.setActionHandler;

  const announce = () => {
    const names = [...handlers].filter(([, fn]) => fn).map(([name]) => name);
    if ('documentPictureInPicture' in window) names.push('@pip');
    const actions = names.join(',');
    document.dispatchEvent(new CustomEvent('__mp_actions', { detail: actions }));
  };

  MediaSession.prototype.setActionHandler = function (action, handler) {
    handlers.set(action, handler);
    announce();
    return original.call(this, action, handler);
  };

  document.addEventListener('__mp_query', announce);
  let pipWin = null, pipPending = false;
  const pipEvent = (detail) => document.dispatchEvent(new CustomEvent('__mp_pip', { detail }));
  // Debe llamarse dentro del clic del usuario (activación transitoria).
  function togglePip() {
    if (pipWin) { pipWin.close(); return; }
    if (pipPending) return;
    const host = document.getElementById('glass-mini-player-host');
    if (!host || !('documentPictureInPicture' in window)) return pipEvent('error:no soportado');
    pipPending = true;
    documentPictureInPicture.requestWindow({ width: 360, height: 72 }).then((w) => {
      pipPending = false;
      pipWin = w;
      w.document.body.style.cssText = 'margin:0;overflow:hidden;background:#1b1b24;';
      w.document.body.append(host);
      pipEvent('open');
      w.addEventListener('pagehide', () => { pipWin = null; pipEvent('closed'); });
    }, (err) => { pipPending = false; pipEvent('error:' + (err && err.message || err)); });
  }

  document.addEventListener('__mp_cmd', (e) => {
    if (e.detail === '__pip') return togglePip();
    const fn = handlers.get(e.detail);
    if (fn) {
      try { fn({ action: e.detail }); } catch (_) { /* el sitio decide */ }
    }
  });
})();
