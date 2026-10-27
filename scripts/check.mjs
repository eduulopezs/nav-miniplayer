// Verificación sin dependencias: el manifest es válido, todos los archivos que
// referencia existen y cada script JavaScript compila.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const errors = [];

const files = new Set();
if (manifest.background?.service_worker) files.add(manifest.background.service_worker);
for (const cs of manifest.content_scripts ?? []) for (const f of [...(cs.js ?? []), ...(cs.css ?? [])]) files.add(f);
for (const f of Object.values(manifest.icons ?? {})) files.add(f);
// Scripts que el service worker carga con importScripts (ruta relativa a su carpeta).
if (manifest.background?.service_worker) {
  const swPath = manifest.background.service_worker;
  const code = existsSync(join(root, swPath)) ? readFileSync(join(root, swPath), 'utf8') : '';
  for (const [, f] of code.matchAll(/importScripts\('([^']+)'\)/g)) files.add(join(dirname(swPath), f).replace(/\\/g, '/'));
}

for (const f of files) {
  const path = join(root, f);
  if (!existsSync(path)) { errors.push(`falta ${f}`); continue; }
  if (f.endsWith('.js')) {
    try { new vm.Script(readFileSync(path, 'utf8'), { filename: f }); } catch (e) { errors.push(`${f}: ${e.message}`); }
  }
}
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) errors.push(`versión no válida: ${manifest.version}`);

// Tokens: cada var(--x) de styles.js existe (en Glass o declarada en el propio CSS) y cada token se usa en algún sitio.
{
  const dir = join(root, 'src/content');
  const ctx = vm.createContext({}); ctx.globalThis = ctx;
  vm.runInContext(readFileSync(join(dir, 'tokens.js'), 'utf8'), ctx);
  const { theme: K, css } = ctx.__NMP.tokens;
  const styles = readFileSync(join(dir, 'styles.js'), 'utf8');
  const sources = readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'tokens.js').map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
  const names = (text) => [...text.matchAll(/--([\w-]+):/g)].map((m) => m[1]);
  const defined = new Set([...Object.keys(K.glass), ...names(css), ...names(styles), ...[...sources.matchAll(/setProperty\('--([\w-]+)'/g)].map((m) => m[1])]);
  for (const [, name, fallback] of styles.matchAll(/var\(--([\w-]+)(,)?/g)) if (!defined.has(name) && !fallback) errors.push(`styles.js usa var(--${name}) sin definir`);
  for (const [theme, tokens] of Object.entries(K)) for (const k of Object.keys(tokens)) {
    if (!new RegExp(`--${k}\\b|['".]${k}\\b`).test(sources)) errors.push(`token sin usar: ${theme}.${k}`);
  }
}

if (errors.length) { console.error(errors.map((e) => '✗ ' + e).join('\n')); process.exit(1); }
console.log(`✓ manifest ${manifest.version}: ${files.size} archivos comprobados`);
