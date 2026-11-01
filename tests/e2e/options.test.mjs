// Página de ajustes (options_ui) y migración de ajustes guardados.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { launch, SHOTS, sleep } from './helpers.mjs';

let env, url;
before(async () => { env = await launch(); url = new URL('/src/options/options.html', env.sw.url()).href; fs.mkdirSync(SHOTS, { recursive: true }); });
after(async () => { await env.close(); });

const stored = (keys) => env.sw.evaluate((k) => chrome.storage.local.get(k), keys);

test('la página de ajustes muestra los diseños con vista previa y guarda los cambios', async () => {
  const page = await env.ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForSelector('.theme');
  assert.equal(await page.title(), 'Ajustes de Nav Miniplayer', 'el título sale de _locales');
  assert.equal(await page.locator('.theme').count(), 7);
  // Cada vista previa es una tarjeta real con altura (la plantilla del diseño se pintó).
  for (const b of await page.locator('.theme .pv').all()) assert.ok((await b.boundingBox()).height >= 100);
  assert.equal(await page.locator('[data-i18n]:empty').count(), 0, 'ningún texto traducible queda vacío');
  assert.equal(await page.locator('#keys li').count() > 0, true, 'lista los atajos');

  await page.locator('.theme[data-id=noir]').click();
  await page.locator('#skip button[data-v="15"]').click();
  await page.locator('#blur').check();
  await sleep(200);
  const r = await stored(['mp_theme', 'mp_prefs']);
  assert.equal(r.mp_theme, 'noir');
  assert.deepEqual(r.mp_prefs, { skip: 15, blur: true });
  assert.equal(await page.locator('.theme[data-id=noir]').getAttribute('aria-checked'), 'true');

  // Un cambio hecho desde fuera (menú del icono) se refleja en la página abierta.
  await env.sw.evaluate(() => chrome.storage.local.set({ mp_theme: 'crt' }));
  await page.waitForFunction(() => document.querySelector('.theme[data-id=crt]').getAttribute('aria-checked') === 'true');
  await page.screenshot({ path: join(SHOTS, 'options.png'), fullPage: true });
  assert.deepEqual(errors, []);
  await page.close();
});

test('el botón de ventana aparte abre la ventana', async () => {
  const page = await env.ctx.newPage();
  await page.goto(url);
  const opened = env.ctx.waitForEvent('page', { timeout: 10000 });
  await page.locator('#open-win').click();
  assert.match((await opened).url(), /src\/window\/player\.html/);
  await page.close();
});

test('la migración normaliza ajustes antiguos y es idempotente', async () => {
  await env.sw.evaluate(() => chrome.storage.local.clear());
  await env.sw.evaluate(() => chrome.storage.local.set({ mp_theme: 'brutal', mp_prefs: { skip: 99, blur: 'sí' }, mp_mode: 'mini', mp_pos: {}, mp_size: {}, mp_capture: 'x' }));
  await env.sw.evaluate(() => self.NMPMigrate.migrate());
  const a = await stored(null);
  assert.equal(a.mp_theme, 'noir');
  assert.deepEqual(a.mp_prefs, { skip: 10, blur: false });
  for (const k of ['mp_mode', 'mp_pos', 'mp_size', 'mp_capture']) assert.ok(!(k in a), k + ' se elimina');
  assert.equal(a.mp_schema, await env.sw.evaluate(() => self.NMPMigrate.SCHEMA));
  await env.sw.evaluate(() => self.NMPMigrate.migrate());
  assert.deepEqual(await stored(null), a);
});
