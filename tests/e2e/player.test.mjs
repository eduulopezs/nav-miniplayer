// Comportamiento del reproductor con la extensión real cargada en Chromium.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, startServer, openPage, sleep } from './helpers.mjs';

let env, server;
before(async () => { server = await startServer(); env = await launch(); });
after(async () => { await env.close(); await server.close(); });

const near = (v, expected, tol, msg) => assert.ok(Math.abs(v - expected) <= tol, `${msg}: ${v} no está cerca de ${expected} (±${tol})`);

test('arranca oculto y se muestra y oculta con el icono', async () => {
  const p = await openPage(env, server);
  assert.equal((await p.read()).shown, false);
  await p.toggle();
  const s = await p.read();
  assert.equal(s.shown, true);
  assert.equal(s.title, 'Canción de prueba');
  await p.toggle();
  assert.equal((await p.read()).shown, false);
  await p.page.close();
});

test('oculto no hace trabajo: ni layouts ni estilos recalculados', async () => {
  const p = await openPage(env, server);
  await p.play();
  await sleep(500);
  const a = await p.metrics();
  await sleep(3000);
  const b = await p.metrics();
  assert.equal(b.LayoutCount - a.LayoutCount, 0, 'layouts con el reproductor oculto');
  assert.equal(b.RecalcStyleCount - a.RecalcStyleCount, 0, 'recálculos de estilo con el reproductor oculto');
  await p.page.close();
});

test('las fuentes del diseño solo se cargan cuando el reproductor se muestra', async () => {
  const p = await openPage(env, server);
  await p.play();
  await sleep(800);
  assert.equal(await p.media(() => document.fonts.size), 0, 'fuentes cargadas con el reproductor oculto');
  await p.toggle();
  await p.waitFor(async () => (await p.media(() => document.fonts.size)) > 0);
  await p.page.close();
});

test('play y pausa con el botón, y la etiqueta cambia', async () => {
  const p = await openPage(env, server);
  await p.toggle();
  assert.equal(await p.paused(), true);
  await p.click('act:play');
  await p.waitFor(async () => !(await p.paused()));
  await p.waitFor(async () => (await p.read()).playLabel === 'Pausar');
  await p.click('act:play');
  await p.waitFor(() => p.paused());
  await p.waitFor(async () => (await p.read()).playLabel === 'Reproducir');
  await p.page.close();
});

test('saltar 10 s hacia delante y hacia atrás', async () => {
  const p = await openPage(env, server);
  await p.toggle();
  await p.seek(20);
  await p.click('act:fwd');
  near(await p.time(), 30, 1, 'tras avanzar');
  await p.click('act:back');
  near(await p.time(), 20, 1, 'tras retroceder');
  await p.seek(4);
  await p.click('act:back');
  assert.equal(await p.time(), 0, 'no baja de 0');
  await p.page.close();
});

test('tiempo y barra de progreso siguen al medio', async () => {
  const p = await openPage(env, server);
  await p.toggle();
  await p.seek(10);
  await p.play();
  await p.waitFor(async () => (await p.read()).cur === '0:10' || (await p.read()).cur === '0:11');
  const s = await p.read();
  near(s.valuenow, 26, 3, 'aria-valuenow');
  near(s.progress, 26, 3, 'progreso visible (--p)');
  await p.pause();
  const t = await p.time();
  await sleep(800);
  assert.equal((await p.read()).cur, `0:${String(Math.floor(t)).padStart(2, '0')}`);
  await p.page.close();
});

test('la barra de progreso busca al pulsar y arrastrar', async () => {
  const p = await openPage(env, server);
  await p.toggle();
  const b = await p.box('bar');
  await p.page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
  near(await p.time(), 20, 2, 'posición tras pulsar la barra');
  await p.page.mouse.move(b.x + b.w * .25, b.y + b.h / 2);
  await p.page.mouse.down();
  await p.page.mouse.move(b.x + b.w * .75, b.y + b.h / 2, { steps: 5 });
  await p.page.mouse.up();
  near(await p.time(), 30, 2, 'posición tras arrastrar');
  await p.page.close();
});

test('teclado: Espacio, flechas y Esc con el reproductor enfocado', async () => {
  const p = await openPage(env, server);
  await p.toggle();
  await p.seek(10);
  await p.focus('card');
  await p.page.keyboard.press('Space');
  await p.waitFor(async () => !(await p.paused()));
  await p.page.keyboard.press('ArrowRight');
  near(await p.time(), 20, 1.5, 'tras →');
  await p.page.keyboard.press('ArrowLeft');
  near(await p.time(), 10, 1.5, 'tras ←');
  await p.page.keyboard.press('k');
  await p.waitFor(() => p.paused());
  await p.page.keyboard.press('Escape');
  await p.waitFor(async () => !(await p.read()).shown);
  await p.page.close();
});

test('se ajusta al tamaño: arrastrar una esquina cambia ancho y alto', async () => {
  const p = await openPage(env, server);
  await p.toggle();
  const before = await p.box('card');
  const g = await p.box('br');
  await p.page.mouse.move(g.x + g.w / 2, g.y + g.h / 2);
  await p.page.mouse.down();
  await p.page.mouse.move(g.x + g.w / 2 - 60, g.y + g.h / 2 - 30, { steps: 5 });
  await p.page.mouse.up();
  const after = await p.box('card');
  near(after.w, before.w - 60, 2, 'ancho');
  near(after.h, before.h - 30, 2, 'alto');
  await p.page.close();
});

// Arrastra la tarjeta por el título (lejos del borde, que es la barra de progreso).
async function dragCard(p, dx, dy) {
  const t = await p.box('t:title');
  const x = t.x + 4, y = t.y + t.h / 2;
  await p.page.mouse.move(x, y);
  await p.page.mouse.down();
  await p.page.mouse.move(x + dx, y + dy, { steps: 6 });
  await p.page.mouse.up();
}

test('la posición se conserva al recargar la página', async () => {
  await env.sw.evaluate(() => chrome.storage.local.remove(['mp_size', 'mp_pos']));
  const p = await openPage(env, server);
  await p.toggle();
  const start = await p.box('card');
  await dragCard(p, -150, -80);
  const moved = await p.box('card');
  near(moved.x, start.x - 150, 3, 'x tras arrastrar');
  near(moved.y, start.y - 80, 3, 'y tras arrastrar');
  await p.waitFor(() => env.sw.evaluate(async () => !!(await chrome.storage.local.get('mp_pos')).mp_pos));
  await p.page.close();
  const q = await openPage(env, server);
  await q.toggle();
  const again = await q.box('card');
  near(again.x, moved.x, 2, 'x tras recargar');
  near(again.y, moved.y, 2, 'y tras recargar');
  await env.sw.evaluate(() => chrome.storage.local.remove('mp_pos'));
  await q.page.close();
});

test('el tamaño se conserva al recargar la página', async () => {
  await env.sw.evaluate(() => chrome.storage.local.remove(['mp_size', 'mp_pos']));
  const p = await openPage(env, server);
  await p.toggle();
  const before = await p.box('card');
  const g = await p.box('br');
  await p.page.mouse.move(g.x + g.w / 2, g.y + g.h / 2);
  await p.page.mouse.down();
  await p.page.mouse.move(g.x + g.w / 2 - 40, g.y + g.h / 2 - 20, { steps: 5 });
  await p.page.mouse.up();
  const resized = await p.box('card');
  assert.ok(resized.w < before.w - 30, 'la tarjeta no se ha encogido');
  await p.waitFor(() => env.sw.evaluate(async () => !!(await chrome.storage.local.get('mp_size')).mp_size));
  await p.page.close();
  const q = await openPage(env, server);
  await q.toggle();
  const again = await q.box('card');
  near(again.w, resized.w, 2, 'ancho tras recargar');
  near(again.h, resized.h, 2, 'alto tras recargar');
  await env.sw.evaluate(() => chrome.storage.local.remove(['mp_size', 'mp_pos']));
  await q.page.close();
});

test('prefers-reduced-motion: sin transiciones ni animaciones', async () => {
  const p = await openPage(env, server);
  await p.page.emulateMedia({ reducedMotion: 'no-preference' });
  await p.toggle();
  await p.waitFor(async () => (await p.read()).shown);
  assert.notEqual(await p.style('card', 'transition-duration'), '0s', 'sin la preferencia debería haber transición');
  await p.page.emulateMedia({ reducedMotion: 'reduce' });
  await p.waitFor(async () => (await p.style('card', 'transition-duration')) === '0s');
  assert.equal(await p.style('card', 'transform'), 'none', 'la tarjeta no debe desplazarse al aparecer');
  assert.equal(await p.style('act:play', 'transition-duration'), '0s');
  await p.page.close();
});
