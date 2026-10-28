// Funciones de #17: volumen (rueda y menú), velocidad, salto configurable, atajos, tooltip de tiempo y auto mostrar.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, startServer, openPage, sleep } from './helpers.mjs';

let env, server;
before(async () => { server = await startServer(); env = await launch(); });
after(async () => { await env.close(); await server.close(); });

const near = (v, expected, tol, msg) => assert.ok(Math.abs(v - expected) <= tol, `${msg}: ${v} no está cerca de ${expected} (±${tol})`);
const vol = (p) => p.media(() => document.getElementById('a').volume);
const reset = () => env.sw.evaluate(() => chrome.storage.local.remove(['mp_prefs', 'mp_vol']));

test('la rueda sobre la tarjeta cambia el volumen en pasos de 5 %', async () => {
  await reset();
  const p = await openPage(env, server);
  await p.toggle();
  const b = await p.box('card');
  await p.page.mouse.move(b.x + b.w / 2, b.y + b.h / 2);
  await p.page.mouse.wheel(0, 100);
  await p.waitFor(async () => (await vol(p)) < 1);
  near(await vol(p), 0.95, 0.001, 'volumen tras bajar un paso');
  await p.page.mouse.wheel(0, -100);
  await p.waitFor(async () => (await vol(p)) === 1);
  await p.page.close();
});

test('clic derecho abre el menú: velocidad, salto y volumen recordado por sitio', async () => {
  await reset();
  const p = await openPage(env, server);
  await p.toggle();
  const b = await p.box('card');
  await p.page.mouse.click(b.x + b.w / 2, b.y + b.h / 2, { button: 'right' });
  await p.waitFor(async () => (await p.read()).menuOpen);
  await p.click('v:2');
  assert.equal(await p.media(() => document.getElementById('a').playbackRate), 2);
  await p.click('v:30');
  await p.waitFor(() => env.sw.evaluate(async () => (await chrome.storage.local.get('mp_prefs')).mp_prefs?.skip === 30));
  await p.page.keyboard.press('Escape');
  await p.waitFor(async () => !(await p.read()).menuOpen);
  await p.seek(5);
  await p.click('act:fwd');
  near(await p.time(), 35, 1.5, 'tras avanzar 30 s');
  // volumen: se guarda por sitio y se aplica al abrir otra pestaña del mismo sitio
  await p.page.mouse.move(b.x + b.w / 2, b.y + b.h / 2);
  for (let i = 0; i < 4; i++) await p.page.mouse.wheel(0, 100);
  // Los pasos de la rueda se procesan de forma asíncrona: se espera al valor final, no a que exista la clave (con el primer paso ya existe).
  const savedVol = () => env.sw.evaluate(async () => (await chrome.storage.local.get('mp_vol')).mp_vol?.['127.0.0.1']);
  await p.waitFor(async () => Math.abs((await savedVol()) - 0.8) < 0.001);
  await p.page.close();
  const q = await openPage(env, server);
  await q.toggle();
  await q.waitFor(async () => Math.abs((await vol(q)) - 0.8) < 0.001);
  await q.page.close();
  await reset();
});

test('atajos: play/pausa y saltos con la pestaña activa', async () => {
  await reset();
  const p = await openPage(env, server);
  const cmd = (name) => env.sw.evaluate(async (n) => {
    const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    await chrome.scripting.executeScript({ target: { tabId: t.id }, args: [n], func: (c) => globalThis.__NMP.command(c) });
  }, name);
  await p.page.bringToFront();
  assert.equal(await p.paused(), true);
  await cmd('play-pause');
  await p.waitFor(async () => !(await p.paused()));
  await p.seek(10);
  await cmd('seek-fwd');
  near(await p.time(), 20, 1.5, 'tras el atajo de avanzar');
  await cmd('seek-back');
  near(await p.time(), 10, 1.5, 'tras el atajo de retroceder');
  await cmd('play-pause');
  await p.waitFor(() => p.paused());
  await cmd('no-existe'); // un nombre desconocido se ignora
  await p.page.close();
});

test('tooltip con el tiempo bajo el puntero en la barra', async () => {
  await reset();
  const p = await openPage(env, server);
  await p.toggle();
  const b = await p.box('bar');
  await p.page.mouse.move(b.x + b.w / 2, b.y + b.h / 2);
  await p.page.mouse.move(b.x + b.w / 2 + 1, b.y + b.h / 2);
  await p.waitFor(async () => /^0:(1[89]|2[0-2])$/.test(await p.attr('bar', 'title') || ''));
  await p.page.close();
});
