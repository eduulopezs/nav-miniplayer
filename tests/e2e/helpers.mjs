// Utilidades de las pruebas e2e: servidor de pruebas, navegador con la extensión cargada e inspector del reproductor.
// El reproductor vive en un shadow DOM cerrado, así que se lee y se pulsa por CDP (que sí atraviesa los shadow roots cerrados).
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// createRequire respeta NODE_PATH (útil en máquinas con Playwright instalado globalmente).
const { chromium } = createRequire(import.meta.url)('playwright');
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// NMP_EXT_DIR permite probar otra carpeta (p. ej. el zip descomprimido) en lugar del repositorio.
export const EXT = process.env.NMP_EXT_DIR || ROOT;
export const SHOTS = join(ROOT, 'tests', 'e2e', '__shots__');
export const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

// WAV mono de 8 kHz y 8 bits con silencio: pesa poco y dura lo que haga falta (la extensión ignora medios de menos de 30 s).
export function wav(sec) {
  const sr = 8000, n = sr * sec, b = Buffer.alloc(44 + n, 128);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40);
  return b;
}

// Servidor de pruebas. `hits` cuenta las peticiones por ruta (sirve para comprobar qué descarga y qué no).
export async function startServer() {
  const audio = wav(40);
  const hits = {};
  const server = http.createServer((q, r) => {
    const url = new URL(q.url, 'http://x');
    hits[url.pathname] = (hits[url.pathname] || 0) + 1;
    if (url.pathname === '/a.wav') { // con Range, para que la duración sea finita y se pueda saltar
      const m = /bytes=(\d+)-(\d*)/.exec(q.headers.range || '');
      if (m) {
        const a = +m[1], z = m[2] ? +m[2] : audio.length - 1;
        r.writeHead(206, { 'content-type': 'audio/wav', 'accept-ranges': 'bytes', 'content-range': `bytes ${a}-${z}/${audio.length}`, 'content-length': z - a + 1 });
        return r.end(audio.subarray(a, z + 1));
      }
      r.writeHead(200, { 'content-type': 'audio/wav', 'accept-ranges': 'bytes', 'content-length': audio.length });
      return r.end(audio);
    }
    if (url.pathname === '/leak.png') { r.writeHead(200, { 'content-type': 'image/png' }); return r.end(Buffer.from('89504e470d0a1a0a000000000000000000000000', 'hex')); }
    const artwork = url.searchParams.get('art');
    const meta = `navigator.mediaSession.metadata=new MediaMetadata({title:'Canción de prueba',artist:'Artista',artwork:${artwork ? `[{src:${JSON.stringify(artwork)},sizes:'512x512'}]` : '[]'}});`;
    r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    r.end(`<!doctype html><meta charset=utf-8><title>Prueba</title><body style="margin:0;height:100vh;background:#336"><audio id=a src="/a.wav" loop></audio><script>${meta}</script>`);
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, hits, close: () => new Promise((ok) => server.close(ok)) };
}

// Chromium con la extensión cargada (el nuevo modo headless admite extensiones).
export async function launch() {
  const dir = fs.mkdtempSync(join(os.tmpdir(), 'nmp-e2e-'));
  const ctx = await chromium.launchPersistentContext(dir, {
    headless: false, viewport: { width: 900, height: 500 },
    args: ['--headless=new', '--autoplay-policy=no-user-gesture-required', `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker', { timeout: 20000 });
  return { ctx, sw, close: async () => { await ctx.close(); fs.rmSync(dir, { recursive: true, force: true }); } };
}

const find = (n, pred, out = []) => { if (pred(n)) out.push(n); for (const c of [...(n.children || []), ...(n.shadowRoots || [])]) find(c, pred, out); return out; };
const attr = (n, k) => { const a = n.attributes || []; const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
const hasClass = (n, c) => (attr(n, 'class') || '').split(/\s+/).includes(c);
const text = (n) => (n.children || []).map((c) => c.nodeValue || '').join('');

// Abre una página de pruebas y devuelve un inspector del reproductor.
export async function openPage(env, server, { art, mode = 'card', theme } = {}) {
  const { ctx, sw } = env;
  await sw.evaluate((v) => chrome.storage.local.set(v), { mp_mode: mode, ...(theme ? { mp_theme: theme } : {}) });
  const page = await ctx.newPage();
  await page.goto(`${server.base}/${art ? `?art=${encodeURIComponent(art)}` : ''}`);
  await page.waitForFunction(() => document.getElementById('a').readyState > 0);
  await sleep(300); // el content script lee su configuración de storage al arrancar
  const cdp = await ctx.newCDPSession(page);
  const tree = async () => (await cdp.send('DOM.getDocument', { depth: -1, pierce: true })).root;
  const node = async (cls) => find(await tree(), (n) => hasClass(n, cls))[0];
  const api = {
    page, cdp,
    media: (fn, arg) => page.evaluate(fn, arg),
    play: () => page.evaluate(() => document.getElementById('a').play()),
    pause: () => page.evaluate(() => document.getElementById('a').pause()),
    time: () => page.evaluate(() => document.getElementById('a').currentTime),
    paused: () => page.evaluate(() => document.getElementById('a').paused),
    seek: (t) => page.evaluate((v) => { document.getElementById('a').currentTime = v; }, t),
    // Estado visible del reproductor.
    async read() {
      const root = await tree();
      const one = (c) => find(root, (n) => hasClass(n, c))[0];
      const card = one('card'), ring = one('ring'), play = one('play'), cur = one('cur'), bar = one('bar'), title = one('title');
      return {
        shown: !!card && hasClass(card, 'show'),
        cur: cur ? text(cur) : null,
        valuenow: ring ? +attr(ring, 'aria-valuenow') : null,
        dash: bar ? parseFloat(((attr(bar, 'style') || '').match(/dasharray:\s*([\d.]+)/) || [])[1]) : null,
        playLabel: play ? attr(play, 'aria-label') : null,
        title: title ? text(title.children && title.children[0] ? title.children[0] : title) : null,
        theme: card ? attr(card, 'data-theme') : null,
        art: card ? ((attr(card, 'style') || '').match(/--art:\s*([^;]+)/) || [])[1] || null : null,
      };
    },
    async box(cls) {
      const n = await node(cls);
      const { model } = await cdp.send('DOM.getBoxModel', { backendNodeId: n.backendNodeId });
      const q = model.border;
      const xs = [q[0], q[2], q[4], q[6]], ys = [q[1], q[3], q[5], q[7]];
      const x = Math.min(...xs), y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    },
    async click(cls) {
      const b = await api.box(cls);
      await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
    },
    async focus(cls) { await cdp.send('DOM.focus', { backendNodeId: (await node(cls)).backendNodeId }); },
    // Igual que el clic izquierdo en el icono de la extensión.
    async toggle() {
      const tabId = await sw.evaluate(async (u) => (await chrome.tabs.query({ url: u + '/*' }))[0].id, server.base);
      await sw.evaluate((id) => chrome.scripting.executeScript({ target: { tabId: id }, func: () => globalThis.__NMP && globalThis.__NMP.toggle && globalThis.__NMP.toggle() }), tabId);
      await sleep(500);
    },
    async metrics() {
      await cdp.send('Performance.enable');
      return Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    },
    async waitFor(fn, ms = 4000) {
      const t0 = Date.now();
      for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('tiempo agotado esperando la condición'); await sleep(100); }
    },
  };
  return api;
}
