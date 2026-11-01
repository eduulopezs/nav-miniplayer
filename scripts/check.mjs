// Verificación sin dependencias: el manifest es válido, todos los archivos que
// referencia existen y cada script JavaScript compila.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { GROUPS } from './groups.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const errors = [];

// Los grupos de scripts de src/background/injection.js son la fuente única: se registran en tiempo de ejecución para los orígenes
// concedidos. El manifiesto no debe declarar hosts ni content_scripts (darían el aviso de instalación de "todos los sitios").
if (manifest.content_scripts?.length) errors.push('manifest.json: content_scripts debe estar vacío (los scripts se registran en src/background/injection.js)');
if (manifest.host_permissions?.length) errors.push('manifest.json: los hosts van en optional_host_permissions');

const files = new Set();
for (const g of GROUPS) for (const f of g.js) files.add(f);
if (manifest.background?.service_worker) files.add(manifest.background.service_worker);
for (const f of Object.values(manifest.icons ?? {})) files.add(f);
// Scripts que el service worker carga con importScripts (ruta relativa a su carpeta).
if (manifest.background?.service_worker) {
  const swPath = manifest.background.service_worker;
  const code = existsSync(join(root, swPath)) ? readFileSync(join(root, swPath), 'utf8') : '';
  for (const [, args] of code.matchAll(/importScripts\(([^)]*)\)/g)) for (const [, f] of args.matchAll(/'([^']+)'/g)) files.add(join(dirname(swPath), f).replace(/\\/g, '/'));
}
// Página de la ventana aparte: sus scripts y su hoja de estilos (rutas relativas a la página).
{
  const page = 'src/window/player.html';
  const html = existsSync(join(root, page)) ? readFileSync(join(root, page), 'utf8') : '';
  files.add(page);
  for (const [, f] of html.matchAll(/(?:src|href)="([^"]+)"/g)) files.add(join(dirname(page), f).replace(/\\/g, '/'));
}

// Página de ajustes (options_ui): sus scripts y su hoja de estilos.
if (manifest.options_ui?.page) {
  const page = manifest.options_ui.page;
  const html = existsSync(join(root, page)) ? readFileSync(join(root, page), 'utf8') : '';
  files.add(page);
  for (const [, f] of html.matchAll(/(?:src|href)="([^"]+)"/g)) files.add(join(dirname(page), f).replace(/\\/g, '/'));
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

// i18n: los _locales tienen las mismas claves, cada clave usada existe y ningún mensaje queda sin usar.
{
  const read = (lang) => JSON.parse(readFileSync(join(root, '_locales', lang, 'messages.json'), 'utf8'));
  const es = read(manifest.default_locale ?? 'es'), others = readdirSync(join(root, '_locales')).filter((l) => l !== (manifest.default_locale ?? 'es'));
  for (const lang of [manifest.default_locale ?? 'es', ...others]) {
    const m = read(lang);
    for (const k of Object.keys(es)) if (!(k in m)) errors.push(`_locales/${lang}: falta ${k}`);
    for (const k of Object.keys(m)) if (!(k in es)) errors.push(`_locales/${lang}: ${k} no existe en ${manifest.default_locale}`);
    for (const [k, v] of Object.entries(m)) {
      const names = Object.keys(v.placeholders ?? {}), used = [...v.message.matchAll(/\$(\w+)\$/g)].map((x) => x[1]);
      if (names.some((n) => !used.includes(n)) || used.some((n) => !names.includes(n))) errors.push(`_locales/${lang}: marcadores mal escritos en ${k}`);
    }
    for (const k of Object.keys(m)) if (es[k] && Object.keys(es[k].placeholders ?? {}).length !== Object.keys(m[k].placeholders ?? {}).length) errors.push(`_locales/${lang}: marcadores distintos en ${k}`);
  }
  const used = new Set();
  const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).forEach((e) => {
    const p = d + '/' + e.name;
    if (e.isDirectory()) { if (e.name !== 'fonts') walk(p); return; }
    if (!/\.(js|html)$/.test(e.name)) return;
    const text = readFileSync(join(root, p), 'utf8');
    for (const [, k] of text.matchAll(/(?:NMP\.t|\bt|getMessage)\(\s*'(\w+)'/g)) used.add(k);
    for (const [, k] of text.matchAll(/data-i18n(?:-label|-title)?="(\w+)"/g)) used.add(k);
    for (const [, k] of text.matchAll(/'(theme(?:Glass|Noir|Crt|Metal|Minimal|Ansi|Dynamic))'/g)) used.add(k);
  });
  walk('src');
  for (const [, k] of JSON.stringify(manifest).matchAll(/__MSG_(\w+)__/g)) used.add(k);
  for (const k of used) if (!(k in es)) errors.push(`clave de i18n sin definir: ${k}`);
  for (const k of Object.keys(es)) if (!used.has(k)) errors.push(`mensaje sin usar: ${k}`);
}

if (errors.length) { console.error(errors.map((e) => '✗ ' + e).join('\n')); process.exit(1); }
console.log(`✓ manifest ${manifest.version}: ${files.size} archivos comprobados`);
