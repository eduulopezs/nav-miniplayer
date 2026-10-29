(() => {
  if (window.top !== window || window.__glassMiniPlayer) return;
  window.__glassMiniPlayer = true;

  const NMP = globalThis.__NMP;
  const { MIN_DURATION, REMOTE_KEY, THEME_KEY, INPAGE_KEY, PREFS_KEY, VOL_KEY, SITE_BUTTONS } = NMP.cfg;
  const { clamp, fmt, fmt2, pad2, strSeed, barcode, palette, DEFAULT_PAL } = NMP.util;
  const HOST_CSS = 'all:initial;position:fixed;right:24px;bottom:24px;z-index:2147483647;';
  const { skins: SK, viz, media: MEDIA } = NMP;

  // ---------- DOM ----------
  const host = document.createElement('div');
  host.id = 'glass-mini-player-host';
  host.style.cssText = HOST_CSS;
  const root = host.attachShadow({ mode: 'closed' }); // cerrado: la página no puede leer ni tocar el reproductor 

  root.innerHTML = `
<style>
${NMP.tokens.css}
${NMP.css}
${NMP.menuCss}
</style>
<div class="card" role="region" aria-label="${NMP.t('region')}" tabindex="0" aria-keyshortcuts="Space ArrowLeft ArrowRight Escape">
  <div class="toast" role="status" aria-live="polite"></div>
  <div class="sb" aria-hidden="true"><i></i><b></b></div>
</div>`;

  const $ = (s) => root.querySelector(s);
  const card = $('.card'), toastEl = $('.toast'), sbEl = $('.sb');
  const qa = (sel) => card.querySelectorAll(sel);

  // ---------- Estado ----------
  let media = null, lastPlayed = null, dismissed = true, actions = new Set();
  // Solo para las pruebas: con mp_inpage la tarjeta también se pinta en la página (en producción solo vive en la ventana flotante).
  let inpage = false;
  const setInpage = (on) => { inpage = on; render(); };
  let lastKey = '', lastKeyHadArt = false, lastPlaying = null, pip = false, curTitle = '', curArtist = '', curImg = '', lastTrack = '', trackNo = 0;
  let theme = 'glass';
  // Diseño activo: cada diseño trae su plantilla, su CSS y su visualizador (skins/*.js). Los nombres antiguos se reasignan al más parecido.
  const LEGACY = { brutal: 'noir', retro: 'crt', pixel: 'glass' };
  const vizCtx = { card, skin: '' };
  let fontSkin = '';
  function applyTheme(t) {
    t = LEGACY[t] || t;
    if (!SK[t]) t = 'glass';
    if (t === theme && vizCtx.skin === t) return;
    theme = t; vizCtx.skin = t;
    if (vizCtx._ro) { vizCtx._ro.disconnect(); vizCtx._ro = null; }
    vizCtx._kv = vizCtx._lv = undefined;
    for (const n of [...card.children]) if (!n.classList.contains('toast') && n !== sbEl) n.remove();
    card.classList.forEach((c) => { if (c.startsWith('sk-')) card.classList.remove(c); });
    card.classList.add('sk-' + t);
    card.insertAdjacentHTML('afterbegin', SK[t].tpl() + '<i class="probe" aria-hidden="true"></i>');
    applySkip();
    if (SK[t].setup) SK[t].setup(vizCtx);
    fontSkin = ''; // se cargan al mostrarse, no al arrancar la página
    lastKey = ''; lastKeyHadArt = false; lastPlaying = null; lastP = -1; // la plantilla es nueva: se vuelve a rellenar todo
    render();
  }


  document.addEventListener('play', (e) => { if (e.target instanceof HTMLMediaElement) { lastPlayed = e.target; } }, true);
  // El puente corre en el mundo de la página, así que lo que anuncia puede estar falseado: solo se aceptan nombres conocidos.
  const KNOWN_ACTIONS = new Set(['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack', '@pip']);
  document.addEventListener('__mp_actions', (e) => { actions = new Set(String(e.detail).split(',').filter((n) => KNOWN_ACTIONS.has(n))); });
  // Opcional: al empezar a sonar un medio, la tarjeta se muestra sola (si estaba oculta).
  // Medios fuera del alcance del documento (sin insertar, en un shadow DOM): el puente manda su estado y recibe las órdenes.
  const remotePlay = (m) => { lastPlayed = m; scanDirty = true; };
  document.addEventListener('__mp_media', (e) => MEDIA.ingest('p', e.detail, send, remotePlay));
  // Medios en iframes: los agentes de los subframes informan por el service worker, que también les lleva las órdenes.
  try {
    chrome.runtime.onMessage.addListener((m, sender) => {
      if (sender.id !== chrome.runtime.id || !m || m.type !== 'mp-frame' || !Number.isInteger(m.frame) || m.frame < 1) return;
      const antes = MEDIA.remotes().length;
      MEDIA.ingest('f' + m.frame, m.list, (cmd) => { try { chrome.runtime.sendMessage({ type: 'mp-cmd', frame: m.frame, cmd }); } catch (_) { /* contexto invalidado */ } }, remotePlay);
      if (MEDIA.remotes().length !== antes) scanDirty = true; // el latido del agente no debe forzar un reescaneo cada vez
    });
  } catch (_) { /* contexto invalidado */ }
  document.dispatchEvent(new CustomEvent('__mp_query'));

  // Registro de medios: se reescanea solo cuando un medio avisa (play, carga, fin...) o, como máximo, una vez por segundo.
  let scanAt = 0, scanDirty = true, picked = null;
  ['play', 'pause', 'ended', 'loadedmetadata', 'loadeddata', 'durationchange', 'emptied'].forEach((ev) => document.addEventListener(ev, () => { scanDirty = true; }, true));
  function pickMedia() {
    const now = performance.now();
    if (!scanDirty && now - scanAt < 1000 && (!picked || picked.isConnected)) return picked;
    scanDirty = false; scanAt = now;
    return (picked = scanMedia());
  }
  function scanMedia() {
    MEDIA.expire();
    const list = [...document.querySelectorAll('video,audio'), ...MEDIA.remotes()].filter((m) => MEDIA.usable(m, MIN_DURATION));
    return MEDIA.pick(list, lastPlayed);
  }


  // La carátula la decide la página: solo se admiten http(s), blob e imágenes en data URL.
  const safeArt = (src) => (typeof src === 'string' && /^(https?:|blob:|data:image\/(png|jpe?g|gif|webp|avif);)/i.test(src) ? src : '');
  function bestArtwork(md) {
    if (md && md.artwork && md.artwork.length) {
      const size = (a) => parseInt(String(a.sizes || '').split(/[x\s]/)[0], 10) || 0;
      return safeArt([...md.artwork].sort((a, b) => size(b) - size(a))[0].src);
    }
    if (media && media.poster) return safeArt(media.poster);
    const yt = /[?&]v=([\w-]{11})/.exec(location.href);
    if (yt && /youtube\.com$/.test(location.hostname)) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
    return '';
  }

  const siteBtn = {}; // kind -> { el, at }: se busca como mucho una vez por segundo
  const shown = (el) => !!el && el.isConnected && el.offsetParent !== null;
  function findSiteButton(kind) {
    const c = siteBtn[kind], now = performance.now();
    if (c && now - c.at < 1000 && (!c.el || shown(c.el))) return c.el;
    let found = null;
    for (const sel of SITE_BUTTONS[kind]) {
      const el = document.querySelector(sel);
      if (shown(el)) { found = el; break; }
    }
    siteBtn[kind] = { el: found, at: now };
    return found;
  }

  let pipAsked = false; // la ventana con marco solo se acepta como abierta si la extensión la pidió: la página no puede fingirlo
  const send = (name) => { if (name === '__pip') pipAsked = true; document.dispatchEvent(new CustomEvent('__mp_cmd', { detail: name })); };

  // ---------- Acciones ----------
  const seekTo = (t) => {
    if (!media || !isFinite(media.duration)) return;
    t = Math.max(0, Math.min(media.duration, t));
    if (media.seek) media.seek(t); else media.currentTime = t; // los remotos mandan la orden al puente
  };

  // skip: segundos de los saltos.
  const prefs = { skip: 10, blur: false };
  let volByHost = {}; // volumen recordado por sitio
  const HOST_KEY = location.hostname;
  const applyPrefs = (v) => {
    if (!v || typeof v !== 'object') return;
    if ([5, 10, 15, 30].includes(v.skip)) prefs.skip = v.skip;
    if (typeof v.blur === 'boolean') prefs.blur = v.blur;
    applySkip();
  };
  const setPref = (k, v) => { prefs[k] = v; applySkip(); try { chrome.storage.local.set({ [PREFS_KEY]: { ...prefs } }); } catch (_) { /* contexto invalidado */ } };
  // Los botones de salto de cada diseño muestran los segundos (data-skn) y los dicen en su etiqueta.
  function applySkip() {
    const n = prefs.skip;
    card.classList.toggle('cov-blur', prefs.blur);
    qa('[data-act=cover]').forEach((b) => b.setAttribute('aria-pressed', String(prefs.blur)));
    qa('[data-skn]').forEach((e) => { e.textContent = (e.dataset.skn || '') + n; });
    qa('[data-act=back]').forEach((b) => { b.title = NMP.t('backTitle', String(n)); b.setAttribute('aria-label', NMP.t('backLabel', String(n))); });
    qa('[data-act=fwd]').forEach((b) => { b.title = NMP.t('fwdTitle', String(n)); b.setAttribute('aria-label', NMP.t('fwdLabel', String(n))); });
  }
  let toastT = 0;
  function toast(text) {
    toastEl.textContent = text; card.classList.add('tst');
    clearTimeout(toastT); toastT = setTimeout(() => card.classList.remove('tst'), 1100);
  }
  // Volumen y velocidad solo existen en medios del DOM; los remotos (sin insertar, iframes) no los exponen.
  const tunable = () => !!media && !media.seek && 'volume' in media;
  function setVolume(v) {
    if (!tunable()) return;
    v = clamp(v, 0, 1);
    media.volume = v; media.muted = v === 0;
    volByHost[HOST_KEY] = Math.round(v * 100) / 100;
    try { const keys = Object.keys(volByHost); if (keys.length > 200) delete volByHost[keys[0]]; chrome.storage.local.set({ [VOL_KEY]: volByHost }); } catch (_) { /* contexto invalidado */ }
  }
  const setRate = (r) => { if (tunable()) media.playbackRate = clamp(r, 0.25, 4); };
  const volApplied = new WeakSet();

  // Todas las acciones salen de [data-act] (cada diseño pone sus botones donde quiere); el clic se resuelve aquí.
  const ACT = {
    play() { if (!media) return; media.paused ? media.play().catch(() => {}) : media.pause(); },
    back() { if (media) seekTo(media.currentTime - prefs.skip); },
    fwd() { if (media) seekTo(media.currentTime + prefs.skip); },
    prev() {
      if (!media) return;
      if (media.currentTime > 3 || (!actions.has('previoustrack') && !findSiteButton('prev'))) return seekTo(0);
      if (actions.has('previoustrack')) send('previoustrack'); else findSiteButton('prev').click();
    },
    next() { if (actions.has('nexttrack')) send('nexttrack'); else findSiteButton('next')?.click(); },
    cover() { setPref('blur', !prefs.blur); },
    mute() { if (media) { media.muted = !media.muted; if (!media.muted && media.volume === 0) setVolume(0.5); render(); } }, // salir del silencio desde 0 % no deja el medio mudo
    hide() { if (pip) send('__pip'); else { dismissed = true; render(); } },
  };
  card.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]'), fn = a && !a.disabled && Object.hasOwn(ACT, a.dataset.act) && ACT[a.dataset.act];
    if (fn) { fn(); render(); if (a.dataset.act === 'back' || a.dataset.act === 'fwd') restart(a, 'nudge'); }
  });
  // Reinicia una animación de un solo uso: quita la clase, fuerza el reflujo y la vuelve a poner.
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); el.addEventListener('animationend', () => el.classList.remove(cls), { once: true }); };

  // Teclado con el reproductor enfocado (Tab): Espacio/K play-pausa, ←/→ ±salto, Esc oculta.
  // Sobre un botón, Espacio/Intro los gestiona el propio botón.
  card.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !media) return;
    const tag = e.composedPath()[0].tagName;
    if (tag === 'INPUT' && /^(Arrow|Home$|End$|Page)/.test(e.key)) return; // el regulador de volumen se maneja con estas teclas
    const onButton = tag === 'BUTTON'; // sin instanceof: en la ventana flotante es otro documento
    if ((e.key === ' ' || e.key === 'Enter') && onButton) return;
    const live = media.duration === Infinity;
    if (e.key === ' ' || e.key === 'k') ACT.play();
    else if (e.key === 'ArrowLeft' && !live) ACT.back();
    else if (e.key === 'ArrowRight' && !live) ACT.fwd();
    else if (e.key === 'Escape') ACT.hide();
    else return;
    e.preventDefault(); e.stopPropagation(); render();
  });

  // ---------- Menú, rueda y atajos ----------
  const timeUrl = () => {
    const t = Math.floor(media.currentTime || 0);
    try {
      const u = new URL(location.href);
      if (/(^|\.)youtube\.com$/.test(u.hostname) || u.hostname === 'youtu.be') u.searchParams.set('t', t + 's');
      else if (/(^|\.)vimeo\.com$/.test(u.hostname)) u.hash = 't=' + t + 's';
      return u.href;
    } catch (_) { return location.href; }
  };
  const menu = NMP.createMenu({
    root, host, card, prefs, setPref, getMedia: () => media, tunable, setVolume, setRate,
    themes: Object.entries(SK).map(([id, k]) => [id, k.label]),
    getTheme: () => theme,
    setTheme(id) { try { chrome.storage.local.set({ [THEME_KEY]: id }); } catch (_) { applyTheme(id); } },
    copyLink() {
      if (!media) return;
      navigator.clipboard.writeText(timeUrl()).then(() => toast(NMP.t('copied')), () => toast(NMP.t('copyFailed')));
    },
    isPip: () => pip,
  });
  card.addEventListener('contextmenu', (e) => { if (media && menu.open()) e.preventDefault(); });
  // Regulador de volumen de la tarjeta: mismo camino que la rueda y el menú (recuerda el volumen por sitio).
  card.addEventListener('input', (e) => {
    const r = e.target.closest && e.target.closest('[data-vol]');
    if (!r) return;
    setVolume(+r.value / 100); render(); if (menu.isOpen()) menu.sync();
  });
  // Rueda sobre la tarjeta: volumen en pasos de 5 %.
  card.addEventListener('wheel', (e) => {
    if (!tunable()) return;
    e.preventDefault();
    const v = clamp(Math.round(((media.muted ? 0 : media.volume) + (e.deltaY < 0 ? .05 : -.05)) * 100) / 100, 0, 1);
    setVolume(v); toast(NMP.t('volumeToast', String(Math.round(v * 100)))); if (menu.isOpen()) menu.sync();
  }, { passive: false });
  // Atajos globales (chrome.commands): los lanza el service worker sobre la pestaña activa.
  const COMMANDS = { 'play-pause': 'play', 'seek-back': 'back', 'seek-fwd': 'fwd', 'next-track': 'next', 'prev-track': 'prev' };
  NMP.command = (name) => {
    const act = Object.hasOwn(COMMANDS, name) && ACT[COMMANDS[name]];
    if (!act) return;
    media = pickMedia();
    if (!media) return;
    act(); render();
  };

  // ---------- Ventana aparte (#16) ----------
  // Mientras la ventana aparte de la extensión está abierta (mp_remote), esta pestaña informa de su medio al service worker y obedece sus
  // órdenes. Sin ventana no se informa de nada: no hay temporizador ni mensajes.
  let remoteOn = false, repT = 0, repKey = '';
  const favicon = () => { const l = document.querySelector('link[rel~="icon"]'); try { return l ? new URL(l.getAttribute('href'), location.href).href : new URL('/favicon.ico', location.href).href; } catch (_) { return ''; } };
  function report(force) {
    if (!remoteOn) return;
    const m = pickMedia();
    if (!m) { if (repKey) { repKey = ''; try { chrome.runtime.sendMessage({ type: 'sess-end' }); } catch (_) { /* sin background */ } } return; }
    const md = navigator.mediaSession && navigator.mediaSession.metadata;
    const prevMedia = media; media = m; const art = bestArtwork(md); media = prevMedia; // bestArtwork mira el medio activo para el póster
    const msg = {
      type: 'sess', title: (md && md.title) || document.title || location.hostname, artist: (md && (md.artist || md.album)) || location.hostname.replace(/^www\./, ''),
      host: location.hostname.replace(/^www\./, ''), fav: favicon(), art: /^https?:/i.test(art) ? art : '',
      playing: !m.paused && !m.ended, live: m.duration === Infinity, d: isFinite(m.duration) ? m.duration : 0, t: m.currentTime || 0, rate: m.playbackRate || 1, muted: !!m.muted,
      next: actions.has('nexttrack') || !!findSiteButton('next'), prev: actions.has('previoustrack') || !!findSiteButton('prev'),
    };
    const key = JSON.stringify([msg.title, msg.artist, msg.art, msg.playing, msg.live, Math.round(msg.d), msg.muted, msg.next, msg.prev, msg.rate]);
    if (!force && key === repKey && !msg.playing) return; // parado y sin cambios: nada que decir
    repKey = key;
    try { chrome.runtime.sendMessage(msg); } catch (_) { /* sin background */ }
  }
  let repQ = 0;
  const schedReport = () => { if (remoteOn && !repQ) repQ = setTimeout(() => { repQ = 0; report(true); }, 50); };
  function setRemote(on) {
    if (on === remoteOn) return;
    remoteOn = on;
    clearInterval(repT); repT = 0; repKey = '';
    if (on) { repT = setInterval(() => report(false), 2000); report(true); }
  }
  ['play', 'pause', 'ended', 'loadedmetadata', 'durationchange', 'seeked', 'ratechange', 'volumechange'].forEach((ev) => document.addEventListener(ev, schedReport, true));
  window.addEventListener('pagehide', () => { if (remoteOn && repKey) { try { chrome.runtime.sendMessage({ type: 'sess-end' }); } catch (_) { /* sin background */ } } });
  // Órdenes de la ventana aparte (por el service worker): solo nombres conocidos; actúan sobre el medio que esta pestaña mostraría.
  const RC = /^(play|pause|toggle|back|fwd|prev|next|mute|seek:(\d{1,9}(?:\.\d+)?))$/;
  try {
    chrome.runtime.onMessage.addListener((m, sender) => {
      if (sender.id !== chrome.runtime.id || sender.tab || !m || m.type !== 'rc-cmd' || typeof m.cmd !== 'string') return;
      const c = RC.exec(m.cmd);
      if (!c) return;
      media = pickMedia();
      if (!media) return;
      if (c[1] === 'play') { if (media.paused) media.play().catch(() => {}); }
      else if (c[1] === 'pause') media.pause();
      else if (c[2] != null) seekTo(+c[2]);
      else ACT[c[1] === 'toggle' ? 'play' : c[1]]();
      render(); schedReport();
    });
  } catch (_) { /* sin background */ }

  // Ventana flotante con marco (Document PiP): la abre el puente y mueve aquí el host. Si no se puede abrir, se usa la ventana aparte (#16).
  const openWindowFallback = () => { try { chrome.runtime.sendMessage({ type: 'open-window' }); } catch (_) { /* sin background */ } };
  document.addEventListener('__mp_pip', (e) => {
    const d = String(e.detail);
    if (d === 'closed' ? !pip : !pipAsked || !(d === 'open' || d.startsWith('error:'))) return; // evento no pedido o falso
    pipAsked = false;
    if (d === 'open') {
      pip = true;
      host.style.cssText = 'all:initial;position:fixed;inset:0;';
      card.classList.add('pip');
    } else if (d === 'closed') {
      pip = false; dismissed = true;
      card.classList.remove('pip');
      host.style.cssText = HOST_CSS;
      (document.body || document.documentElement).append(host);
    } else openWindowFallback();
    render();
  });

  // Clic izquierdo en el icono: abre o cierra la ventana flotante; sin Document PiP, abre la ventana aparte.
  NMP.toggle = () => { // lo invoca el service worker desde el mundo aislado; la página no puede alcanzarlo
    if (pip) return send('__pip');
    if (inpage) { dismissed = !dismissed; return render(); }
    if (actions.has('@pip')) send('__pip'); else openWindowFallback();
  };


  // ---------- Render ----------
  // Solo hay trabajo (y temporizador) mientras algo se ve: la ventana flotante o, en las pruebas, la tarjeta en la página.
  const isActive = () => pip || (inpage && !dismissed && !document.hidden);
  let loop = 0;
  const sleep = () => { if (loop) { clearInterval(loop); loop = 0; } vizStop(); };
  const setTxt = (el, v) => { if (el._t !== v) { el._t = v; el.textContent = v; } };

  // Visualizador: un temporizador propio (~30 fps, ~10 con movimiento reducido) que solo corre mientras la tarjeta se ve.
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let vizT = 0, vizLast = 0;
  function vizTick() {
    const n = performance.now();
    if (reduceMotion.matches && n - vizLast < 100) return;
    const dt = Math.min(.05, (n - vizLast) / 1000); vizLast = n;
    viz.step(dt); viz.draw(vizCtx);
  }
  // Audio real: si el service worker ha activado la captura de esta pestaña, el espectro llega por un puerto mientras el reproductor se ve.
  let vizPort = null;
  function vizConnect() {
    if (vizPort) return;
    try {
      const port = chrome.runtime.connect({ name: 'viz' });
      port.onMessage.addListener((m) => { if (m && Array.isArray(m.f) && Array.isArray(m.t)) viz.feed(Uint8Array.from(m.f), Uint8Array.from(m.t), +m.r || 48000); });
      port.onDisconnect.addListener(() => { void chrome.runtime.lastError; if (vizPort === port) vizPort = null; });
      vizPort = port;
    } catch (_) { /* sin background */ }
  }
  const vizDisconnect = () => { if (vizPort) { try { vizPort.disconnect(); } catch (_) { /* ya cerrado */ } vizPort = null; } };
  let wantViz = false, vizPending = 0; // vizPending: el aviso de conexión puede llegar antes de que el reproductor se muestre
  try { chrome.runtime.onMessage.addListener((m, sender) => { if (sender.id === chrome.runtime.id && !sender.tab && m && m.type === 'viz-connect') { if (wantViz) vizConnect(); else vizPending = Date.now(); } }); } catch (_) { /* sin background */ }
  const vizStart = () => { if (!vizT) { vizLast = performance.now(); vizT = setInterval(vizTick, 33); } };
  function vizStop() { wantViz = false; vizDisconnect(); if (vizT) { clearInterval(vizT); vizT = 0; } }

  // Paleta de la carátula: tiñe los diseños (--c1..--c3). Sin carátula, o si no se puede leer, la de por defecto.
  const setPalette = (p) => p.forEach((c, i) => card.style.setProperty('--c' + (i + 1), c));
  function loadPalette(src) {
    setPalette(DEFAULT_PAL);
    if (!src) return;
    const done = (im) => { if (curImg !== src) return; const p = palette(im, NMP.tokens.theme[theme]['bg-b']); if (p) setPalette(p); };
    const load = (u, cors, fail) => { const im = new Image(); if (cors) im.crossOrigin = 'anonymous'; im.onload = () => done(im); im.onerror = fail; im.src = u; };
    load(src, true, () => {
      try { chrome.runtime.sendMessage({ type: 'img', url: src }, (r) => { void chrome.runtime.lastError; if (r && r.data) load(r.data, false, () => {}); }); } catch (_) { /* sin background */ }
    });
  }

  let lastP = -1;
  function render() {
    if (!isActive()) { sleep(); card.classList.remove('show'); return; }
    if (!loop) loop = setInterval(render, 250);
    media = pickMedia();
    const visible = pip || (inpage && !!media && !dismissed && !document.fullscreenElement);
    card.classList.toggle('show', visible);
    if (visible) {
      if (!wantViz) { wantViz = true; if (vizPending && Date.now() - vizPending < 4000) vizConnect(); }
      vizPending = 0; vizStart();
      if (fontSkin !== theme) { const t = fontSkin = theme; NMP.loadFonts(t, () => { if (theme === t) requestAnimationFrame(layout); }); }
      if (host.ownerDocument !== document) NMP.syncFonts(host.ownerDocument);
    } else { vizStop(); menu.close(); }
    // Volumen recordado del sitio: se aplica una vez a cada medio la primera vez que el reproductor lo muestra.
    if (visible && tunable() && !volApplied.has(media)) { volApplied.add(media); const v = volByHost[HOST_KEY]; if (typeof v === 'number' && v >= 0 && v <= 1) { media.volume = v; } }
    if (!media) return;

    const md = navigator.mediaSession && navigator.mediaSession.metadata;
    const title = (md && md.title) || document.title || location.hostname;
    const artist = (md && (md.artist || md.album)) || location.hostname.replace(/^www\./, '');
    const img = bestArtwork(md);
    const key = title + '\u0001' + artist + '\u0001' + img;
    if (key !== lastKey) {
      const imgChanged = img !== curImg || !lastKey;
      lastKey = key;
      curTitle = title; curArtist = artist; curImg = img;
      if (title + artist !== lastTrack) { lastTrack = title + artist; trackNo++; }
      qa('[data-t=title]').forEach((e) => { e.textContent = title; e.title = title; });
      qa('[data-t=artist]').forEach((e) => { e.textContent = artist; e.title = artist; });
      qa('[data-t=idx]').forEach((e) => { e.textContent = pad2(trackNo % 100) + '/--'; });
      qa('[data-t=no]').forEach((e) => { e.textContent = pad2(trackNo % 100); });
      const url = img ? `url("${img.replace(/["\\\n\r]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))}")` : 'none';
      card.style.setProperty('--art', url);
      card.style.setProperty('--bars', barcode(strSeed(title)));
      if (imgChanged) { loadPalette(img); if (lastKeyHadArt) restart(card, 'swap'); }
      if (img) lastKeyHadArt = true;
    }

    const live = media.duration === Infinity, dur = isFinite(media.duration) ? media.duration : 0, ct = media.currentTime || 0;
    card.classList.toggle('live-badge', live);
    const p = live ? 1 : dur > 0 ? Math.min(1, ct / dur) : 0;
    if (p !== lastP) { lastP = p; card.style.setProperty('--p', p.toFixed(4)); }
    const V = {
      cur: fmt(ct), cur2: fmt2(ct), curd: fmt2(ct).replace(':', '.'), dur: live ? 'LIVE' : fmt(dur), dur2: live ? 'LIVE' : fmt2(dur), durd: live ? 'LIVE' : '/ ' + fmt(dur),
      rem: live ? '--:--' : '-' + fmt(Math.max(0, dur - ct)), rem2: live ? '--:--' : '-' + fmt2(Math.max(0, dur - ct)), pct: Math.round(p * 100) + '%',
    };
    qa('[data-v]').forEach((e) => { const t = V[e.dataset.v]; if (t != null) setTxt(e, t); });
    const now = Math.round(p * 100), vt = live ? NMP.t('live') : NMP.t('timeOf', [fmt(ct), fmt(dur)]);
    qa('[data-bar]').forEach((b) => { if (b._n !== now) { b._n = now; b.setAttribute('aria-valuenow', now); } if (b._vt !== vt) { b._vt = vt; b.setAttribute('aria-valuetext', vt); } });

    const playing = !media.paused && !media.ended;
    if (playing !== lastPlaying) {
      lastPlaying = playing;
      const label = playing ? NMP.t('pause') : NMP.t('play');
      qa('[data-act=play]').forEach((b) => { b.title = label; b.setAttribute('aria-label', label); });
    }
    card.classList.toggle('paused', !playing);
    card.classList.toggle('muted', !!media.muted);
    const vol = tunable() ? Math.round((media.muted ? 0 : media.volume) * 100) : 100;
    qa('[data-vol]').forEach((r) => { if (+r.value !== vol) r.value = vol; r.disabled = !tunable(); r.setAttribute('aria-valuetext', vol + '%'); });
    card.classList.toggle('loading', playing && media.readyState < 3); // reproduciendo pero sin datos suficientes
    qa('[data-act=back],[data-act=fwd]').forEach((b) => { b.disabled = live; });
    const canNext = actions.has('nexttrack') || !!findSiteButton('next');
    qa('[data-act=next]').forEach((b) => { b.disabled = !canNext; });
    viz.setSource(playing && !media.muted, strSeed(title), media.duration);
  }

  // El bucle de 250 ms ya cubre el progreso; los eventos solo sirven para reaccionar al instante a play, pausa y cambios de pista.
  ['play', 'pause', 'ended', 'loadedmetadata', 'durationchange'].forEach((ev) => document.addEventListener(ev, render, true));
  document.addEventListener('visibilitychange', render);
  applyTheme(theme);

  // ---------- Tamaño ----------
  // Radio de las esquinas: crece con el tamaño sin pasar de la mitad del alto (pastilla). En la ventana con marco no hay esquinas.
  const radius = (w, h) => Math.min(h / 2, 20 + Math.min(w, h) * .05);
  function layout() {
    const w = card.clientWidth, h = card.clientHeight;
    if (!w || !h) return;
    card.style.setProperty('--r', (pip ? 0 : radius(w, h)) + 'px');
  }
  new ResizeObserver(layout).observe(card);


  // ---------- Miniatura bajo el puntero (storyboard de YouTube) ----------
  // El puente del mundo de la página entrega el spec; las hojas las descarga el service worker (solo ytimg.com) y se cachean pocas.
  const SB_RECHECK_MS = 4000, SB_CACHE = 6, SB_RETRY_MS = 10000, SB_MIN_H = 36, SB_GAP = 8, SB_EDGE = 4;
  const SB = NMP.storyboard;
  const YT_HOST = /(^|\.)youtube\.com$/;
  let sb = null, sbId = '', sbAskedAt = 0, sbPaint = '', sbSize = ''; // sbPaint: lo último pintado en el fondo, para no reasignar la hoja en cada movimiento
  const sbSheets = new Map(), sbBusy = new Set(), sbFailed = new Map(); // url -> data URL | url -> instante del fallo
  document.addEventListener('__mp_sb', (e) => {
    if (!inpage && !YT_HOST.test(location.hostname)) return; // el puente solo existe en YouTube: en otras páginas el evento sería de la propia página (salvo en las pruebas)
    let d = null;
    try { d = JSON.parse(String(e.detail)); } catch (_) { /* sin storyboard */ }
    const ok = d && typeof d.id === 'string' && /^[\w-]{1,20}$/.test(d.id) && SB.parse(d.spec);
    if (!ok) { sb = null; sbId = ''; return; }
    if (d.id !== sbId) { sbSheets.clear(); sbFailed.clear(); sbPaint = ''; sbSize = ''; }
    sbId = d.id; sb = ok;
  });
  let sbPtr = null; // último puntero sobre la barra: al llegar la hoja se pinta sin esperar a otro movimiento
  function hideThumb() { sbEl.classList.remove('on'); }
  const leaveThumb = () => { sbPtr = null; hideThumb(); };
  // Devuelve true si el globo se está mostrando; si falta la hoja, la pide y se pinta en cuanto llega (si el puntero sigue ahí).
  function showThumb(e, b, t) {
    const now = Date.now();
    if (now - sbAskedAt > SB_RECHECK_MS) { sbAskedAt = now; document.dispatchEvent(new CustomEvent('__mp_sbq')); } // el puente responde en el acto
    const pos = sb && SB.locate(sb, t, media.duration);
    if (!pos) return hideThumb(), false;
    const url = SB.sheetUrl(sb, pos.sheet), data = sbSheets.get(url);
    if (!data) {
      if (!sbBusy.has(url) && now - (sbFailed.get(url) || 0) > SB_RETRY_MS) {
        sbBusy.add(url);
        try {
          chrome.runtime.sendMessage({ type: 'sb', url }, (r) => {
            void chrome.runtime.lastError; sbBusy.delete(url);
            if (r && r.busy) { /* el worker iba ocupado con otra hoja: no es un fallo */ } else if (r && r.data) { sbSheets.set(url, r.data); if (sbSheets.size > SB_CACHE) sbSheets.delete(sbSheets.keys().next().value); if (sbPtr) showThumb(sbPtr.e, sbPtr.b, sbPtr.t); } else { sbFailed.delete(url); sbFailed.set(url, Date.now()); if (sbFailed.size > SB_CACHE * 8) sbFailed.delete(sbFailed.keys().next().value); }
          });
        } catch (_) { sbBusy.delete(url); }
      }
      return hideThumb(), false;
    }
    // El globo vive dentro de la tarjeta (que recorta): se encoge para caber entre el borde superior y la barra, o no se muestra.
    const { w, h, c, r } = sb.level, cr = card.getBoundingClientRect(), br = b.getBoundingClientRect();
    const barTop = br.top - cr.top, s = Math.min(1, (barTop - SB_GAP - SB_EDGE) / h, (cr.width - 2 * SB_EDGE) / w);
    if (!(h * s >= SB_MIN_H)) return hideThumb(), false;
    const tw = Math.round(w * s), th = Math.round(h * s);
    const size = `${tw}|${th}`;
    if (size !== sbSize) { sbSize = size; sbEl.style.width = tw + 'px'; sbEl.style.height = th + 'px'; }
    sbEl.style.left = clamp(e.clientX - cr.left - tw / 2, SB_EDGE, cr.width - tw - SB_EDGE) + 'px';
    sbEl.style.top = barTop - SB_GAP - th + 'px';
    const paint = `${url}|${c}|${r}|${pos.col}|${pos.row}|${tw}|${th}`;
    if (paint !== sbPaint) { sbPaint = paint; sbEl.firstElementChild.style.cssText = `background:url(${data}) -${pos.col * tw}px -${pos.row * th}px / ${c * tw}px ${r * th}px`; }
    sbEl.lastElementChild.textContent = fmt(t);
    sbEl.classList.add('on');
    return true;
  }

  // ---------- Barra de progreso (la de cada diseño): clic o arrastre para buscar ----------
  const barFrac = (e, b) => { const r = b.getBoundingClientRect(); return clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1); };
  card.addEventListener('pointerdown', (e) => {
    const b = e.button === 0 && e.target.closest('[data-bar]');
    if (!b || !media || !isFinite(media.duration)) return;
    b.setPointerCapture(e.pointerId); b.classList.add('drag');
    seekTo(barFrac(e, b) * media.duration); render();
  });
  card.addEventListener('pointermove', (e) => {
    const b = e.target.closest('[data-bar]');
    if (!b || !media || !isFinite(media.duration)) return leaveThumb();
    const t = barFrac(e, b) * media.duration;
    sbPtr = { e, b, t };
    b.title = showThumb(e, b, t) ? '' : fmt(t); // tiempo bajo el puntero (con miniatura, el globo ya lo dice)
    if (b.classList.contains('drag')) { seekTo(t); render(); }
  });
  card.addEventListener('pointerleave', leaveThumb);
  const endBar = (e) => { const b = e.target.closest('[data-bar]'); if (b) b.classList.remove('drag'); };
  card.addEventListener('pointerup', endBar);
  card.addEventListener('pointercancel', endBar);


  try {
    chrome.storage.local.get([INPAGE_KEY, THEME_KEY, PREFS_KEY, VOL_KEY, REMOTE_KEY], (r) => {
      if (r && r[REMOTE_KEY] === true) setRemote(true);
      if (r && r[PREFS_KEY]) applyPrefs(r[PREFS_KEY]);
      if (r && r[VOL_KEY] && typeof r[VOL_KEY] === 'object') volByHost = r[VOL_KEY];
      if (r && r[INPAGE_KEY] === true) setInpage(true);
      if (r && r[THEME_KEY]) applyTheme(r[THEME_KEY]);
    });
    chrome.storage.onChanged.addListener((c) => {
      if (c[INPAGE_KEY]) setInpage(c[INPAGE_KEY].newValue === true);
      if (c[THEME_KEY] && c[THEME_KEY].newValue) applyTheme(c[THEME_KEY].newValue);
      if (c[PREFS_KEY]) applyPrefs(c[PREFS_KEY].newValue);
      if (c[REMOTE_KEY]) setRemote(c[REMOTE_KEY].newValue === true);
    });
  } catch (_) { /* sin storage */ }

  (document.body || document.documentElement).appendChild(host);
})();