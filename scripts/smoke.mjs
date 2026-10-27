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
const count = { intervals: 0, scans: 0 };
const el = () => ({ attachShadow: () => ({ innerHTML: '', set innerHTML(v) { this.html = v; }, querySelector: () => el(), querySelectorAll: () => [], append() {} }), style: { cssText: '' }, classList: { toggle() {}, add() {}, remove() {} }, dataset: {}, addEventListener() {}, append() {}, appendChild() {}, querySelectorAll: () => [], setAttribute() {}, getBoundingClientRect: () => ({}), observe() {} });
const doc = { createElement: el, querySelectorAll: () => { count.scans++; return []; }, querySelector: () => null, addEventListener: (t, f) => listeners.push([t, f]), dispatchEvent() {}, body: el(), documentElement: el(), title: '', pictureInPictureEnabled: true };
const win = { top: null, innerWidth: 1280, innerHeight: 720, addEventListener() {} };
win.top = win;
const ctx = vm.createContext({ window: win, document: doc, location: { href: 'https://x/', hostname: 'x' }, navigator: { mediaSession: {} }, chrome: { storage: { local: { get: (k, cb) => cb({}), set() {} }, onChanged: { addListener() {} } }, runtime: {} }, CustomEvent: class { constructor(n, o) { this.detail = o?.detail; } }, ResizeObserver: class { observe() {} }, HTMLMediaElement: class {}, HTMLCanvasElement: { prototype: {} }, requestAnimationFrame: (f) => f(), setInterval: () => { count.intervals++; return 1; }, clearInterval() {}, setTimeout: () => 0, performance: { now: () => 0 }, Image: class {}, console });
ctx.globalThis = ctx;
for (const f of files) vm.runInContext(readFileSync(join(root, f), 'utf8'), ctx, { filename: f });
if (count.intervals !== 0) throw new Error(`oculto por defecto no debe crear temporizadores (hay ${count.intervals})`);
if (count.scans !== 0) throw new Error(`oculto por defecto no debe buscar medios (${count.scans} búsquedas)`);
console.log('✓ carga sin errores; módulos:', Object.keys(ctx.__NMP).join(', '));
const html = ctx.__NMP.css; if (!html.includes('.card')) throw new Error('css vacío');
const N = ctx.__NMP;
const c2d = new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 500 }) : k.startsWith('create') ? () => ({ addColorStop() {} }) : typeof t[k] !== 'undefined' ? t[k] : () => {}, set: () => true });
ctx.document.createElement = () => ({ getContext: () => c2d, width: 0, height: 0 });
for (const th of Object.keys(N.themes)) {
  const r = N.createRenderer(() => ({ theme: th, title: 'Título largo '.repeat(5), artist: 'Artista', art: '', media: { duration: 100, currentTime: 30 } }));
  r.attach(c2d); r.draw(); r.setDpr(4); r.draw(); r.invalidate(); r.draw(); r.release();
  for (const media of [{ duration: 100, currentTime: 30, paused: true }, { duration: Infinity, currentTime: 30, paused: false }, null]) { // pausa, directo y sin medio
    const r2 = N.createRenderer(() => ({ theme: th, title: 'T', artist: 'A', art: '', media }));
    r2.attach(c2d); r2.draw(); r2.release();
  }
}
console.log('✓ renderer dibuja todos los diseños');

// Medios remotos y política de selección.
{
  const M = N.media, sent = [];
  const m = (o) => ({ isConnected: true, readyState: 4, duration: 100, paused: true, ended: false, muted: false, loop: false, tagName: 'AUDIO', ...o });
  const [a, b, c] = [m({ duration: 60 }), m({ duration: 300 }), m({ duration: 120, paused: false })];
  const ok = (cond, msg) => { if (!cond) throw new Error('selección: ' + msg); };
  ok(M.pick([], null) === null, 'lista vacía');
  ok(M.pick([a, b, c], a) === c, 'el que suena gana al último que sonó');
  ok(M.pick([a, b], a) === a, 'sin ninguno sonando, el último que sonó');
  ok(M.pick([a, b], null) === b, 'sin último, el más largo');
  const loud = m({ duration: 50, paused: false }), mute = m({ duration: 500, paused: false, muted: true });
  ok(M.pick([mute, loud], null) === loud, 'el silenciado cede ante el que tiene sonido');
  ok(M.pick([mute], null) === mute, 'un silenciado solo se usa si no hay otro');
  ok(!M.usable(m({ tagName: 'VIDEO', muted: true, loop: true }), 30), 'ignora vídeos de fondo');
  ok(!M.usable(m({ duration: 5 }), 30) && M.usable(m({ duration: Infinity }), 30), 'duración mínima y directos');

  const played = [];
  const feed = (list) => M.ingest(JSON.stringify(list), (s) => sent.push(s), (r) => played.push(r));
  feed([{ i: 1, p: true, d: 90, r: 4 }, { i: 2, p: false, l: true, r: 4 }]);
  let [r1, r2] = M.remotes();
  ok(r1.duration === 90 && r2.duration === Infinity && played.length === 1 && played[0] === r2, 'estado remoto y aviso de inicio');
  r1.play(); r1.pause(); r1.seek(12.5);
  ok(sent.join('|') === 'm:1:play|m:1:pause|m:1:seek:12.5' && r1.currentTime === 12.5, 'órdenes al puente');
  feed([{ i: 1, p: true, t: -5, d: 1e12, r: 99, k: 'x' }, { i: 'x' }, null, { i: 0 }]);
  [r1] = M.remotes();
  ok(M.remotes().length === 1 && r2.alive === false && r1.currentTime === 0 && !(r1.duration < 1e12) && r1.readyState === 0 && r1.playbackRate === 1, 'valida y descarta lo que la página falsea');
  M.ingest('{no es json', () => {}); M.ingest('{"i":1}', () => {});
  ok(M.remotes().length === 1, 'ignora basura');
}
console.log('✓ medios remotos y política de selección');
