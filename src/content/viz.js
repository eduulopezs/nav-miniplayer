(() => {
  const NMP = (globalThis.__NMP ||= {});
  const { hash } = NMP.util;

  // Motor del visualizador: mantiene el espectro (48 bandas con pico), la forma de onda, un historial para las crestas, el golpe de bombo
  // y el nivel de graves, y lo dibuja en los <canvas data-viz> del diseño activo.
  // Hay dos fuentes: la señal real de la pestaña (feed(), desde la captura de audio) y, si no hay, una señal sintética que sigue el estado
  // del reproductor (suena/pausa/silencio). Un sitio cualquiera no deja analizar su audio (CORS), por eso la captura es opt-in.
  const N = 48;
  const V = { N, b: new Float32Array(N), pk: new Float32Array(N), w: new Float32Array(96), ph: 0, t: 0, kick: 0, lvl: 0, hist: [], hAcc: 0, idle: true, real: false };
  const src = { bpm: 108, voice: false, on: false };
  const real = { freq: null, time: null, at: -1e9, kick: 0, prevLow: 0, peak: .25, avg: new Float32Array(N) }; // peak: control automático de ganancia; avg: nivel medio por banda
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const REAL_FRESH_MS = 400;

  // Estado del reproductor: lo fija player.js en cada render. `seed` da a cada pista su propio tempo; las pistas largas se tratan como voz.
  function setSource(on, seed, duration) {
    src.on = on;
    src.bpm = 84 + Math.floor(hash(seed >>> 0, 7) * 48);
    src.voice = duration > 1500 && duration !== Infinity;
  }

  // Señal real: `freq` y `time` son los Uint8Array de un AnalyserNode (getByteFrequencyData / getByteTimeDomainData).
  function feed(freq, time, sampleRate) {
    real.freq = freq; real.time = time; real.rate = sampleRate || 48000; real.at = now();
  }
  const isReal = () => !!real.freq && now() - real.at < REAL_FRESH_MS;

  function targetsSim(dt, tg) {
    const on = src.on, voice = src.voice, bpm = src.bpm;
    if (on && bpm) V.ph += dt * bpm / 60;
    const beat = V.ph % 1, kick = on && bpm ? Math.exp(-5.5 * beat) : 0, hat = on && bpm ? Math.exp(-13 * ((V.ph * 2 + .5) % 1)) : 0;
    const syl = voice ? Math.max(0, Math.sin(V.t * 5.3) * Math.sin(V.t * 1.7 + 1) * .9 + .1) : 1;
    const tick = Math.floor(V.t * 16);
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1), low = kick * Math.pow(1 - f, 1.5);
      const mid = (.5 + .5 * Math.sin(V.t * (1.1 + f * 2.6) + i * 1.9)) * (.35 + .4 * Math.pow(Math.sin(V.t * .37 + i * .5), 2)) * Math.sin(Math.PI * Math.min(1, f * 1.08));
      const rnd = hash(i, tick);
      tg[i] = on ? (1.05 - .55 * f) * (.14 + .6 * (voice ? 0 : low * 1.25) + (voice ? .85 : .5) * mid * syl + .6 * hat * f * rnd) + (rnd - .5) * .06 : 0;
    }
    return kick;
  }
  // Señal real. La música rara vez llena el rango del analizador, así que se normaliza con un control automático de ganancia (el pico
  // reciente fija la escala) y se realzan los cambios: cada banda mezcla su nivel con cuánto sube sobre su media de ~1 s, de modo que
  // los golpes y las entradas se ven aunque el volumen sea bajo o la canción sea densa.
  function targetsReal(dt, tg) {
    const fq = real.freq, nb = fq.length, hz = real.rate / 2 / nb, lo = 40, hi = Math.min(14000, real.rate / 2 - 1), ratio = hi / lo;
    let top = 0;
    for (let i = 0; i < N; i++) {
      const a = Math.max(0, Math.floor(lo * Math.pow(ratio, i / N) / hz)), b = Math.max(a + 1, Math.min(nb, Math.ceil(lo * Math.pow(ratio, (i + 1) / N) / hz)));
      let m = 0; for (let k = a; k < b; k++) if (fq[k] > m) m = fq[k]; // el máximo de la banda conserva los picos que la media diluye
      let s = 0; for (let k = a; k < b; k++) s += fq[k];
      const e = (.5 * m + .5 * s / (b - a)) / 255 * (.85 + .55 * (i / (N - 1))); // los agudos llegan con menos energía: se compensa un poco
      tg[i] = e; if (e > top) top = e;
    }
    real.peak = Math.max(.12, top, real.peak * Math.exp(-dt * .3));
    const kA = 1 - Math.exp(-dt / 1.0);
    for (let i = 0; i < N; i++) {
      const en = Math.min(1, tg[i] / real.peak), rise = Math.max(0, en - real.avg[i]);
      real.avg[i] += (en - real.avg[i]) * kA;
      tg[i] = Math.min(1, Math.pow(en, 1.6) * .8 + rise * 1.7);
    }
    let low = 0; for (let i = 0; i < 6; i++) low += tg[i]; low /= 6;
    if (low - real.prevLow > .06) real.kick = Math.min(1, low * 1.5);
    real.kick *= Math.exp(-dt * 7); real.prevLow = low;
    return real.kick;
  }

  const tg = new Float32Array(N);
  function step(dt) {
    V.t += dt;
    const useReal = isReal(); V.real = useReal;
    const kick = useReal ? targetsReal(dt, tg) : targetsSim(dt, tg);
    let sum = 0, loud = 0;
    for (let i = 0; i < N; i++) {
      const t = Math.max(0, Math.min(1, tg[i])), v = V.b[i], k = 1 - Math.exp(-dt * (t > v ? (useReal ? 60 : 34) : (useReal ? 13 : 9)));
      V.b[i] = v + (t - v) * k; V.pk[i] = Math.max(V.b[i], V.pk[i] - dt * .55); loud += V.b[i]; if (i < 8) sum += V.b[i];
    }
    V.kick = kick; V.lvl = sum / 8; V.idle = loud / N < .004;
    const tick = Math.floor(V.t * 16);
    if (useReal && real.time) { const tl = real.time.length; for (let k = 0; k < 96; k++) V.w[k] = Math.max(-1, Math.min(1, (real.time[Math.floor(k / 96 * tl)] - 128) / 110)); }
    else for (let k = 0; k < 96; k++) { const x = k / 95; let a = 0; for (let j = 0; j < 12; j++) a += V.b[j * 3 + 1] * Math.sin(6.2832 * (j + 1) * x * .5 + V.t * (2 + j * .7) + j); V.w[k] = Math.max(-1, Math.min(1, a / 3.2 + (src.on ? (hash(k, tick) - .5) * .06 : 0))); }
    V.hAcc += dt; if (V.hAcc > .085) { V.hAcc = 0; V.hist.unshift(Float32Array.from(V.b)); if (V.hist.length > 18) V.hist.pop(); }
  }

  // Dibuja los canvas del diseño. `ctx` = { card, skin }; las variables --kick y --lvl dejan que el CSS reaccione al sonido.
  function draw(ctx) {
    const card = ctx.card, kv = V.kick.toFixed(2), lv = V.lvl.toFixed(2);
    if (ctx._kv !== kv) { card.style.setProperty('--kick', kv); ctx._kv = kv; }
    if (ctx._lv !== lv) { card.style.setProperty('--lvl', lv); ctx._lv = lv; }
    const sk = NMP.skins[ctx.skin], fns = sk && sk.viz; if (!fns) return;
    const dpr = Math.min((typeof devicePixelRatio === 'number' && devicePixelRatio) || 1, 2);
    card.querySelectorAll('canvas[data-viz]').forEach((cv) => {
      const fn = fns[cv.dataset.viz]; if (!fn) return;
      const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      const W = Math.round(w * dpr), H = Math.round(h * dpr);
      const resized = cv.width !== W || cv.height !== H; if (resized) { cv.width = W; cv.height = H; }
      if (V.idle && cv._idle && !resized && !fn.always) return; // en silencio solo se repinta lo que sigue animado por sí mismo
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      fn(g, w, h, V, card, cv); cv._idle = V.idle;
    });
  }

  NMP.viz = { state: V, step, draw, feed, setSource, isReal };
})();
