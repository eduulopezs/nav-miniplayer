(() => {
  if (window.top !== window || window.__glassMiniPlayer) return;
  window.__glassMiniPlayer = true;

  const NMP = globalThis.__NMP;
  const { MIN_DURATION, MARGIN, POS_KEY, SIZE_KEY, THEME_KEY, MODE_KEY, PREFS_KEY, VOL_KEY, MIN, MAX, CW, CH, DPR0, SITE_BUTTONS } = NMP.cfg;
  const { clamp, fmt, fmt2, pad2, strSeed, barcode, palette, DEFAULT_PAL } = NMP.util;
  const { themes: TH, skins: SK, viz, media: MEDIA } = NMP;

  // ---------- DOM ----------
  const host = document.createElement('div');
  host.id = 'glass-mini-player-host';
  host.style.cssText = 'all:initial;position:fixed;left:0;top:0;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'closed' }); // cerrado: la página no puede leer ni tocar el reproductor (ni el lienzo del Mini)

  root.innerHTML = `
<style>
${NMP.css}
${NMP.menuCss}
</style>
<div class="card" role="region" aria-label="Minirreproductor" tabindex="0" aria-keyshortcuts="Space ArrowLeft ArrowRight Escape">
  <div class="hint" aria-hidden="true"></div><div class="toast" role="status" aria-live="polite"></div>
  <div class="grip tl"></div><div class="grip tr"></div><div class="grip bl"></div><div class="grip br"></div>
</div>`;

  const $ = (s) => root.querySelector(s);
  const grips = root.querySelectorAll('.grip');
  const card = $('.card'), hintEl = $('.hint'), toastEl = $('.toast');
  const qa = (sel) => card.querySelectorAll(sel);

  // ---------- Estado ----------
  let modeSwitch = false; // cambiando de tipo de ventana, esperando a que se cierre la anterior
  let media = null, lastPlayed = null, dismissed = true, actions = new Set();
  let lastKey = '', lastPlaying = null, pip = false, curTitle = '', curArtist = '', curImg = '', lastTrack = '', trackNo = 0;
  let fm = 'pip';
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
    for (const n of [...card.children]) if (!n.classList.contains('grip') && !n.classList.contains('hint') && !n.classList.contains('toast')) n.remove();
    card.classList.forEach((c) => { if (c.startsWith('sk-')) card.classList.remove(c); });
    card.classList.add('sk-' + t);
    card.insertAdjacentHTML('afterbegin', SK[t].tpl() + '<i class="probe" aria-hidden="true"></i>');
    applySkip();
    if (SK[t].setup) SK[t].setup(vizCtx);
    fontSkin = ''; // se cargan al mostrarse, no al arrancar la página
    lastKey = ''; lastPlaying = null; lastP = -1; lastHint = null; pending = null; // la plantilla es nueva: se vuelve a rellenar todo
    renderer.invalidate(); render();
  }
  const setMode = (v) => { applyMode(v); try { chrome.storage.local.set({ [MODE_KEY]: v }); } catch (_) { /* contexto invalidado */ } };

  // Cambio de modo: cierra la ventana anterior, espera a su evento de cierre y entonces muestra/abre la nueva.
  // Un cierre provocado por el cambio (exiting / pipClosing) no es un "ocultar" del usuario, llegue cuando llegue.
  let switchTimer = 0, pipClosing = false, openFailed = false;
  function finishSwitch() {
    clearTimeout(switchTimer);
    modeSwitch = false; render(); startFloat();
  }
  function settleSwitch() { if (modeSwitch && !vp.active && !pip) finishSwitch(); }
  function applyMode(v) {
    if (v === fm) return;
    fm = v; openFailed = false;
    if (!document.hidden) dismissed = false; // las pestañas en segundo plano conservan lo que se cerró
    if (fm !== 'pip' && vp.active) { vp.exiting = true; document.exitPictureInPicture().catch(() => { vp.exiting = false; }); }
    if (fm !== 'win' && pip) { pipClosing = true; send('__pip'); }
    modeSwitch = true; render();
    clearTimeout(switchTimer);
    switchTimer = setTimeout(finishSwitch, 2000); // respaldo si el cierre no llega
    settleSwitch();
  }


  document.addEventListener('play', (e) => { if (e.target instanceof HTMLMediaElement) { lastPlayed = e.target; autoShow(); } }, true);
  // El puente corre en el mundo de la página, así que lo que anuncia puede estar falseado: solo se aceptan nombres conocidos.
  const KNOWN_ACTIONS = new Set(['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack', '@pip']);
  document.addEventListener('__mp_actions', (e) => { actions = new Set(String(e.detail).split(',').filter((n) => KNOWN_ACTIONS.has(n))); });
  // Opcional: al empezar a sonar un medio, la tarjeta se muestra sola (si estaba oculta).
  function autoShow() { if (prefs.autoshow && dismissed && !document.hidden) { dismissed = false; render(); startFloat(); } }
  // Medios fuera del alcance del documento (sin insertar, en un shadow DOM): el puente manda su estado y recibe las órdenes.
  const remotePlay = (m) => { lastPlayed = m; scanDirty = true; autoShow(); };
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

  // ---------- Preferencias ----------
  // skip: segundos de los saltos; autoshow: mostrar al empezar a sonar; autohide: minutos en pausa antes de ocultar (0 = nunca).
  const prefs = { skip: 10, autoshow: false, autohide: 0 };
  let volByHost = {}; // volumen recordado por sitio
  const HOST_KEY = location.hostname;
  const applyPrefs = (v) => {
    if (!v || typeof v !== 'object') return;
    if ([5, 10, 15, 30].includes(v.skip)) prefs.skip = v.skip;
    if (typeof v.autoshow === 'boolean') prefs.autoshow = v.autoshow;
    if ([0, 1, 5, 10, 30].includes(v.autohide)) prefs.autohide = v.autohide;
    applySkip();
  };
  const setPref = (k, v) => { prefs[k] = v; applySkip(); try { chrome.storage.local.set({ [PREFS_KEY]: { ...prefs } }); } catch (_) { /* contexto invalidado */ } };
  // Los botones de salto de cada diseño muestran los segundos (data-skn) y los dicen en su etiqueta.
  function applySkip() {
    const n = prefs.skip;
    qa('[data-skn]').forEach((e) => { e.textContent = (e.dataset.skn || '') + n; });
    qa('[data-act=back]').forEach((b) => { b.title = `Retroceder ${n} s`; b.setAttribute('aria-label', `Retroceder ${n} segundos`); });
    qa('[data-act=fwd]').forEach((b) => { b.title = `Avanzar ${n} s`; b.setAttribute('aria-label', `Avanzar ${n} segundos`); });
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
    mute() { if (media) { media.muted = !media.muted; render(); } },
    mode() { if (fm === 'pip') startFloat(); else setMode('pip'); },
    hide() { dismissed = true; render(); },
  };
  card.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]'), fn = a && !a.disabled && Object.hasOwn(ACT, a.dataset.act) && ACT[a.dataset.act];
    if (fn) { fn(); render(); }
  });

  // Teclado con el reproductor enfocado (Tab): Espacio/K play-pausa, ←/→ ±salto, Esc oculta.
  // Sobre un botón, Espacio/Intro los gestiona el propio botón.
  card.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !media) return;
    const onButton = e.composedPath()[0].tagName === 'BUTTON'; // sin instanceof: en la ventana flotante es otro documento
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
    modes: [['pip', 'Mini'], ['win', 'Ventana'], ['card', 'Tarjeta']],
    getTheme: () => theme, getMode: () => fm,
    setTheme(id) { try { chrome.storage.local.set({ [THEME_KEY]: id }); } catch (_) { applyTheme(id); } },
    setMode(id) { try { chrome.storage.local.set({ [MODE_KEY]: id }); } catch (_) { applyMode(id); } },
    copyLink() {
      if (!media) return;
      navigator.clipboard.writeText(timeUrl()).then(() => toast('Enlace copiado'), () => toast('No se pudo copiar'));
    },
    isPip: () => pip,
  });
  card.addEventListener('contextmenu', (e) => { if (media && menu.open()) e.preventDefault(); });
  // Rueda sobre la tarjeta: volumen en pasos de 5 %.
  card.addEventListener('wheel', (e) => {
    if (!tunable()) return;
    e.preventDefault();
    const v = clamp(Math.round(((media.muted ? 0 : media.volume) + (e.deltaY < 0 ? .05 : -.05)) * 100) / 100, 0, 1);
    setVolume(v); toast('Volumen ' + Math.round(v * 100) + '%'); if (menu.isOpen()) menu.sync();
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

  // Respaldo: ventana flotante con marco (Document PiP), la abre main.js y mueve aquí el host.
  document.addEventListener('__mp_pip', (e) => {
    const d = String(e.detail);
    if (d === 'open' ? !pipAsked : d === 'closed' ? !pip : !d.startsWith('error:')) return; // evento no pedido o falso
    pipAsked = false;
    if (d === 'open') {
      pip = true;
      host.style.cssText = 'all:initial;position:fixed;inset:0;';
      card.classList.add('pip');
    } else if (d === 'closed') {
      pip = false;
      if (!pipClosing) dismissed = true;
      pipClosing = false;
      card.classList.remove('pip');
      host.style.cssText = 'all:initial;position:fixed;left:0;top:0;z-index:2147483647;';
      (document.body || document.documentElement).append(host);
      applyPos(savedPos);
    }
    render();
    settleSwitch();
  });

  // ---------- Ventana flotante sin marco: el reproductor se dibuja en un canvas y se saca con el PiP de vídeo ----------
  const vp = { active: false, starting: false, exiting: false, video: null, stop: null, pausing: 0 };
  const renderer = NMP.createRenderer(() => ({ theme, title: curTitle, artist: curArtist, art: curImg, media }));

  function vpTick() {
    renderer.draw();
    const v = vp.video;
    if (!v || !media) return;
    if (!media.paused && v.paused) v.play().catch(() => {});
    else if (media.paused && !v.paused && !vp.pausing) {
      vp.pausing = setTimeout(() => { vp.pausing = 0; if (media && media.paused) v.pause(); }, 150);
    }
    const now = performance.now();
    if (now - (vp.posAt || 0) < 500) return;
    vp.posAt = now;
    try {
      if (isFinite(media.duration) && media.duration > 0) {
        navigator.mediaSession.setPositionState({ duration: media.duration, position: Math.min(media.currentTime, media.duration), playbackRate: media.playbackRate || 1 });
      }
    } catch (_) { /* estado no válido */ }
  }
  // Una pestaña que reproduce audio/vídeo no se frena, así que un temporizador basta (~30 fps).
  function startTicker(fn) {
    const t = setInterval(fn, 33);
    return () => clearInterval(t);
  }
  const setHandler = (n, f) => { try { navigator.mediaSession.setActionHandler(n, f); } catch (_) { /* no soportada */ } };
  function releaseVideo() {
    if (vp.stop) vp.stop();
    if (vp.video) vp.video.remove();
    vp.stop = vp.video = null; vp.active = false; renderer.release();
  }
  async function openVideoPip() {
    const cv = document.createElement('canvas');
    cv.width = CW * renderer.dpr; cv.height = CH * renderer.dpr;
    renderer.attach(cv.getContext('2d'));
    renderer.draw();
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true;
    v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none;';
    v.srcObject = cv.captureStream(30);
    root.append(v);
    vp.video = v;
    await v.play();
    if (v.readyState < 1) await new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true }));
    const pw = await v.requestPictureInPicture();
    vp.active = true; openFailed = false;
    // La ventana ya está abierta a tamaño pequeño: ahora se dibuja a 4x para que se vea nítida.
    const w0 = pw.width;
    renderer.setDpr(4); cv.width = CW * renderer.dpr; cv.height = CH * renderer.dpr;
    setTimeout(() => {
      if (vp.active && pw.width > w0 * 1.5) { renderer.setDpr(DPR0); cv.width = CW * renderer.dpr; cv.height = CH * renderer.dpr; } // el navegador la agrandó: deshacer
    }, 600);
    v.addEventListener('leavepictureinpicture', () => { releaseVideo(); if (!vp.exiting) dismissed = true; vp.exiting = false; render(); settleSwitch(); });
    setHandler('play', () => media && media.play().catch(() => {}));
    setHandler('pause', () => media && media.pause());
    setHandler('seekbackward', () => media && seekTo(media.currentTime - prefs.skip));
    setHandler('seekforward', () => media && seekTo(media.currentTime + prefs.skip));
    setHandler('seekto', (d) => seekTo(d.seekTime));
    setHandler('previoustrack', () => ACT.prev());
    if (actions.has('nexttrack') || findSiteButton('next')) setHandler('nexttrack', () => ACT.next());
    vp.stop = startTicker(vpTick);
    render();
  }
  const canVideoPip = () => document.pictureInPictureEnabled && !!HTMLCanvasElement.prototype.captureStream;
  async function startFloat() {
    if (fm === 'card' || pip || vp.active || vp.starting || dismissed || !media) return;
    const docFallback = () => { if (actions.has('@pip')) send('__pip'); };
    if (fm === 'win' || !canVideoPip()) return docFallback();
    vp.starting = true;
    try { await openVideoPip(); } catch (err) {
      releaseVideo();
      if (!(err && err.name === 'NotAllowedError')) { openFailed = !actions.has('@pip'); docFallback(); } // sin gesto no es un fallo: se reintenta con el siguiente clic
    } finally { vp.starting = false; render(); }
  }
  // La API exige un gesto del usuario: se abre con el primer clic o tecla en la página.
  ['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, startFloat, true));
  // Alternar entre ventana flotante (PiP) y tarjeta dentro de la página.
  // Clic izquierdo en el icono: mostrar u ocultar en el modo elegido (la ventana se abre ya, o con el siguiente clic en la página).
  NMP.toggle = () => { // lo invoca el service worker desde el mundo aislado; la página no puede alcanzarlo
    if (vp.active) { document.exitPictureInPicture().catch(() => {}); return; }
    if (pip) { send('__pip'); return; }
    dismissed = !dismissed; render(); startFloat();
  };

  // El navegador solo abre la ventana con un gesto en la página: mientras espera, la tarjeta lo dice (cualquier clic o tecla la abre).
  const canOpenFloat = () => !openFailed && (fm === 'win' ? actions.has('@pip') : fm === 'pip' && (canVideoPip() || actions.has('@pip')));
  let pending = null, lastHint = null;
  function setPending(on) {
    if (on === pending) return;
    pending = on;
    card.classList.toggle('pending', on);
    hintEl.textContent = on ? (fm === 'pip' ? 'Toca para abrir Mini' : 'Toca para abrir la ventana') : '';
    const label = on && fm === 'pip' ? 'Abrir Mini' : 'Pasar a Mini';
    qa('[data-act=mode]').forEach((b) => { b.title = label; b.setAttribute('aria-label', label); });
  }

  // ---------- Render ----------
  // Solo hay trabajo (y temporizador) mientras algo se ve: tarjeta visible en una pestaña visible, ventana flotante o Mini.
  const isActive = () => pip || vp.active || (!dismissed && !document.hidden);
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
    const done = (im) => { if (curImg !== src) return; const p = palette(im); if (p) setPalette(p); };
    const load = (u, cors, fail) => { const im = new Image(); if (cors) im.crossOrigin = 'anonymous'; im.onload = () => done(im); im.onerror = fail; im.src = u; };
    load(src, true, () => {
      if (vp.active || vp.starting) return; // Mini pide la misma carátula al service worker y solo atiende una descarga a la vez
      try { chrome.runtime.sendMessage({ type: 'img', url: src }, (r) => { void chrome.runtime.lastError; if (r && r.data) load(r.data, false, () => {}); }); } catch (_) { /* sin background */ }
    });
  }

  let lastP = -1, pausedAt = 0;
  function render() {
    if (!isActive()) { sleep(); if (dismissed) card.classList.remove('show'); return; }
    if (!loop) loop = setInterval(render, 250);
    media = pickMedia();
    const fs = !!document.fullscreenElement;
    const visible = !!media && !dismissed && !fs && !vp.active;
    card.classList.toggle('show', visible || pip);
    if (visible || pip) {
      if (!wantViz) { wantViz = true; if (vizPending && Date.now() - vizPending < 4000) vizConnect(); }
      vizPending = 0; vizStart();
      if (fontSkin !== theme) { const t = fontSkin = theme; NMP.loadFonts(t, () => { if (theme === t) requestAnimationFrame(layout); }); }
      if (host.ownerDocument !== document) NMP.syncFonts(host.ownerDocument);
    } else vizStop();
    if (!visible && !pip) menu.close();
    // Volumen recordado del sitio: se aplica una vez a cada medio la primera vez que el reproductor lo muestra.
    if (visible && tunable() && !volApplied.has(media)) { volApplied.add(media); const v = volByHost[HOST_KEY]; if (typeof v === 'number' && v >= 0 && v <= 1) { media.volume = v; } }
    // Opcional: ocultar tras N minutos en pausa.
    if (media && prefs.autohide && visible && media.paused && !pip) { pausedAt ||= performance.now(); if (performance.now() - pausedAt > prefs.autohide * 60000) { dismissed = true; pausedAt = 0; } } else pausedAt = 0;
    setPending(visible && !pip && !modeSwitch && !vp.starting && canOpenFloat());
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
      if (imgChanged) loadPalette(img);
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
    const now = Math.round(p * 100), vt = live ? 'En directo' : fmt(ct) + ' de ' + fmt(dur);
    qa('[data-bar]').forEach((b) => { if (b._n !== now) { b._n = now; b.setAttribute('aria-valuenow', now); } if (b._vt !== vt) { b._vt = vt; b.setAttribute('aria-valuetext', vt); } });

    const playing = !media.paused && !media.ended;
    if (playing !== lastPlaying) {
      lastPlaying = playing;
      const label = playing ? 'Pausar' : 'Reproducir';
      qa('[data-act=play]').forEach((b) => { b.title = label; b.setAttribute('aria-label', label); });
    }
    card.classList.toggle('paused', !playing);
    card.classList.toggle('muted', !!media.muted);
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

  function setSize(w, h) {
    card.style.width = clamp(w, MIN.w, MAX.w) + 'px';
    card.style.height = clamp(h, MIN.h, MAX.h) + 'px';
    if (host._x != null) place(host._x, host._y);
  }
  let rs = null;
  grips.forEach((g) => {
    const sx = g.classList.contains('tl') || g.classList.contains('bl') ? -1 : 1;
    const sy = g.classList.contains('tl') || g.classList.contains('tr') ? -1 : 1;
    g.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      g.setPointerCapture(e.pointerId);
      const pw = pip ? card.ownerDocument.defaultView : null;
      rs = { pw, sx: e.screenX, sy: e.screenY, ow: pw && pw.outerWidth, oh: pw && pw.outerHeight, x: e.clientX, y: e.clientY, w: card.offsetWidth, h: card.offsetHeight, px: host._x || 0, py: host._y || 0 };
    });
    g.addEventListener('pointermove', (e) => {
      if (!rs) return;
      if (rs.pw) { // ventana flotante: se redimensiona la propia ventana
        try { rs.pw.resizeTo(Math.max(200, rs.ow + e.screenX - rs.sx), Math.max(60, rs.oh + e.screenY - rs.sy)); } catch (_) { /* sin permiso */ }
        return;
      }
      // La esquina opuesta queda fija: hacia fuera de la pantalla no se puede crecer.
      const roomW = sx > 0 ? window.innerWidth - rs.px : rs.px + rs.w;
      const roomH = sy > 0 ? window.innerHeight - rs.py : rs.py + rs.h;
      const w = clamp(rs.w + sx * (e.clientX - rs.x), MIN.w, Math.max(MIN.w, Math.min(MAX.w, roomW)));
      const h = clamp(rs.h + sy * (e.clientY - rs.y), MIN.h, Math.max(MIN.h, Math.min(MAX.h, roomH)));
      card.style.width = w + 'px';
      card.style.height = h + 'px';
      place(sx < 0 ? rs.px + rs.w - w : rs.px, sy < 0 ? rs.py + rs.h - h : rs.py);
    });
    const end = () => {
      if (!rs) return;
      const wasPip = !!rs.pw;
      rs = null;
      if (wasPip) return;
      savePos();
      try { chrome.storage.local.set({ [SIZE_KEY]: { w: card.offsetWidth, h: card.offsetHeight } }); } catch (_) { /* contexto invalidado */ }
    };
    g.addEventListener('pointerup', end);
    g.addEventListener('pointercancel', end);
  });

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
    if (!b || !media || !isFinite(media.duration)) return;
    b.title = fmt(barFrac(e, b) * media.duration); // tiempo bajo el puntero
    if (b.classList.contains('drag')) { seekTo(barFrac(e, b) * media.duration); render(); }
  });
  const endBar = (e) => { const b = e.target.closest('[data-bar]'); if (b) b.classList.remove('drag'); };
  card.addEventListener('pointerup', endBar);
  card.addEventListener('pointercancel', endBar);

  // ---------- Arrastre ----------
  const SNAP = 14;
  const snap = (v, max) => Math.abs(v - MARGIN) < SNAP ? MARGIN : Math.abs(v - (max - MARGIN)) < SNAP ? max - MARGIN : v;
  let mode = null, offX = 0, offY = 0;
  card.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button,[data-bar]')) return;
    card.setPointerCapture(e.pointerId);
    if (!pip) {
      mode = 'drag';
      const r = host.getBoundingClientRect();
      offX = e.clientX - r.left; offY = e.clientY - r.top;
      card.classList.add('dragging');
    }
  });
  card.addEventListener('pointermove', (e) => {
    if (mode === 'drag') { // imán a los márgenes de la pantalla; Alt lo desactiva
      const x = e.clientX - offX, y = e.clientY - offY;
      place(e.altKey ? x : snap(x, window.innerWidth - card.offsetWidth), e.altKey ? y : snap(y, window.innerHeight - card.offsetHeight));
    }
  });
  const endPointer = () => {
    if (mode === 'drag') savePos();
    mode = null; card.classList.remove('dragging');
  };
  card.addEventListener('pointerup', endPointer);
  card.addEventListener('pointercancel', endPointer);

  function place(x, y) {
    if (pip) return;
    const w = card.offsetWidth, h = card.offsetHeight;
    x = Math.max(0, Math.min(window.innerWidth - w, x));
    y = Math.max(0, Math.min(window.innerHeight - h, y));
    host.style.transform = `translate(${x}px, ${y}px)`;
    host._x = x; host._y = y;
  }
  function savePos() {
    const w = card.offsetWidth, h = card.offsetHeight;
    const pos = {
      x: (host._x ?? 0) / Math.max(1, window.innerWidth - w),
      y: (host._y ?? 0) / Math.max(1, window.innerHeight - h),
    };
    try { chrome.storage.local.set({ [POS_KEY]: pos }); } catch (_) { /* contexto invalidado */ }
  }
  function applyPos(pos) {
    const w = card.offsetWidth, h = card.offsetHeight;
    if (!pos) return place(window.innerWidth - w - MARGIN, window.innerHeight - h - MARGIN);
    place(pos.x * (window.innerWidth - w), pos.y * (window.innerHeight - h));
  }
  let savedPos = null;
  window.addEventListener('resize', () => applyPos(savedPos));

  try {
    chrome.storage.local.get([POS_KEY, SIZE_KEY, MODE_KEY, THEME_KEY, PREFS_KEY, VOL_KEY], (r) => {
      if (r && r[PREFS_KEY]) applyPrefs(r[PREFS_KEY]);
      if (r && r[VOL_KEY] && typeof r[VOL_KEY] === 'object') volByHost = r[VOL_KEY];
      if (r && r[MODE_KEY]) fm = r[MODE_KEY];
      if (r && r[THEME_KEY]) applyTheme(r[THEME_KEY]);
      if (r && r[SIZE_KEY]) setSize(r[SIZE_KEY].w, r[SIZE_KEY].h);
      savedPos = r && r[POS_KEY]; applyPos(savedPos);
    });
    chrome.storage.onChanged.addListener((c) => {
      // Si el navegador no deja abrir la ventana sin un gesto, se ve la tarjeta y se abre con el siguiente clic en la página.
      if (c[MODE_KEY] && c[MODE_KEY].newValue) applyMode(c[MODE_KEY].newValue);
      if (c[THEME_KEY] && c[THEME_KEY].newValue) applyTheme(c[THEME_KEY].newValue);
      if (c[PREFS_KEY]) applyPrefs(c[PREFS_KEY].newValue);
      if (c[SIZE_KEY] && !rs && c[SIZE_KEY].newValue) setSize(c[SIZE_KEY].newValue.w, c[SIZE_KEY].newValue.h);
      if (c[POS_KEY] && mode !== 'drag') { savedPos = c[POS_KEY].newValue; applyPos(savedPos); } });
  } catch (_) { applyPos(null); }

  (document.body || document.documentElement).appendChild(host);
  applyPos(savedPos);
})();