// Clic izquierdo: se ejecuta un script en la pestaña desde el propio clic, para que cuente como gesto del usuario
// y el navegador deje abrir la ventana flotante al momento.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id == null) return;
  chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => document.dispatchEvent(new CustomEvent('__mp_toggle')) }).catch(() => {});
});

// Descarga una carátula y la devuelve como data URL: así el canvas del PiP no queda "contaminado" por CORS.
chrome.runtime.onMessage.addListener((m, _sender, reply) => {
  if (!m || m.type !== 'img' || typeof m.url !== 'string') return;
  fetch(m.url)
    .then((r) => r.blob())
    .then((b) => new Promise((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = ko; fr.readAsDataURL(b); }))
    .then((data) => reply({ data }))
    .catch(() => reply({}));
  return true;
});

// Clic derecho en el icono: elegir el tipo de ventana y (para desarrollo) el diseño.
const MODE_KEY = 'mp_mode';
const THEME_KEY = 'mp_theme';
const MODES = { pip: 'Mini · ventana flotante sin marco', win: 'Ventana · flotante con marco y controles', card: 'Tarjeta · dentro de la página' };
const THEMES = { glass: 'Glass (original)', brutal: 'Cyber Brutalismo / Micrographics', pixel: 'Pixel art', retro: 'Retro Cyber' };
const syncMenu = (mode, theme) => {
  const up = (id, checked) => chrome.contextMenus.update(id, { checked }, () => void chrome.runtime.lastError);
  if (mode) for (const id of Object.keys(MODES)) up(id, id === mode);
  if (theme) for (const id of Object.keys(THEMES)) up('th:' + id, id === theme);
};
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    for (const [id, title] of Object.entries(MODES)) chrome.contextMenus.create({ id, type: 'radio', title, contexts: ['action'], checked: id === 'pip' });
    chrome.contextMenus.create({ id: 'sep', type: 'separator', contexts: ['action'] });
    chrome.contextMenus.create({ id: 'themes', title: 'Diseño (desarrollo)', contexts: ['action'] });
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
