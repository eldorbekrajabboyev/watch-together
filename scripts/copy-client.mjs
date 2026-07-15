import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'client', 'dist');
const dest = path.join(root, 'server', 'public');

if (!existsSync(src)) {
  console.error('client/dist not found. Run the client build first.');
  process.exit(1);
}

await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });
console.log(`Copied client build -> ${dest}`);
