// Verificación sin dependencias: el manifest es válido, todos los archivos que
// referencia existen y cada script JavaScript compila.
import { readFileSync, existsSync } from 'node:fs';
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

for (const f of files) {
  const path = join(root, f);
  if (!existsSync(path)) { errors.push(`falta ${f}`); continue; }
  if (f.endsWith('.js')) {
    try { new vm.Script(readFileSync(path, 'utf8'), { filename: f }); } catch (e) { errors.push(`${f}: ${e.message}`); }
  }
}
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) errors.push(`versión no válida: ${manifest.version}`);

if (errors.length) { console.error(errors.map((e) => '✗ ' + e).join('\n')); process.exit(1); }
console.log(`✓ manifest ${manifest.version}: ${files.size} archivos comprobados`);
