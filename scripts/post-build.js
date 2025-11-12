#!/usr/bin/env node
/**
 * Post-build script to copy static assets to dist
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  console.log('📦 Post-build: Copying static assets to dist...');
  
  const distDir = path.join(root, 'dist');
  
  // Copy manifest.json
  await fs.copyFile(
    path.join(root, 'extension/manifest.json'),
    path.join(distDir, 'manifest.json')
  );
  console.log('  ✓ Copied manifest.json');
  
  // Copy assets folder
  await copyDir(
    path.join(root, 'extension/assets'),
    path.join(distDir, 'assets')
  );
  console.log('  ✓ Copied assets/');
  
  // Copy styles folder (content.css, etc.)
  await copyDir(
    path.join(root, 'extension/styles'),
    path.join(distDir, 'styles')
  );
  
  // Copy popup.css from popup folder to styles folder
  await fs.copyFile(
    path.join(root, 'extension/popup/popup.css'),
    path.join(distDir, 'styles/popup.css')
  );
  console.log('  ✓ Copied styles/');
  
  // Copy popup scripts (seed-demo.js, popup.js, admin.js, settings.js, login.js) that aren't bundled by Vite
  await fs.mkdir(path.join(distDir, 'popup'), { recursive: true });
  
  const popupScripts = ['seed-demo.js', 'popup.js', 'admin.js', 'settings.js', 'login.js'];
  for (const script of popupScripts) {
    await fs.copyFile(
      path.join(root, 'extension/popup', script),
      path.join(distDir, 'popup', script)
    );
  }
  console.log('  ✓ Copied popup scripts/');
  
  // Copy login.html to extension/popup (Vite doesn't process it)
  await fs.copyFile(
    path.join(root, 'extension/popup/login.html'),
    path.join(distDir, 'extension/popup/login.html')
  );
  console.log('  ✓ Copied login.html');
  
  // Copy capture-ui.js to content folder
  await fs.mkdir(path.join(distDir, 'content'), { recursive: true });
  await fs.copyFile(
    path.join(root, 'extension/content/capture-ui.js'),
    path.join(distDir, 'content/capture-ui.js')
  );
  console.log('  ✓ Copied capture-ui.js');
  
  // Create placeholder for ONNX model
  await fs.mkdir(path.join(distDir, 'smolvlm-classifier-onnx'), { recursive: true });
  await fs.writeFile(
    path.join(distDir, 'smolvlm-classifier-onnx/README.txt'),
    'Copy classifier.onnx (520MB) here before loading extension.\n' +
    'Model location: ../smolvlm-classifier-onnx/classifier.onnx\n'
  );
  console.log('  ✓ Created model placeholder (copy classifier.onnx manually)');
  
  console.log('✅ Post-build complete!');
  console.log('\nNext steps:');
  console.log('1. Copy smolvlm-classifier-onnx/classifier.onnx to dist/smolvlm-classifier-onnx/');
  console.log('2. Load dist/ folder as unpacked extension in Chrome');
}

main().catch((e) => {
  console.error('❌ Post-build failed:', e);
  process.exit(1);
});
