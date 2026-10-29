(() => {
  const NMP = (globalThis.__NMP ||= {});

  // Texto localizado (_locales). Si falta la clave o no hay chrome.i18n (pruebas), devuelve la clave.
  const t = (key, subs) => { try { return chrome.i18n.getMessage(key, subs) || key; } catch (_) { return ''; } };

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const fmt = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    s = Math.floor(s);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0');
  };

  const pad2 = (n) => String(n).padStart(2, '0');
  // m:ss o h:mm:ss con minutos a dos cifras (lo usan CRT y Noir).
  const fmt2 = (s) => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? String(h) + ':' : '') + pad2(h ? m : m) + ':' + pad2(x); };
  // Ruido determinista en [0, 1) a partir de dos enteros (no usa Math.random: el visualizador se ve igual entre fotogramas y entre pestañas).
  const hash = (a, b) => { let x = (a * 374761393 + b * 668265263) >>> 0; x = (x ^ (x >>> 13)) * 1274126177 >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
  const strSeed = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  // Código de barras determinista por semilla (Noir lo usa como barra de progreso).
  function barcode(seed) {
    let x = (seed + 1) * 2654435761 >>> 0; const rnd = () => (x = (x * 1664525 + 1013904223) >>> 0) / 4294967296;
    let pos = 0, on = true; const stops = [], total = 100;
    while (pos < total) { const w = on ? 0.5 + Math.floor(rnd() * 4) * 0.5 : 0.5 + Math.floor(rnd() * 3) * 0.5; const e = Math.min(total, pos + w); stops.push(`${on ? '#000' : 'transparent'} ${pos}% ${e}%`); pos = e; on = !on; }
    return `linear-gradient(90deg, ${stops.join(',')})`;
  }

  // Tres colores dominantes de una carátula (vivos y distintos entre sí) para teñir los diseños. Devuelve null si el canvas está contaminado.
  const DEFAULT_PAL = ['#ffb36b', '#e0475b', '#7c5cff'];

  // Contraste WCAG entre dos colores [r,g,b] opacos, y ajuste de un color hasta alcanzar un mínimo contra un fondo (se aclara sobre fondo oscuro y se oscurece sobre fondo claro).
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  function ensureContrast(rgb, bg, min = 3) {
    const to = lum(bg) < .5 ? 255 : 0;
    for (let t = 0; t <= 1.001; t += .05) {
      const c = rgb.map((v) => Math.round(v + (to - v) * t));
      if (contrast(c, bg) >= min) return c;
    }
    return [to, to, to];
  }

  // bg: fondo (#rrggbb) sobre el que se dibujan los colores; si se da, cada uno se ajusta a 3:1 como mínimo.
  function palette(img, bg) {
    try {
      const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(16, 16) : Object.assign(document.createElement('canvas'), { width: 16, height: 16 });
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 16, 16);
      const d = g.getImageData(0, 0, 16, 16).data, px = [];
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2, dl = mx - mn;
        const s = dl === 0 ? 0 : dl / (1 - Math.abs(2 * l - 1));
        let h = 0; if (dl) h = mx === r ? ((gg - b) / dl) % 6 : mx === gg ? (b - r) / dl + 2 : (r - gg) / dl + 4; h = (h * 60 + 360) % 360;
        px.push({ h, s, l, score: s * (1 - Math.abs(2 * l - 1)) + .02, c: [d[i], d[i + 1], d[i + 2]] });
      }
      px.sort((a, b) => b.score - a.score);
      const pick = [px[0]], hd = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
      for (const p of px) { if (pick.length >= 3) break; if (pick.every((q) => hd(q.h, p.h) > 35)) pick.push(p); }
      const back = bg && rgbOf(bg);
      const hex = (p) => '#' + (back ? ensureContrast(p.c, back) : p.c).map((v) => v.toString(16).padStart(2, '0')).join('');
      const out = pick.map(hex);
      while (out.length < 3) out.push(DEFAULT_PAL[out.length]);
      return out;
    } catch (_) { return null; }
  }

  NMP.t = t;
  NMP.util = { clamp, fmt, fmt2, pad2, hash, strSeed, barcode, palette, DEFAULT_PAL, contrast, ensureContrast, rgbOf };
})();
