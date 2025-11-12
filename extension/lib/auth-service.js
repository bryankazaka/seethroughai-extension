/**
 * Authentication Service
 * Handles all Firebase Authentication operations
 */

import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
  onAuthStateChanged,
  updateEmail,
  updatePassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase-config.js';

/**
 * Sign up a new user
 */
export async function signUp(email, password, displayName) {
  try {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: displayName || null,
      createdAt: serverTimestamp(),
      settings: {
        autoSync: true,
        autoUpload: false,
        theme: 'light',
        notifications: true,
        storageMode: 'thumbnails' // 'full' or 'thumbnails'
      }
    });
    
    // Initialize analytics document
    await setDoc(doc(db, 'analytics', user.uid), {
      totalDetections: 0,
      aiDetected: 0,
      humanDetected: 0,
      avgAiScore: 0,
      lastScan: null,
      totalStorageUsed: 0
    });
    
    console.log('✅ User created:', user.uid);
    return { success: true, user };
  } catch (error) {
    console.error('❌ Sign up error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign in existing user
 */
export async function signIn(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ User signed in:', userCredential.user.uid);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('❌ Sign in error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    await firebaseSignOut(auth);
    console.log('✅ User signed out');
    return { success: true };
  } catch (error) {
    console.error('❌ Sign out error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current authenticated user
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return auth.currentUser !== null;
}

/**
 * Send password reset email
 */
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log('✅ Password reset email sent');
    return { success: true };
  } catch (error) {
    console.error('❌ Password reset error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(updates) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No authenticated user');
    
    // Update auth profile
    if (updates.displayName || updates.photoURL) {
      await updateProfile(user, {
        displayName: updates.displayName,
        photoURL: updates.photoURL
      });
    }
    
    // Update Firestore document
    await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
    
    console.log('✅ Profile updated');
    return { success: true };
  } catch (error) {
    console.error('❌ Profile update error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update email
 */
export async function changeEmail(newEmail, password) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No authenticated user');
    
    // Re-authenticate before email change
    await signInWithEmailAndPassword(auth, user.email, password);
    
    // Update email
    await updateEmail(user, newEmail);
    
    // Update Firestore
    await setDoc(doc(db, 'users', user.uid), { email: newEmail }, { merge: true });
    
    console.log('✅ Email updated');
    return { success: true };
  } catch (error) {
    console.error('❌ Email update error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update password
 */
export async function changePassword(currentPassword, newPassword) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No authenticated user');
    
    // Re-authenticate
    await signInWithEmailAndPassword(auth, user.email, currentPassword);
    
    // Update password
    await updatePassword(user, newPassword);
    
    console.log('✅ Password updated');
    return { success: true };
  } catch (error) {
    console.error('❌ Password update error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete user account
 */
export async function deleteAccount(password) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No authenticated user');
    
    const userId = user.uid;
    
    // Re-authenticate
    await signInWithEmailAndPassword(auth, user.email, password);
    
    // Delete Firestore data
    await deleteDoc(doc(db, 'users', userId));
    await deleteDoc(doc(db, 'analytics', userId));
    
    // Note: Detection history and storage files should be deleted via Cloud Function
    // for batch processing and proper cleanup
    
    // Delete auth account
    await deleteUser(user);
    
    console.log('✅ Account deleted');
    return { success: true };
  } catch (error) {
    console.error('❌ Account deletion error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(userId = null) {
  try {
    const uid = userId || getCurrentUser()?.uid;
    if (!uid) throw new Error('No user ID provided');
    
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User profile not found' };
    }
    
    return { success: true, profile: userDoc.data() };
  } catch (error) {
    console.error('❌ Get profile error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update user settings
 */
export async function updateSettings(settings) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No authenticated user');
    
    await setDoc(doc(db, 'users', user.uid), {
      settings: settings
    }, { merge: true });
    
    console.log('✅ Settings updated');
    return { success: true };
  } catch (error) {
    console.error('❌ Settings update error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user settings
 */
export async function getSettings() {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No authenticated user');
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      return { success: false, error: 'Settings not found' };
    }
    
    return { success: true, settings: userDoc.data().settings || {} };
  } catch (error) {
    console.error('❌ Get settings error:', error);
    return { success: false, error: error.message };
  }
}
