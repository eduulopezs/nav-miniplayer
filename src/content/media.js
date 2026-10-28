(() => {
  const NMP = (globalThis.__NMP ||= {});

  // Medios que el content script no alcanza (sin insertar en el documento o dentro de un shadow DOM): el puente del mundo de la página
  // los vigila y manda su estado; aquí se reflejan en objetos con la misma forma que un HTMLMediaElement y las órdenes vuelven por el puente.
  // Todo lo que llega lo escribe la página, así que cada campo se valida.
  const num = (v, min, max, d) => (typeof v === 'number' && v >= min && v <= max ? v : d);

  class RemoteMedia {
    constructor(id, send) {
      this.id = id; this.send = send; this.alive = true;
      this.paused = true; this.ended = false; this.currentTime = 0; this.duration = NaN; this.readyState = 0;
      this.muted = false; this.loop = false; this.playbackRate = 1; this.tagName = 'AUDIO'; this.poster = '';
    }
    get isConnected() { return this.alive; }
    update(s) {
      this.paused = s.p === true; this.ended = s.e === true; this.muted = s.m === true; this.loop = s.o === true;
      this.tagName = s.v === true ? 'VIDEO' : 'AUDIO';
      this.readyState = num(s.r, 0, 4, 0);
      this.currentTime = num(s.t, 0, 1e9, 0);
      this.duration = s.l === true ? Infinity : num(s.d, 0, 1e9, NaN);
      this.playbackRate = num(s.k, 0.0625, 16, 1);
    }
    play() { this.send(`m:${this.id}:play`); return Promise.resolve(); }
    pause() { this.send(`m:${this.id}:pause`); }
    seek(t) { this.currentTime = t; this.send(`m:${this.id}:seek:${Math.max(0, t).toFixed(3)}`); } // el puente lo aplica; hasta su siguiente estado se ve ya
  }

  // Cada origen (el puente de la página, o un iframe) publica su lista completa; las claves llevan el origen delante.
  const remotes = new Map(); // `${origen}:${id}` -> RemoteMedia
  const STALE_MS = 6000; // un iframe que deja de dar señales (se cerró o se descargó) se descarta; el agente avisa cada 2 s como mucho
  // `send(orden)` manda una orden al origen; `onPlay(m)` avisa de un medio remoto que acaba de empezar a sonar.
  function ingest(source, detail, send, onPlay, now = Date.now()) {
    let list;
    try { list = JSON.parse(String(detail)); } catch (_) { return; }
    if (!Array.isArray(list)) return;
    const seen = new Set();
    for (const s of list.slice(0, 32)) {
      if (!s || !Number.isInteger(s.i) || s.i < 1) continue;
      const key = `${source}:${s.i}`;
      let m = remotes.get(key);
      if (!m) remotes.set(key, (m = new RemoteMedia(s.i, send)));
      const was = m.paused;
      m.update(s); m.alive = true; m.at = now; seen.add(key);
      if (was && !m.paused && onPlay) onPlay(m);
    }
    for (const [key, m] of remotes) if (key.startsWith(source + ':') && !seen.has(key)) { m.alive = false; remotes.delete(key); }
  }
  function expire(now = Date.now()) {
    for (const [key, m] of remotes) if (now - m.at > STALE_MS && !key.startsWith('p:')) { m.alive = false; remotes.delete(key); }
  }

  // Un medio cuenta si ya tiene datos, dura lo bastante (o es un directo) y no es un vídeo de fondo (silenciado y en bucle).
  const usable = (m, min) =>
    m.isConnected && m.readyState > 0 && (m.duration >= min || m.duration === Infinity) && !(m.tagName === 'VIDEO' && m.muted && m.loop);

  // Política: el que suena (con sonido antes que silenciado) > el último que sonó > el más largo.
  function pick(list, last) {
    if (!list.length) return null;
    const longest = (a) => a.reduce((best, m) => (m.duration > best.duration ? m : best));
    const playing = list.filter((m) => !m.paused && !m.ended);
    if (playing.length) {
      const loud = playing.filter((m) => !m.muted);
      const from = loud.length ? loud : playing;
      return from.includes(last) ? last : longest(from);
    }
    return list.includes(last) ? last : longest(list);
  }

  NMP.media = { ingest, expire, remotes: () => [...remotes.values()], usable, pick };
})();
