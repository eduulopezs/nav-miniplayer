// Detección de medios fuera del alcance del documento: elementos sin insertar y dentro de shadow DOM.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, startServer, openPage, sleep } from './helpers.mjs';

let env, server;
before(async () => { server = await startServer(); env = await launch(); });
after(async () => { await env.close(); await server.close(); });

// Crea el medio en la página (var `w.x`), lo reproduce y muestra el reproductor.
async function start(make) {
  const p = await openPage(env, server, { bare: true });
  await p.media(make);
  await p.media(() => window.x.play());
  await p.waitFor(() => p.media(() => !window.x.paused && window.x.readyState > 0));
  await sleep(700); // el puente publica el estado y el content script reescanea
  await p.toggle();
  return p;
}
const xTime = (p) => p.media(() => window.x.currentTime);
const xPaused = (p) => p.media(() => window.x.paused);

test('new Audio() sin insertar: aparece, se pausa, se reanuda y salta', async () => {
  const p = await start(() => { window.x = new Audio('/a.wav'); window.x.loop = true; });
  await p.waitFor(async () => (await p.read()).shown);
  assert.equal((await p.read()).playLabel, 'Pausar');
  await p.click('act:play');
  await p.waitFor(() => xPaused(p));
  await p.waitFor(async () => (await p.read()).playLabel === 'Reproducir');
  await p.click('act:play');
  await p.waitFor(async () => !(await xPaused(p)));
  const t0 = await xTime(p);
  await p.click('act:fwd');
  await p.waitFor(async () => (await xTime(p)) >= t0 + 8);
  await p.page.close();
});

test('medio dentro de un shadow DOM cerrado', async () => {
  const p = await start(() => {
    const host = document.createElement('div');
    document.body.append(host);
    const a = document.createElement('audio');
    a.src = '/a.wav'; a.loop = true;
    host.attachShadow({ mode: 'closed' }).append(a);
    window.x = a;
  });
  await p.waitFor(async () => (await p.read()).shown);
  await p.click('act:play');
  await p.waitFor(() => xPaused(p));
  await p.page.close();
});

test('autoplay sin llamar a play(): shadow DOM abierto, cerrado y sin insertar', async () => {
  for (const make of [
    () => { const h = document.createElement('div'); document.body.append(h); h.attachShadow({ mode: 'open' }).innerHTML = '<audio id=q autoplay loop src="/a.wav"></audio>'; window.x = h.shadowRoot.getElementById('q'); },
    () => { const h = document.createElement('div'); document.body.append(h); const r = h.attachShadow({ mode: 'closed' }); r.innerHTML = '<audio id=q autoplay loop src="/a.wav"></audio>'; window.x = r.getElementById('q'); },
    () => { window.x = new Audio(); window.x.loop = true; window.x.autoplay = true; window.x.src = '/a.wav'; },
  ]) {
    const p = await openPage(env, server, { bare: true });
    await p.media(make);
    await p.waitFor(() => p.media(() => !window.x.paused && window.x.readyState > 0));
    await sleep(700);
    await p.toggle();
    await p.waitFor(async () => (await p.read()).shown);
    assert.equal((await p.read()).playLabel, 'Pausar');
    await p.click('act:play');
    await p.waitFor(() => xPaused(p));
    await p.page.close();
  }
});

test('un medio sin insertar que no suena no secuestra el reproductor', async () => {
  const p = await openPage(env, server);
  await p.media(() => { window.y = new Audio('/a.wav'); window.y.loop = true; window.y.play(); window.y.pause(); });
  await p.play();
  await sleep(1200);
  await p.toggle();
  await p.click('act:play'); // el que suena es el <audio> de la página: lo pausa a él
  await p.waitFor(() => p.paused());
  assert.equal(await p.media(() => window.y.paused), true);
  await p.page.close();
});

// Iframes: el agente de cada subframe informa al marco superior y ejecuta sus órdenes (mismo origen y origen cruzado).
for (const [nombre, host] of [['mismo origen', null], ['origen cruzado', 'localhost']]) {
  test(`medio dentro de un iframe (${nombre})`, async () => {
    const p = await openPage(env, server, { bare: true });
    const src = (host ? server.base.replace('127.0.0.1', host) : server.base) + '/frame';
    await p.media((u) => new Promise((ok) => {
      const f = document.createElement('iframe');
      f.src = u; f.onload = ok; document.body.append(f);
    }), src);
    const frame = p.page.frames().find((f) => f.url() === src);
    assert.ok(frame, 'el iframe cargó');
    const fEval = (fn) => frame.evaluate(fn);
    await p.waitFor(() => fEval(() => document.getElementById('a').readyState > 0));
    await fEval(() => document.getElementById('a').play());
    await sleep(900); // el agente informa y el marco superior reescanea
    await p.toggle();
    await p.waitFor(async () => (await p.read()).shown);
    assert.equal((await p.read()).playLabel, 'Pausar');
    await p.click('act:play');
    await p.waitFor(() => fEval(() => document.getElementById('a').paused));
    await p.waitFor(async () => (await p.read()).playLabel === 'Reproducir');
    await p.click('act:play');
    await p.waitFor(async () => !(await fEval(() => document.getElementById('a').paused)));
    const t0 = await fEval(() => document.getElementById('a').currentTime);
    await p.click('act:fwd');
    await p.waitFor(async () => (await fEval(() => document.getElementById('a').currentTime)) >= t0 + 8);
    await p.page.close();
  });
}

// Dentro de un iframe, un medio que no está en el DOM (new Audio() con autoplay) también se ve y se controla.
test('medio sin insertar dentro de un iframe', async () => {
  const p = await openPage(env, server, { bare: true });
  const src = server.base + '/frame-hidden';
  await p.media((u) => new Promise((ok) => { const f = document.createElement('iframe'); f.src = u; f.onload = ok; document.body.append(f); }), src);
  const frame = p.page.frames().find((f) => f.url() === src);
  assert.ok(frame, 'el iframe cargó');
  await p.waitFor(() => frame.evaluate(() => !window.x.paused && window.x.readyState > 0));
  await sleep(1000);
  await p.toggle();
  await p.waitFor(async () => (await p.read()).shown);
  assert.equal((await p.read()).playLabel, 'Pausar');
  await p.click('act:play');
  await p.waitFor(() => frame.evaluate(() => window.x.paused));
  await p.click('act:play');
  await p.waitFor(async () => !(await frame.evaluate(() => window.x.paused)));
  const t0 = await frame.evaluate(() => window.x.currentTime);
  await p.click('act:fwd');
  await p.waitFor(async () => (await frame.evaluate(() => window.x.currentTime)) >= t0 + 8);
  await p.page.close();
});
