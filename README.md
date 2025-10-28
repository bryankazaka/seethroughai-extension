# SeeThroughAI Browser Extension

AI-powered content authenticity detector running locally in your browser.

## Features

- 🔍 **Instant Detection**: Analyze images with client-side ML inference
- 🚀 **Fast & Private**: All processing happens in your browser
- ☁️ **Cloud Sync**: Optional sync to Firebase for cross-device access
- 📊 **Analytics Dashboard**: Track your scan history and patterns
- 🎯 **Context Menu**: Right-click any image to scan

## Quick start (short)

Prereqs: Node.js 18+ and npm.

From this folder:

```bash
npm ci
npm test   # optional sanity check
npm run build
```

- Dev load: Chrome → `chrome://extensions/` → enable Developer mode → Load unpacked → select `web-extension/extension`
- Release zip: `web-extension/dist/seethroughai-extension-v<version>.zip`
- Icons (only if you changed the favicon source):

```bash
npm run icons   # regenerates icon16/48/128.png from extension/assets/favicon48BWv2.svg
```

Notes:
- No secrets/config needed to build. To enable cloud features later, paste your Firebase Web App config into `extension/lib/firebase-config.js`.

## Usage

### Scan an Image

1. Right-click on any image
2. Select "Scan with SeeThroughAI"
3. View results in the popup

### Capture Screen Area

1. Click the extension icon
2. Click "Capture Area"
3. Select the area to analyze

### View History

1. Click the extension icon
2. Click "View Dashboard"
3. See all your scans and analytics


## Development

### Project Structure

```
web-extension/
├── package.json            # Dependencies and scripts
└── extension/
├── manifest.json          # Extension manifest
├── background/            # Service worker
├── content/               # Content scripts
├── popup/                 # Popup UI
├── lib/                   # Libraries (Firebase, ML)
├── styles/                # CSS files
└── assets/                # Icons and images
```

### Building

Run `npm run build`. Output: `web-extension/dist/seethroughai-extension-v<version>.zip`.

### Testing

```bash
npm test
```

Runs a quick sanity check to validate `manifest.json`, required files (service worker, popup, content script), and icon assets.

## Technologies

- Chrome Extension Manifest V3
- Transformers.js / ONNX Runtime Web
- Firebase (Auth, Firestore, Functions)
- IndexedDB for local storage
- WebGPU/WASM for ML acceleration

## Security and audits

- Dependencies are kept up to date. We pin `undici >= 6.21.2` via npm overrides to address known advisories.
- Run security checks anytime:

```bash
cd web-extension
npm audit
```

## Privacy

- Images are processed locally in your browser
- Only scan results (not images) are synced to cloud
- You control what data is uploaded
- Data can be deleted at any time

## Developers

- This is a solo project undertaken by Winner Kazaka