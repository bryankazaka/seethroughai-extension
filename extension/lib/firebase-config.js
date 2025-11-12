import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyBfxTYr8XMlO5T-HqUAxPlF8YYszacuz5E",
  authDomain: "seethrough-ai.firebaseapp.com",
  projectId: "seethrough-ai",
  storageBucket: "seethrough-ai.firebasestorage.app",
  messagingSenderId: "158233220276",
  appId: "1:158233220276:web:6ecd7d719d23c39252b3e1",
  measurementId: "G-7KVTKBPXMJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Detect development mode (extension loaded unpacked vs. published)
const isDevelopment = !('update_url' in chrome.runtime.getManifest());

// Override detection with localStorage flag if needed
const forceProduction = localStorage.getItem('forceProduction') === 'true';
const useEmulators = isDevelopment && !forceProduction;

if (useEmulators) {
  console.log('🔧 Running in DEVELOPMENT mode - connecting to Firebase Emulators');
  
  // Connect to emulators
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  
  console.log('✅ Connected to local emulators:');
  console.log('  Auth: http://127.0.0.1:9099');
  console.log('  Firestore: http://127.0.0.1:8080');
  console.log('  Storage: http://127.0.0.1:9199');
  console.log('  Functions: http://127.0.0.1:5001');
  console.log('  UI: http://localhost:4000');
} else {
  console.log('🚀 Running in PRODUCTION mode - using live Firebase');
}

export { app, auth, db, storage, functions, useEmulators };
export default firebaseConfig;

