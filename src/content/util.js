(() => {
  const NMP = (globalThis.__NMP ||= {});

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const fmt = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    s = Math.floor(s);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0');
  };

  NMP.util = { clamp, fmt };
})();
