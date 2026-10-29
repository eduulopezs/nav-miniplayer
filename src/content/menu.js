(() => {
  const NMP = (globalThis.__NMP ||= {});

  // Menú del reproductor (clic derecho sobre la tarjeta): volumen, velocidad, salto, diseño y copiar enlace.
  // Vive en el shadow root, fuera de la tarjeta (que recorta lo que sobresale), y se coloca debajo de ella o encima si no cabe.
  // Todo el contenido lo crea la extensión: nada de lo que escribe la página entra por innerHTML.
  NMP.menuCss = `
  .menu { position: absolute; left: 0; top: 0; z-index: 10; width: 248px; max-height: calc(100vh - 16px); overflow-y: auto; padding: 10px; display: none; flex-direction: column; gap: 8px; border-radius: 14px;
    background: rgba(24, 24, 32, .96); color: #f2f2f6; font: 500 12px/1.3 "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
    box-shadow: 0 10px 30px rgba(0, 0, 0, .45), inset 0 0 0 1px rgba(255, 255, 255, .12); }
  .menu.open { display: flex; }
  .menu .mrow { display: flex; flex-direction: column; gap: 4px; }
  .menu .mrow > span { color: rgba(255, 255, 255, .7); font-size: 11px; }
  .menu .chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .menu button { all: unset; box-sizing: border-box; cursor: pointer; padding: 4px 8px; border-radius: 8px; background: rgba(255, 255, 255, .1); }
  .menu button:hover { background: rgba(255, 255, 255, .2); }
  .menu button[aria-pressed=true] { background: #f2f2f6; color: #181820; }
  .menu button:focus-visible, .menu input:focus-visible { outline: 2px solid #fff; outline-offset: 1px; }
  .menu .vol { display: flex; align-items: center; gap: 8px; }
  .menu input[type=range] { flex: 1; min-width: 0; accent-color: #f2f2f6; }
  .menu output { width: 34px; text-align: right; font-variant-numeric: tabular-nums; }
  .menu .sep { height: 1px; background: rgba(255, 255, 255, .12); }
  .menu [disabled], .menu .off { opacity: .4; pointer-events: none; }
  @media (prefers-reduced-motion: reduce) { .menu * { transition: none; } }
  `;

  const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
  const SKIPS = [5, 10, 15, 30];

  // o: { root, host, card, prefs, setPref(k, v), getMedia(), tunable(), setVolume(v), setRate(r), themes:[[id, texto]],
  //      getTheme(), setTheme(id), copyLink(), isPip() }
  NMP.createMenu = (o) => {
    const el = (tag, props = {}, kids = []) => { const n = document.createElement(tag); Object.assign(n, props); kids.forEach((k) => n.append(k)); return n; };
    const chips = (items, onPick, label) => {
      const g = el('div', { className: 'chips' }); g.setAttribute('role', 'group'); g.setAttribute('aria-label', label);
      for (const [v, text] of items) { const b = el('button', { type: 'button', textContent: text }); b.dataset.v = String(v); b.addEventListener('click', () => onPick(v)); g.append(b); }
      return g;
    };
    const row = (label, ...kids) => el('div', { className: 'mrow' }, [el('span', { textContent: label }), ...kids]);

    const vol = el('input', { type: 'range', min: 0, max: 100, step: 1 }); vol.setAttribute('aria-label', NMP.t('volume')); vol.dataset.m = 'vol';
    const volOut = el('output', { textContent: '100%' });
    const rate = chips(RATES.map((r) => [r, r + 'x']), (r) => { o.setRate(r); sync(); }, NMP.t('rate'));
    const skip = chips(SKIPS.map((s) => [s, s + ' s']), (s) => { o.setPref('skip', s); sync(); }, NMP.t('skip'));
    const theme = chips(o.themes, (id) => { o.setTheme(id); sync(); }, NMP.t('design'));
    const copy = el('button', { type: 'button', textContent: NMP.t('copyLink') }); copy.dataset.m = 'copy';

    const menu = el('div', { className: 'menu' });
    menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', NMP.t('playerOptions'));
    const volRow = row(NMP.t('volume'), el('div', { className: 'vol' }, [vol, volOut])), rateRow = row(NMP.t('rate'), rate);
    menu.append(volRow, rateRow, row(NMP.t('skip'), skip), el('div', { className: 'sep' }), row(NMP.t('design'), theme), el('div', { className: 'sep' }), copy);
    o.root.append(menu);

    const press = (g, v) => g.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
    function sync() {
      const m = o.getMedia(), ok = o.tunable();
      volRow.classList.toggle('off', !ok); rateRow.classList.toggle('off', !ok);
      const v = ok ? Math.round((m.muted ? 0 : m.volume) * 100) : 100;
      vol.value = String(v); volOut.textContent = v + '%';
      press(rate, ok ? m.playbackRate : 1); press(skip, o.prefs.skip); press(theme, o.getTheme());
    }
    vol.addEventListener('input', () => { o.setVolume(vol.value / 100); sync(); });
    copy.addEventListener('click', () => { o.copyLink(); close(); });
    // Teclas dentro del menú: Esc lo cierra y no llega a la página ni al reproductor.
    menu.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); close(); o.card.focus(); } });

    let isOpen = false;
    function open() {
      if (o.isPip()) return false; // la ventana con marco es demasiado pequeña: se queda el menú del navegador
      sync(); menu.classList.add('open'); isOpen = true;
      const cw = o.card.offsetWidth, ch = o.card.offsetHeight, mw = menu.offsetWidth, mh = menu.offsetHeight, r = o.card.getBoundingClientRect(), x = r.left, y = r.top, G = 8;
      // Coordenadas de la ventana: debajo de la tarjeta si cabe, si no encima y, si tampoco, pegado al borde; siempre dentro de la ventana.
      const left = x + mw + G <= innerWidth ? x : x + cw - mw;
      const top = y + ch + G + mh + G <= innerHeight ? y + ch + G : y - mh - G >= G ? y - mh - G : innerHeight - mh - G;
      menu.style.left = Math.max(G, Math.min(innerWidth - mw - G, left)) - x + 'px';
      menu.style.top = Math.max(G, top) - y + 'px';
      (vol.closest('.off') ? copy : vol).focus();
      return true;
    }
    function close() { if (isOpen) { isOpen = false; menu.classList.remove('open'); } }
    // Un clic fuera del reproductor, o una tecla Esc con el foco fuera, lo cierra.
    document.addEventListener('pointerdown', (e) => { if (isOpen && !e.composedPath().includes(o.host)) close(); }, true);
    window.addEventListener('blur', close);
    return { open, close, sync, isOpen: () => isOpen, menu };
  };
})();
