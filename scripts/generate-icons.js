/*
 * Generate PNG icons for the extension from SVG sources.
 * Preferred source: extension/assets/favicon48BWv2.svg (matches site favicon)
 * Fallback sources in extension/assets/:
 *  - favicon16.svg  -> icon16.png (16x16)
 *  - favicon32.svg  -> icon48.png (48x48)
 *  - iOSICON.svg    -> icon128.png (128x128)
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'extension', 'assets');

async function ensureExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function generate() {
  const preferredSvg = path.join(assetsDir, 'favicon48BWv2.svg');
  const hasPreferred = await ensureExists(preferredSvg);

  if (hasPreferred) {
    const sizes = [
      { out: 'icon16.png', size: 16 },
      { out: 'icon48.png', size: 48 },
      { out: 'icon128.png', size: 128 },
    ];

    for (const { out, size } of sizes) {
      const outPath = path.join(assetsDir, out);
      console.log(`Generating ${out} from favicon48BWv2.svg at ${size}x${size} ...`);
      await sharp(preferredSvg)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toFile(outPath);
    }
  } else {
    const sources = [
      { src: 'favicon16.svg', out: 'icon16.png', size: 16 },
      { src: 'favicon32.svg', out: 'icon48.png', size: 48 },
      { src: 'iOSICON.svg', out: 'icon128.png', size: 128 },
    ];

    for (const { src, out, size } of sources) {
      const srcPath = path.join(assetsDir, src);
      const outPath = path.join(assetsDir, out);

      const exists = await ensureExists(srcPath);
      if (!exists) {
        console.error(`Missing source: ${srcPath}`);
        process.exitCode = 1;
        continue;
      }

      console.log(`Generating ${out} from ${src} at ${size}x${size} ...`);
      await sharp(srcPath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toFile(outPath);
    }
  }

  console.log('Icon generation complete.');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
