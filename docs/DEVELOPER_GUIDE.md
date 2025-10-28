# SeeThroughAI Extension - Developer Guide

## Project Structure

```
web-extension/
├── extension/              # Main extension code
│   ├── manifest.json      # Extension manifest (Manifest V3)
│   ├── background/        # Service worker
│   │   └── service-worker.js
│   ├── content/          # Content scripts
│   │   ├── content-script.js
│   │   └── capture-ui.js
│   ├── popup/            # Extension popup UI
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── lib/              # Libraries
│   │   ├── firebase-config.js
│   │   └── ml-inference.js
│   ├── styles/           # CSS files
│   │   ├── content.css
│   │   └── capture-ui.css
│   └── assets/           # Icons and images
├── docs/                 # Documentation
├── package.json
├── .gitignore
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd web-extension
npm install
```

### 2. Configure Firebase

Edit `extension/lib/firebase-config.js` and add your Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  // ... other config
};
```

### 3. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension` folder

### 4. Test the Extension

1. Click the extension icon in Chrome toolbar
2. Visit any website with images
3. Right-click on an image → "Scan with SeeThroughAI"
4. View results in the popup

## Development Workflow

### Making Changes

1. Edit files in `extension/` folder
2. Go to `chrome://extensions/`
3. Click the refresh icon on your extension
4. Test your changes

### Debugging

**Background Script:**
- Go to `chrome://extensions/`
- Click "Service worker" under your extension
- Use Chrome DevTools console

**Popup:**
- Right-click extension icon → "Inspect popup"
- Use Chrome DevTools

**Content Script:**
- Open any webpage
- Open Chrome DevTools (F12)
- Check Console for content script logs

## Architecture

### Service Worker (Background Script)

**File:** `background/service-worker.js`

**Responsibilities:**
- ML model loading and management
- Context menu creation
- Message handling between components
- Local storage management
- Firebase synchronization
- Notifications

**Key Functions:**
- `loadModel()` - Loads ML model
- `handleImageScan()` - Processes image scans
- `saveScanResult()` - Saves to local storage
- `syncToFirebase()` - Syncs to cloud

### Content Scripts

**File:** `content/content-script.js`

**Responsibilities:**
- Interact with web pages
- Highlight scanned images
- Enable page scanning features

**File:** `content/capture-ui.js`

**Responsibilities:**
- Area selection overlay
- Screenshot capture interface

### Popup UI

**Files:** `popup/popup.html`, `popup.css`, `popup.js`

**Features:**
- Main extension interface
- Quick actions (scan, capture, record)
- Recent scan results
- Statistics overview
- Links to dashboard

## Implementing ML Inference

### Option 1: Transformers.js

```bash
npm install @xenova/transformers
```

**Update `lib/ml-inference.js`:**

```javascript
import { pipeline } from '@xenova/transformers';

export async function loadModel() {
  const classifier = await pipeline(
    'zero-shot-image-classification',
    'Xenova/clip-vit-base-patch32'
  );
  return classifier;
}

export async function runInference(imageUrl, model) {
  const result = await model(imageUrl, {
    candidate_labels: ['AI-generated', 'human-created'],
  });
  
  return {
    result: result.labels[0] === 'AI-generated' ? 'ai' : 'human',
    confidence: Math.round(result.scores[0] * 100)
  };
}
```

### Option 2: ONNX Runtime Web

```bash
npm install onnxruntime-web
```

**Convert your model to ONNX format, then:**

```javascript
import * as ort from 'onnxruntime-web';

export async function loadModel() {
  const session = await ort.InferenceSession.create('/models/smolvlm2.onnx');
  return session;
}
```

## Firebase Integration

### Setup

1. Create Firebase project
2. Enable Authentication (Email/Password)
3. Enable Firestore
4. Deploy Cloud Functions (from main repo)

### Authentication

```javascript
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from './lib/firebase-config.js';
import { initializeApp } from 'firebase/app';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Sign in
await signInWithEmailAndPassword(auth, email, password);
```

### Syncing Scans

```javascript
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const db = getFirestore(app);

// Save scan
await addDoc(collection(db, 'scans'), {
  userId: user.uid,
  result: 'ai',
  confidence: 85,
  timestamp: Date.now()
});
```

## Testing

### Unit Tests (Coming Soon)

```bash
npm test
```

### Manual Testing Checklist

- [ ] Extension installs without errors
- [ ] Popup opens and displays correctly
- [ ] Context menu appears on images
- [ ] Image scanning works
- [ ] Results save to local storage
- [ ] Statistics update correctly
- [ ] Links open correct pages
- [ ] Capture UI displays properly
- [ ] Firebase sync works (if configured)
- [ ] Notifications appear

## Building for Production

### 1. Update Version

Edit `manifest.json`:
```json
{
  "version": "1.0.1"
}
```

### 2. Remove Debug Code

- Remove `console.log()` statements
- Remove test API keys
- Enable production Firebase config

### 3. Create ZIP

```bash
cd extension
zip -r seethroughai-v1.0.1.zip .
```

### 4. Submit to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay one-time $5 developer fee (if first time)
3. Click "New Item"
4. Upload ZIP file
5. Fill out listing details
6. Submit for review

## Common Issues

### "Service worker registration failed"

**Solution:** Check manifest.json syntax

### "Cannot access chrome.* APIs"

**Solution:** Ensure you're using https:// or loaded as extension

### Model loading fails

**Solution:** 
- Check model file exists in `/models`
- Verify CORS headers
- Check browser console for errors

### Firebase auth not working

**Solution:**
- Verify firebaseConfig is correct
- Check Firebase console for auth errors
- Ensure domain is whitelisted in Firebase

## Performance Tips

1. **Lazy load ML model** - Only load when first needed
2. **Cache model** - Save to IndexedDB after first load
3. **Batch operations** - Group Firebase writes
4. **Optimize images** - Resize before inference
5. **Use web workers** - Offload heavy processing

## Security Best Practices

1. **Never hardcode API keys** - Use environment variables
2. **Validate all inputs** - Sanitize user data
3. **Use HTTPS** - All external requests
4. **Minimal permissions** - Request only what you need
5. **Content Security Policy** - Define in manifest

## Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Transformers.js](https://huggingface.co/docs/transformers.js)
- [Firebase Docs](https://firebase.google.com/docs)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)

## Support

For issues, open a GitHub issue or contact: support@brainrot.tools
