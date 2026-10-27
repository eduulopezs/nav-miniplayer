(() => {
  const NMP = (globalThis.__NMP ||= {});

  const { CW, CH, FONT } = NMP.cfg;

  // Paletas del canvas de Mini, una por diseño (las mismas ideas que el CSS de la tarjeta).
  const MONO = '"Cascadia Mono",Consolas,"Lucida Console",monospace';
  const TH = {
    glass: { font: FONT, tw: 600, bg: ['#3a3a52', '#1b1b24'], blur: true, veil: true, artR: 13, fg: '#fff', fg2: 'rgba(255,255,255,.68)', time: 'rgba(255,255,255,.7)',
      track: 'rgba(255,255,255,.18)', bar: ['#8ec5ff', '#c9a7ff', '#ffb0e0'], barH: 4, barR: 2, shadow: 'rgba(0,0,0,.35)' },
    brutal: { font: MONO, tw: 700, upper: true, bg: ['#1b1727', '#121019'], artR: 0, artBorder: '#b8aaf0', gray: true, tint: '#b8aaf0', fg: '#cfc4fa', fg2: 'rgba(184,170,240,.65)', time: '#b8aaf0',
      track: 'rgba(184,170,240,.25)', bar: ['#cfc4fa'], barH: 2, barR: 0,
      deco(b) {
        b.fillStyle = 'rgba(184,170,240,.16)';
        for (let x = 1; x < CW; x += 9) for (let y = 1; y < CH; y += 9) b.fillRect(x, y, 1, 1);
        b.strokeStyle = 'rgba(184,170,240,.7)'; b.lineWidth = 1; b.strokeRect(.5, .5, CW - 1, CH - 1);
        b.fillStyle = '#b8aaf0';
        for (let x = 0; x <= 228; x += 6) b.fillRect(80 + x, x % 30 ? 60 : 59, 1, x % 30 ? 2 : 4);
        b.fillRect(CW - 50, 4, 38, 11); b.fillStyle = '#15111f'; b.font = '700 8px ' + MONO; b.textBaseline = 'alphabetic'; b.fillText('ACTIVE', CW - 47, 12.5);
        b.fillStyle = '#b8aaf0'; b.font = '12px ' + MONO; b.fillText('+', 3, CH - 3);
      } },
    pixel: { font: '"Lucida Console","Courier New",monospace', tw: 700, upper: true, bg: ['#10160f', '#10160f'], artR: 0, artBorder: '#e6e2b8', pixelArt: true, gray: true, tint: '#8fcf55', fg: '#e6e2b8', fg2: '#8fcf55', time: '#a4d65e',
      track: '#2d3a26', bar: ['#6db33f'], barH: 6, barR: 0, seg: 5,
      deco(b) {
        b.fillStyle = '#e6e2b8';
        b.fillRect(3, 0, CW - 6, 2); b.fillRect(3, CH - 2, CW - 6, 2); b.fillRect(0, 3, 2, CH - 6); b.fillRect(CW - 2, 3, 2, CH - 6);
        b.fillRect(2, 2, 1, 1); b.fillRect(CW - 3, 2, 1, 1); b.fillRect(2, CH - 3, 1, 1); b.fillRect(CW - 3, CH - 3, 1, 1);
        b.strokeStyle = '#6db33f'; b.lineWidth = 1; b.strokeRect(5.5, 5.5, CW - 11, CH - 11);
        b.fillStyle = '#000'; b.fillRect(0, 0, 3, 3); b.fillRect(CW - 3, 0, 3, 3); b.fillRect(0, CH - 3, 3, 3); b.fillRect(CW - 3, CH - 3, 3, 3);
      } },
    retro: { font: '"Lucida Console",Consolas,monospace', tw: 700, upper: true, prefix: '> ', bg: ['#0a2a1b', '#03100a'], artR: 0, artBorder: '#2fd88c', gray: true, tint: '#3dffa0', fg: '#4dffb0', fg2: '#2fd88c', time: '#4dffb0',
      track: 'rgba(77,255,176,.22)', bar: ['#4dffb0'], barH: 5, barR: 0, glow: '#2dff9c',
      deco(b) {
        const v = b.createRadialGradient(CW / 2, CH / 2, 14, CW / 2, CH / 2, CW * .62);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.62)');
        b.fillStyle = v; b.fillRect(0, 0, CW, CH);
        b.strokeStyle = '#1d5a3c'; b.lineWidth = 2; b.strokeRect(1, 1, CW - 2, CH - 2);
        b.fillStyle = 'rgba(0,0,0,.28)'; for (let y = 0; y < CH; y += 3) b.fillRect(0, y, CW, 1);
      } },
  };

  NMP.themes = TH;
})();
