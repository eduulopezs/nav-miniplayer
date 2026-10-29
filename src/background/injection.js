// Única fuente de los scripts que la extensión inyecta en las páginas. Hoy el manifiesto los declara como content_scripts estáticos
// (scripts/check.mjs comprueba que coincidan con estos grupos); injectInto los inyecta a mano en una pestaña ya abierta.
(() => {
  const GROUPS = [
    // Agente sin interfaz de los iframes.
    { id: 'agent', js: ['src/content/frame-agent.js'], allFrames: true, runAt: 'document_idle' },
    // Puente de Media Session: comparte contexto con la página y necesita llegar antes que sus scripts.
    { id: 'bridge', js: ['src/page/media-session-bridge.js'], allFrames: true, runAt: 'document_start', world: 'MAIN' },
    // Interfaz del reproductor, solo en el marco superior.
    {
      id: 'ui', allFrames: false, runAt: 'document_idle',
      js: [
        'src/content/config.js',
        'src/content/util.js',
        'src/content/media.js',
        'src/content/storyboard.js',
        'src/content/tokens.js',
        'src/content/fonts.js',
        'src/content/viz.js',
        'src/content/skins/noir.js',
        'src/content/skins/crt.js',
        'src/content/skins/glass.js',
        'src/content/skins/metal.js',
        'src/content/styles.js',
        'src/content/menu.js',
        'src/content/player.js',
      ],
    },
  ];

  // Inyecta los grupos en una pestaña ya cargada. executeScript no respeta runAt: el puente de MAIN llega tarde y no ve los
  // manejadores que la página registró antes (en un content script registrado sí llegaría a document_start).
  async function injectInto(tabId) {
    for (const g of GROUPS) {
      await chrome.scripting.executeScript({ target: { tabId, allFrames: g.allFrames }, files: g.js, world: g.world || 'ISOLATED' });
    }
  }

  // ---- Registro dinámico: sustituye a los content_scripts estáticos del manifiesto. Los scripts registrados corren en cada carga
  // (puente de MAIN incluido, a document_start) solo en los orígenes a los que el usuario ha dado permiso.
  const PREFIX = 'nmp-';
  const registration = (g, matches) => ({
    id: PREFIX + g.id, matches, js: g.js, allFrames: g.allFrames, runAt: g.runAt, world: g.world || 'ISOLATED', persistAcrossSessions: true,
  });
  const shape = (s) => JSON.stringify([s.id, [...s.matches].sort(), s.js, !!s.allFrames, s.runAt, s.world || 'ISOLATED']);

  // Deja registrados exactamente los grupos que tocan para los orígenes concedidos (ninguno si no hay permiso). Las llamadas se encadenan:
  // dos reconciliaciones a la vez chocarían al registrar el mismo id.
  let queue = Promise.resolve();
  async function run() {
    const { origins = [] } = await chrome.permissions.getAll();
    const ours = (await chrome.scripting.getRegisteredContentScripts()).filter((s) => s.id.startsWith(PREFIX));
    const want = origins.length ? GROUPS.map((g) => registration(g, origins)) : [];
    if (ours.length === want.length && want.every((w) => ours.some((o) => shape(o) === shape(w)))) return;
    if (ours.length) await chrome.scripting.unregisterContentScripts({ ids: ours.map((s) => s.id) });
    if (want.length) await chrome.scripting.registerContentScripts(want);
  }
  const reconcile = () => (queue = queue.then(run, run));

  // Pestañas que ya estaban abiertas cuando se concedió el permiso: los scripts registrados solo afectan a las cargas siguientes.
  async function injectOpen(origins) {
    const tabs = await chrome.tabs.query({ url: origins });
    await Promise.all(tabs.filter((t) => t.id != null).map((t) => injectInto(t.id).catch(() => {})));
  }

  self.NMPInject = { GROUPS, injectInto, reconcile, injectOpen };
})();
