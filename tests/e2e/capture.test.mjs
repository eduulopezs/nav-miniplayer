// Captura de audio: lo que se puede comprobar sin un clic real en el icono (tabCapture exige ese gesto, que Playwright no puede dar).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, startServer } from './helpers.mjs';

let env, server;
before(async () => { server = await startServer(); env = await launch(); });
after(async () => { await env.close(); await server.close(); });

test('el documento offscreen rechaza peticiones inválidas y puertos sin captura', async () => {
  const { sw } = env;
  await sw.evaluate(() => chrome.offscreen.createDocument({ url: 'src/offscreen/offscreen.html', reasons: ['USER_MEDIA'], justification: 'test' }));
  const bad = await sw.evaluate(() => chrome.runtime.sendMessage({ target: 'offscreen', type: 'cap-start', tabId: 1, streamId: 'no-existe' }));
  assert.equal(bad && bad.ok, false, 'un id de flujo falso no debe capturar nada');
  const ignored = await sw.evaluate(() => chrome.runtime.sendMessage({ target: 'offscreen', type: 'cap-start', tabId: 'x', streamId: 1 }).then((r) => (r === undefined ? 'ignorado' : 'respondido'), () => 'ignorado'));
  assert.equal(ignored, 'ignorado', 'tipos inválidos se ignoran');
  await sw.evaluate(() => chrome.offscreen.closeDocument());
});
