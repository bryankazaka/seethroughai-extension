import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const extDir = path.join(root, 'extension');
const distDir = path.join(root, 'dist');

async function ensureDir(p) {
  try {
    await fs.mkdir(p, { recursive: true });
  } catch {}
}

async function readJSON(p) {
  const raw = await fs.readFile(p, 'utf-8');
  return JSON.parse(raw);
}

async function zipDirectory(srcDir, outFile) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outFile);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn(err);
      } else {
        reject(err);
      }
    });
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(srcDir + '/', false);
    archive.finalize();
  });
}

async function main() {
  const pkg = await readJSON(pkgPath);
  // Ensure output directory exists
  await ensureDir(distDir);
  const outName = `seethroughai-extension-v${pkg.version}.zip`;
  const outPath = path.join(distDir, outName);
  console.log(`Creating ${outPath} ...`);
  // If a Vite build has produced a bundled extension in dist, zip that.
  // Fall back to zipping the extension/ folder if dist is missing.
  const srcToZip = await (async () => {
    try {
      await fs.access(distDir);
      // dist exists and will be used as source
      return distDir;
    } catch {
      return extDir;
    }
  })();

  await zipDirectory(srcToZip, outPath);
  console.log('Build complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
