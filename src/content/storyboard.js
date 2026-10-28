(() => {
  const NMP = (globalThis.__NMP ||= {});

  // Storyboard de YouTube: la miniatura bajo el puntero sale de hojas de sprites (varias miniaturas por imagen). El spec lo lee el puente
  // del mundo de la página, así que es entrada hostil: aquí se valida campo a campo y solo se construyen URL con la plantilla del spec.
  // Formato: `base|w#h#total#columnas#filas#intervaloMs#nombre#firma|...` (un nivel de calidad por cada `|`); la base lleva `$L` y `$N`.
  const MAX_SPEC = 4000;
  const MIN_THUMB_W = 100; // se prefiere el nivel más pequeño que llegue a este ancho
  const int = (s, min, max) => (/^\d{1,7}$/.test(s) && +s >= min && +s <= max ? +s : 0);

  function parse(spec) {
    if (typeof spec !== 'string' || spec.length > MAX_SPEC) return null;
    const [base, ...rows] = spec.split('|');
    if (!/^https:\/\/[^\s#]+$/.test(base) || !base.includes('$L') || !base.includes('$N')) return null;
    const levels = [];
    rows.forEach((row, i) => {
      const f = row.split('#');
      if (f.length < 8) return;
      const lv = { l: i, w: int(f[0], 20, 400), h: int(f[1], 20, 400), n: int(f[2], 1, 20000), c: int(f[3], 1, 20), r: int(f[4], 1, 20), ms: f[5] === '0' ? 0 : int(f[5], 1, 3.6e6), name: f[6], sigh: f[7] };
      if (!lv.w || !lv.h || !lv.n || !lv.c || !lv.r || (f[5] !== '0' && !lv.ms)) return;
      if (!/^[\w$.-]{1,40}$/.test(lv.name) || !/^[\w$.-]{1,200}$/.test(lv.sigh)) return;
      levels.push(lv);
    });
    if (!levels.length) return null;
    levels.sort((a, b) => a.w - b.w);
    const level = levels.find((l) => l.w >= MIN_THUMB_W) || levels[levels.length - 1];
    return { base, level };
  }

  // Hoja, columna y fila de la miniatura que corresponde al segundo `t` de un vídeo de `duration` s.
  function locate(sb, t, duration) {
    const { level: v } = sb;
    if (!(duration > 0) || !isFinite(t)) return null;
    const step = v.ms || (duration * 1000) / v.n;
    const idx = Math.max(0, Math.min(v.n - 1, Math.floor((t * 1000) / step)));
    const per = v.c * v.r, at = idx % per;
    return { sheet: Math.floor(idx / per), col: at % v.c, row: Math.floor(at / v.c) };
  }

  function sheetUrl(sb, sheet) {
    const { level: v } = sb;
    const url = sb.base.replace('$L', () => v.l).replace('$N', () => v.name.replace('$M', () => sheet));
    return url + (url.includes('?') ? '&' : '?') + 'sigh=' + encodeURIComponent(v.sigh);
  }

  NMP.storyboard = { parse, locate, sheetUrl };
})();
