(() => {
  const NMP = globalThis.__NMP;

  // Ventana aparte (#16): informe de la pestaña al service worker y órdenes que llegan de él.
  // `d` trae lo que necesita del reproductor: pickMedia, refreshMedia (elige y guarda el medio activo), bestArtwork, hasAction, findSiteButton, seekTo, ACT y render.
  NMP.createRemote = (d) => {
    // Mientras la ventana aparte de la extensión está abierta (mp_remote), esta pestaña informa de su medio al service worker y obedece sus
    // órdenes. Sin ventana no se informa de nada: no hay temporizador ni mensajes.
    let remoteOn = false, repT = 0, repKey = '';
    const favicon = () => { const l = document.querySelector('link[rel~="icon"]'); try { return l ? new URL(l.getAttribute('href'), location.href).href : new URL('/favicon.ico', location.href).href; } catch (_) { return ''; } };
    function report(force) {
      if (!remoteOn) return;
      const m = d.pickMedia();
      if (!m) { if (repKey) { repKey = ''; try { chrome.runtime.sendMessage({ type: 'sess-end' }); } catch (_) { /* sin background */ } } return; }
      const md = navigator.mediaSession && navigator.mediaSession.metadata;
      const art = d.bestArtwork(md, m);
      const msg = {
        type: 'sess', title: (md && md.title) || document.title || location.hostname, artist: (md && (md.artist || md.album)) || location.hostname.replace(/^www\./, ''),
        host: location.hostname.replace(/^www\./, ''), fav: favicon(), art: /^https?:/i.test(art) ? art : '',
        playing: !m.paused && !m.ended, live: m.duration === Infinity, d: isFinite(m.duration) ? m.duration : 0, t: m.currentTime || 0, rate: m.playbackRate || 1, muted: !!m.muted,
        next: d.hasAction('nexttrack') || !!d.findSiteButton('next'), prev: d.hasAction('previoustrack') || !!d.findSiteButton('prev'),
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
    const RC = NMP.cfg.CMD;
    try {
      chrome.runtime.onMessage.addListener((m, sender) => {
        if (sender.id !== chrome.runtime.id || sender.tab || !m || m.type !== 'rc-cmd' || typeof m.cmd !== 'string') return;
        const c = RC.exec(m.cmd);
        if (!c) return;
        const media = d.refreshMedia();
        if (!media) return;
        if (c[1] === 'play') { if (media.paused) media.play().catch(() => {}); }
        else if (c[1] === 'pause') media.pause();
        else if (c[2] != null) d.seekTo(+c[2]);
        else d.ACT[c[1] === 'toggle' ? 'play' : c[1]]();
        d.render(); schedReport();
      });
    } catch (_) { /* sin background */ }

    return { setRemote, schedReport };
  };
})();
