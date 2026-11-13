(() => {
  const NMP = globalThis.__NMP;

  // Ventana aparte (#16): informe de la pestaña al service worker y órdenes que llegan de él.
  // Solo es transporte: `d.nowPlaying()` da qué suena ({ m: medio, md: metadatos, art, next, prev } o null) y `d.run(c)` ejecuta una orden ya validada (c: resultado de CMD.exec).
  NMP.createRemote = (d) => {
    for (const k of ['nowPlaying', 'run']) if (!d[k]) throw new Error('createRemote: falta ' + k);
    const send = (msg) => { try { chrome.runtime.sendMessage(msg); } catch (_) { /* sin background */ } };
    // Mientras la ventana aparte de la extensión está abierta (mp_remote), esta pestaña informa de su medio al service worker y obedece sus
    // órdenes. Sin ventana no se informa de nada: no hay temporizador ni mensajes.
    let remoteOn = false, repT = 0, repKey = '';
    const favicon = () => { const l = document.querySelector('link[rel~="icon"]'); try { return l ? new URL(l.getAttribute('href'), location.href).href : new URL('/favicon.ico', location.href).href; } catch (_) { return ''; } };
    function report(force) {
      if (!remoteOn) return;
      const np = d.nowPlaying();
      if (!np) { if (repKey) { repKey = ''; send({ type: 'sess-end' }); } return; }
      const { m, md, art } = np;
      const msg = {
        type: 'sess', title: (md && md.title) || document.title || location.hostname, artist: (md && (md.artist || md.album)) || location.hostname.replace(/^www\./, ''),
        host: location.hostname.replace(/^www\./, ''), fav: favicon(), art: /^https?:/i.test(art) ? art : '',
        playing: !m.paused && !m.ended, live: m.duration === Infinity, d: isFinite(m.duration) ? m.duration : 0, t: m.currentTime || 0, rate: m.playbackRate || 1, muted: !!m.muted,
        next: np.next, prev: np.prev,
      };
      const key = JSON.stringify([msg.title, msg.artist, msg.art, msg.playing, msg.live, Math.round(msg.d), msg.muted, msg.next, msg.prev, msg.rate]);
      if (!force && key === repKey && !msg.playing) return; // parado y sin cambios: nada que decir
      repKey = key;
      send(msg);
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
    window.addEventListener('pagehide', () => { if (remoteOn && repKey) { send({ type: 'sess-end' }); } });
    // Órdenes de la ventana aparte (por el service worker): solo nombres conocidos; actúan sobre el medio que esta pestaña mostraría.
    const RC = NMP.cfg.CMD;
    try {
      chrome.runtime.onMessage.addListener((m, sender) => {
        if (sender.id !== chrome.runtime.id || sender.tab || !m || m.type !== 'rc-cmd' || typeof m.cmd !== 'string') return;
        const c = RC.exec(m.cmd);
        if (!c) return;
        d.run(c); schedReport();
      });
    } catch (_) { /* sin background */ }

    return { setRemote, schedReport };
  };
})();
