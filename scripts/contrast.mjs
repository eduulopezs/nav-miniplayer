// Auditoría de contraste WCAG de los tokens: texto sobre fondo en cada diseño.
// Uso: node scripts/contrast.mjs [--strict]  (--strict sale con error si algún par no llega a su mínimo).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = vm.createContext({});
ctx.globalThis = ctx;
vm.runInContext(readFileSync(join(root, 'src/content/tokens.js'), 'utf8'), ctx);
const K = ctx.__NMP.tokens.theme;

const parse = (c) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  const r = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(c);
  if (r) return [+r[1], +r[2], +r[3], +r[4]];
  throw new Error('color no soportado: ' + c);
};
const over = (fg, bg) => { const [r, g, b, a] = parse(fg), [R, G, B] = parse(bg); return [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)]; };
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (fg, bg) => { const [a, b] = [lum(over(fg, bg)), lum(parse(bg))].sort((x, y) => y - x); return (a + .05) / (b + .05); };
const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

// [tema, texto, token del texto, token del fondo, mínimo]; 4.5 texto normal, 3 texto grande / componentes de interfaz.
const pairs = [
  ['glass', 'título', 'text', 'bg-a', 4.5], ['glass', 'título', 'text', 'bg-b', 4.5],
  ['glass', 'artista', 'mini-fg-2', 'bg-a', 4.5], ['glass', 'tiempo', 'mini-time', 'bg-a', 4.5],
  ['noir', 'título', 'mini-fg', 'mini-bg-a', 4.5], ['noir', 'artista', 'mini-fg-2', 'mini-bg-a', 4.5], ['noir', 'tiempo', 'mini-time', 'mini-bg-a', 4.5],
  ['crt', 'título', 'mini-fg', 'mini-bg-a', 4.5], ['crt', 'artista', 'mini-fg-2', 'mini-bg-a', 4.5], ['crt', 'tiempo', 'mini-time', 'mini-bg-a', 4.5],
  ['metal', 'título', 'mini-fg', 'mini-bg-a', 4.5], ['metal', 'artista', 'mini-fg-2', 'mini-bg-a', 4.5], ['metal', 'tiempo', 'mini-time', 'mini-bg-a', 4.5],
];

let fails = 0;
for (const [theme, what, fgKey, bgKey, min] of pairs) {
  const k = { ...K.glass, ...K[theme] }; // los diseños heredan de Glass lo que no definen (p. ej. el título usa --text)
  const bg = typeof bgKey === 'function' ? bgKey(k) : k[bgKey];
  const fg = k[fgKey];
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) fails++;
  console.log(`${ok ? '✓' : '✗'} ${theme.padEnd(6)} ${what.padEnd(11)} ${fgKey.padEnd(9)} sobre ${(typeof bgKey === 'function' ? 'fondo' : bgKey).padEnd(8)} ${r.toFixed(2).padStart(5)}:1 (mín ${min})`);
}
console.log(fails ? `\n${fails} par(es) por debajo del mínimo WCAG` : '\n✓ todos los pares cumplen WCAG');
if (fails && process.argv.includes('--strict')) process.exit(1);
