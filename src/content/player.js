(() => {
  if (window.top !== window || window.__glassMiniPlayer) return;
  window.__glassMiniPlayer = true;

  const NMP = globalThis.__NMP;
  const { SKIP, MIN_DURATION, MARGIN, EDGE, POS_KEY, SIZE_KEY, THEME_KEY, MODE_KEY, SLIM, SLIM_BELOW, DESIGN, MIN, MAX, CW, CH, DPR0, SITE_BUTTONS } = NMP.cfg;
  const { clamp, fmt } = NMP.util;
  const { icons, themes: TH, tokens, media: MEDIA } = NMP;
  const G = tokens.theme.glass; // degradado de la barra de progreso (Glass)

  // ---------- DOM ----------
  const host = document.createElement('div');
  host.id = 'glass-mini-player-host';
  host.style.cssText = 'all:initial;position:fixed;left:0;top:0;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'closed' }); // cerrado: la página no puede leer ni tocar el reproductor (ni el lienzo del Mini)

  root.innerHTML = `
<style>
${NMP.css}
</style>
<div class="card" role="region" aria-label="Minirreproductor" tabindex="0" aria-keyshortcuts="Space ArrowLeft ArrowRight Escape">
  <div class="glow"></div>
  <svg class="ring" role="progressbar" aria-label="Progreso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${G['bar-1']}"/><stop offset=".5" stop-color="${G['bar-2']}"/><stop offset="1" stop-color="${G['bar-3']}"/>
      </linearGradient>
    </defs>
    <rect class="track" pathLength="100"/>
    <rect class="bar" pathLength="100"/>
  </svg>
  <div class="inner">
  <div class="top">
    <div class="art">${icons.note}</div>
    <div class="meta" aria-live="polite"><div class="title"></div><div class="artist"></div><div class="artist hint"></div></div>
    <div class="side">
    <button class="mode" title="Pasar a Mini" aria-label="Pasar a Mini"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><rect x="12" y="11" width="6" height="5" rx="1.5" fill="currentColor"/></svg></button>
    <button class="close" title="Ocultar" aria-label="Ocultar">${icons.close}</button>
    </div>
  </div>
  <div class="controls">
    <span class="time cur">0:00</span>
    <div class="buttons">
      <button class="prev" title="Anterior" aria-label="Anterior">${icons.prev}</button>
      <button class="back" title="Retroceder ${SKIP} s" aria-label="Retroceder ${SKIP} segundos">${icons.back}</button>
      <button class="play" title="Reproducir" aria-label="Reproducir">${icons.play}</button>
      <button class="fwd" title="Avanzar ${SKIP} s" aria-label="Avanzar ${SKIP} segundos">${icons.fwd}</button>
      <button class="next" title="Siguiente" aria-label="Siguiente">${icons.next}</button>
    </div>
    <span class="time end dur">0:00</span>
  </div>
  </div>
  <div class="grip tl"></div><div class="grip tr"></div><div class="grip bl"></div><div class="grip br"></div>
</div>`;

  const $ = (s) => root.querySelector(s);
  const inner = $('.inner'), grips = root.querySelectorAll('.grip');
  const card = $('.card'), ring = $('.ring'), bar = $('.bar'), art = $('.art');
  const titleEl = $('.title'), artistEl = $('.artist'), hintEl = $('.hint'), curEl = $('.cur'), durEl = $('.dur');
  const btn = { prev: $('.prev'), back: $('.back'), play: $('.play'), fwd: $('.fwd'), next: $('.next'), close: $('.close'), mode: $('.mode') };

  // ---------- Estado ----------
  let modeSwitch = false; // cambiando de tipo de ventana, esperando a que se cierre la anterior
  let media = null, lastPlayed = null, dismissed = true, actions = new Set();
  let lastKey = '', lastPlaying = null, pip = false, curTitle = '', curArtist = '', curImg = '';
  let fm = 'pip';
  let theme = 'glass';
  const applyTheme = (t) => { theme = TH[t] ? t : 'glass'; if (theme === 'glass') delete card.dataset.theme; else card.dataset.theme = theme; renderer.invalidate(); };
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


  document.addEventListener('play', (e) => { if (e.target instanceof HTMLMediaElement) lastPlayed = e.target; }, true);
  // El puente corre en el mundo de la página, así que lo que anuncia puede estar falseado: solo se aceptan nombres conocidos.
  const KNOWN_ACTIONS = new Set(['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack', '@pip']);
  document.addEventListener('__mp_actions', (e) => { actions = new Set(String(e.detail).split(',').filter((n) => KNOWN_ACTIONS.has(n))); });
  // Medios fuera del alcance del documento (sin insertar, en un shadow DOM): el puente manda su estado y recibe las órdenes.
  document.addEventListener('__mp_media', (e) => MEDIA.ingest(e.detail, send, (m) => { lastPlayed = m; scanDirty = true; }));
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

  btn.play.addEventListener('click', () => { if (!media) return; media.paused ? media.play().catch(() => {}) : media.pause(); });
  btn.back.addEventListener('click', () => media && seekTo(media.currentTime - SKIP));
  btn.fwd.addEventListener('click', () => media && seekTo(media.currentTime + SKIP));
  btn.prev.addEventListener('click', () => {
    if (!media) return;
    if (media.currentTime > 3 || (!actions.has('previoustrack') && !findSiteButton('prev'))) return seekTo(0);
    if (actions.has('previoustrack')) send('previoustrack'); else findSiteButton('prev').click();
  });
  btn.next.addEventListener('click', () => {
    if (actions.has('nexttrack')) send('nexttrack'); else findSiteButton('next')?.click();
  });
  btn.close.addEventListener('click', () => { dismissed = true; render(); });

  // Teclado con el reproductor enfocado (Tab): Espacio/K play-pausa, ←/→ ±SKIP s, Esc oculta.
  // Sobre un botón, Espacio/Intro los gestiona el propio botón.
  card.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !media) return;
    const onButton = e.composedPath()[0].tagName === 'BUTTON'; // sin instanceof: en la ventana flotante es otro documento
    if ((e.key === ' ' || e.key === 'Enter') && onButton) return;
    if (e.key === ' ' || e.key === 'k') btn.play.click();
    else if (e.key === 'ArrowLeft' && !btn.back.disabled) btn.back.click();
    else if (e.key === 'ArrowRight' && !btn.fwd.disabled) btn.fwd.click();
    else if (e.key === 'Escape') btn.close.click();
    else return;
    e.preventDefault(); e.stopPropagation();
  });

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

  // Texto largo: en vez de "…", se desplaza de lado a lado mostrando todo el nombre.
  function setText(el, text) {
    el.innerHTML = '<span></span>';
    el.firstChild.textContent = text;
    el.title = text;
    fitMarquee(el);
  }
  function fitMarquee(el) {
    el.classList.remove('scroll');
    const d = el.scrollWidth - el.clientWidth;
    if (d > 1) {
      el.style.setProperty('--d', -d + 'px');
      el.style.setProperty('--t', Math.max(4, d / 22 + 3) + 's');
      el.classList.add('scroll');
    }
  }


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
    setHandler('seekbackward', () => media && seekTo(media.currentTime - SKIP));
    setHandler('seekforward', () => media && seekTo(media.currentTime + SKIP));
    setHandler('seekto', (d) => seekTo(d.seekTime));
    setHandler('previoustrack', () => btn.prev.click());
    if (actions.has('nexttrack') || findSiteButton('next')) setHandler('nexttrack', () => btn.next.click());
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
  btn.mode.addEventListener('click', () => { if (fm === 'pip') startFloat(); else setMode('pip'); });
  // Clic izquierdo en el icono: mostrar u ocultar en el modo elegido (la ventana se abre ya, o con el siguiente clic en la página).
  NMP.toggle = () => { // lo invoca el service worker desde el mundo aislado; la página no puede alcanzarlo
    if (vp.active) { document.exitPictureInPicture().catch(() => {}); return; }
    if (pip) { send('__pip'); return; }
    dismissed = !dismissed; render(); startFloat();
  };

  // El navegador solo abre la ventana con un gesto en la página: mientras espera, la tarjeta lo dice (cualquier clic o tecla la abre).
  const canOpenFloat = () => !openFailed && (fm === 'win' ? actions.has('@pip') : fm === 'pip' && (canVideoPip() || actions.has('@pip')));
  let pending = null;
  function setPending(on) {
    if (on === pending) return;
    pending = on;
    card.classList.toggle('pending', on);
    if (!on) requestAnimationFrame(() => fitMarquee(artistEl)); // el artista estaba oculto: recalcular su desplazamiento
    hintEl.textContent = on ? (fm === 'pip' ? 'Toca para abrir Mini' : 'Toca para abrir la ventana') : '';
    const label = on && fm === 'pip' ? 'Abrir Mini' : 'Pasar a Mini';
    btn.mode.title = label; btn.mode.setAttribute('aria-label', label);
  }

  // ---------- Render ----------
  // Solo hay trabajo (y temporizador) mientras algo se ve: tarjeta visible en una pestaña visible, ventana flotante o Mini.
  const isActive = () => pip || vp.active || (!dismissed && !document.hidden);
  let loop = 0;
  const sleep = () => { if (loop) { clearInterval(loop); loop = 0; } };
  const setTxt = (el, v) => { if (el._t !== v) { el._t = v; el.textContent = v; } };
  let lastDash = '', lastNow = -1;
  function render() {
    if (!isActive()) { sleep(); if (dismissed) card.classList.remove('show'); return; }
    if (!loop) loop = setInterval(render, 250);
    media = pickMedia();
    const fs = !!document.fullscreenElement;
    const visible = !!media && !dismissed && !fs && !vp.active;
    card.classList.toggle('show', visible || pip);
    setPending(visible && !pip && !modeSwitch && !vp.starting && canOpenFloat());
    if (!media) return;

    const md = navigator.mediaSession && navigator.mediaSession.metadata;
    const title = (md && md.title) || document.title || location.hostname;
    const artist = (md && (md.artist || md.album)) || location.hostname.replace(/^www\./, '');
    const img = bestArtwork(md);
    const key = title + '\u0001' + artist + '\u0001' + img;
    if (key !== lastKey) {
      lastKey = key;
      curTitle = title; curArtist = artist; curImg = img;
      setText(titleEl, title); setText(artistEl, artist);
      const url = img ? `url("${img.replace(/["\\\n\r]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))}")` : 'none';
      card.style.setProperty('--art', url);
      art.classList.toggle('has-img', !!img);
    }

    const live = media.duration === Infinity;
    card.classList.toggle('live', live);
    const dur = media.duration;
    const p = live ? 100 : dur > 0 ? Math.min(100, (media.currentTime / dur) * 100) : 0;
    const dash = p > 0 ? `${p.toFixed(2)} 100` : '0 100';
    if (dash !== lastDash) { lastDash = dash; bar.style.strokeDasharray = dash; }
    if (Math.round(p) !== lastNow) { lastNow = Math.round(p); ring.setAttribute('aria-valuenow', lastNow); }
    setTxt(curEl, fmt(media.currentTime));
    setTxt(durEl, live ? '' : fmt(dur));

    const playing = !media.paused && !media.ended;
    if (playing !== lastPlaying) {
      lastPlaying = playing;
      btn.play.innerHTML = playing ? icons.pause : icons.play;
      const label = playing ? 'Pausar' : 'Reproducir';
      btn.play.title = label; btn.play.setAttribute('aria-label', label);
    }
    card.classList.toggle('paused', !playing);
    card.classList.toggle('loading', playing && media.readyState < 3); // reproduciendo pero sin datos suficientes
    btn.back.disabled = btn.fwd.disabled = live;
    btn.next.disabled = !(actions.has('nexttrack') || findSiteButton('next'));
  }

  // El bucle de 250 ms ya cubre el progreso; los eventos solo sirven para reaccionar al instante a play, pausa y cambios de pista.
  ['play', 'pause', 'ended', 'loadedmetadata', 'durationchange'].forEach((ev) => document.addEventListener(ev, render, true));
  document.addEventListener('visibilitychange', render);
  render();

  // ---------- Tamaño ----------
  function layout() {
    const w = card.clientWidth, h = card.clientHeight;
    if (!w || !h) return;
    const slim = h < SLIM_BELOW, d = slim ? SLIM : DESIGN;
    const k = clamp(Math.min(w / d.w, h / d.h), 0.5, 4);
    inner.classList.toggle('slim', slim);
    requestAnimationFrame(() => { fitMarquee(titleEl); fitMarquee(artistEl); });
    inner.style.cssText = `width:${w / k}px;height:${h / k}px;zoom:${k}`;
    card.style.setProperty('--r', (pip ? 0 : Math.min(44 * k, h / 2)) + 'px');
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

  // ---------- Arrastre + barra de progreso en el borde ----------
  function edgeFraction(e) {
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top, W = r.width, H = r.height;
    const d = [y, W - x, H - y, x];
    const side = d.indexOf(Math.min(...d));
    const s = [x, W + y, W + H + (W - x), 2 * W + H + (H - y)][side];
    return Math.max(0, Math.min(1, s / (2 * (W + H))));
  }
  const nearEdge = (e) => {
    const r = card.getBoundingClientRect();
    return Math.min(e.clientX - r.left, r.right - e.clientX, e.clientY - r.top, r.bottom - e.clientY) <= EDGE;
  };

  const SNAP = 14;
  const snap = (v, max) => Math.abs(v - MARGIN) < SNAP ? MARGIN : Math.abs(v - (max - MARGIN)) < SNAP ? max - MARGIN : v;
  let mode = null, offX = 0, offY = 0;
  card.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    card.setPointerCapture(e.pointerId);
    if (nearEdge(e) && media && isFinite(media.duration)) {
      mode = 'scrub'; seekTo(edgeFraction(e) * media.duration); render();
    } else if (!pip) {
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
    else if (mode === 'scrub' && media && isFinite(media.duration)) { seekTo(edgeFraction(e) * media.duration); render(); }
    else card.classList.toggle('edge', nearEdge(e));
  });
  const endPointer = () => {
    if (mode === 'drag') savePos();
    mode = null; card.classList.remove('dragging');
  };
  card.addEventListener('pointerup', endPointer);
  card.addEventListener('pointercancel', endPointer);
  card.addEventListener('pointerleave', () => { if (!mode) card.classList.remove('edge'); });

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
    chrome.storage.local.get([POS_KEY, SIZE_KEY, MODE_KEY, THEME_KEY], (r) => {
      if (r && r[MODE_KEY]) fm = r[MODE_KEY];
      if (r && r[THEME_KEY]) applyTheme(r[THEME_KEY]);
      if (r && r[SIZE_KEY]) setSize(r[SIZE_KEY].w, r[SIZE_KEY].h);
      savedPos = r && r[POS_KEY]; applyPos(savedPos);
    });
    chrome.storage.onChanged.addListener((c) => {
      // Si el navegador no deja abrir la ventana sin un gesto, se ve la tarjeta y se abre con el siguiente clic en la página.
      if (c[MODE_KEY] && c[MODE_KEY].newValue) applyMode(c[MODE_KEY].newValue);
      if (c[THEME_KEY] && c[THEME_KEY].newValue) applyTheme(c[THEME_KEY].newValue);
      if (c[SIZE_KEY] && !rs && c[SIZE_KEY].newValue) setSize(c[SIZE_KEY].newValue.w, c[SIZE_KEY].newValue.h);
      if (c[POS_KEY] && mode !== 'drag') { savedPos = c[POS_KEY].newValue; applyPos(savedPos); } });
  } catch (_) { applyPos(null); }

  (document.body || document.documentElement).appendChild(host);
  applyPos(savedPos);
})();