(() => {
  const NMP = (globalThis.__NMP ||= {});

  const { CW, CH, FONT } = NMP.cfg;
  const K = NMP.tokens.theme;

  // Paletas del canvas de Mini, una por diseño (las mismas ideas que el CSS de la tarjeta). Los colores salen de los tokens (design/tokens.json).
  const MONO = '"Cascadia Mono",Consolas,"Lucida Console",monospace';
  const art = { artA: K.glass['mini-art-a'], artB: K.glass['mini-art-b'], artShade: K.glass['mini-art-shade'] }; // carátula vacía y velo de pausa, iguales en todos los diseños
  const TH = {
    glass: { ...art, font: FONT, tw: 600, bg: [K.glass['bg-a'], K.glass['bg-b']], blur: true, veil: K.glass['mini-veil'], artR: 13, fg: K.glass.text, fg2: K.glass['mini-fg-2'], time: K.glass['mini-time'],
      track: K.glass['mini-track'], bar: [K.glass['bar-1'], K.glass['bar-2'], K.glass['bar-3']], barH: 4, barR: 2, shadow: K.glass['mini-shadow'] },
    noir: { ...art, font: '"Archivo Narrow","Segoe UI",system-ui,sans-serif', tw: 700, upper: true, bg: [K.noir['mini-bg-a'], K.noir['mini-bg-b']], artR: 0, artBorder: K.noir['mini-bar'], gray: true, fg: K.noir['mini-fg'], fg2: K.noir['mini-fg-2'], time: K.noir['mini-time'],
      track: K.noir['mini-track'], bar: [K.noir['mini-bar']], barH: 3, barR: 0 },
    crt: { ...art, font: '"Lucida Console",Consolas,monospace', tw: 700, upper: true, prefix: '> ', bg: [K.crt['mini-bg-a'], K.crt['mini-bg-b']], artR: 0, artBorder: K.crt['mini-fg-2'], gray: true, tint: K.crt['mini-bar'] + '', fg: K.crt['mini-fg'], fg2: K.crt['mini-fg-2'], time: K.crt['mini-time'],
      track: K.crt['mini-track'], bar: [K.crt['mini-bar']], barH: 5, barR: 0, glow: K.crt['mini-glow'],
      deco(b) {
        const k = K.crt;
        const v = b.createRadialGradient(CW / 2, CH / 2, 14, CW / 2, CH / 2, CW * .62);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, k['mini-vignette']);
        b.fillStyle = v; b.fillRect(0, 0, CW, CH);
        b.fillStyle = k['mini-scan']; for (let y = 0; y < CH; y += 3) b.fillRect(0, y, CW, 1);
      } },
    metal: { ...art, font: '"Montserrat","Segoe UI",system-ui,sans-serif', tw: 700, blur: true, bg: [K.metal['mini-bg-a'], K.metal['mini-bg-b']], artR: 14, fg: K.metal['mini-fg'], fg2: K.metal['mini-fg-2'], time: K.metal['mini-time'],
      track: K.metal['mini-track'], bar: [K.metal['mini-bar-1'], K.metal['mini-bar-2'], K.metal['mini-bar-3']], barH: 4, barR: 2, shadow: K.glass['mini-shadow'] },
  };

  NMP.themes = TH;
})();
