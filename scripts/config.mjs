// Carga NMP.cfg de src/content/config.js (fuente única de diseños, órdenes y claves) para los scripts de comprobación.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = vm.createContext({});
ctx.globalThis = ctx;
vm.runInContext(readFileSync(join(root, 'src/content/config.js'), 'utf8'), ctx);
export const CFG = ctx.__NMP.cfg;
