// Ventana aparte (#16): una página de la extensión que muestra y controla el medio de cualquier pestaña.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, startServer, openPage, sleep } from './helpers.mjs';

let env, server;
before(async () => { server = await startServer(); env = await launch(); });
after(async () => { await env.close(); await server.close(); });

const until = async (fn, ms = 8000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('tiempo agotado: ' + fn); await sleep(100); } };
const findWin = () => env.ctx.pages().find((p) => p.url().includes('/src/window/player.html'));

test('ventana aparte: cambia de sesión y controla las dos pestañas', async () => {
  await env.sw.evaluate(() => chrome.storage.local.remove(['mp_win', 'mp_remote']));
  const a = await openPage(env, server, { title: 'Pista A' });
  const b = await openPage(env, server, { title: 'Pista B' });
  await a.play(); await b.play();
  await env.sw.evaluate(() => self.NMPSess.openWindow());
  const w = await until(findWin);
  await until(async () => (await w.locator('.chip').count()) === 2);
  // Sin elegir nada se muestra la que suena; se elige la A y se pausa desde la ventana.
  await w.locator('.chip', { hasText: 'Pista A' }).click();
  await until(async () => (await w.locator('[data-t=title]').first().textContent()) === 'Pista A');
  await w.locator('[data-act=play]:visible').first().click();
  await until(() => a.paused());
  assert.equal(await b.paused(), false, 'la otra pestaña sigue sonando');
  // Cambia a la B y la pausa.
  await w.locator('.chip', { hasText: 'Pista B' }).click();
  await until(async () => (await w.locator('[data-t=title]').first().textContent()) === 'Pista B');
  await w.locator('[data-act=play]:visible').first().click();
  await until(() => b.paused());
  // Vuelve a reproducir la A y salta por la barra.
  await w.locator('.chip', { hasText: 'Pista A' }).click();
  await until(async () => (await w.locator('[data-t=title]').first().textContent()) === 'Pista A');
  await w.locator('[data-act=play]:visible').first().click();
  await until(async () => !(await a.paused()));
  await a.seek(2);
  await until(async () => /^0:0[2-4]$/.test((await w.locator('[data-v=cur]:visible').first().textContent()) || ''));
  const bar = await w.locator('[data-bar]:visible').first().boundingBox();
  await w.mouse.click(bar.x + bar.width * 0.5, bar.y + bar.height / 2);
  await until(async () => Math.abs((await a.time()) - 20) < 3);
  await a.page.close(); await b.page.close();
  await until(async () => (await w.locator('.chip').count()) === 0 || (await w.locator('#empty').isVisible()));
  await w.close();
});

test('al cerrar la ventana las pestañas dejan de informar', async () => {
  await env.sw.evaluate(() => chrome.storage.local.remove(['mp_remote']));
  const a = await openPage(env, server, { title: 'Pista A' });
  await a.play();
  await env.sw.evaluate(() => self.NMPSess.openWindow());
  const w = await until(findWin);
  await until(async () => (await w.locator('.chip').count()) === 1);
  assert.equal(await env.sw.evaluate(async () => (await chrome.storage.local.get('mp_remote')).mp_remote), true);
  await w.close();
  await until(() => env.sw.evaluate(async () => (await chrome.storage.local.get('mp_remote')).mp_remote === false));
  assert.equal(await env.sw.evaluate(async () => (await chrome.storage.session.get('mp_sessions')).mp_sessions), undefined, 'se borran las sesiones');
  await a.page.close();
});

test('el service worker rechaza órdenes que no vienen de la ventana ni de una sesión conocida', async () => {
  const a = await openPage(env, server, { title: 'Pista A' });
  await env.sw.evaluate(() => self.NMPSess.openWindow());
  const w = await until(findWin);
  await a.play();
  await until(async () => (await w.locator('.chip').count()) === 1);
  await a.pause();
  // Desde la página de prueba (ni ventana ni extensión) no se acepta nada: ni siquiera existe chrome.runtime.sendMessage hacia la extensión.
  const sent = await a.page.evaluate(() => typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage);
  assert.equal(sent, true);
  // Una orden con formato inválido desde la ventana se ignora.
  await w.evaluate(() => chrome.runtime.sendMessage({ type: 'rc-cmd', tabId: 1, cmd: 'play; alert(1)' }));
  await w.evaluate(() => chrome.runtime.sendMessage({ type: 'rc-cmd', tabId: 99999, cmd: 'play' }));
  await sleep(500);
  assert.equal(await a.paused(), true);
  await w.close(); await a.page.close();
});
