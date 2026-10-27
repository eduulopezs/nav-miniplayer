// Pruebas de seguridad sin navegador: reglas de red para carátulas y comprobaciones estáticas del aislamiento.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');
const ctx = vm.createContext({ URL });
ctx.self = ctx;
vm.runInContext(read('src/background/net-guard.js'), ctx);
const { isAllowedArtworkUrl: ok, sniffImage } = ctx.NMPNet;

let fails = 0;
const t = (name, cond) => { if (!cond) fails++; console.log(`${cond ? '✓' : '✗'} ${name}`); };

for (const u of ['https://i.ytimg.com/vi/abc/hqdefault.jpg', 'http://cdn.example.org/a.png', 'https://lh3.googleusercontent.com/x=w512', 'https://img.com:443/a.jpg']) t(`permite ${u}`, ok(u));
for (const u of [
  'http://127.0.0.1/a.png', 'http://127.1/a.png', 'http://2130706433/a.png', 'http://0x7f.0.0.1/a.png', 'http://localhost/a.png', 'http://foo.localhost/a.png',
  'http://10.0.0.5/a.png', 'http://192.168.1.1/a.png', 'http://172.16.0.1/a.png', 'http://172.31.255.1/a.png', 'http://169.254.169.254/latest/meta-data', 'http://100.64.0.1/a.png', 'http://0.0.0.0/a.png',
  'http://[::1]/a.png', 'http://[fd00::1]/a.png', 'http://[::ffff:7f00:1]/a.png', 'http://router/a.png', 'http://nas.local/a.png', 'http://intranet.corp/a.png',
  'https://user:pw@evil.com/a.png', 'https://evil.com:8080/a.png', 'https://evil.com:22/a.png', 'file:///etc/passwd', 'ftp://x.com/a.png', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'blob:https://x.com/1', 'no es url', '',
  'https://x.com/' + 'a'.repeat(3000),
]) t(`bloquea ${u.slice(0, 60)}`, !ok(u));
t('rechaza tipos no string', !ok(null) && !ok(undefined) && !ok({}) && !ok(42));

const b = (...a) => Uint8Array.from([...a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const str = (s) => [...s].map((c) => c.charCodeAt(0));
t('detecta PNG', sniffImage(b(0x89, ...str('PNG'))) === 'image/png');
t('detecta JPEG', sniffImage(b(0xff, 0xd8, 0xff, 0xe0)) === 'image/jpeg');
t('detecta GIF', sniffImage(b(...str('GIF89a'))) === 'image/gif');
t('detecta WebP', sniffImage(Uint8Array.from([...str('RIFF'), 1, 2, 3, 4, ...str('WEBP'), 0])) === 'image/webp');
t('rechaza SVG', sniffImage(Uint8Array.from(str('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))) === null);
t('rechaza HTML', sniffImage(Uint8Array.from(str('<!doctype html><script>alert(1)</script>'))) === null);
t('rechaza vacío', sniffImage(new Uint8Array(0)) === null);

// Comprobaciones estáticas del aislamiento
const player = read('src/content/player.js'), bridge = read('src/page/media-session-bridge.js'), sw = read('src/background/service-worker.js');
t('shadow root cerrado', /attachShadow\(\{ mode: 'closed' \}\)/.test(player) && !/mode:\s*'open'/.test(player));
t('el puente no deja banderas globales', !/window\.__\w+/.test(bridge));
t('toggle ya no pasa por un evento del DOM', !/__mp_toggle/.test(player + sw));
t('el service worker no envía cookies ni sigue redirecciones', /credentials: 'omit'/.test(sw) && /redirect: 'error'/.test(sw));
t('el service worker exige pestaña emisora', /sender\.tab/.test(sw));
t('el service worker valida la URL antes de descargar', /isAllowedArtworkUrl\(url\)/.test(sw));
t('las acciones anunciadas por la página se filtran', /KNOWN_ACTIONS/.test(player));

// Service worker con fetch simulado: camino positivo y negativos de la descarga de carátulas.
{
  let listener = null, calls = [];
  const bytesPng = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 1, 2, 3, 4]);
  const mkRes = (body, { ok = true, len } = {}) => ({ ok, status: ok ? 200 : 500, headers: { get: (k) => (k === 'content-length' && len != null ? String(len) : null) },
    body: { getReader() { let sent = false; return { read: async () => (sent ? { done: true } : ((sent = true), { done: false, value: body })), cancel: async () => {} }; } } });
  const sctx = vm.createContext({
    URL, AbortController, setTimeout, clearTimeout, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), console,
    importScripts() { vm.runInContext(read('src/background/net-guard.js'), sctx); },
    chrome: { runtime: { id: 'me', onMessage: { addListener: (f) => { listener = f; } }, onInstalled: { addListener() {} } }, action: { onClicked: { addListener() {} } },
      scripting: {}, storage: { onChanged: { addListener() {} }, local: { get() {}, set() {} } }, contextMenus: { onClicked: { addListener() {} }, removeAll() {}, create() {}, update() {} } },
    fetch: async (u, o) => { calls.push([u, o]); return sctx.__next(u); },
  });
  sctx.self = sctx;
  vm.runInContext(read('src/background/service-worker.js'), sctx);
  const ask = (url, sender = { id: 'me', tab: { id: 1 } }) => new Promise((ok) => { const r = listener({ type: 'img', url }, sender, ok); if (r !== true) setTimeout(() => ok('sin respuesta'), 20); });

  sctx.__next = () => mkRes(bytesPng);
  let r = await ask('https://cdn.example.org/a.png');
  t('descarga una imagen válida como data URL', r.data && r.data.startsWith('data:image/png;base64,'));
  t('la petición va sin cookies ni redirecciones', calls[0][1].credentials === 'omit' && calls[0][1].redirect === 'error' && calls[0][1].referrerPolicy === 'no-referrer');
  const n = calls.length;
  r = await ask('http://127.0.0.1/a.png'); t('IP privada: respuesta vacía y sin petición', !r.data && calls.length === n);
  r = await ask('https://cdn.example.org/a.png', { id: 'otro', tab: { id: 1 } }); t('rechaza remitente que no es la extensión', r === 'sin respuesta');
  r = await ask('https://cdn.example.org/a.png', { id: 'me' }); t('rechaza mensajes sin pestaña', r === 'sin respuesta');
  sctx.__next = () => mkRes(Uint8Array.from(str('<svg xmlns="http://www.w3.org/2000/svg"></svg>')));
  r = await ask('https://cdn.example.org/a.svg'); t('rechaza SVG aunque venga como imagen', !r.data);
  sctx.__next = () => mkRes(new Uint8Array(6 * 1024 * 1024).fill(0xff));
  r = await ask('https://cdn.example.org/big.jpg'); t('rechaza imágenes de más de 5 MB leyendo en streaming', !r.data);
  sctx.__next = () => mkRes(bytesPng, { len: 99999999 });
  r = await ask('https://cdn.example.org/big2.png'); t('rechaza por Content-Length declarado', !r.data);
  sctx.__next = () => mkRes(bytesPng, { ok: false });
  r = await ask('https://cdn.example.org/404.png'); t('error HTTP: respuesta vacía', !r.data);
  let release; sctx.__next = () => new Promise((ok) => { release = () => ok(mkRes(bytesPng)); });
  const first = ask('https://cdn.example.org/slow.png');
  r = await ask('https://cdn.example.org/second.png'); t('una descarga a la vez por pestaña', !r.data);
  await new Promise((ok) => setTimeout(ok, 5)); release(); r = await first; t('la primera descarga termina bien', !!r.data);
}

console.log(fails ? `\n${fails} comprobación(es) fallida(s)` : '\n✓ seguridad correcta');
if (fails) process.exit(1);
