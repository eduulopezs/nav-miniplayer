// Aislamiento de la extensión frente a la página (ver SECURITY.md).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, startServer, openPage, sleep } from './helpers.mjs';

let env, server;
before(async () => { server = await startServer(); env = await launch(); });
after(async () => { await env.close(); await server.close(); });

test('la página no ve el shadow root ni las variables internas', async () => {
  const p = await openPage(env, server);
  const seen = await p.media(() => {
    const h = document.getElementById('glass-mini-player-host');
    return { host: !!h, shadow: h ? h.shadowRoot : 'sin host', nmp: typeof globalThis.__NMP, flagA: typeof window.__glassMiniPlayerHooked, flagB: typeof window.__glassMiniPlayer };
  });
  assert.deepEqual(seen, { host: true, shadow: null, nmp: 'undefined', flagA: 'undefined', flagB: 'undefined' });
  await p.page.close();
});

test('el service worker no descarga carátulas de IPs privadas ni de localhost', async () => {
  const urls = [`${server.base}/leak.png`, 'http://localhost:1/a.png', 'http://169.254.169.254/latest/meta-data', 'http://[::1]/a.png'];
  const before = server.hits['/leak.png'] || 0;
  for (const u of urls) {
    const r = await env.sw.evaluate((x) => fetchArtwork(x).then((d) => 'OK ' + d.slice(0, 20), (e) => 'ERR ' + e.message), u);
    assert.match(r, /^ERR URL no permitida/, u);
  }
  assert.equal(server.hits['/leak.png'] || 0, before, 'el service worker llegó a pedir la imagen privada');
});

test('carátulas: solo http(s), blob e imágenes data llegan a la interfaz', async () => {
  for (const [art, ok] of [['javascript:alert(1)', false], ['file:///etc/passwd', false], ['data:text/html;base64,PHNjcmlwdD4=', false], [`${server.base}/leak.png`, true]]) {
    const p = await openPage(env, server, { art });
    await p.toggle();
    const s = await p.read();
    assert.equal(s.shown, true);
    if (ok) assert.match(s.art, /^url\("http:\/\/127\.0\.0\.1:\d+\/leak\.png"\)$/, art);
    else assert.equal(s.art, 'none', art);
    await p.page.close();
  }
});

test('la página no puede mostrar la tarjeta con eventos falsos', async () => {
  const p = await openPage(env, server);
  await p.media(() => { document.dispatchEvent(new CustomEvent('__mp_toggle')); document.dispatchEvent(new CustomEvent('__mp_pip', { detail: 'open' })); document.dispatchEvent(new CustomEvent('__mp_pip', { detail: { x: 1 } })); });
  await sleep(600);
  assert.equal((await p.read()).shown, false);
  await p.page.close();
});
