importScripts('net-guard.js');
const { isAllowedArtworkUrl, sniffImage, MAX_URL } = self.NMPNet;

// Clic izquierdo: se ejecuta un script en la pestaña desde el propio clic, para que cuente como gesto del usuario
// y el navegador deje abrir la ventana flotante al momento. Corre en el mundo aislado de la extensión (el mismo
// que el content script), así que llama a una función que la página no puede ver ni invocar.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id == null) return;
  chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => { const n = globalThis.__NMP; if (n && typeof n.toggle === 'function') n.toggle(); } }).catch(() => {});
  startCapture(tab.id); // el clic en el icono es el gesto que autoriza la captura (activeTab)
});

// Audio real de la pestaña para el visualizador (opt-in desde el menú del icono). tabCapture da un id de flujo que consume el documento
// offscreen (src/offscreen), que analiza el audio y manda el espectro al content script por un puerto. Sin captura, el visualizador es simulado.
const CAPTURE_KEY = 'mp_capture';
async function startCapture(tabId) {
  try {
    if (!(await chrome.storage.local.get(CAPTURE_KEY))[CAPTURE_KEY]) return;
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
    try { // solo puede haber un documento offscreen: si ya existe, createDocument falla y se reutiliza
      await chrome.offscreen.createDocument({ url: 'src/offscreen/offscreen.html', reasons: ['USER_MEDIA'], justification: 'Analizar el audio de la pestaña para el visualizador' });
    } catch (e) { if (!/single offscreen/i.test(String(e && e.message))) throw e; }
    const r = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'cap-start', tabId, streamId });
    if (r && r.ok) chrome.tabs.sendMessage(tabId, { type: 'viz-connect' }).catch(() => {});
  } catch (_) { /* pestaña no capturable (chrome://, ya capturada...): sigue el visualizador simulado */ }
}

// Descarga una carátula y la devuelve como data URL: así el canvas del PiP no queda "contaminado" por CORS.
// La URL la elige la página, por lo que se restringe a http(s) público (net-guard.js), sin cookies, sin redirecciones,
// con tope de tamaño y de tiempo, y el tipo se decide por los bytes reales de la imagen.
const MAX_ART_BYTES = 5 * 1024 * 1024;
const ART_TIMEOUT_MS = 8000;
const toBase64 = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
async function readCapped(res, max) {
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) { reader.cancel().catch(() => {}); throw new Error('imagen demasiado grande'); }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}
async function fetchArtwork(url) {
  if (!isAllowedArtworkUrl(url)) throw new Error('URL no permitida');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ART_TIMEOUT_MS);
  try {
    const res = await fetch(url, { credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', signal: ctl.signal });
    if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
    if (+res.headers.get('content-length') > MAX_ART_BYTES) throw new Error('imagen demasiado grande');
    const bytes = await readCapped(res, MAX_ART_BYTES);
    const mime = sniffImage(bytes);
    if (!mime) throw new Error('no es una imagen válida');
    return `data:${mime};base64,${toBase64(bytes)}`;
  } finally { clearTimeout(timer); }
}
// Medios en iframes: un agente sin interfaz en cada subframe informa al marco superior, y este le manda órdenes. Los content scripts
// no se ven entre sí, así que el service worker solo reenvía (agente -> marco 0 y marco 0 -> agente), sin salir de la pestaña emisora.
const MAX_FRAME_MSG = 20000;
function relayFrame(m, sender, tabId) {
  if (m.type === 'mp-frame' && sender.frameId > 0 && typeof m.list === 'string' && m.list.length <= MAX_FRAME_MSG) {
    chrome.tabs.sendMessage(tabId, { type: 'mp-frame', frame: sender.frameId, list: m.list }, { frameId: 0 }).catch(() => {});
  } else if (m.type === 'mp-cmd' && sender.frameId === 0 && Number.isInteger(m.frame) && m.frame > 0 && typeof m.cmd === 'string' && m.cmd.length < 40) {
    chrome.tabs.sendMessage(tabId, { type: 'mp-cmd', cmd: m.cmd }, { frameId: m.frame }).catch(() => {});
  }
}
// Fuentes de los diseños: se leen de la propia extensión y se entregan al content script en base64 (no son accesibles desde las páginas).
const FONT_FILE = /^[a-z0-9]+(?:-[a-z0-9]+)*-latin-\d{3}$/;
const fontCache = new Map();
async function readFont(file) {
  if (fontCache.has(file)) return fontCache.get(file);
  const res = await fetch(chrome.runtime.getURL(`src/fonts/${file}-normal.woff2`));
  if (!res.ok) throw new Error('fuente no encontrada');
  const data = toBase64(new Uint8Array(await res.arrayBuffer()));
  fontCache.set(file, data);
  return data;
}
chrome.runtime.onMessage.addListener((m, sender) => {
  if (sender.id === chrome.runtime.id && !sender.tab && m && m.type === 'cap-idle') chrome.offscreen.closeDocument().catch(() => {});
});
const inflight = new Set(); // una descarga a la vez por pestaña
chrome.runtime.onMessage.addListener((m, sender, reply) => {
  const tabId = sender.tab && sender.tab.id;
  if (sender.id !== chrome.runtime.id || tabId == null || !m) return;
  if (m.type === 'mp-frame' || m.type === 'mp-cmd') return void relayFrame(m, sender, tabId);
  if (m.type === 'font') {
    if (typeof m.file !== 'string' || !FONT_FILE.test(m.file)) return;
    readFont(m.file).then((data) => reply({ data }), () => reply({}));
    return true;
  }
  if (m.type !== 'img' || typeof m.url !== 'string' || m.url.length > MAX_URL) return;
  if (inflight.has(tabId)) { reply({}); return; }
  inflight.add(tabId);
  fetchArtwork(m.url).then((data) => reply({ data }), () => reply({})).finally(() => inflight.delete(tabId));
  return true;
});

// Clic derecho en el icono: elegir el tipo de ventana y (para desarrollo) el diseño.
const MODE_KEY = 'mp_mode';
const THEME_KEY = 'mp_theme';
const MODES = { pip: 'Mini · ventana flotante sin marco', win: 'Ventana · flotante con marco y controles', card: 'Tarjeta · dentro de la página' };
const THEMES = { glass: 'Glassware', noir: 'Noir', crt: 'Terminal CRT', metal: 'Liquid Metal' };
const syncMenu = (mode, theme) => {
  const up = (id, checked) => chrome.contextMenus.update(id, { checked }, () => void chrome.runtime.lastError);
  if (mode) for (const id of Object.keys(MODES)) up(id, id === mode);
  if (theme) for (const id of Object.keys(THEMES)) up('th:' + id, id === theme);
};
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    for (const [id, title] of Object.entries(MODES)) chrome.contextMenus.create({ id, type: 'radio', title, contexts: ['action'], checked: id === 'pip' });
    chrome.contextMenus.create({ id: 'sep', type: 'separator', contexts: ['action'] });
    chrome.contextMenus.create({ id: 'cap', type: 'checkbox', title: 'Visualizador con el audio real de la pestaña', contexts: ['action'], checked: false });
    chrome.contextMenus.create({ id: 'themes', title: 'Diseño', contexts: ['action'] });
    for (const [id, title] of Object.entries(THEMES)) chrome.contextMenus.create({ id: 'th:' + id, parentId: 'themes', type: 'radio', title, contexts: ['action'], checked: id === 'glass' });
    chrome.storage.local.get([MODE_KEY, THEME_KEY], (r) => syncMenu((r && r[MODE_KEY]) || 'pip', (r && r[THEME_KEY]) || 'glass'));
  });
});
chrome.contextMenus.onClicked.addListener((info) => {
  const id = String(info.menuItemId);
  if (id === 'cap') { chrome.storage.local.set({ [CAPTURE_KEY]: !!info.checked }); return; }
  if (MODES[id]) chrome.storage.local.set({ [MODE_KEY]: id });
  else if (id.startsWith('th:') && THEMES[id.slice(3)]) chrome.storage.local.set({ [THEME_KEY]: id.slice(3) });
});
chrome.storage.onChanged.addListener((c) => syncMenu(c[MODE_KEY] && c[MODE_KEY].newValue, c[THEME_KEY] && c[THEME_KEY].newValue));
