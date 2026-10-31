// Carga NMPInject (y GROUPS) de src/background/injection.js (fuente única de los grupos de scripts).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const inj = { self: {} };
vm.runInNewContext(readFileSync(join(root, 'src/background/injection.js'), 'utf8'), inj);
export const NMPInject = inj.self.NMPInject;
export const GROUPS = NMPInject.GROUPS;
