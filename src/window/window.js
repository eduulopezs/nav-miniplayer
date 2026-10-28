// Ventana aparte: reproductor de la extensión que muestra y controla el medio de cualquier pestaña.
// Lee las sesiones que guarda el service worker (chrome.storage.session) y le manda órdenes por mensajes. Reutiliza los diseños de la tarjeta
// (plantilla, CSS, visualizador y layouts por container queries), pero la lógica de enlace con los datos es propia: aquí no hay medios en el DOM.
(() => {
  const NMP = globalThis.__NMP;
  const { fmt, fmt2, pad2, strSeed, barcode, palette, DEFAULT_PAL } = NMP.util;
  const { skins: SK, viz } = NMP;
  const { PREFS_KEY } = NMP.cfg;
  const SESS_KEY = 'mp_sessions', THEME_KEY = 'mp_theme', WIN_KEY = 'mp_win';
  const $ = (id) => document.getElementById(id);
  const STALE_MS = 7000; // las pestañas informan cada 2 s mientras suenan; si callan, se muestra como en pausa

  // ---------- Tarjeta ----------
  const root = $('app').attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${NMP.tokens.css}
${NMP.css}
  .card.wnd { cursor: default; }
  .wnd [data-act=mode], .wnd [data-act=hide] { display: none !important; }
  </style><div class="card pip show wnd" role="region" aria-label="Reproductor" tabindex="0"><div class="toast"></div></div>`;
  const card = root.querySelector('.card');
  const qa = (sel) => card.querySelectorAll(sel);
  card.style.setProperty('--r', '0px');

  // ---------- Estado ----------
  let sessions = {}, sel = null, theme = 'glass', skip = 10;
  let lastKey = '', lastTrack = '', trackNo = 0, lastP = -1, lastArt = '', chipsKey = '';
  const vizCtx = { card, skin: '' };
  const fresh = (s) => Date.now() - s.at < STALE_MS;
  const playingNow = (s) => s.playing && fresh(s);
  const ordered = () => Object.values(sessions).sort((a, b) => (playingNow(b) - playingNow(a)) || b.at - a.at);
  const current = () => (sel != null && sessions[sel]) || ordered()[0] || null;
  const timeOf = (s) => { const t = s.t + (playingNow(s) ? (Date.now() - s.at) / 1000 * s.rate : 0); return s.d > 0 ? Math.min(t, s.d) : t; };

  // ---------- Fuentes: se cargan de la propia extensión ----------
  const fontDone = new Set();
  function loadFonts(skin) {
    for (const [family, weight, file] of NMP.fontFiles[skin] || []) {
      if (fontDone.has(file)) continue;
      fontDone.add(file);
      fetch(chrome.runtime.getURL(`src/fonts/${file}-normal.woff2`)).then((r) => r.arrayBuffer()).then((buf) => {
        const face = new FontFace(family, buf, { weight: String(weight), display: 'swap' });
        return face.load().then(() => document.fonts.add(face));
      }).catch(() => fontDone.delete(file));
    }
  }

  // ---------- Diseño ----------
  function applyTheme(t) {
    if (!SK[t]) t = 'glass';
    if (t === theme && vizCtx.skin === t) return;
    theme = t; vizCtx.skin = t;
    if (vizCtx._ro) { vizCtx._ro.disconnect(); vizCtx._ro = null; }
    vizCtx._kv = vizCtx._lv = undefined;
    for (const n of [...card.children]) if (!n.classList.contains('toast')) n.remove();
    card.classList.forEach((c) => { if (c.startsWith('sk-')) card.classList.remove(c); });
    card.classList.add('sk-' + t);
    card.insertAdjacentHTML('afterbegin', SK[t].tpl() + '<i class="probe" aria-hidden="true"></i>');
    applySkip();
    if (SK[t].setup) SK[t].setup(vizCtx);
    loadFonts(t);
    lastKey = ''; lastP = -1; lastArt = '';
    render();
  }
  function applySkip() {
    qa('[data-skn]').forEach((e) => { e.textContent = (e.dataset.skn || '') + skip; });
    qa('[data-act=back]').forEach((b) => { b.title = `Retroceder ${skip} s`; b.setAttribute('aria-label', `Retroceder ${skip} segundos`); });
    qa('[data-act=fwd]').forEach((b) => { b.title = `Avanzar ${skip} s`; b.setAttribute('aria-label', `Avanzar ${skip} segundos`); });
  }

  // ---------- Carátula y paleta: la descarga el service worker (reglas de red de net-guard) ----------
  const artCache = new Map(); // url -> { data, pal }
  function loadArt(url) {
    if (!url) { setPal(DEFAULT_PAL); card.style.setProperty('--art', 'none'); return; }
    const done = (c) => { if (lastArt !== url) return; card.style.setProperty('--art', `url("${c.data}")`); setPal(c.pal || DEFAULT_PAL); };
    if (artCache.has(url)) return done(artCache.get(url));
    card.style.setProperty('--art', 'none'); setPal(DEFAULT_PAL);
    try {
      chrome.runtime.sendMessage({ type: 'art', url }, (r) => {
        void chrome.runtime.lastError;
        if (!r || typeof r.data !== 'string') return;
        const im = new Image();
        im.onload = () => { const c = { data: r.data, pal: palette(im) }; if (artCache.size > 20) artCache.delete(artCache.keys().next().value); artCache.set(url, c); done(c); };
        im.src = r.data;
      });
    } catch (_) { /* sin background */ }
  }
  const setPal = (p) => p.forEach((c, i) => card.style.setProperty('--c' + (i + 1), c));

  // ---------- Render ----------
  const setTxt = (el, v) => { if (el._t !== v) { el._t = v; el.textContent = v; } };
  function render() {
    const s = current();
    $('empty').hidden = !!s; card.style.display = s ? '' : 'none'; $('go').disabled = !s;
    renderChips();
    if (!s) { viz.setSource(false, 0, 0); return; }
    const key = s.tabId + '\u0001' + s.title + '\u0001' + s.artist + '\u0001' + s.art;
    if (key !== lastKey) {
      lastKey = key;
      if (s.tabId + s.title + s.artist !== lastTrack) { lastTrack = s.tabId + s.title + s.artist; trackNo++; }
      qa('[data-t=title]').forEach((e) => { e.textContent = s.title; e.title = s.title; });
      qa('[data-t=artist]').forEach((e) => { e.textContent = s.artist; e.title = s.artist; });
      qa('[data-t=idx]').forEach((e) => { e.textContent = pad2(trackNo % 100) + '/--'; });
      qa('[data-t=no]').forEach((e) => { e.textContent = pad2(trackNo % 100); });
      card.style.setProperty('--bars', barcode(strSeed(s.title)));
      lastArt = s.art; loadArt(s.art);
    }
    const t = timeOf(s), live = s.live, d = s.d, p = live ? 1 : d > 0 ? Math.min(1, t / d) : 0;
    card.classList.toggle('live-badge', live);
    if (p !== lastP) { lastP = p; card.style.setProperty('--p', p.toFixed(4)); }
    const V = {
      cur: fmt(t), cur2: fmt2(t), curd: fmt2(t).replace(':', '.'), dur: live ? 'LIVE' : fmt(d), dur2: live ? 'LIVE' : fmt2(d), durd: live ? 'LIVE' : '/ ' + fmt(d),
      rem: live ? '--:--' : '-' + fmt(Math.max(0, d - t)), rem2: live ? '--:--' : '-' + fmt2(Math.max(0, d - t)), pct: Math.round(p * 100) + '%',
    };
    qa('[data-v]').forEach((e) => { const x = V[e.dataset.v]; if (x != null) setTxt(e, x); });
    const now = Math.round(p * 100), vt = live ? 'En directo' : fmt(t) + ' de ' + fmt(d);
    qa('[data-bar]').forEach((b) => { if (b._n !== now) { b._n = now; b.setAttribute('aria-valuenow', now); } if (b._vt !== vt) { b._vt = vt; b.setAttribute('aria-valuetext', vt); } });
    const playing = playingNow(s);
    qa('[data-act=play]').forEach((b) => { const l = playing ? 'Pausar' : 'Reproducir'; if (b.title !== l) { b.title = l; b.setAttribute('aria-label', l); } });
    card.classList.toggle('paused', !playing); card.classList.toggle('muted', s.muted);
    qa('[data-act=back],[data-act=fwd]').forEach((b) => { b.disabled = live; });
    qa('[data-act=next]').forEach((b) => { b.disabled = !s.next; });
    qa('[data-act=prev]').forEach((b) => { b.disabled = false; });
    viz.setSource(playing && !s.muted, strSeed(s.title), d || 0);
  }

  // Selector de sesiones: una pastilla por pestaña con su icono y título.
  function renderChips() {
    const list = ordered(), cur = current();
    const key = list.map((s) => `${s.tabId}|${s.title}|${s.fav}|${playingNow(s)}`).join('~') + '#' + (cur && cur.tabId);
    if (key === chipsKey) return;
    chipsKey = key;
    const box = $('chips'); box.replaceChildren();
    for (const s of list) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip' + (playingNow(s) ? '' : ' paused'); b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(!!cur && cur.tabId === s.tabId)); b.title = s.title + ' · ' + s.host;
      const ic = document.createElement('i'); ic.textContent = (s.host[0] || '?').toUpperCase();
      if (s.fav) { const im = document.createElement('img'); im.referrerPolicy = 'no-referrer'; im.alt = ''; im.onload = () => { ic.textContent = ''; ic.append(im); }; im.src = s.fav; }
      const sp = document.createElement('span'); sp.textContent = s.title || s.host;
      b.append(ic, sp);
      b.addEventListener('click', () => { sel = s.tabId; render(); });
      box.append(b);
    }
  }

  // ---------- Órdenes ----------
  const send = (cmd) => { const s = current(); if (s) { try { chrome.runtime.sendMessage({ type: 'rc-cmd', tabId: s.tabId, cmd }); } catch (_) { /* sin background */ } } };
  const ACT = { play: 'toggle', back: 'back', fwd: 'fwd', prev: 'prev', next: 'next', mute: 'mute' };
  card.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (a && !a.disabled && Object.hasOwn(ACT, a.dataset.act)) send(ACT[a.dataset.act]);
  });
  card.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.composedPath()[0].tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
    const s = current();
    if (!s) return;
    if (e.key === ' ' || e.key === 'k') send('toggle');
    else if (e.key === 'ArrowLeft' && !s.live) send('back');
    else if (e.key === 'ArrowRight' && !s.live) send('fwd');
    else return;
    e.preventDefault();
  });
  // Barra de progreso: pulsar o arrastrar busca en el medio de la pestaña.
  const frac = (e, b) => { const r = b.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / Math.max(1, r.width))); };
  card.addEventListener('pointerdown', (e) => {
    const b = e.button === 0 && e.target.closest('[data-bar]'), s = current();
    if (!b || !s || s.live || !s.d) return;
    b.setPointerCapture(e.pointerId); b.classList.add('drag'); send('seek:' + (frac(e, b) * s.d).toFixed(2));
  });
  card.addEventListener('pointermove', (e) => {
    const b = e.target.closest('[data-bar]'), s = current();
    if (!b || !s || s.live || !s.d) return;
    b.title = fmt(frac(e, b) * s.d);
    if (b.classList.contains('drag')) send('seek:' + (frac(e, b) * s.d).toFixed(2));
  });
  const endBar = (e) => { const b = e.target.closest('[data-bar]'); if (b) b.classList.remove('drag'); };
  card.addEventListener('pointerup', endBar); card.addEventListener('pointercancel', endBar);
  // Ir a la pestaña que suena.
  $('go').addEventListener('click', () => {
    const s = current();
    if (s) chrome.tabs.update(s.tabId, { active: true }).then((t) => chrome.windows.update(t.windowId, { focused: true })).catch(() => {});
  });

  // ---------- Datos ----------
  const setSessions = (v) => { sessions = v && typeof v === 'object' ? v : {}; if (sel != null && !sessions[sel]) sel = null; render(); };
  chrome.storage.session.get(SESS_KEY).then((r) => setSessions(r[SESS_KEY]));
  chrome.storage.onChanged.addListener((c, area) => {
    if (area === 'session' && c[SESS_KEY]) setSessions(c[SESS_KEY].newValue);
    if (area === 'local') {
      if (c[THEME_KEY] && c[THEME_KEY].newValue) applyTheme(c[THEME_KEY].newValue);
      if (c[PREFS_KEY] && c[PREFS_KEY].newValue && [5, 10, 15, 30].includes(c[PREFS_KEY].newValue.skip)) { skip = c[PREFS_KEY].newValue.skip; applySkip(); }
    }
  });
  chrome.storage.local.get([THEME_KEY, PREFS_KEY], (r) => {
    if (r && r[PREFS_KEY] && [5, 10, 15, 30].includes(r[PREFS_KEY].skip)) skip = r[PREFS_KEY].skip;
    applyTheme((r && r[THEME_KEY]) || 'glass');
  });
  setInterval(render, 250);
  // Visualizador simulado (la captura de audio es por pestaña y no se usa aquí); solo corre con la ventana visible.
  let vizLast = performance.now();
  setInterval(() => { if (document.hidden) return; const n = performance.now(), dt = Math.min(.05, (n - vizLast) / 1000); vizLast = n; viz.step(dt); viz.draw(vizCtx); }, 33);

  // ---------- Posición y tamaño de la ventana ----------
  let lastB = '';
  const saveBounds = () => {
    const b = { left: window.screenX, top: window.screenY, width: window.outerWidth, height: window.outerHeight }, k = JSON.stringify(b);
    if (k !== lastB) { lastB = k; try { chrome.storage.local.set({ [WIN_KEY]: b }); } catch (_) { /* contexto invalidado */ } }
  };
  setInterval(saveBounds, 2000);
  addEventListener('pagehide', saveBounds);
})();
