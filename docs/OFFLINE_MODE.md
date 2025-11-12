# Offline Development Mode

This guide explains how to develop and test the SeeThroughAI extension using Firebase Local Emulator Suite, enabling fully offline development without affecting production data.

## Overview

The Firebase Local Emulator Suite provides local emulation of:
- **Authentication** (port 9099)
- **Firestore** (port 8080)
- **Cloud Storage** (port 9199)
- **Cloud Functions** (port 5001)
- **Emulator UI** (port 4000)

## Quick Start

### 1. Install Dependencies

```bash
cd web-extension
npm install
```

This installs `firebase-tools` as a dev dependency.

### 2. Start Emulators

```bash
npm run emulators
```

This will:
- Start all Firebase emulators
- Open the Emulator UI at http://localhost:4000
- Provide mock services for Auth, Firestore, Storage, and Functions

### 3. Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `web-extension/extension` folder

The extension will automatically detect it's running against emulators and connect to localhost instead of production.

## Configuration

### Automatic Emulator Detection

The extension automatically detects when running in development mode:

```javascript
// In firebase-config.js
const isDevelopment = !('update_url' in chrome.runtime.getManifest());

if (isDevelopment) {
  // Connect to emulators
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}
```

**How it works:**
- Published extensions have an `update_url` in manifest
- Locally loaded extensions don't have this field
- Extension auto-connects to emulators when loaded unpacked

### Manual Override

To force production mode during local development, set:

```javascript
localStorage.setItem('forceProduction', 'true');
```

## Seed Data

Pre-populate the emulators with test data:

```bash
npm run seed-data
```

This creates:
- 3 test user accounts
- Sample detection history
- Admin account
- Mock analytics data

### Test Accounts

| Email | Password | Role |
|-------|----------|------|
| user@test.com | password123 | User |
| admin@test.com | admin123 | Admin |
| demo@test.com | demo123 | User (with history) |

## Data Persistence

### Export Emulator Data

Save current emulator state to disk:

```bash
npm run emulators:export
```

Exports to `./emulator-data/` directory.

### Import Emulator Data

Restart emulators with saved state:

```bash
npm run emulators:import
```

**Use case**: Share consistent test data across team members.

## Emulator UI

Access at http://localhost:4000

Features:
- View and edit Firestore documents
- Inspect Auth users
- Browse Storage files
- Monitor Function logs
- Real-time updates

## Testing Workflows

### Test User Registration

1. Open extension popup
2. Click "Sign Up"
3. Create account (stored in Auth emulator)
4. Verify user document created in Firestore

### Test Image Detection

1. Right-click any image → "Scan with SeeThroughAI"
2. Check Firestore for new detection document
3. Verify thumbnail uploaded to Storage (if auto-upload enabled)
4. View result in extension history

### Test Admin Features

1. Sign in with admin@test.com
2. Navigate to admin dashboard
3. View system analytics (using emulator data)
4. Test user management functions

## Troubleshooting

### Emulators Won't Start

**Issue**: Port already in use

```bash
# Find process using port 8080
lsof -i :8080

# Kill process
kill -9 <PID>
```

**Issue**: Firebase CLI not found

```bash
npm install -g firebase-tools
```

### Extension Not Connecting

**Issue**: Extension connects to production

- Check browser console for connection messages
- Verify `isDevelopment` is true in firebase-config.js
- Hard refresh extension (chrome://extensions/ → Reload)

### Data Not Persisting

Emulator data is ephemeral by default. To persist:

1. Export before stopping: `npm run emulators:export`
2. Import on restart: `npm run emulators:import`
3. Or use `--import` and `--export-on-exit` flags together

## Best Practices

1. **Always develop with emulators** - Never test against production
2. **Export seed data** - Share consistent state with team
3. **Use test accounts** - Don't mix development and real user data
4. **Clear emulator data** - Fresh start for each test cycle
5. **Check Emulator UI** - Verify data writes and security rules

## CI/CD Integration

For automated testing:

```bash
# Start emulators in background
firebase emulators:exec --only auth,firestore "npm test"
```

This:
- Starts emulators
- Runs tests
- Stops emulators automatically

## Production Deployment

When ready to deploy:

1. Build extension: `npm run build`
2. Deploy Firebase rules: `firebase deploy --only firestore:rules,storage:rules`
3. Test with production credentials
4. Submit to Chrome Web Store

## Resources

- [Firebase Emulator Suite Docs](https://firebase.google.com/docs/emulator-suite)
- [Extension Development Guide](./DEVELOPER_GUIDE.md)
- [Security Rules Testing](https://firebase.google.com/docs/rules/unit-tests)
