// Se ejecuta en el mundo de la página (MAIN) para capturar los manejadores de
// Media Session que registra el sitio (anterior/siguiente, etc.) y poder invocarlos.
(() => {
  if (typeof MediaSession === 'undefined') return; // sin banderas globales: la página no puede detectar la extensión por una variable

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

  // Medios que el content script no ve: sin insertar (new Audio()) o dentro de un shadow DOM, abierto o cerrado.
  // Se registran al llamar a play() y se publica su estado (sin referencias: solo números y banderas) por un evento.
  const MAX_TRACKED = 16;
  const tracked = new Map(); // id -> WeakRef del elemento
  const ids = new WeakMap();
  let nextId = 1, timer = 0, queued = false, lastJson = '';
  const hidden = (el) => !el.isConnected || el.getRootNode() !== document; // el content script ya ve el resto
  const snap = (id, el) => ({
    i: id, p: el.paused, e: el.ended, t: el.currentTime, l: el.duration === Infinity, d: isFinite(el.duration) ? el.duration : 0,
    r: el.readyState, m: el.muted, o: el.loop, v: el.tagName === 'VIDEO', k: el.playbackRate,
  });
  function publish() {
    queued = false;
    const list = [];
    for (const [id, ref] of tracked) {
      const el = ref.deref();
      if (!el) tracked.delete(id);
      else if (hidden(el)) list.push(snap(id, el));
    }
    if (!list.some((s) => !s.p && !s.e)) { clearInterval(timer); timer = 0; } // nada suena: sin temporizador
    else if (!timer) timer = setInterval(publish, 500);
    const json = JSON.stringify(list);
    if (json === lastJson) return;
    lastJson = json;
    document.dispatchEvent(new CustomEvent('__mp_media', { detail: json }));
  }
  const schedule = () => { if (!queued) { queued = true; queueMicrotask(publish); } };
  function track(el) {
    if (!(el instanceof HTMLMediaElement) || ids.has(el) || !hidden(el)) return;
    if (tracked.size >= MAX_TRACKED) tracked.delete(tracked.keys().next().value);
    const id = nextId++;
    ids.set(el, id); tracked.set(id, new WeakRef(el));
    ['play', 'pause', 'ended', 'loadedmetadata', 'durationchange', 'emptied', 'seeked', 'volumechange'].forEach((ev) => el.addEventListener(ev, schedule));
  }
  const nativePlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = new Proxy(nativePlay, {
    apply(target, self, args) {
      try { track(self); schedule(); } catch (_) { /* el sitio decide */ }
      return Reflect.apply(target, self, args);
    },
  });
  document.addEventListener('__mp_query', () => { lastJson = ''; schedule(); }); // quien se une tarde (content script, agente de un iframe) recibe el estado actual

  // Medios que arrancan solos (`autoplay`) sin llamar a play(): se registran al empezar a sonar. `play` y `playing` no burbujean ni cruzan
  // un shadow root, así que se escuchan en cada raíz que se crea y en cada elemento creado por script (sin insertar).
  const START = ['play', 'playing'];
  const onStart = (e) => { try { track(e.target); schedule(); } catch (_) { /* el sitio decide */ } };
  const watch = (el) => { if (el instanceof HTMLMediaElement) START.forEach((ev) => el.addEventListener(ev, onStart, { once: true })); return el; };
  const nativeAttach = Element.prototype.attachShadow;
  Element.prototype.attachShadow = new Proxy(nativeAttach, {
    apply(target, self, args) {
      const root = Reflect.apply(target, self, args);
      try { START.forEach((ev) => root.addEventListener(ev, onStart, true)); } catch (_) { /* el sitio decide */ }
      return root;
    },
  });
  const nativeCreate = Document.prototype.createElement;
  Document.prototype.createElement = new Proxy(nativeCreate, {
    apply(target, self, args) {
      const el = Reflect.apply(target, self, args);
      try { if (el instanceof HTMLMediaElement) watch(el); } catch (_) { /* el sitio decide */ }
      return el;
    },
  });
  window.Audio = new Proxy(window.Audio, { construct(target, args, nt) { const el = Reflect.construct(target, args, nt); try { watch(el); } catch (_) { /* el sitio decide */ } return el; } });
  // Órdenes `m:<id>:play|pause|seek:<segundos>`; el id solo sirve para elementos que el propio puente registró.
  function mediaCmd(cmd) {
    const m = /^m:(\d+):(play|pause|seek)(?::(\d{1,9}(?:\.\d+)?))?$/.exec(cmd);
    const el = m && tracked.get(+m[1])?.deref();
    if (!el) return;
    try {
      if (m[2] === 'play') nativePlay.call(el).catch(() => {});
      else if (m[2] === 'pause') el.pause();
      else if (m[3] != null && isFinite(el.duration)) el.currentTime = Math.min(el.duration, +m[3]);
    } catch (_) { /* el sitio decide */ }
  }

  document.addEventListener('__mp_cmd', (e) => {
    if (e.detail === '__pip') return togglePip();
    if (typeof e.detail !== 'string') return;
    if (e.detail.startsWith('m:')) return mediaCmd(e.detail);
    const fn = handlers.get(e.detail);
    if (fn) {
      try { fn({ action: e.detail }); } catch (_) { /* el sitio decide */ }
    }
  });
})();
