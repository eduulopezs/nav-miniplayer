// #32: miniatura del storyboard de YouTube sobre la barra. El puente solo responde en youtube.com, así que aquí el «puente» es la propia
// página enviando el evento; la extensión lo valida igual y las hojas se piden al servidor de miniaturas (interceptado) por el service worker.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, startServer, openPage } from './helpers.mjs';

let env, server;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==', 'base64');
const hits = [];
before(async () => {
  server = await startServer(); env = await launch();
  await env.ctx.route('https://i.ytimg.com/**', (r) => { hits.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'image/png', body: PNG }); });
});
after(async () => { await env.close(); await server.close(); });

const SPEC = 'https://i.ytimg.com/sb/test/storyboard3_L$L/$N.jpg?sqp=x|160#90#8#4#2#5000#M$M#rs$S'; // 8 miniaturas, una cada 5 s: el audio dura 40 s
const announce = (p, spec = SPEC) => p.media((s) => document.dispatchEvent(new CustomEvent('__mp_sb', { detail: JSON.stringify({ id: 'abcdefghijk', spec: s }) })), spec);
const hover = async (p, frac) => { const b = await p.box('bar'); await p.page.mouse.move(b.x + b.w * frac, b.y + b.h / 2); };

test('al pasar el puntero por la barra aparece la miniatura, con su hoja descargada', async () => {
  const p = await openPage(env, server, { theme: 'glass' });
  await p.toggle();
  await p.size(420, 300); // Panorámico: hay hueco sobre la barra
  await announce(p);
  await hover(p, 0.5);
  await p.waitFor(async () => { const b = await p.box('sb'); return b && b.w > 0 && b.h > 0; });
  assert.ok(hits.some((u) => /storyboard3_L0\/M0\.jpg\?sqp=x&sigh=rs%24S$/.test(u)), 'pidió la hoja con la firma');
  const b = await p.box('sb'), c = await p.box('card');
  assert.ok(b.x >= c.x && b.x + b.w <= c.x + c.w && b.y >= c.y, 'cabe dentro de la tarjeta');
  await p.page.mouse.move(5, 5);
  await p.waitFor(async () => { const x = await p.box('sb'); return !x || !x.w; });
  await p.page.close();
});

test('sin storyboard, con un spec falso o en una tarjeta demasiado baja no hay miniatura', async () => {
  const p = await openPage(env, server, { theme: 'glass' });
  await p.toggle();
  await p.size(420, 300);
  await hover(p, 0.5);
  await p.page.waitForTimeout(400);
  assert.ok(!((await p.box('sb'))?.w > 0), 'sin storyboard');
  const n = hits.length;
  await announce(p, 'https://evil.example/x/$L/$N|160#90#8#4#2#5000#M$M#rs$S');
  await hover(p, 0.4);
  await p.page.waitForTimeout(400);
  assert.ok(!((await p.box('sb'))?.w > 0) && hits.length === n, 'un host que no es ytimg.com no se descarga');
  await announce(p);
  await p.size(340, 70); // Fila: la barra está pegada al borde superior
  await hover(p, 0.5);
  await p.page.waitForTimeout(400);
  assert.ok(!((await p.box('sb'))?.w > 0), 'tarjeta baja');
  await p.page.close();
});
