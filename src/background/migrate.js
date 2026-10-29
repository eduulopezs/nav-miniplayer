// Migración de las claves de chrome.storage.local con versión de esquema (mp_schema). Se ejecuta al instalar o actualizar la extensión.
// Cada paso lleva el almacenamiento de la versión n a la n+1; para añadir uno basta agregar su función al final de STEPS.
(() => {
  const SCHEMA_KEY = 'mp_schema';
  const SKIPS = [5, 10, 15, 30];
  const THEMES = ['glass', 'noir', 'crt', 'metal'];
  const LEGACY_THEME = { brutal: 'noir', retro: 'crt', pixel: 'glass' };

  const STEPS = [
    // 1: normaliza los ajustes existentes y retira los de los modos Mini y Tarjeta.
    (s) => {
      const out = { set: {}, remove: ['mp_mode', 'mp_pos', 'mp_size'] };
      const p = s.mp_prefs;
      if (p && typeof p === 'object') out.set.mp_prefs = { skip: SKIPS.includes(p.skip) ? p.skip : 10, blur: p.blur === true };
      else if (p !== undefined) out.remove.push('mp_prefs');
      if (s.mp_theme !== undefined) {
        const t = LEGACY_THEME[s.mp_theme] || s.mp_theme;
        if (THEMES.includes(t)) out.set.mp_theme = t; else out.remove.push('mp_theme');
      }
      if (s.mp_capture !== undefined && typeof s.mp_capture !== 'boolean') out.remove.push('mp_capture');
      return out;
    },
  ];

  async function migrate() {
    const stored = await chrome.storage.local.get(null);
    let v = Number.isInteger(stored[SCHEMA_KEY]) ? stored[SCHEMA_KEY] : 0;
    if (v >= STEPS.length) return v;
    const set = {}, remove = new Set(), view = { ...stored };
    for (; v < STEPS.length; v++) {
      const r = STEPS[v](view);
      Object.assign(set, r.set); Object.assign(view, r.set);
      for (const k of r.remove) { remove.add(k); delete view[k]; }
    }
    for (const k of Object.keys(set)) remove.delete(k);
    if (remove.size) await chrome.storage.local.remove([...remove]);
    await chrome.storage.local.set({ ...set, [SCHEMA_KEY]: STEPS.length });
    return STEPS.length;
  }

  self.NMPMigrate = { migrate, SCHEMA: STEPS.length, SCHEMA_KEY };
})();
