// Página de ajustes (options_ui): diseño con vista previa, salto, difuminado de carátula, visualizador, atajos y ventana aparte.
// Escribe en chrome.storage.local las mismas claves que usa el menú del reproductor; las pestañas abiertas las reciben por storage.onChanged.
(() => {
  const NMP = globalThis.__NMP;
  const { THEME_KEY, PREFS_KEY } = NMP.cfg;
  const CAPTURE_KEY = 'mp_capture';
  const SKIPS = [5, 10, 15, 30];
  const $ = (id) => document.getElementById(id);
  const t = NMP.t;

  document.documentElement.lang = chrome.i18n.getUILanguage();
  document.title = t('optionsTitle');
  document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
  document.querySelectorAll('[data-i18n-label]').forEach((e) => e.setAttribute('aria-label', t(e.dataset.i18nLabel)));

  let theme = 'glass';
  const prefs = { skip: 10, blur: false };
  const saveTheme = (id) => chrome.storage.local.set({ [THEME_KEY]: id });
  const savePrefs = () => chrome.storage.local.set({ [PREFS_KEY]: { ...prefs } });

  // ---- Diseños: cada tarjeta es una vista previa real (plantilla y CSS del diseño) con datos de ejemplo.
  const cards = {}, previews = {};
  for (const id of ['glass', 'noir', 'crt', 'metal'].filter((k) => NMP.skins[k])) {
    const skin = NMP.skins[id];
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'theme'; b.setAttribute('role', 'radio'); b.dataset.id = id;
    const pv = document.createElement('span'); pv.className = 'pv';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = skin.label;
    b.append(pv, nm); $('themes').append(b); cards[id] = b;
    b.addEventListener('click', () => { theme = id; markTheme(); saveTheme(id); });
    const root = pv.attachShadow({ mode: 'closed' });
    root.innerHTML = `<style>${NMP.tokens.css}\n${NMP.css}\n.card { --r: 0px; height: 130px; }</style><div class="card pip show paused sk-${id}" aria-hidden="true" inert>${skin.tpl()}<i class="probe" aria-hidden="true"></i></div>`;
    const set = (sel, text) => root.querySelectorAll(sel).forEach((e) => { e.textContent = text; });
    set('[data-t=title]', t('previewTitle')); set('[data-t=artist]', t('previewArtist'));
    set('[data-v=cur]', '1:24'); set('[data-v=dur]', '3:42'); set('[data-v=cur2]', '01:24'); set('[data-v=dur2]', '03:42');
    root.querySelectorAll('[data-bar] i').forEach((e) => { e.style.width = '38%'; });
    previews[id] = root;
    for (const [family, weight, file] of NMP.fontFiles[id] || []) {
      fetch(chrome.runtime.getURL(`src/fonts/${file}-normal.woff2`)).then((r) => r.arrayBuffer())
        .then((buf) => { const f = new FontFace(family, buf, { weight: String(weight) }); return f.load().then(() => document.fonts.add(f)); }).catch(() => {});
    }
  }
  const markTheme = () => { for (const [id, b] of Object.entries(cards)) b.setAttribute('aria-checked', String(id === theme)); };

  // ---- Salto, difuminado y visualizador
  const skipEl = $('skip');
  for (const s of SKIPS) {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.v = String(s); b.textContent = s + ' s';
    b.addEventListener('click', () => { prefs.skip = s; markSkip(); savePrefs(); });
    skipEl.append(b);
  }
  const markSkip = () => {
    // Los botones de salto de las vistas previas llevan el valor elegido.
    for (const root of Object.values(previews)) {
      root.querySelectorAll('[data-skn]').forEach((e) => { e.textContent = (e.dataset.skn || '') + prefs.skip; });
      root.querySelectorAll('[data-act=back]').forEach((e) => { e.title = t('backTitle', String(prefs.skip)); e.setAttribute('aria-label', t('backLabel', String(prefs.skip))); });
      root.querySelectorAll('[data-act=fwd]').forEach((e) => { e.title = t('fwdTitle', String(prefs.skip)); e.setAttribute('aria-label', t('fwdLabel', String(prefs.skip))); });
    }
    markSkipChips();
  };
  const markSkipChips = () => skipEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.v === String(prefs.skip))));
  $('blur').addEventListener('change', (e) => { prefs.blur = e.target.checked; savePrefs(); });
  $('capture').addEventListener('change', (e) => chrome.storage.local.set({ [CAPTURE_KEY]: e.target.checked }));

  // ---- Acceso a los sitios: permiso opcional de host. El service worker registra los scripts cuando se concede y los retira al revocarlo.
  const ALL = { origins: ['<all_urls>'] };
  const syncAccess = () => chrome.permissions.contains(ALL).then((ok) => { $('access').checked = ok; }, () => {});
  $('access').addEventListener('change', async (e) => {
    try { if (e.target.checked) await chrome.permissions.request(ALL); else await chrome.permissions.remove(ALL); } catch (_) { /* el navegador decide */ }
    syncAccess();
  });
  chrome.permissions.onAdded.addListener(syncAccess); chrome.permissions.onRemoved.addListener(syncAccess);
  syncAccess();

  // ---- Atajos: se muestran los de chrome.commands; cambiarlos se hace en la página del navegador.
  chrome.commands.getAll().then((cmds) => {
    for (const c of cmds) {
      const li = document.createElement('li'), name = document.createElement('span'), kb = document.createElement('kbd');
      name.textContent = c.name === '_execute_action' ? t('actionTitle') : c.description || c.name; kb.textContent = c.shortcut || t('noShortcut');
      li.append(name, kb); $('keys').append(li);
    }
  }).catch(() => {});
  $('edit-keys').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));
  $('open-win').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'open-window' }));

  // ---- Estado inicial y cambios hechos desde otro sitio (menú del icono, menú del reproductor)
  const apply = (r) => {
    if (r[THEME_KEY] && NMP.skins[r[THEME_KEY]]) theme = r[THEME_KEY];
    if (r[PREFS_KEY] && typeof r[PREFS_KEY] === 'object') {
      if (SKIPS.includes(r[PREFS_KEY].skip)) prefs.skip = r[PREFS_KEY].skip;
      prefs.blur = r[PREFS_KEY].blur === true;
    }
    if (CAPTURE_KEY in r) $('capture').checked = r[CAPTURE_KEY] === true;
    $('blur').checked = prefs.blur; markTheme(); markSkip();
  };
  chrome.storage.local.get([THEME_KEY, PREFS_KEY, CAPTURE_KEY], apply);
  chrome.storage.onChanged.addListener((c) => {
    const r = {};
    for (const k of [THEME_KEY, PREFS_KEY, CAPTURE_KEY]) if (c[k]) r[k] = c[k].newValue;
    apply(r);
  });
})();
