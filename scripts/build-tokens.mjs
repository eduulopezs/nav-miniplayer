// Genera src/content/tokens.js a partir de design/tokens.json.
// Resuelve '{primitivo}' y '{primitivo}@alfa' a valores concretos (el lienzo de Mini no entiende var()).
// Uso: node scripts/build-tokens.mjs [--check]  (--check falla si tokens.js no está al día).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = JSON.parse(readFileSync(join(root, 'design/tokens.json'), 'utf8'));
const out = join(root, 'src/content/tokens.js');

const rgb = (hex) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`primitivo no es #rrggbb: ${hex}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
};
const alpha = (a) => String(+a).replace(/^0\./, '.');

const resolve = (v, where) => {
  const m = /^\{([\w-]+)\}(?:@([\d.]+))?$/.exec(v);
  if (!m) return v;
  const hex = src.primitive[m[1]];
  if (!hex) throw new Error(`${where}: primitivo desconocido "${m[1]}"`);
  return m[2] === undefined ? hex : `rgba(${rgb(hex).join(',')},${alpha(m[2])})`;
};

const themes = {};
for (const [name, tokens] of Object.entries(src.themes)) {
  themes[name] = Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, resolve(v, `${name}.${k}`)]));
}

const decl = (o) => Object.entries(o).filter(([k]) => !k.startsWith('mini-')).map(([k, v]) => `--${k}: ${v};`).join(' ');
const shared = Object.fromEntries(Object.entries(src.shared).map(([k, v]) => [k, resolve(v, `shared.${k}`)]));
const css = [
  `.card { ${decl(shared)} ${decl(themes.glass)} }`,
  ...Object.keys(themes).filter((n) => n !== 'glass').map((n) => `.card[data-theme=${n}] { ${decl(themes[n])} }`),
].join('\n  ');

const body = `// GENERADO por scripts/build-tokens.mjs desde design/tokens.json: no editar a mano.
(() => {
  const NMP = (globalThis.__NMP ||= {});

  NMP.tokens = {
    css: ${JSON.stringify('\n  ' + css + '\n')},
    theme: ${JSON.stringify(themes, null, 2).replace(/\n/g, '\n    ')},
  };
})();
`;

if (process.argv.includes('--check')) {
  if (!existsSync(out) || readFileSync(out, 'utf8').replace(/\r\n/g, '\n') !== body) { console.error('✗ src/content/tokens.js desactualizado: ejecuta `npm run tokens`'); process.exit(1); }
  console.log('✓ tokens.js al día');
} else {
  writeFileSync(out, body);
  console.log(`✓ ${out.replace(root, '.')}: ${Object.keys(themes).length} temas`);
}
