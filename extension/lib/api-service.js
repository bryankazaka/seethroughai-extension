/**
 * API Service
 * Handles Firestore CRUD operations for detections and analytics
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from './firebase-config.js';
import { getCurrentUser } from './auth-service.js';
import { uploadFullMedia, uploadThumbnail, deleteDetectionMedia } from './storage-service.js';

/**
 * Save detection result to Firestore
 * @param {object} result - Detection result object
 * @param {File|Blob} mediaFile - Optional full media file
 * @param {string} thumbnailDataUrl - Optional thumbnail data URL
 * @returns {Promise<object>} Save result with detection ID
 */
export async function saveDetection(result, mediaFile = null, thumbnailDataUrl = null) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No authenticated user');
    
    // Get user settings
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const settings = userDoc.data()?.settings || {};
    
    // Create detection document
    const detectionData = {
      userId: user.uid,
      result: result.classification, // 'definitely-ai', 'likely-ai', 'likely-not', 'definitely-not'
      aiScore: result.aiScore, // 0-100
      confidence: result.confidence,
      timestamp: serverTimestamp(),
      metadata: {
        source: result.source || 'unknown',
        processingTime: result.processingTime || null,
        modelVersion: result.modelVersion || '1.0.0',
        imageUrl: result.imageUrl || null
      }
    };
    
    // Add detection to Firestore
    const docRef = await addDoc(collection(db, 'detections'), detectionData);
    const detectionId = docRef.id;
    
    console.log('✅ Detection saved:', detectionId);
    
    // Upload media based on settings
    let mediaUrl = null;
    let thumbnailUrl = null;
    let storagePaths = {};
    
    if (settings.autoUpload && settings.storageMode === 'full' && mediaFile) {
      // Upload full media
      const uploadResult = await uploadFullMedia(mediaFile, detectionId, {
        classification: result.classification,
        aiScore: result.aiScore
      });
      
      if (uploadResult.success) {
        mediaUrl = uploadResult.url;
        storagePaths.media = uploadResult.path;
      }
    }
    
    if (thumbnailDataUrl) {
      // Upload thumbnail
      const thumbResult = await uploadThumbnail(thumbnailDataUrl, detectionId);
      
      if (thumbResult.success) {
        thumbnailUrl = thumbResult.url;
        storagePaths.thumbnail = thumbResult.path;
      }
    }
    
    // Update detection with storage URLs
    if (mediaUrl || thumbnailUrl) {
      await updateDoc(doc(db, 'detections', detectionId), {
        'metadata.mediaUrl': mediaUrl,
        'metadata.thumbnailUrl': thumbnailUrl,
        'metadata.storagePaths': storagePaths
      });
    }
    
    // Update user analytics
    await updateAnalytics(user.uid, result);
    
    return { 
      success: true, 
      detectionId,
      mediaUrl,
      thumbnailUrl
    };
  } catch (error) {
    console.error('❌ Save detection error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's detection history
 * @param {object} options - Query options (limit, offset, filters)
 * @returns {Promise<object>} Detection history
 */
export async function getDetectionHistory(options = {}) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No authenticated user');
    
    const {
      limitCount = 50,
      lastDoc = null,
      filterBy = null // 'ai', 'human', or null for all
    } = options;
    
    // Build query
    let q = query(
      collection(db, 'detections'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    // Add filter
    if (filterBy) {
      const isAI = filterBy === 'ai';
      q = query(
        collection(db, 'detections'),
        where('userId', '==', user.uid),
        where('result', 'in', isAI 
          ? ['definitely-ai', 'likely-ai'] 
          : ['definitely-not', 'likely-not']
        ),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    }
    
    // Add pagination
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    // Execute query
    const snapshot = await getDocs(q);
    const detections = [];
    
    snapshot.forEach(doc => {
      detections.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      });
    });
    
    console.log(`✅ Retrieved ${detections.length} detections`);
    return { 
      success: true, 
      detections,
      lastDoc: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (error) {
    console.error('❌ Get history error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get single detection by ID
 * @param {string} detectionId - The detection ID
 * @returns {Promise<object>} Detection data
 */
export async function getDetection(detectionId) {
  try {
    const docSnap = await getDoc(doc(db, 'detections', detectionId));
    
    if (!docSnap.exists()) {
      return { success: false, error: 'Detection not found' };
    }
    
    return { 
      success: true, 
      detection: {
        id: docSnap.id,
        ...docSnap.data(),
        timestamp: docSnap.data().timestamp?.toDate()
      }
    };
  } catch (error) {
    console.error('❌ Get detection error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete detection
 * @param {string} detectionId - The detection ID
 * @returns {Promise<object>} Deletion result
 */
export async function deleteDetection(detectionId) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No authenticated user');
    
    // Get detection to verify ownership
    const docSnap = await getDoc(doc(db, 'detections', detectionId));
    
    if (!docSnap.exists()) {
      return { success: false, error: 'Detection not found' };
    }
    
    if (docSnap.data().userId !== user.uid) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Delete storage files
    await deleteDetectionMedia(detectionId, user.uid);
    
    // Delete Firestore document
    await deleteDoc(doc(db, 'detections', detectionId));
    
    console.log('✅ Detection deleted:', detectionId);
    return { success: true };
  } catch (error) {
    console.error('❌ Delete detection error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update detection notes
 * @param {string} detectionId - The detection ID
 * @param {string} notes - User notes
 * @returns {Promise<object>} Update result
 */
export async function updateDetectionNotes(detectionId, notes) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No authenticated user');
    
    // Verify ownership
    const docSnap = await getDoc(doc(db, 'detections', detectionId));
    if (!docSnap.exists() || docSnap.data().userId !== user.uid) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Update notes
    await updateDoc(doc(db, 'detections', detectionId), {
      'metadata.notes': notes,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Notes updated:', detectionId);
    return { success: true };
  } catch (error) {
    console.error('❌ Update notes error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update user analytics after detection
 * @param {string} userId - The user ID
 * @param {object} result - Detection result
 */
async function updateAnalytics(userId, result) {
  try {
    const analyticsRef = doc(db, 'analytics', userId);
    const analyticsDoc = await getDoc(analyticsRef);
    
    if (!analyticsDoc.exists()) {
      // Create analytics document
      await setDoc(analyticsRef, {
        totalDetections: 1,
        aiDetected: result.classification.includes('ai') ? 1 : 0,
        humanDetected: result.classification.includes('not') ? 1 : 0,
        avgAiScore: result.aiScore,
        lastScan: serverTimestamp()
      });
    } else {
      // Update existing analytics
      const data = analyticsDoc.data();
      const newTotal = data.totalDetections + 1;
      const newAvg = ((data.avgAiScore * data.totalDetections) + result.aiScore) / newTotal;
      
      await updateDoc(analyticsRef, {
        totalDetections: increment(1),
        aiDetected: increment(result.classification.includes('ai') ? 1 : 0),
        humanDetected: increment(result.classification.includes('not') ? 1 : 0),
        avgAiScore: newAvg,
        lastScan: serverTimestamp()
      });
    }
    
    console.log('✅ Analytics updated');
  } catch (error) {
    console.error('❌ Analytics update error:', error);
  }
}

/**
 * Get user analytics
 * @param {string} userId - Optional user ID (defaults to current user)
 * @returns {Promise<object>} Analytics data
 */
export async function getUserAnalytics(userId = null) {
  try {
    const uid = userId || getCurrentUser()?.uid;
    if (!uid) throw new Error('No user ID available');
    
    const docSnap = await getDoc(doc(db, 'analytics', uid));
    
    if (!docSnap.exists()) {
      return { 
        success: true, 
        analytics: {
          totalDetections: 0,
          aiDetected: 0,
          humanDetected: 0,
          avgAiScore: 0,
          lastScan: null
        }
      };
    }
    
    return { 
      success: true, 
      analytics: {
        ...docSnap.data(),
        lastScan: docSnap.data().lastScan?.toDate()
      }
    };
  } catch (error) {
    console.error('❌ Get analytics error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Search detections
 * @param {string} searchTerm - Search term
 * @returns {Promise<object>} Search results
 */
export async function searchDetections(searchTerm) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No authenticated user');
    
    // Note: Firestore doesn't support full-text search natively
    // This is a basic implementation that searches in notes
    // For production, consider using Algolia or ElasticSearch
    
    const q = query(
      collection(db, 'detections'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const detections = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const notes = data.metadata?.notes || '';
      
      if (notes.toLowerCase().includes(searchTerm.toLowerCase())) {
        detections.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate()
        });
      }
    });
    
    console.log(`✅ Found ${detections.length} matching detections`);
    return { success: true, detections };
  } catch (error) {
    console.error('❌ Search error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Export detection history as JSON
 * @returns {Promise<object>} Export data
 */
export async function exportDetectionHistory() {
  try {
    const historyResult = await getDetectionHistory({ limitCount: 1000 });
    
    if (!historyResult.success) {
      return historyResult;
    }
    
    const exportData = {
      exportDate: new Date().toISOString(),
      totalDetections: historyResult.detections.length,
      detections: historyResult.detections.map(d => ({
        id: d.id,
        result: d.result,
        aiScore: d.aiScore,
        confidence: d.confidence,
        timestamp: d.timestamp?.toISOString(),
        notes: d.metadata?.notes || ''
      }))
    };
    
    return { success: true, data: exportData };
  } catch (error) {
    console.error('❌ Export error:', error);
    return { success: false, error: error.message };
  }
}
