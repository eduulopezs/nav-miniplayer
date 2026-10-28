// Sesiones de reproducción de todas las pestañas y ventana aparte (src/window).
// Las pestañas informan de su medio mientras la ventana aparte está abierta (mp_remote); aquí se guardan en chrome.storage.session (el service
// worker se duerme) y la ventana las lee de ahí. Las órdenes de la ventana vuelven a la pestaña elegida por este mismo canal.
// Todo lo que llega lo escribe una pestaña (y por tanto la página puede influir en ello), así que cada campo se valida y se acota.
(() => {
  const SESS_KEY = 'mp_sessions', REMOTE_KEY = 'mp_remote', WIN_KEY = 'mp_win', WINID_KEY = 'mp_winid';
  const PAGE = 'src/window/player.html';
  const CMD = /^(?:play|pause|toggle|back|fwd|prev|next|mute|seek:\d{1,9}(?:\.\d+)?)$/;
  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  const num = (v, lo, hi, d) => (typeof v === 'number' && v >= lo && v <= hi ? v : d);
  const web = (v) => { v = str(v, 1000); return /^https?:\/\//i.test(v) ? v : ''; };
  const MAX_SESSIONS = 24;

  // Lectura, cambio y escritura en serie: varias pestañas informan a la vez.
  let chain = Promise.resolve();
  const update = (fn) => (chain = chain.then(async () => {
    const cur = (await chrome.storage.session.get(SESS_KEY))[SESS_KEY] || {};
    const next = fn(cur) || cur;
    await chrome.storage.session.set({ [SESS_KEY]: next });
  }).catch(() => {}));

  // La ventana aparte es una pestaña de una ventana emergente (sender.tab existe): se reconoce por la URL de la página de la extensión.
  const fromWindow = (sender) => sender.id === chrome.runtime.id && typeof sender.url === 'string' && sender.url.startsWith(chrome.runtime.getURL(PAGE));

  function record(m, tab) {
    return {
      tabId: tab.id, title: str(m.title, 200), artist: str(m.artist, 200), host: str(m.host, 100), fav: web(m.fav), art: web(m.art),
      playing: m.playing === true, live: m.live === true, muted: m.muted === true, next: m.next === true, prev: m.prev === true,
      t: num(m.t, 0, 1e9, 0), d: num(m.d, 0, 1e9, 0), rate: num(m.rate, 0.0625, 16, 1), at: Date.now(),
    };
  }

  chrome.runtime.onMessage.addListener((m, sender, reply) => {
    if (!m || sender.id !== chrome.runtime.id) return;
    if (m.type === 'sess' && sender.tab && sender.frameId === 0) {
      const rec = record(m, sender.tab);
      update((s) => {
        s[rec.tabId] = rec;
        const ids = Object.keys(s);
        if (ids.length > MAX_SESSIONS) delete s[ids.sort((a, b) => s[a].at - s[b].at)[0]]; // se descarta la más antigua
        return s;
      });
    } else if (m.type === 'sess-end' && sender.tab) {
      update((s) => { delete s[sender.tab.id]; return s; });
    } else if (m.type === 'rc-cmd' && fromWindow(sender)) {
      if (!Number.isInteger(m.tabId) || typeof m.cmd !== 'string' || !CMD.test(m.cmd)) return;
      chrome.storage.session.get(SESS_KEY).then((r) => {
        if (!((r[SESS_KEY] || {})[m.tabId])) return; // solo pestañas que han informado de un medio
        chrome.tabs.sendMessage(m.tabId, { type: 'rc-cmd', cmd: m.cmd }, { frameId: 0 }).catch(() => update((s) => { delete s[m.tabId]; return s; }));
      });
    } else if (m.type === 'art' && fromWindow(sender)) {
      if (typeof m.url !== 'string' || m.url.length > MAX_URL) { reply({}); return; }
      fetchArtwork(m.url).then((data) => reply({ data }), () => reply({}));
      return true;
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => { update((s) => { delete s[tabId]; return s; }); });

  async function openWindow() {
    const id = (await chrome.storage.session.get(WINID_KEY))[WINID_KEY];
    if (id != null) { try { await chrome.windows.update(id, { focused: true }); return; } catch (_) { /* ya no existe */ } }
    const b = (await chrome.storage.local.get(WIN_KEY))[WIN_KEY];
    const o = { url: chrome.runtime.getURL(PAGE), type: 'popup', width: 380, height: 260 };
    if (b && [b.left, b.top, b.width, b.height].every((v) => Number.isFinite(v))) Object.assign(o, { left: Math.round(b.left), top: Math.round(b.top), width: Math.max(240, Math.round(b.width)), height: Math.max(140, Math.round(b.height)) });
    const w = await chrome.windows.create(o);
    await chrome.storage.session.set({ [WINID_KEY]: w.id });
    await chrome.storage.local.set({ [REMOTE_KEY]: true });
  }
  chrome.windows.onRemoved.addListener(async (id) => {
    if ((await chrome.storage.session.get(WINID_KEY))[WINID_KEY] !== id) return;
    await chrome.storage.session.remove([WINID_KEY, SESS_KEY]);
    await chrome.storage.local.set({ [REMOTE_KEY]: false });
  });
  // Si el navegador se cerró con la ventana abierta, no queda marcada como abierta al arrancar.
  chrome.runtime.onStartup.addListener(() => { chrome.storage.local.set({ [REMOTE_KEY]: false }); });

  self.NMPSess = { openWindow };
})();
