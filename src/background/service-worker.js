importScripts('net-guard.js');
const { isAllowedArtworkUrl, sniffImage, MAX_URL } = self.NMPNet;

// Clic izquierdo: se ejecuta un script en la pestaña desde el propio clic, para que cuente como gesto del usuario
// y el navegador deje abrir la ventana flotante al momento. Corre en el mundo aislado de la extensión (el mismo
// que el content script), así que llama a una función que la página no puede ver ni invocar.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id == null) return;
  chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => { const n = globalThis.__NMP; if (n && typeof n.toggle === 'function') n.toggle(); } }).catch(() => {});
});

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
const inflight = new Set(); // una descarga a la vez por pestaña
chrome.runtime.onMessage.addListener((m, sender, reply) => {
  const tabId = sender.tab && sender.tab.id;
  if (sender.id !== chrome.runtime.id || tabId == null || !m) return;
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
    chrome.contextMenus.create({ id: 'themes', title: 'Diseño', contexts: ['action'] });
    for (const [id, title] of Object.entries(THEMES)) chrome.contextMenus.create({ id: 'th:' + id, parentId: 'themes', type: 'radio', title, contexts: ['action'], checked: id === 'glass' });
    chrome.storage.local.get([MODE_KEY, THEME_KEY], (r) => syncMenu((r && r[MODE_KEY]) || 'pip', (r && r[THEME_KEY]) || 'glass'));
  });
});
chrome.contextMenus.onClicked.addListener((info) => {
  const id = String(info.menuItemId);
  if (MODES[id]) chrome.storage.local.set({ [MODE_KEY]: id });
  else if (id.startsWith('th:') && THEMES[id.slice(3)]) chrome.storage.local.set({ [THEME_KEY]: id.slice(3) });
});
chrome.storage.onChanged.addListener((c) => syncMenu(c[MODE_KEY] && c[MODE_KEY].newValue, c[THEME_KEY] && c[THEME_KEY].newValue));
