// Inyección de scripts (src/background/injection.js): registro dinámico, inyección manual, revocación del permiso y modo sin permiso.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, startServer, sleep } from './helpers.mjs';

let env, server;
before(async () => { env = await launch(); server = await startServer(); });
after(async () => { await env.close(); await server.close(); });

const ids = (sw) => sw.evaluate(async () => (await chrome.scripting.getRegisteredContentScripts()).map((s) => s.id).sort());
const tabOf = (sw, url) => sw.evaluate(async (u) => (await chrome.tabs.query({ url: u }))[0].id, url);
// ¿Hay interfaz del reproductor, agente y puente en la pestaña? (el puente vive en MAIN, la interfaz en el mundo aislado)
const has = (sw, tabId) => sw.evaluate(async (id) => {
  const [iso] = await chrome.scripting.executeScript({ target: { tabId: id }, func: () => !!globalThis.__NMP });
  const [main] = await chrome.scripting.executeScript({ target: { tabId: id }, world: 'MAIN', func: () => !/native code/.test(MediaSession.prototype.setActionHandler.toString()) });
  return { ui: iso.result, bridge: main.result };
}, tabId);

test('al arrancar con el permiso concedido quedan registrados los tres grupos', async () => {
  assert.deepEqual(await ids(env.sw), ['nmp-agent', 'nmp-bridge', 'nmp-ui']);
  const [bridge] = await env.sw.evaluate(() => chrome.scripting.getRegisteredContentScripts({ ids: ['nmp-bridge'] }));
  assert.equal(bridge.runAt, 'document_start');
  assert.equal(bridge.world, 'MAIN');
  assert.equal(bridge.persistAcrossSessions, true);
});

test('reconcile es idempotente y repara un registro que falta o está alterado', async () => {
  await env.sw.evaluate(() => self.NMPInject.reconcile());
  assert.deepEqual(await ids(env.sw), ['nmp-agent', 'nmp-bridge', 'nmp-ui']);
  await env.sw.evaluate(() => chrome.scripting.unregisterContentScripts({ ids: ['nmp-ui'] }));
  await env.sw.evaluate(() => self.NMPInject.reconcile());
  assert.deepEqual(await ids(env.sw), ['nmp-agent', 'nmp-bridge', 'nmp-ui']);
  // Registro con otra forma (aquí, otros orígenes): se sustituye por el correcto.
  await env.sw.evaluate(async () => {
    await chrome.scripting.unregisterContentScripts({ ids: ['nmp-agent'] });
    await chrome.scripting.registerContentScripts([{ id: 'nmp-agent', matches: ['http://example.invalid/*'], js: ['src/content/frame-agent.js'] }]);
    await self.NMPInject.reconcile();
  });
  const [agent] = await env.sw.evaluate(() => chrome.scripting.getRegisteredContentScripts({ ids: ['nmp-agent'] }));
  assert.deepEqual(agent.matches, ['<all_urls>']);
  assert.equal(agent.allFrames, true);
});

test('dos reconciliaciones simultáneas no chocan', async () => {
  await env.sw.evaluate(() => chrome.scripting.unregisterContentScripts({ ids: ['nmp-ui', 'nmp-bridge'] }));
  await env.sw.evaluate(async () => { await Promise.all([self.NMPInject.reconcile(), self.NMPInject.reconcile(), self.NMPInject.reconcile()]); });
  assert.deepEqual(await ids(env.sw), ['nmp-agent', 'nmp-bridge', 'nmp-ui']);
});

test('al revocar el permiso se retiran los scripts y al volver a concederlo se registran', async () => {
  // permissions.remove/request piden diálogo; se simula lo que ve el service worker: getAll sin y con orígenes.
  await env.sw.evaluate(() => { self.__getAll = chrome.permissions.getAll; chrome.permissions.getAll = async () => ({ origins: [], permissions: [] }); });
  await env.sw.evaluate(() => self.NMPInject.reconcile());
  assert.deepEqual(await ids(env.sw), [], 'sin permiso no queda nada registrado');
  await env.sw.evaluate(() => self.NMPInject.reconcile());
  assert.deepEqual(await ids(env.sw), [], 'repetirlo no falla');
  await env.sw.evaluate(() => { chrome.permissions.getAll = self.__getAll; });
  await env.sw.evaluate(() => self.NMPInject.reconcile());
  assert.deepEqual(await ids(env.sw), ['nmp-agent', 'nmp-bridge', 'nmp-ui']);
});

test('sin scripts registrados una página no lleva el reproductor; injectInto lo añade a la pestaña abierta', async () => {
  await env.sw.evaluate(() => chrome.scripting.unregisterContentScripts({ ids: ['nmp-agent', 'nmp-bridge', 'nmp-ui'] }));
  const page = await env.ctx.newPage();
  await page.goto(`${server.base}/`);
  await sleep(400);
  const tab = await tabOf(env.sw, `${server.base}/*`);
  assert.equal((await has(env.sw, tab)).ui, false, 'sin registro no hay interfaz');
  await env.sw.evaluate((id) => self.NMPInject.injectInto(id), tab);
  assert.equal((await has(env.sw, tab)).ui, true, 'injectInto inyecta la interfaz');
  // Se puede inyectar dos veces sin romper la página (el reproductor protege contra la doble carga).
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await env.sw.evaluate((id) => self.NMPInject.injectInto(id), tab);
  await sleep(200);
  assert.deepEqual(errors, []);
  await page.close();
  await env.sw.evaluate(() => self.NMPInject.reconcile());
});

test('injectOpen inyecta solo en las pestañas de los orígenes concedidos', async () => {
  await env.sw.evaluate(() => chrome.scripting.unregisterContentScripts({ ids: ['nmp-agent', 'nmp-bridge', 'nmp-ui'] }));
  const a = await env.ctx.newPage(); await a.goto(`${server.base}/`);
  const b = await env.ctx.newPage(); await b.goto('http://localhost:' + new URL(server.base).port + '/');
  await sleep(400);
  const tabA = await tabOf(env.sw, 'http://127.0.0.1/*'), tabB = await tabOf(env.sw, 'http://localhost/*');
  await env.sw.evaluate(() => self.NMPInject.injectOpen(['http://127.0.0.1/*']));
  assert.equal((await has(env.sw, tabA)).ui, true);
  assert.equal((await has(env.sw, tabB)).ui, false, 'otro origen no se toca');
  // Una pestaña donde no se puede inyectar (chrome://) no hace fallar el conjunto.
  const c = await env.ctx.newPage(); await c.goto('chrome://version');
  await env.sw.evaluate(() => self.NMPInject.injectOpen(['<all_urls>']));
  await a.close(); await b.close(); await c.close();
  await env.sw.evaluate(() => self.NMPInject.reconcile());
});

test('la página de ajustes refleja el permiso concedido', async () => {
  const page = await env.ctx.newPage();
  await page.goto(new URL('/src/options/options.html', env.sw.url()).href);
  await page.waitForFunction(() => document.getElementById('access').checked === true);
  await page.close();
});

test('sin el permiso de host la extensión no registra nada ni inyecta en las páginas', async () => {
  const bare = await launch({ optional: true });
  try {
    assert.equal(await bare.sw.evaluate(() => chrome.permissions.contains({ origins: ['<all_urls>'] })), false);
    await sleep(500);
    assert.deepEqual(await ids(bare.sw), []);
    const page = await bare.ctx.newPage();
    await page.goto(`${server.base}/`);
    await sleep(500);
    // Sin permiso las pestañas no exponen su url: la página recién abierta es la de id más alto.
    const tab = await bare.sw.evaluate(async () => Math.max(...(await chrome.tabs.query({})).map((t) => t.id)));
    // Sin permiso ni activeTab, ni siquiera executeScript puede mirar la pestaña: lo esperado es que lo rechace.
    const r = await bare.sw.evaluate((id) => chrome.scripting.executeScript({ target: { tabId: id }, func: () => 1 }).then(() => 'ok', (e) => e.message), tab);
    assert.match(r, /Cannot access|permission|host/i);
    const opts = await bare.ctx.newPage();
    await opts.goto(new URL('/src/options/options.html', bare.sw.url()).href);
    await sleep(300);
    assert.equal(await opts.locator('#access').isChecked(), false, 'el interruptor refleja que no hay permiso');
    // injectInto no debe colgarse ni tumbar el worker sin permiso: rechaza y el worker sigue vivo.
    const inj = await bare.sw.evaluate((id) => self.NMPInject.injectInto(id).then(() => 'ok', (e) => 'rechazado'), tab);
    assert.equal(inj, 'rechazado');
    assert.deepEqual(await ids(bare.sw), []);
  } finally { await bare.close(); }
});

test('el clic en el icono o un atajo inyecta el reproductor en una pestaña que no lo lleva', async () => {
  await env.sw.evaluate(() => chrome.scripting.unregisterContentScripts({ ids: ['nmp-agent', 'nmp-bridge', 'nmp-ui'] }));
  await env.sw.evaluate(() => chrome.storage.local.set({ mp_inpage: true }));
  const page = await env.ctx.newPage();
  await page.goto(`${server.base}/`);
  await sleep(400);
  const tab = await tabOf(env.sw, `${server.base}/*`);
  assert.equal((await has(env.sw, tab)).ui, false);
  await env.sw.evaluate((id) => callPlayer(id, 'command', 'play-pause'), tab);
  assert.equal((await has(env.sw, tab)).ui, true, 'callPlayer inyecta y ejecuta la orden');
  await page.waitForFunction(() => !document.getElementById('a').paused);
  await page.close();
  await env.sw.evaluate(() => self.NMPInject.reconcile());
});

test('el clic izquierdo del icono (toggle, sin argumento) se ejecuta en la pestaña sin errores', async () => {
  await env.sw.evaluate(() => chrome.storage.local.set({ mp_inpage: true }));
  const page = await env.ctx.newPage();
  await page.goto(`${server.base}/`);
  await sleep(400);
  const tab = await tabOf(env.sw, `${server.base}/*`);
  // Lo que hace onClicked: callPlayer(tab.id, 'toggle') con el tercer argumento sin definir (no serializable si no se normaliza).
  const warns = await env.sw.evaluate(async (id) => {
    const seen = [], orig = console.warn;
    console.warn = (...a) => { seen.push(a.join(' ')); };
    try { await callPlayer(id, 'toggle'); await callPlayer(id, 'toggle'); } finally { console.warn = orig; }
    return seen;
  }, tab);
  assert.deepEqual(warns, []);
  assert.equal((await has(env.sw, tab)).ui, true);
  await page.close();
});

test('injectInto avisa de que el puente llega tarde solo la primera vez', async () => {
  await env.sw.evaluate(() => chrome.scripting.unregisterContentScripts({ ids: ['nmp-agent', 'nmp-bridge', 'nmp-ui'] }));
  const page = await env.ctx.newPage();
  await page.goto(`${server.base}/`);
  await sleep(400);
  const tab = await tabOf(env.sw, `${server.base}/*`);
  assert.equal(await env.sw.evaluate((id) => self.NMPInject.injectInto(id), tab), true, 'puente inyectado tarde');
  assert.equal(await env.sw.evaluate((id) => self.NMPInject.injectInto(id), tab), false, 'ya lo lleva');
  await page.close();
  await env.sw.evaluate(() => self.NMPInject.reconcile());
});

test('reinyectar en una pestaña que ya lleva los scripts no duplica el puente ni la interfaz', async () => {
  const page = await env.ctx.newPage();
  await page.goto(`${server.base}/`);
  await sleep(400);
  const tab = await tabOf(env.sw, `${server.base}/*`);
  assert.deepEqual(await has(env.sw, tab), { ui: true, bridge: true });
  await env.sw.evaluate((id) => self.NMPInject.injectInto(id), tab);
  await env.sw.evaluate((id) => self.NMPInject.injectInto(id), tab);
  // Un puente duplicado respondería dos veces a cada consulta.
  const replies = await page.evaluate(() => new Promise((res) => {
    let n = 0;
    document.addEventListener('__mp_actions', () => n++);
    document.dispatchEvent(new CustomEvent('__mp_query'));
    setTimeout(() => res(n), 100);
  }));
  assert.equal(replies, 1);
  await page.close();
});

test('si falla un grupo de la inyección manual, los demás se inyectan igualmente', async () => {
  await env.sw.evaluate(() => chrome.scripting.unregisterContentScripts({ ids: ['nmp-agent', 'nmp-bridge', 'nmp-ui'] }));
  const page = await env.ctx.newPage();
  await page.goto(`${server.base}/`);
  await sleep(400);
  const tab = await tabOf(env.sw, `${server.base}/*`);
  await env.sw.evaluate(() => {
    self.__exec = chrome.scripting.executeScript;
    chrome.scripting.executeScript = (inj) => (inj.files && inj.files[0].includes('frame-agent') ? Promise.reject(new Error('sin acceso')) : self.__exec.call(chrome.scripting, inj));
  });
  try { await env.sw.evaluate((id) => self.NMPInject.injectInto(id), tab); }
  finally { await env.sw.evaluate(() => { chrome.scripting.executeScript = self.__exec; }); }
  assert.deepEqual(await has(env.sw, tab), { ui: true, bridge: true });
  await page.close();
  await env.sw.evaluate(() => self.NMPInject.reconcile());
});

test('una instalación sin permiso de host abre Ajustes', async () => {
  const bare = await launch({ optional: true });
  try {
    let urls = [];
    for (let i = 0; i < 50 && !urls.some((u) => u.includes('options.html')); i++) { await sleep(200); urls = bare.ctx.pages().map((p) => p.url()); }
    assert.ok(urls.some((u) => /src\/options\/options\.html/.test(u)), 'Ajustes abierto: ' + urls);
  } finally { await bare.close(); }
});
