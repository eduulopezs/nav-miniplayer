// Prueba de humo sin navegador: carga los módulos del content script con un DOM falso.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { GROUPS } from './groups.mjs';
const files = GROUPS.find((g) => g.id === 'ui').js;
const mk = () => { const f = function () {}; return new Proxy(f, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === 'length' ? 0 : k === 'then' ? undefined : mk(), apply: () => mk(), construct: () => mk(), set: () => true }); };
const listeners = [];
const count = { intervals: 0, scans: 0 };
const el = () => ({ children: [], insertAdjacentHTML() {}, removeAttribute() {}, matches: () => false, closest: () => null, contains: () => false, clientWidth: 312, clientHeight: 126, attachShadow: () => ({ innerHTML: '', set innerHTML(v) { this.html = v; }, querySelector: () => el(), querySelectorAll: () => [], append() {} }), style: { cssText: '', setProperty() {} }, classList: { toggle() {}, add() {}, remove() {}, forEach() {}, contains: () => false }, dataset: {}, addEventListener() {}, append() {}, appendChild() {}, querySelectorAll: () => [], setAttribute() {}, getBoundingClientRect: () => ({}), observe() {} });
const doc = { createElement: el, createTextNode: el, querySelectorAll: () => { count.scans++; return []; }, querySelector: () => null, addEventListener: (t, f) => listeners.push([t, f]), dispatchEvent() {}, body: el(), documentElement: el(), title: '', pictureInPictureEnabled: true };
const win = { top: null, innerWidth: 1280, innerHeight: 720, addEventListener() {} };
win.top = win;
const ctx = vm.createContext({ window: win, document: doc, location: { href: 'https://x/', hostname: 'x' }, navigator: { mediaSession: {} }, chrome: { storage: { local: { get: (k, cb) => cb({}), set() {} }, onChanged: { addListener() {} } }, runtime: {} }, CustomEvent: class { constructor(n, o) { this.detail = o?.detail; } }, ResizeObserver: class { observe() {} disconnect() {} }, matchMedia: () => ({ matches: false }), HTMLMediaElement: class {}, HTMLCanvasElement: { prototype: {} }, requestAnimationFrame: (f) => f(), setInterval: () => { count.intervals++; return 1; }, clearInterval() {}, setTimeout: () => 0, performance: { now: () => 0 }, Image: class {}, console });
ctx.globalThis = ctx;
for (const f of files) vm.runInContext(readFileSync(join(root, f), 'utf8'), ctx, { filename: f });
if (count.intervals !== 0) throw new Error(`oculto por defecto no debe crear temporizadores (hay ${count.intervals})`);
if (count.scans !== 0) throw new Error(`oculto por defecto no debe buscar medios (${count.scans} búsquedas)`);
console.log('✓ carga sin errores; módulos:', Object.keys(ctx.__NMP).join(', '));
const html = ctx.__NMP.css; if (!html.includes('.card')) throw new Error('css vacío');
const N = ctx.__NMP;

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
  const feed = (list, src = 'p') => M.ingest(src, JSON.stringify(list), (s) => sent.push(s), (r) => played.push(r));
  feed([{ i: 1, p: true, d: 90, r: 4 }, { i: 2, p: false, l: true, r: 4 }]);
  let [r1, r2] = M.remotes();
  ok(r1.duration === 90 && r2.duration === Infinity && played.length === 1 && played[0] === r2, 'estado remoto y aviso de inicio');
  r1.play(); r1.pause(); r1.seek(12.5);
  ok(sent.join('|') === 'm:1:play|m:1:pause|m:1:seek:12.500' && r1.currentTime === 12.5, 'órdenes al puente');
  feed([{ i: 1, p: true, t: -5, d: 1e12, r: 99, k: 'x' }, { i: 'x' }, null, { i: 0 }]);
  [r1] = M.remotes();
  ok(M.remotes().length === 1 && r2.alive === false && r1.currentTime === 0 && !(r1.duration < 1e12) && r1.readyState === 0 && r1.playbackRate === 1, 'valida y descarta lo que la página falsea');
  M.ingest('p', '{no es json', () => {}); M.ingest('p', '{"i":1}', () => {});
  ok(M.remotes().length === 1, 'ignora basura');

  // Cada origen tiene su espacio de ids; un iframe que deja de dar señales mientras suena se descarta, el puente no.
  const t0 = 1000;
  M.ingest('f3', JSON.stringify([{ i: 1, p: false, d: 90, r: 4 }]), () => {}, null, t0);
  ok(M.remotes().length === 2, 'mismo id en otro origen no se pisa');
  M.ingest('f3', '[]', () => {});
  ok(M.remotes().length === 1, 'un origen solo vacía lo suyo');
  M.ingest('f3', JSON.stringify([{ i: 1, p: false, d: 90, r: 4 }]), () => {}, null, t0);
  M.expire(t0 + 1000);
  ok(M.remotes().length === 2, 'aún no caduca');
  M.expire(t0 + 7000);
  ok(M.remotes().length === 1, 'caduca el iframe mudo');
}
console.log('✓ medios remotos y política de selección');

// Paleta de la carátula: el ajuste de contraste lleva cualquier color a 3:1 como mínimo y no toca los que ya cumplen.
{
  const { util: U, tokens: T } = ctx.__NMP;
  const bg = U.rgbOf(T.theme.glass['bg-b']);
  const ok = (c, m) => { if (!c) throw new Error('paleta: ' + m); };
  for (const c of [[10, 10, 40], [0, 0, 0], [27, 27, 36], [120, 40, 200]]) ok(U.contrast(U.ensureContrast(c, bg), bg) >= 3, `${c} queda por debajo de 3:1`);
  ok(U.ensureContrast([255, 179, 107], bg).join() === '255,179,107', 'un color que ya cumple no cambia');
  for (const h of U.DEFAULT_PAL) ok(U.contrast(U.rgbOf(h), bg) >= 3, `la paleta por defecto ${h} no llega a 3:1`);
  console.log('✓ paleta de la carátula: contraste mínimo 3:1');
}

// Storyboard de YouTube: el spec lo escribe la página, así que se valida; y la miniatura se calcula por hoja, columna y fila.
{
  const S = N.storyboard, ok = (cond, msg) => { if (!cond) throw new Error('storyboard: ' + msg); };
  const base = 'https://i.ytimg.com/sb/abc/storyboard3_L$L/$N.jpg?sqp=xyz';
  const spec = base + '|48#27#100#10#10#0#default#rs$AAA|80#45#100#10#10#0#M$M#rs$BBB|160#90#200#5#5#10000#M$M#rs$CCC';
  const sb = S.parse(spec);
  ok(sb && sb.level.w === 160 && sb.level.l === 2, 'elige el nivel más pequeño con al menos 100 px de ancho');
  ok(S.sheetUrl(sb, 3) === 'https://i.ytimg.com/sb/abc/storyboard3_L2/M3.jpg?sqp=xyz&sigh=rs%24CCC', 'URL de la hoja');
  // 200 miniaturas de 25 por hoja, una cada 10 s: el segundo 265 es la miniatura 26 -> hoja 1, primera celda.
  let p = S.locate(sb, 265, 2000); ok(p.sheet === 1 && p.col === 1 && p.row === 0, 'hoja, columna y fila (' + JSON.stringify(p) + ')');
  p = S.locate(sb, 5000, 2000); ok(p.sheet === 7 && p.col === 4 && p.row === 4, 'se acota a la última miniatura');
  ok(S.parse('http://i.ytimg.com/x/$L/$N|160#90#10#5#5#0#M$M#s') === null, 'solo https');
  ok(S.parse(base.replace('$N', 'n') + '|160#90#10#5#5#0#M$M#s') === null, 'la base debe llevar $L y $N');
  ok(S.parse(base + '|160#90#10#5#5#0#../x#s') === null, 'nombre con caracteres raros');
  ok(S.parse(base + '|99999#90#10#5#5#0#M$M#s') === null, 'tamaños fuera de rango');
  ok(S.parse(base + '|160#90#10#5#5#abc#M$M#s') === null, 'intervalo no numérico');
  ok(S.parse('x'.repeat(5000)) === null && S.parse(42) === null, 'longitud y tipo');
  console.log('✓ storyboard: validación y cálculo de la miniatura');
}
