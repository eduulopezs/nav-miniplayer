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
    brutal: { ...art, font: MONO, tw: 700, upper: true, bg: [K.brutal['bg-a'], K.brutal['bg-b']], artR: 0, artBorder: K.brutal.ac, gray: true, tint: K.brutal['mini-tint'], fg: K.brutal.fg, fg2: K.brutal['mini-fg-2'], time: K.brutal.ac,
      track: K.brutal['mini-track'], bar: [K.brutal.bar], barH: 2, barR: 0,
      deco(b) {
        const k = K.brutal;
        b.fillStyle = k.dot;
        for (let x = 1; x < CW; x += 9) for (let y = 1; y < CH; y += 9) b.fillRect(x, y, 1, 1);
        b.strokeStyle = k.line; b.lineWidth = 1; b.strokeRect(.5, .5, CW - 1, CH - 1);
        b.fillStyle = k.ac;
        for (let x = 0; x <= 228; x += 6) b.fillRect(80 + x, x % 30 ? 60 : 59, 1, x % 30 ? 2 : 4);
        b.fillRect(CW - 50, 4, 38, 11); b.fillStyle = k.ink; b.font = '700 8px ' + MONO; b.textBaseline = 'alphabetic'; b.fillText('ACTIVE', CW - 47, 12.5);
        b.fillStyle = k.ac; b.font = '12px ' + MONO; b.fillText('+', 3, CH - 3);
      } },
    pixel: { ...art, font: '"Lucida Console","Courier New",monospace', tw: 700, upper: true, bg: [K.pixel['bg-a'], K.pixel['bg-b']], artR: 0, artBorder: K.pixel.frame, pixelArt: true, gray: true, tint: K.pixel['mini-tint'], fg: K.pixel.fg, fg2: K.pixel['fg-2'], time: K.pixel['mini-time'],
      track: K.pixel.track, bar: [K.pixel.bar], barH: 6, barR: 0, seg: 5,
      deco(b) {
        const k = K.pixel;
        b.fillStyle = k.frame;
        b.fillRect(3, 0, CW - 6, 2); b.fillRect(3, CH - 2, CW - 6, 2); b.fillRect(0, 3, 2, CH - 6); b.fillRect(CW - 2, 3, 2, CH - 6);
        b.fillRect(2, 2, 1, 1); b.fillRect(CW - 3, 2, 1, 1); b.fillRect(2, CH - 3, 1, 1); b.fillRect(CW - 3, CH - 3, 1, 1);
        b.strokeStyle = k['frame-2']; b.lineWidth = 1; b.strokeRect(5.5, 5.5, CW - 11, CH - 11);
        b.fillStyle = k.corner; b.fillRect(0, 0, 3, 3); b.fillRect(CW - 3, 0, 3, 3); b.fillRect(0, CH - 3, 3, 3); b.fillRect(CW - 3, CH - 3, 3, 3);
      } },
    retro: { ...art, font: '"Lucida Console",Consolas,monospace', tw: 700, upper: true, prefix: '> ', bg: [K.retro['bg-a'], K.retro['bg-b']], artR: 0, artBorder: K.retro['fg-2'], gray: true, tint: K.retro['mini-tint'], fg: K.retro.fg, fg2: K.retro['fg-2'], time: K.retro['mini-time'],
      track: K.retro.track, bar: [K.retro.bar], barH: 5, barR: 0, glow: K.retro.glow,
      deco(b) {
        const k = K.retro;
        const v = b.createRadialGradient(CW / 2, CH / 2, 14, CW / 2, CH / 2, CW * .62);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, k['mini-vignette']);
        b.fillStyle = v; b.fillRect(0, 0, CW, CH);
        b.strokeStyle = k.line; b.lineWidth = 2; b.strokeRect(1, 1, CW - 2, CH - 2);
        b.fillStyle = k.scan; for (let y = 0; y < CH; y += 3) b.fillRect(0, y, CW, 1);
      } },
  };

  NMP.themes = TH;
})();
