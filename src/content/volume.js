(() => {
  const NMP = (globalThis.__NMP ||= {});
  const { VOL_PREFIX } = NMP.cfg;

  // Volumen recordado por sitio: una clave por hostname (mp_vol:<host>) para que dos pestañas de sitios distintos no se pisen.
  const KEY = VOL_PREFIX + location.hostname, MAX = 200;
  let saved; // undefined mientras este sitio no tenga volumen guardado

  // shortcut: al pasar de MAX sitios se borran otros cualesquiera, no los menos usados; guarda la fecha de uso si llega a importar.
  const trim = () => chrome.storage.local.get(null).then((all) => {
    const ks = Object.keys(all).filter((k) => k.startsWith(VOL_PREFIX) && k !== KEY);
    if (ks.length >= MAX) return chrome.storage.local.remove(ks.slice(0, ks.length - MAX + 1));
  }).catch(() => {});

  NMP.siteVol = {
    key: KEY,
    get: () => saved,
    // Valor leído de chrome.storage (al arrancar o porque otra pestaña del mismo sitio lo cambió); cualquier cosa que no sea número lo borra.
    adopt(v) { saved = typeof v === 'number' ? v : undefined; },
    save(v) {
      const isNew = saved === undefined;
      saved = Math.round(v * 100) / 100;
      try { chrome.storage.local.set({ [KEY]: saved }); if (isNew) trim(); } catch (_) { /* contexto invalidado */ }
    },
  };
})();
