(() => {
  const NMP = (globalThis.__NMP ||= {});
  const { CW, CH, DPR0 } = NMP.cfg;
  const { clamp, fmt } = NMP.util;
  const TH = NMP.themes;

  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function drawMarquee(c, text, x, y, maxW, size) {
    const tw = c.measureText(text).width;
    c.save(); c.beginPath(); c.rect(x, y - size, maxW, size * 1.4); c.clip();
    let off = 0;
    if (tw > maxW) {
      const d = tw - maxW, dur = d / 45, P = dur + 1.5, m = (performance.now() / 1000) % (2 * P);
      const f = (v) => clamp((v - 0.75) / dur, 0, 1);
      off = (m < P ? f(m) : 1 - f(m - P)) * d;
    }
    c.fillText(text, x - off, y); c.restore();
  }

  // Dibuja el reproductor de la ventana Mini en un canvas. `getView()` devuelve lo que se pinta:
  // { theme, title, artist, art, media }.
  NMP.createRenderer = (getView) => {
    const r = { ctx: null, dpr: DPR0, bg: null, bgImg: undefined, img: null, imgSrc: '', pix: null, pixFor: null };
    function paintBackground(theme) {
      const T = TH[theme] || TH.glass;
      if (!r.bg) r.bg = document.createElement('canvas');
      r.bg.width = CW * r.dpr; r.bg.height = CH * r.dpr;
      const b = r.bg.getContext('2d');
      b.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);
      const g = b.createLinearGradient(0, 0, CW, CH);
      g.addColorStop(0, T.bg[0]); g.addColorStop(1, T.bg[1]);
      b.fillStyle = g; b.fillRect(0, 0, CW, CH);
      if (T.blur && r.img) { b.save(); b.globalAlpha = 0.45; b.filter = 'blur(14px) saturate(1.7)'; b.drawImage(r.img, -20, -20 - (CW - CH) / 2, CW + 40, CW + 40); b.restore(); }
      if (T.veil) { b.fillStyle = 'rgba(255,255,255,.05)'; b.fillRect(0, 0, CW, CH); }
      if (T.deco) T.deco(b);
      r.bgImg = r.img;
    }
    function loadArt(src) {
      if (!src) return;
      const set = (im) => { if (r.imgSrc === src) r.img = im; };
      const load = (u, cors, fail) => {
        const im = new Image();
        if (cors) im.crossOrigin = 'anonymous';
        im.onload = () => set(im); im.onerror = fail; im.src = u;
      };
      load(src, true, () => {
        try { chrome.runtime.sendMessage({ type: 'img', url: src }, (r) => { if (r && r.data) load(r.data, false, () => {}); }); } catch (_) { /* sin background */ }
      });
    }
    function draw() {
      const c = r.ctx;
      if (!c) return;
      const v = getView();
      const T = TH[v.theme] || TH.glass;
      if (v.art !== r.imgSrc) {
        r.imgSrc = v.art; r.img = null; r.pix = null;
        loadArt(v.art);
      }
      if (!r.bg || r.bgImg !== r.img) paintBackground(v.theme);
      c.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);
      c.drawImage(r.bg, 0, 0, CW, CH);
      // carátula
      c.save(); roundRect(c, 12, 12, 56, 56, T.artR); c.clip();
      if (r.img) {
        let src = r.img;
        if (T.pixelArt) { // pixelar: se reduce a 14x14 y se amplía sin suavizar
          if (!r.pix || r.pixFor !== r.img) { const p = document.createElement('canvas'); p.width = p.height = 14; p.getContext('2d').drawImage(r.img, 0, 0, 14, 14); r.pix = p; r.pixFor = r.img; }
          src = r.pix; c.imageSmoothingEnabled = false;
        }
        if (T.gray) c.filter = 'grayscale(1) contrast(1.25)';
        c.drawImage(src, 12, 12, 56, 56);
        c.filter = 'none';
        if (T.tint) { c.globalCompositeOperation = 'multiply'; c.fillStyle = T.tint; c.fillRect(12, 12, 56, 56); }
      } else { const a = c.createLinearGradient(12, 12, 68, 68); a.addColorStop(0, T.artBorder || '#7c8cff'); a.addColorStop(1, T.artBorder ? T.bg[1] : '#c77dff'); c.fillStyle = a; c.fillRect(12, 12, 56, 56); }
      c.restore();
      if (T.artBorder) { c.strokeStyle = T.artBorder; c.lineWidth = 2; c.strokeRect(12, 12, 56, 56); }
      c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      const tx = 80, tw = CW - tx - 12;
      const tt = (T.prefix || '') + (T.upper ? v.title.toUpperCase() : v.title), ta = T.upper ? v.artist.toUpperCase() : v.artist;
      if (T.shadow || T.glow) { c.shadowColor = T.glow || T.shadow; c.shadowBlur = T.glow ? 8 : 4; }
      c.fillStyle = T.fg; c.font = T.tw + ' 17px ' + T.font;
      drawMarquee(c, tt, tx, 29, tw, 17);
      c.shadowBlur = 0; c.fillStyle = T.fg2; c.font = '13px ' + T.font;
      drawMarquee(c, ta, tx, 47, tw, 13);
      // barra de progreso + tiempos (los controles son los nativos de la ventana)
      const live = v.media && v.media.duration === Infinity;
      const p = !v.media ? 0 : live ? 1 : v.media.duration > 0 ? Math.min(1, v.media.currentTime / v.media.duration) : 0;
      const by = 56, bh = T.barH, R = T.barR;
      c.fillStyle = T.track; roundRect(c, tx, by, tw, bh, R); c.fill();
      if (p > 0) {
        let fill = T.bar[0];
        if (T.bar.length > 1) { fill = c.createLinearGradient(tx, 0, tx + tw, 0); T.bar.forEach((col, i) => fill.addColorStop(i / (T.bar.length - 1), col)); }
        c.fillStyle = fill;
        if (T.glow) { c.shadowColor = T.glow; c.shadowBlur = 6; }
        if (T.seg) { const n = Math.round(tw * p / (T.seg + 2)); for (let i = 0; i < n; i++) c.fillRect(tx + i * (T.seg + 2), by, T.seg, bh); }
        else { roundRect(c, tx, by, Math.max(bh, tw * p), bh, R); c.fill(); }
        c.shadowBlur = 0;
      }
      c.fillStyle = T.time; c.font = '11px ' + T.font;
      c.fillText(v.media ? fmt(v.media.currentTime) : '0:00', tx, 73);
      c.textAlign = 'right'; c.fillText(live || !v.media ? '' : fmt(v.media.duration), tx + tw, 73); c.textAlign = 'left';
    }
    return {
      get dpr() { return r.dpr; },
      attach(ctx) { r.ctx = ctx; },
      // Cambia la resolución (el fondo cacheado debe repintarse).
      setDpr(n) { r.dpr = n; r.bgImg = undefined; },
      // Fuerza repintar el fondo (cambio de diseño).
      invalidate() { r.bgImg = undefined; },
      release() { r.ctx = null; r.dpr = DPR0; r.bgImg = undefined; },
      draw,
    };
  };
})();
