/**
 * Storage Service
 * Handles Cloud Storage operations for images and videos
 */

import {
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata
} from 'firebase/storage';
import { storage } from './firebase-config.js';
import { getCurrentUser } from './auth-service.js';

/**
 * Upload full media file (image or video)
 * @param {File|Blob} file - The media file to upload
 * @param {string} detectionId - The detection ID to associate with
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} Upload result with download URL
 */
export async function uploadFullMedia(file, detectionId, metadata = {}) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No authenticated user');
    
    // Determine file extension
    const ext = file.type.split('/')[1] || 'png';
    const fileName = `${detectionId}.${ext}`;
    const path = `detections/${user.uid}/${fileName}`;
    
    // Create storage reference
    const storageRef = ref(storage, path);
    
    // Upload file with metadata
    const uploadResult = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        detectionId,
        userId: user.uid,
        ...metadata
      }
    });
    
    // Get download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    console.log('✅ Media uploaded:', path);
    return { 
      success: true, 
      url: downloadURL, 
      path,
      size: uploadResult.metadata.size
    };
  } catch (error) {
    console.error('❌ Upload error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Upload thumbnail (base64 or data URL)
 * @param {string} dataUrl - Base64 encoded image data
 * @param {string} detectionId - The detection ID
 * @returns {Promise<object>} Upload result with download URL
 */
export async function uploadThumbnail(dataUrl, detectionId) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No authenticated user');
    
    const fileName = `${detectionId}_thumb.jpg`;
    const path = `thumbnails/${user.uid}/${fileName}`;
    
    // Create storage reference
    const storageRef = ref(storage, path);
    
    // Upload base64 string
    const uploadResult = await uploadString(storageRef, dataUrl, 'data_url', {
      contentType: 'image/jpeg',
      customMetadata: {
        detectionId,
        userId: user.uid,
        type: 'thumbnail'
      }
    });
    
    // Get download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    console.log('✅ Thumbnail uploaded:', path);
    return { 
      success: true, 
      url: downloadURL, 
      path,
      size: uploadResult.metadata.size
    };
  } catch (error) {
    console.error('❌ Thumbnail upload error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a media file from storage
 * @param {string} path - The storage path to delete
 * @returns {Promise<object>} Deletion result
 */
export async function deleteMedia(path) {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    
    console.log('✅ Media deleted:', path);
    return { success: true };
  } catch (error) {
    console.error('❌ Delete error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete all media for a detection
 * @param {string} detectionId - The detection ID
 * @param {string} userId - The user ID (optional, uses current user if not provided)
 * @returns {Promise<object>} Deletion result
 */
export async function deleteDetectionMedia(detectionId, userId = null) {
  try {
    const uid = userId || getCurrentUser()?.uid;
    if (!uid) throw new Error('No user ID available');
    
    // Delete full media
    try {
      const mediaPath = `detections/${uid}/${detectionId}`;
      await deleteMedia(mediaPath);
    } catch (e) {
      console.log('No full media to delete');
    }
    
    // Delete thumbnail
    try {
      const thumbPath = `thumbnails/${uid}/${detectionId}_thumb.jpg`;
      await deleteMedia(thumbPath);
    } catch (e) {
      console.log('No thumbnail to delete');
    }
    
    console.log('✅ Detection media deleted:', detectionId);
    return { success: true };
  } catch (error) {
    console.error('❌ Delete detection media error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get download URL for a stored file
 * @param {string} path - The storage path
 * @returns {Promise<object>} Result with download URL
 */
export async function getMediaUrl(path) {
  try {
    const storageRef = ref(storage, path);
    const url = await getDownloadURL(storageRef);
    
    return { success: true, url };
  } catch (error) {
    console.error('❌ Get URL error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * List all media files for current user
 * @param {string} folder - 'detections' or 'thumbnails'
 * @returns {Promise<object>} Result with file list
 */
export async function listUserMedia(folder = 'detections') {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No authenticated user');
    
    const folderRef = ref(storage, `${folder}/${user.uid}`);
    const result = await listAll(folderRef);
    
    const files = await Promise.all(
      result.items.map(async (item) => {
        const url = await getDownloadURL(item);
        const metadata = await getMetadata(item);
        
        return {
          name: item.name,
          path: item.fullPath,
          url,
          size: metadata.size,
          contentType: metadata.contentType,
          created: metadata.timeCreated,
          updated: metadata.updated
        };
      })
    );
    
    console.log(`✅ Listed ${files.length} files`);
    return { success: true, files };
  } catch (error) {
    console.error('❌ List media error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate total storage used by current user
 * @returns {Promise<object>} Result with storage size in bytes
 */
export async function getUserStorageSize() {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No authenticated user');
    
    let totalSize = 0;
    
    // Get detections size
    const detectionsResult = await listUserMedia('detections');
    if (detectionsResult.success) {
      totalSize += detectionsResult.files.reduce((sum, file) => sum + file.size, 0);
    }
    
    // Get thumbnails size
    const thumbnailsResult = await listUserMedia('thumbnails');
    if (thumbnailsResult.success) {
      totalSize += thumbnailsResult.files.reduce((sum, file) => sum + file.size, 0);
    }
    
    return { 
      success: true, 
      bytes: totalSize,
      megabytes: (totalSize / (1024 * 1024)).toFixed(2),
      gigabytes: (totalSize / (1024 * 1024 * 1024)).toFixed(3)
    };
  } catch (error) {
    console.error('❌ Get storage size error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete all user media (used for account deletion)
 * @returns {Promise<object>} Deletion result
 */
export async function deleteAllUserMedia() {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No authenticated user');
    
    // Delete all detections
    const detectionsRef = ref(storage, `detections/${user.uid}`);
    const detectionsResult = await listAll(detectionsRef);
    await Promise.all(
      detectionsResult.items.map(item => deleteObject(item))
    );
    
    // Delete all thumbnails
    const thumbnailsRef = ref(storage, `thumbnails/${user.uid}`);
    const thumbnailsResult = await listAll(thumbnailsRef);
    await Promise.all(
      thumbnailsResult.items.map(item => deleteObject(item))
    );
    
    console.log('✅ All user media deleted');
    return { success: true };
  } catch (error) {
    console.error('❌ Delete all media error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create thumbnail from image file
 * @param {File|Blob} imageFile - The image file
 * @param {number} maxSize - Maximum dimension (width or height)
 * @returns {Promise<string>} Base64 data URL of thumbnail
 */
export async function createThumbnail(imageFile, maxSize = 200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(imageFile);
  });
}

/**
 * Convert blob URL to File object
 * @param {string} blobUrl - The blob URL
 * @param {string} filename - Desired filename
 * @returns {Promise<File>} File object
 */
export async function blobUrlToFile(blobUrl, filename = 'image.png') {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}
