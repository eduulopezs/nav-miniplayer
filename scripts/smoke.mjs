// Prueba de humo sin navegador: carga los módulos del content script con un DOM falso y dibuja el lienzo de Mini con cada diseño.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const m = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const files = m.content_scripts[1].js;
const mk = () => { const f = function () {}; return new Proxy(f, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === 'length' ? 0 : k === 'then' ? undefined : mk(), apply: () => mk(), construct: () => mk(), set: () => true }); };
const listeners = [];
const el = () => ({ attachShadow: () => ({ innerHTML: '', set innerHTML(v) { this.html = v; }, querySelector: () => el(), querySelectorAll: () => [], append() {} }), style: { cssText: '' }, classList: { toggle() {}, add() {}, remove() {} }, dataset: {}, addEventListener() {}, append() {}, appendChild() {}, querySelectorAll: () => [], setAttribute() {}, getBoundingClientRect: () => ({}), observe() {} });
const doc = { createElement: el, querySelectorAll: () => [], querySelector: () => null, addEventListener: (t, f) => listeners.push([t, f]), dispatchEvent() {}, body: el(), documentElement: el(), title: '', pictureInPictureEnabled: true };
const win = { top: null, innerWidth: 1280, innerHeight: 720, addEventListener() {} };
win.top = win;
const ctx = vm.createContext({ window: win, document: doc, location: { href: 'https://x/', hostname: 'x' }, navigator: { mediaSession: {} }, chrome: { storage: { local: { get: (k, cb) => cb({}), set() {} }, onChanged: { addListener() {} } }, runtime: {} }, CustomEvent: class { constructor(n, o) { this.detail = o?.detail; } }, ResizeObserver: class { observe() {} }, HTMLMediaElement: class {}, HTMLCanvasElement: { prototype: {} }, requestAnimationFrame: (f) => f(), setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, performance: { now: () => 0 }, Image: class {}, console });
ctx.globalThis = ctx;
for (const f of files) vm.runInContext(readFileSync(join(root, f), 'utf8'), ctx, { filename: f });
console.log('✓ carga sin errores; módulos:', Object.keys(ctx.__NMP).join(', '));
const html = ctx.__NMP.css; if (!html.includes('.card')) throw new Error('css vacío');
const N = ctx.__NMP;
const c2d = new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 500 }) : k.startsWith('create') ? () => ({ addColorStop() {} }) : typeof t[k] !== 'undefined' ? t[k] : () => {}, set: () => true });
ctx.document.createElement = () => ({ getContext: () => c2d, width: 0, height: 0 });
for (const th of Object.keys(N.themes)) {
  const r = N.createRenderer(() => ({ theme: th, title: 'Título largo '.repeat(5), artist: 'Artista', art: '', media: { duration: 100, currentTime: 30 } }));
  r.attach(c2d); r.draw(); r.setDpr(4); r.draw(); r.invalidate(); r.draw(); r.release();
}
console.log('✓ renderer dibuja todos los diseños');
