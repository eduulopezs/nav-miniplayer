// Agente sin interfaz para los iframes: informa al marco superior (por el service worker) del estado de los medios de este marco
// y ejecuta sus órdenes. La interfaz y la elección del medio viven solo en el marco superior (player.js).
(() => {
  if (window.top === window || window.__nmpFrameAgent) return;
  window.__nmpFrameAgent = true; // mundo aislado: la página no lo ve

  const MAX = 8;
  const ids = new WeakMap(), byId = new Map(); // elemento <-> id local
  let nextId = 1, timer = 0, period = 0, queued = false;
  // Medios que el puente del mundo de la página ve y este agente no (sin insertar, en shadow DOM): llegan por evento y sus ids se desplazan
  // para no chocar con los del DOM normal.
  const BRIDGE = 1e6;
  let bridged = [];

  const idOf = (el) => {
    let id = ids.get(el);
    if (!id) {
      id = nextId++; ids.set(el, id); byId.set(id, new WeakRef(el));
      if (byId.size > 64) for (const [k, r] of byId) if (!r.deref()) byId.delete(k);
    }
    return id;
  };
  const snap = (el) => ({
    i: idOf(el), p: el.paused, e: el.ended, t: el.currentTime, l: el.duration === Infinity, d: isFinite(el.duration) ? el.duration : 0,
    r: el.readyState, m: el.muted, o: el.loop, v: el.tagName === 'VIDEO', k: el.playbackRate,
  });

  function publish() {
    queued = false;
    const list = [...document.querySelectorAll('video,audio')].filter((el) => el.readyState > 0).slice(0, MAX).map(snap).concat(bridged);
    // Sonando: cada 500 ms. Con medios en pausa: un latido cada 2 s, para que un marco superior que llega tarde los vea y no caduquen.
    const want = list.some((s) => !s.p && !s.e) ? 500 : list.length ? 2000 : 0;
    if (want !== period) { clearInterval(timer); timer = want ? setInterval(publish, want) : 0; period = want; }
    const json = JSON.stringify(list);
    try { chrome.runtime.sendMessage({ type: 'mp-frame', list: json }); } catch (_) { /* contexto invalidado */ }
  }
  const schedule = () => { if (!queued) { queued = true; queueMicrotask(publish); } };
  ['play', 'pause', 'ended', 'loadedmetadata', 'durationchange', 'emptied', 'seeked', 'volumechange'].forEach((ev) => document.addEventListener(ev, schedule, true));
  addEventListener('pagehide', () => { try { chrome.runtime.sendMessage({ type: 'mp-frame', list: '[]' }); } catch (_) { /* ya no hay a quién avisar */ } });
  document.addEventListener('__mp_media', (e) => {
    try {
      const l = JSON.parse(String(e.detail));
      bridged = Array.isArray(l) ? l.slice(0, MAX).filter((s) => s && Number.isInteger(s.i) && s.i > 0 && s.i < BRIDGE).map((s) => ({ ...s, i: s.i + BRIDGE })) : [];
    } catch (_) { bridged = []; }
    schedule();
  });
  document.dispatchEvent(new CustomEvent('__mp_query')); // el puente reenvía el estado que ya tuviera
  schedule(); // medios que ya estaban cargados antes de que llegara el agente

  // Órdenes `m:<id>:play|pause|seek:<segundos>` del marco superior.
  chrome.runtime.onMessage.addListener((m, sender) => {
    if (sender.id !== chrome.runtime.id || !m || m.type !== 'mp-cmd' || typeof m.cmd !== 'string') return;
    const c = /^m:(\d+):(play|pause|seek)(?::(\d{1,9}(?:\.\d+)?))?$/.exec(m.cmd);
    if (c && +c[1] > BRIDGE) return void document.dispatchEvent(new CustomEvent('__mp_cmd', { detail: m.cmd.replace(/^m:\d+/, 'm:' + (+c[1] - BRIDGE)) }));
    const el = c && byId.get(+c[1])?.deref();
    if (!el) return;
    try {
      if (c[2] === 'play') el.play().catch(() => {});
      else if (c[2] === 'pause') el.pause();
      else if (c[3] != null && isFinite(el.duration)) el.currentTime = Math.min(el.duration, +c[3]);
    } catch (_) { /* el sitio decide */ }
  });
})();
