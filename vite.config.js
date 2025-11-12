import { defineConfig } from 'vite';
import { resolve } from 'path';

// Plugin to replace import.meta.url for Chrome extension compatibility
function replaceImportMeta() {
  return {
    name: 'replace-import-meta',
    transform(code, id) {
      if (code.includes('import.meta')) {
        // Replace import.meta.url with chrome.runtime.getURL for extension context
        code = code.replace(
          /import\.meta\.url/g,
          'typeof chrome !== "undefined" && chrome.runtime ? chrome.runtime.getURL("") : document.currentScript?.src || ""'
        );
      }
      return code;
    }
  };
}

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'service-worker': resolve(__dirname, 'extension/background/service-worker.js'),
        'content-script': resolve(__dirname, 'extension/content/content-script.js'),
        popup: resolve(__dirname, 'extension/popup/popup.html'),
        settings: resolve(__dirname, 'extension/popup/settings.html'),
        admin: resolve(__dirname, 'extension/popup/admin.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'service-worker') {
            return 'background/service-worker.js';
          }
          if (chunkInfo.name === 'content-script') {
            return 'content/content-script.js';
          }
          return 'popup/[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.html')) {
            return 'popup/[name][extname]';
          }
          if (assetInfo.name.endsWith('.css')) {
            return 'styles/[name][extname]';
          }
          return 'assets/[name][extname]';
        },
      },
    },
    sourcemap: false,
    minify: false, // Disable for debugging
    target: 'chrome100', // Target Chrome extensions
    modulePreload: false, // Disable module preload
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'extension'),
      '@lib': resolve(__dirname, 'extension/lib'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  plugins: [replaceImportMeta()],
});
