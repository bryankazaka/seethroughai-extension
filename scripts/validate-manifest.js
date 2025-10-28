import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const extDir = path.join(root, 'extension');
const manifestPath = path.join(extDir, 'manifest.json');

function fail(msg) {
  console.error(`\u274c ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`\u2705 ${msg}`);
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(manifestPath))) fail(`manifest.json not found at ${manifestPath}`);

  const raw = await fs.readFile(manifestPath, 'utf-8');
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (e) {
    fail(`manifest.json is not valid JSON: ${e.message}`);
  }

  if (manifest.manifest_version !== 3) fail('manifest_version must be 3');
  ok('manifest_version is 3');

  if (!manifest.name) fail('name is required in manifest');
  if (!manifest.version) fail('version is required in manifest');
  ok(`name: ${manifest.name}, version: ${manifest.version}`);

  const swPath = path.join(extDir, manifest.background?.service_worker || '');
  if (!(await exists(swPath))) fail(`background service worker not found: ${swPath}`);
  ok('background service worker exists');

  const popupPath = path.join(extDir, manifest.action?.default_popup || '');
  if (!(await exists(popupPath))) fail(`popup not found: ${popupPath}`);
  ok('popup exists');

  const contentJs = manifest.content_scripts?.[0]?.js?.[0];
  if (!contentJs) fail('content_scripts[0].js[0] missing');
  const contentPath = path.join(extDir, contentJs);
  if (!(await exists(contentPath))) fail(`content script not found: ${contentPath}`);
  ok('content script exists');

  // Icons check
  const icons = manifest.icons || {};
  const required = [['16', 'icon16.png'], ['48', 'icon48.png'], ['128', 'icon128.png']];
  for (const [size, fname] of required) {
    const rel = icons[size];
    if (!rel || !rel.endsWith(fname)) fail(`icons[${size}] should point to ${fname}`);
    const abs = path.join(extDir, rel);
    if (!(await exists(abs))) fail(`Icon missing on disk: ${abs}`);
  }
  ok('icons are present and correctly referenced');

  console.log('\nAll checks passed.');
}

main().catch((e) => fail(e.message));
