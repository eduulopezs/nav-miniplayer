// Captura de audio: lo que se puede comprobar sin un clic real en el icono (tabCapture exige ese gesto, que Playwright no puede dar).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, startServer, openPage, sleep } from './helpers.mjs';

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

// Con tabCapture permitido por bandera, se comprueba la cadena completa: id de flujo, documento offscreen y puerto con el reproductor visible.
test('con el reproductor visible, la captura conecta el puerto del visualizador', async () => {
  const cap = await launch({ capture: true });
  try {
    const p = await openPage(cap, server);
    await p.toggle();
    await cap.sw.evaluate(async () => {
      self.__ports = 0;
      chrome.runtime.onConnect.addListener((pt) => { if (pt.name === 'viz') self.__ports++; });
      await chrome.storage.local.set({ mp_capture: true });
      const [t] = await chrome.tabs.query({ active: true });
      await startCapture(t.id);
    });
    for (let i = 0; i < 20 && !(await cap.sw.evaluate(() => self.__ports)); i++) await sleep(250);
    assert.ok(await cap.sw.evaluate(() => self.__ports) >= 1, 'el reproductor visible debe conectarse al flujo de audio');
  } finally { await cap.close(); }
});
