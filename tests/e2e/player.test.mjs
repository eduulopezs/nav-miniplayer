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

test('sin la bandera de pruebas la tarjeta no se pinta en la página y un modo guardado no estorba', async () => {
  const p = await openPage(env, server, { inpage: false });
  await env.sw.evaluate(() => chrome.storage.local.set({ mp_mode: 'card', mp_pos: { x: 1, y: 1 }, mp_size: { w: 300, h: 100 } }));
  await p.page.reload();
  await sleep(500);
  assert.equal((await p.read()).shown, false);
  await p.page.close();
  await env.sw.evaluate(() => chrome.storage.local.remove(['mp_mode', 'mp_pos', 'mp_size']));
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
