importScripts('net-guard.js', 'sessions.js', 'migrate.js', 'injection.js');
const { isAllowedArtworkUrl, isStoryboardUrl, sniffImage, MAX_URL } = self.NMPNet;

// Clic izquierdo: se ejecuta un script en la pestaña desde el propio clic, para que cuente como gesto del usuario
// y el navegador deje abrir la ventana flotante al momento. Corre en el mundo aislado de la extensión (el mismo
// que el content script), así que llama a una función que la página no puede ver ni invocar.
// Si la pestaña no lleva los scripts (sin permiso de host: solo activeTab, concedido por este mismo clic o atajo), se inyectan en ese momento.
const callPlayer = (tabId, method, arg) => {
  const call = (method, arg) => chrome.scripting.executeScript({ target: { tabId }, args: [method, arg ?? null], func: (m, a) => { const n = globalThis.__NMP; if (n && typeof n[m] === 'function') { n[m](a); return true; } return false; } });
  const run = () => call(method, arg);
  // Si la primera ejecución rechaza también se intenta la inyección: si tampoco hay acceso, falla ahí y se registra.
  return run().catch(() => null).then(async (res) => { if (res && res[0] && res[0].result) return; const late = await self.NMPInject.injectInto(tabId); await run(); if (late && !(await chrome.permissions.contains({ origins: ['<all_urls>'] }).catch(() => true))) await call('lateBridge'); }).catch((e) => console.warn('[Nav Miniplayer] no se pudo ejecutar la orden en la pestaña:', (e && e.message) || e));
};
chrome.action.onClicked.addListener((tab) => {
  if (tab.id == null) return;
  callPlayer(tab.id, 'toggle');
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
      await chrome.offscreen.createDocument({ url: 'src/offscreen/offscreen.html', reasons: ['USER_MEDIA'], justification: chrome.i18n.getMessage('offscreenReason') });
    } catch (e) { if (!/single offscreen/i.test(String(e && e.message))) throw e; }
    const r = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'cap-start', tabId, streamId });
    if (r && r.ok) chrome.tabs.sendMessage(tabId, { type: 'viz-connect' }).catch(() => {});
  } catch (e) { const msg = (e && e.message) || String(e);
    console.warn('[Nav Miniplayer] captura de audio no disponible:', msg);
    // Aviso visible en el icono (6 s) para saber por qué no hay captura sin abrir la consola
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#c0392b' }).catch(() => {});
    chrome.action.setBadgeText({ tabId, text: '!' }).catch(() => {});
    chrome.action.setTitle({ tabId, title: chrome.i18n.getMessage('captureUnavailable', msg.slice(0, 160)) }).catch(() => {});
    setTimeout(() => { chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {}); chrome.action.setTitle({ tabId, title: chrome.i18n.getMessage('actionTitle') }).catch(() => {}); }, 6000); /* pestaña no capturable (chrome://, ya capturada...): sigue el visualizador simulado */ }
}

// Atajos de teclado (chrome.commands, configurables en chrome://extensions/shortcuts): se ejecutan sobre la pestaña activa.
// Mostrar/ocultar (_execute_action) lo gestiona onClicked.
const COMMANDS = new Set(['play-pause', 'seek-back', 'seek-fwd', 'prev-track', 'next-track']);
chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'open-window') { self.NMPSess.openWindow(); return; }
  if (!COMMANDS.has(cmd)) return;
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || tab.id == null) return;
    callPlayer(tab.id, 'command', cmd);
  });
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
async function fetchArtwork(url, extra = () => true, ico = false) {
  if (!isAllowedArtworkUrl(url) || !extra(url)) throw new Error('URL no permitida');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ART_TIMEOUT_MS);
  try {
    const res = await fetch(url, { credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', signal: ctl.signal });
    if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
    if (+res.headers.get('content-length') > MAX_ART_BYTES) throw new Error('imagen demasiado grande');
    const bytes = await readCapped(res, MAX_ART_BYTES);
    const mime = sniffImage(bytes, ico);
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
    // Si el marco ya no existe, se vacía su lista en el marco superior para que el medio desaparezca sin esperar a que caduque.
    const frame = m.frame;
    chrome.tabs.sendMessage(tabId, { type: 'mp-cmd', cmd: m.cmd }, { frameId: frame })
      .catch(() => chrome.tabs.sendMessage(tabId, { type: 'mp-frame', frame, list: '[]' }, { frameId: 0 }).catch(() => {}));
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
  if (sender.id !== chrome.runtime.id || sender.tab || !m) return;
  if (m.type === 'cap-idle') chrome.offscreen.closeDocument().catch(() => {});
  else if (m.type === 'open-window' && sender.url === chrome.runtime.getURL('src/options/options.html')) self.NMPSess.openWindow(); // botón de la página de ajustes
});
const inflight = new Set(); // una descarga a la vez por pestaña
const inflightSb = new Set(); // ídem para las hojas del storyboard
chrome.runtime.onMessage.addListener((m, sender, reply) => {
  const tabId = sender.tab && sender.tab.id;
  if (sender.id !== chrome.runtime.id || tabId == null || !m) return;
  if (m.type === 'mp-frame' || m.type === 'mp-cmd') return void relayFrame(m, sender, tabId);
  if (m.type === 'open-window') return void self.NMPSess.openWindow(); // la pestaña lo pide cuando no puede abrir la ventana con marco
  if (m.type === 'font') {
    if (typeof m.file !== 'string' || !FONT_FILE.test(m.file)) return;
    readFont(m.file).then((data) => reply({ data }), () => reply({}));
    return true;
  }
  if (m.type === 'sb') {
    if (typeof m.url !== 'string' || m.url.length > MAX_URL) return;
    if (inflightSb.has(tabId)) { reply({ busy: true }); return; }
    inflightSb.add(tabId);
    fetchArtwork(m.url, isStoryboardUrl).then((data) => reply({ data }), () => reply({})).finally(() => inflightSb.delete(tabId));
    return true;
  }
  if (m.type !== 'img' || typeof m.url !== 'string' || m.url.length > MAX_URL) return;
  if (inflight.has(tabId)) { reply({}); return; }
  inflight.add(tabId);
  fetchArtwork(m.url).then((data) => reply({ data }), () => reply({})).finally(() => inflight.delete(tabId));
  return true;
});

// Clic derecho en el icono: captura de audio, ventana aparte y (para desarrollo) el diseño.
const THEME_KEY = 'mp_theme';
const THEMES = { glass: 'themeGlass', noir: 'themeNoir', crt: 'themeCrt', metal: 'themeMetal', minimal: 'themeMinimal', ansi: 'themeAnsi' };
const syncMenu = (theme, capture) => {
  const up = (id, checked) => chrome.contextMenus.update(id, { checked }, () => void chrome.runtime.lastError);
  if (theme) for (const id of Object.keys(THEMES)) up('th:' + id, id === theme);
  if (typeof capture === 'boolean') up('cap', capture);
};
// El menú se reconstruye al instalar y al arrancar para que siga el idioma del navegador y los ajustes guardados.
const buildMenu = async () => {
  await self.NMPMigrate.migrate().catch((e) => console.warn('[Nav Miniplayer] migración de ajustes fallida:', e));
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'cap', type: 'checkbox', title: chrome.i18n.getMessage('ctxCapture'), contexts: ['action'], checked: false });
    chrome.contextMenus.create({ id: 'win', title: chrome.i18n.getMessage('ctxWindow'), contexts: ['action'] });
    chrome.contextMenus.create({ id: 'themes', title: chrome.i18n.getMessage('design'), contexts: ['action'] });
    for (const [id, key] of Object.entries(THEMES)) chrome.contextMenus.create({ id: 'th:' + id, parentId: 'themes', type: 'radio', title: chrome.i18n.getMessage(key), contexts: ['action'], checked: id === 'glass' });
    chrome.contextMenus.create({ id: 'settings', title: chrome.i18n.getMessage('ctxSettings'), contexts: ['action'] });
    chrome.storage.local.get([THEME_KEY, CAPTURE_KEY], (r) => syncMenu((r && r[THEME_KEY]) || 'glass', !!(r && r[CAPTURE_KEY])));
  });
};
chrome.runtime.onInstalled.addListener(buildMenu);
chrome.runtime.onStartup.addListener(buildMenu);

// Scripts de las páginas: se registran para los orígenes concedidos (permisos opcionales). Se reconcilian en cada arranque del worker
// (nivel superior: cubre instalar y arrancar sin depender de onInstalled/onStartup) y cuando el usuario concede o retira un permiso.
// Al conceder, las pestañas ya abiertas reciben los scripts en el momento.
const reconcile = () => self.NMPInject.reconcile().catch((e) => console.warn('[Nav Miniplayer] registro de scripts fallido:', e));
const initialReconcile = reconcile();
chrome.runtime.onInstalled.addListener(async (d) => {
  await initialReconcile;
  // Sin permiso de host se abre Ajustes, donde está el interruptor "Acceso a los sitios": en una instalación nueva y al actualizar desde
  // antes de 1.15.0, donde Chrome pudo no conservar el permiso y el reproductor dejaría de cargar en todos los sitios sin aviso.
  if (self.NMPInject.promptsAccess(d) && !(await chrome.permissions.contains({ origins: ['<all_urls>'] }).catch(() => true))) chrome.runtime.openOptionsPage().catch(() => {});
});
chrome.permissions.onAdded.addListener(async (p) => { await reconcile(); if (p.origins && p.origins.length) self.NMPInject.injectOpen(p.origins).catch(() => {}); });
chrome.permissions.onRemoved.addListener(reconcile);
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const id = String(info.menuItemId);
  if (id === 'win') { self.NMPSess.openWindow(); return; }
  if (id === 'settings') { chrome.runtime.openOptionsPage(); return; }
  if (id === 'cap') { // el clic en el menú también es un gesto del usuario: al activarla se captura ya la pestaña actual
    await chrome.storage.local.set({ [CAPTURE_KEY]: !!info.checked });
    if (info.checked && tab && tab.id != null) startCapture(tab.id);
    return;
  }
  if (id.startsWith('th:') && THEMES[id.slice(3)]) chrome.storage.local.set({ [THEME_KEY]: id.slice(3) });
});
chrome.storage.onChanged.addListener((c) => syncMenu(c[THEME_KEY] && c[THEME_KEY].newValue, c[CAPTURE_KEY] ? c[CAPTURE_KEY].newValue === true : undefined));
