// Empaqueta la extensión en dist/nav-miniplayer-<versión>.zip sin dependencias (zip con deflate hecho a mano).
// Solo entra lo que usa el navegador: manifest, iconos y src.
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = ['manifest.json', ...walk(join(root, 'icons')).map((p) => relative(root, p)), ...walk(join(root, 'src')).map((p) => relative(root, p))]
  .map((f) => f.replace(/\\/g, '/')).sort();

const T = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (b) => { let c = -1; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const DOS_TIME = 0, DOS_DATE = (2020 - 1980) << 9 | 1 << 5 | 1; // fecha fija: el zip sale igual en cada ejecución

const parts = [], central = [];
let offset = 0;
for (const f of files) {
  const data = readFileSync(join(root, f)), comp = deflateRawSync(data, { level: 9 }), name = Buffer.from(f), crc = crc32(data);
  const h = Buffer.alloc(30);
  h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8); h.writeUInt16LE(DOS_TIME, 10); h.writeUInt16LE(DOS_DATE, 12);
  h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(name.length, 26);
  parts.push(h, name, comp);
  const c = Buffer.alloc(46);
  c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10); c.writeUInt16LE(DOS_TIME, 12); c.writeUInt16LE(DOS_DATE, 14);
  c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
  central.push(c, name);
  offset += h.length + name.length + comp.length;
}
const cdSize = central.reduce((n, b) => n + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cdSize, 12); end.writeUInt32LE(offset, 16);

mkdirSync(join(root, 'dist'), { recursive: true });
const out = join('dist', `nav-miniplayer-${manifest.version}.zip`);
writeFileSync(join(root, out), Buffer.concat([...parts, ...central, end]));
console.log(`✓ ${out}: ${files.length} archivos`);
