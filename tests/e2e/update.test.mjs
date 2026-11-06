// Actualización desde antes de 1.15.0, cuando <all_urls> era un permiso obligatorio (desde 1.15.0 es opcional).
// Se instala la versión antigua y se vuelve a cargar la misma carpeta con la versión actual por CDP (Extensions.loadUnpacked):
// Chrome lo trata como una actualización (onInstalled con reason 'update' y previousVersion). Relanzar el navegador o
// chrome.runtime.reload() no sirven: lo primero llega como 'install' y lo segundo descarga una extensión cargada por línea de comandos.
// La versión antigua se simula con el código actual y el manifiesto de entonces: la CI clona sin historial y no puede sacar la 1.14.0 de git.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { EXT, sleep } from './helpers.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const manifest = JSON.parse(fs.readFileSync(join(EXT, 'manifest.json'), 'utf8'));
const isOptions = (p) => p.url().endsWith('/src/options/options.html');

// Instala `version` (con el permiso de host obligatorio si `required`), actualiza a la actual y devuelve el estado resultante.
async function update(version, required) {
  const tmp = fs.mkdtempSync(join(os.tmpdir(), 'nmp-upd-'));
  const ext = join(tmp, 'ext'), profile = join(tmp, 'profile');
  for (const f of ['icons', 'src', '_locales']) fs.cpSync(join(EXT, f), join(ext, f), { recursive: true });
  const old = { ...manifest, version };
  if (required) old.host_permissions = old.optional_host_permissions;
  delete old.optional_host_permissions;
  fs.writeFileSync(join(ext, 'manifest.json'), JSON.stringify(old));

  // Playwright pasa --disable-extensions por defecto, y Extensions.loadUnpacked necesita --enable-unsafe-extension-debugging.
  const ctx = await chromium.launchPersistentContext(profile, {
    headless: false, ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--headless=new', '--enable-unsafe-extension-debugging', '--remote-debugging-port=0', `--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  try {
    await (ctx.serviceWorkers()[0] || ctx.waitForEvent('serviceworker', { timeout: 20000 }));
    await sleep(1000); // deja terminar onInstalled de la instalación, que sin el permiso abre Ajustes
    for (const p of ctx.pages()) if (isOptions(p)) await p.close();

    // Extensions.loadUnpacked es del nivel del navegador: el contexto persistente no da esa sesión, así que se conecta aparte por el puerto.
    const port = fs.readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
    const cdp = await (await chromium.connectOverCDP(`http://127.0.0.1:${port}`)).newBrowserCDPSession();
    fs.writeFileSync(join(ext, 'manifest.json'), JSON.stringify(manifest));
    const next = ctx.waitForEvent('serviceworker', { timeout: 20000 });
    await cdp.send('Extensions.loadUnpacked', { path: ext });
    const sw = await next;
    await sleep(2000); // onInstalled espera a la reconciliación y luego decide si abre Ajustes
    return {
      ...await sw.evaluate(async () => ({
        version: chrome.runtime.getManifest().version,
        granted: await chrome.permissions.contains({ origins: ['<all_urls>'] }),
        scripts: (await chrome.scripting.getRegisteredContentScripts()).length,
      })),
      options: ctx.pages().some(isOptions),
    };
  } finally {
    await ctx.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test('desde 1.14.0 se conserva el permiso de host y no se abre Ajustes', async () => {
  const r = await update('1.14.0', true);
  assert.equal(r.version, manifest.version);
  assert.equal(r.granted, true, 'Chrome conserva <all_urls> al pasar de obligatorio a opcional');
  assert.equal(r.scripts, 3, 'el reproductor sigue registrado en todos los sitios');
  assert.equal(r.options, false);
});

// Simula que Chrome no conservara el permiso: sin aviso, el reproductor dejaría de cargar en todos los sitios.
test('desde 1.14.0 sin el permiso de host se abre Ajustes', async () => {
  const r = await update('1.14.0', false);
  assert.equal(r.granted, false);
  assert.equal(r.scripts, 0);
  assert.equal(r.options, true);
});

// Control: si Chrome tratara la recarga como una instalación nueva, aquí también se abriría Ajustes.
test('desde 1.15.0 sin el permiso de host no se abre Ajustes (lo pudo retirar el usuario)', async () => {
  const r = await update('1.15.0', false);
  assert.equal(r.granted, false);
  assert.equal(r.options, false);
});
