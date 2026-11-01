(() => {
  const NMP = (globalThis.__NMP ||= {});

  // Fuentes de cada diseño (SIL OFL, en src/fonts). Se piden al service worker, que las lee de la propia extensión: así no hay recursos
  // accesibles desde las páginas ni dependencia de la CSP del sitio, y solo se descarga lo que el diseño activo usa.
  // [familia, peso, archivo]
  const FILES = {
    noir: [['Archivo Narrow', 500, 'archivo-narrow-latin-500'], ['Archivo Narrow', 700, 'archivo-narrow-latin-700'], ['Space Mono', 400, 'space-mono-latin-400'], ['Space Mono', 700, 'space-mono-latin-700']],
    crt: [['JetBrains Mono', 400, 'jetbrains-mono-latin-400'], ['JetBrains Mono', 700, 'jetbrains-mono-latin-700'], ['VT323', 400, 'vt323-latin-400']],
    ansi: [['JetBrains Mono', 400, 'jetbrains-mono-latin-400'], ['JetBrains Mono', 700, 'jetbrains-mono-latin-700']],
    dynamic: [['Figtree', 500, 'figtree-latin-500'], ['Figtree', 700, 'figtree-latin-700']],
    minimal: [['Figtree', 500, 'figtree-latin-500'], ['Figtree', 700, 'figtree-latin-700']],
    glass: [['Figtree', 500, 'figtree-latin-500'], ['Figtree', 700, 'figtree-latin-700']],
    metal: [['Montserrat', 300, 'montserrat-latin-300'], ['Montserrat', 400, 'montserrat-latin-400'], ['Syne', 700, 'syne-latin-700'], ['Figtree', 500, 'figtree-latin-500'], ['Figtree', 700, 'figtree-latin-700']],
  };
  NMP.fontFiles = FILES; // la ventana aparte (página de la extensión) las carga directamente desde src/fonts
  const done = new Set(), faces = [], docs = new WeakMap(); // faces: las ya descargadas; docs: documento -> las que ya tiene
  const b64 = (s) => { const bin = atob(s), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out.buffer; };

  // Registra en `doc` las fuentes descargadas. La ventana flotante (Document PiP) es otro documento y no hereda las de la página:
  // se llama también con el suyo cuando el reproductor se mueve allí.
  NMP.syncFonts = (doc) => {
    let have = docs.get(doc); if (!have) docs.set(doc, have = new Set());
    const F = (doc.defaultView && doc.defaultView.FontFace) || FontFace;
    for (const f of faces) {
      if (have.has(f)) continue;
      have.add(f);
      try {
        const face = new F(f.family, f.buf.slice(0), { weight: String(f.weight), display: 'swap' });
        face.load().then(() => doc.fonts.add(face), () => {});
      } catch (_) { /* fuente no válida */ }
    }
  };

  // Carga las fuentes de un diseño en document.fonts (las ve el shadow DOM). Si falla, el diseño usa sus tipografías de respaldo.
  NMP.loadFonts = (skin, onReady) => {
    for (const [family, weight, file] of FILES[skin] || []) {
      if (done.has(file)) continue;
      done.add(file);
      try {
        chrome.runtime.sendMessage({ type: 'font', file }, (r) => {
          void chrome.runtime.lastError;
          if (!r || typeof r.data !== 'string') { done.delete(file); return; }
          faces.push({ family, weight, buf: b64(r.data) });
          NMP.syncFonts(document); if (onReady) onReady();
        });
      } catch (_) { done.delete(file); /* contexto invalidado */ }
    }
  };
})();
