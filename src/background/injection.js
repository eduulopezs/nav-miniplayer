// Única fuente de los scripts que la extensión inyecta en las páginas. El manifiesto no declara content_scripts: se registran
// dinámicamente (reconcile) para los orígenes concedidos, e injectInto los inyecta a mano en una pestaña ya abierta.
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

  // ¿Qué grupos lleva ya la pestaña? Evita reinyectar: repetir los archivos de la interfaz sobreescribiría NMP.* mientras
  // player.js conserva las referencias antiguas.
  const present = async (tabId) => {
    const probe = (world, func) => chrome.scripting.executeScript({ target: { tabId }, world, func }).then(([r]) => !!(r && r.result), () => false);
    return {
      ui: await probe('ISOLATED', () => !!(globalThis.__NMP && globalThis.__NMP.toggle)),
      bridge: await probe('MAIN', () => typeof MediaSession !== 'undefined' && !!MediaSession.prototype.setActionHandler[Symbol.for('nmp.bridge')]),
    };
  };

  // Inyecta los grupos que falten en una pestaña ya cargada. executeScript no respeta runAt: el puente de MAIN llega tarde y no ve los
  // manejadores que la página registró antes (en un content script registrado sí llegaría a document_start).
  // Un grupo que falla (p. ej. allFrames con iframes de otro origen bajo activeTab) no impide los demás; solo falla la llamada si falla la interfaz.
  // Devuelve true si el puente de MAIN se inyectó ahora (llega tarde); false si la pestaña ya lo tenía.
  async function injectInto(tabId) {
    const have = await present(tabId);
    let uiError = null;
    for (const g of GROUPS) {
      if (have[g.id]) continue;
      try {
        await chrome.scripting.executeScript({ target: { tabId, allFrames: g.allFrames }, files: g.js, world: g.world || 'ISOLATED' });
      } catch (e) { if (g.id === 'ui') uiError = e; }
    }
    if (uiError) throw uiError;
    return !have.bridge;
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

  // ¿Hay que llevar al usuario a Ajustes tras onInstalled si falta el permiso de host? En una instalación nueva, siempre. En una actualización,
  // solo desde antes de 1.15.0 (host_permissions obligatorio): quien ya tenía 1.15+ pudo retirar el permiso a propósito.
  function promptsAccess(d) {
    if (d.reason === 'install') return true;
    if (d.reason !== 'update' || !/^\d+\.\d+/.test(d.previousVersion || '')) return false;
    const [maj, min] = d.previousVersion.split('.').map(Number);
    return maj < 1 || (maj === 1 && min < 15);
  }

  self.NMPInject = { GROUPS, injectInto, reconcile, injectOpen, promptsAccess };
})();
