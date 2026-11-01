// Capturas de cada diseño (se suben como artefacto en CI) y comprobación de que cada uno se aplica y se ve distinto.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { launch, startServer, openPage, SHOTS, sleep } from './helpers.mjs';

let env, server;
before(async () => { fs.mkdirSync(SHOTS, { recursive: true }); server = await startServer(); env = await launch(); });
after(async () => { await env.close(); await server.close(); });

test('los 5 diseños se aplican y se ven distintos', async () => {
  const hashes = {};
  for (const theme of ['glass', 'noir', 'crt', 'metal', 'minimal']) {
    const p = await openPage(env, server, { theme });
    await p.toggle();
    await p.waitFor(async () => (await p.read()).shown);
    await sleep(500);
    const s = await p.read();
    assert.equal(s.theme, theme, `diseño aplicado (${theme})`);
    const b = await p.box('card');
    const buf = await p.page.screenshot({ path: `${SHOTS}/${theme}.png`, clip: { x: b.x - 8, y: b.y - 8, width: b.w + 16, height: b.h + 16 } });
    hashes[theme] = createHash('sha1').update(buf).digest('hex');
    await p.page.close();
  }
  assert.equal(new Set(Object.values(hashes)).size, 5, 'dos diseños se ven idénticos');
});
