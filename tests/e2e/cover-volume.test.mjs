// #39: carátula difuminable (preferencia recordada) y regulador de volumen en los layouts medianos y grandes.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, startServer, openPage } from './helpers.mjs';

let env, server;
before(async () => { server = await startServer(); env = await launch(); });
after(async () => { await env.close(); await server.close(); });

const reset = () => env.sw.evaluate(() => chrome.storage.local.remove(['mp_prefs', 'mp_vol']));
const vol = (p) => p.media(() => document.getElementById('a').volume);
const COV = { glass: '.gl-cov', noir: '.nr-art', crt: '.cr-art', metal: '.lm-cov' };

for (const theme of Object.keys(COV)) {
  test(`${theme}: la carátula se difumina con clic y con teclado, y se recuerda`, async () => {
    await reset();
    const p = await openPage(env, server, { theme });
    await p.toggle();
    assert.equal(await p.attr('act:cover', 'aria-pressed'), 'false');
    assert.doesNotMatch(await p.style(COV[theme].slice(1), 'filter'), /blur/);
    await p.click('act:cover');
    await p.waitFor(async () => (await p.attr('act:cover', 'aria-pressed')) === 'true');
    await p.waitFor(async () => /blur\(14px\)/.test(await p.style(COV[theme].slice(1), 'filter')));
    await p.waitFor(() => env.sw.evaluate(async () => (await chrome.storage.local.get('mp_prefs')).mp_prefs?.blur === true));
    // teclado: Intro sobre el botón la devuelve
    await p.focus('act:cover');
    await p.page.keyboard.press('Enter');
    await p.waitFor(async () => (await p.attr('act:cover', 'aria-pressed')) === 'false');
    await p.page.close();
  });
}

for (const theme of Object.keys(COV)) {
  test(`${theme}: el regulador cambia el volumen y respeta el silencio`, async () => {
    await reset();
    const p = await openPage(env, server, { theme });
    await p.toggle();
    await p.size(680, 100); // Fila ancha
    const b = await p.box('vol');
    assert.ok(b && b.w > 0, 'el regulador se ve en Fila ancha');
    assert.ok(b.h >= 24, `objetivo de al menos 24 px (${b.h})`);
    await p.focus('vol');
    await p.page.keyboard.press('ArrowLeft');
    await p.waitFor(async () => (await vol(p)) < 1);
    assert.ok((await vol(p)) >= 0.98);
    assert.equal((await p.read()).shown, true, 'las flechas del regulador no cierran ni saltan');
    // clic en la mitad: volumen ≈ 50 %
    await p.click('vol');
    await p.waitFor(async () => Math.abs((await vol(p)) - 0.5) < 0.1);
    await p.waitFor(() => env.sw.evaluate(async () => !!(await chrome.storage.local.get('mp_vol')).mp_vol));
    await p.click('act:mute');
    await p.waitFor(async () => (await p.attr('vol', 'aria-valuetext')) === '0%');
    await p.page.close();
  });
}

test('el regulador se ve también en Panorámico y Portada', async () => {
  await reset();
  const p = await openPage(env, server, { theme: 'glass' });
  await p.toggle();
  for (const [w, h] of [[640, 240], [320, 420]]) {
    await p.size(w, h);
    const b = await p.box('vol');
    assert.ok(b && b.w > 0 && b.h >= 24, `regulador visible en ${w}x${h}`);
  }
  await p.page.close();
});
