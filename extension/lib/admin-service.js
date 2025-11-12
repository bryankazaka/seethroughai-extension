/**
 * Admin Service
 * Handles admin dashboard functionality and system-wide analytics
 */

import { db, auth } from './firebase-config.js';
import { collection, query, where, getDocs, orderBy, limit, getCountFromServer, Timestamp } from 'firebase/firestore';

/**
 * Check if current user is admin
 * @returns {Promise<boolean>}
 */
export async function isAdmin() {
  try {
    const user = auth.currentUser;
    if (!user) return false;
    
    // Get ID token with custom claims
    const idTokenResult = await user.getIdTokenResult();
    
    return idTokenResult.claims.admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get system-wide statistics
 * @returns {Promise<object>}
 */
export async function getSystemStats() {
  try {
    console.log('📊 Fetching system stats...');
    
    // Get user count
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getCountFromServer(usersRef);
    const totalUsers = usersSnapshot.data().count;
    
    // Get detection count
    const detectionsRef = collection(db, 'detections');
    const detectionsSnapshot = await getCountFromServer(detectionsRef);
    const totalDetections = detectionsSnapshot.data().count;
    
    // Get active users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const activeUsersQuery = query(
      usersRef,
      where('lastActive', '>=', Timestamp.fromDate(sevenDaysAgo))
    );
    const activeUsersSnapshot = await getCountFromServer(activeUsersQuery);
    const activeUsers = activeUsersSnapshot.data().count;
    
    // Get AI detections count
    const aiDetectionsQuery = query(
      detectionsRef,
      where('classification', 'in', ['likely-ai', 'definitely-ai'])
    );
    const aiDetectionsSnapshot = await getCountFromServer(aiDetectionsQuery);
    const aiDetections = aiDetectionsSnapshot.data().count;
    
    console.log('✅ System stats fetched');
    
    return {
      totalUsers,
      activeUsers,
      totalDetections,
      aiDetections,
      humanDetections: totalDetections - aiDetections,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching system stats:', error);
    throw error;
  }
}

/**
 * Get recent detections across all users
 * @param {number} limitCount - Number of detections to fetch
 * @returns {Promise<Array>}
 */
export async function getRecentDetections(limitCount = 50) {
  try {
    console.log('📋 Fetching recent detections...');
    
    const detectionsRef = collection(db, 'detections');
    const q = query(
      detectionsRef,
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    
    const detections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ ${detections.length} detections fetched`);
    
    return detections;
  } catch (error) {
    console.error('Error fetching recent detections:', error);
    throw error;
  }
}

/**
 * Get top users by detection count
 * @param {number} limitCount - Number of users to fetch
 * @returns {Promise<Array>}
 */
export async function getTopUsers(limitCount = 10) {
  try {
    console.log('👥 Fetching top users...');
    
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      orderBy('totalDetections', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    
    const users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ ${users.length} users fetched`);
    
    return users;
  } catch (error) {
    console.error('Error fetching top users:', error);
    throw error;
  }
}

/**
 * Get detection trends over time
 * @param {number} days - Number of days to analyze
 * @returns {Promise<object>}
 */
export async function getDetectionTrends(days = 30) {
  try {
    console.log(`📈 Analyzing detection trends (${days} days)...`);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const detectionsRef = collection(db, 'detections');
    const q = query(
      detectionsRef,
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'asc')
    );
    
    const snapshot = await getDocs(q);
    
    // Group by date and classification
    const dailyStats = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const date = data.timestamp.toDate().toISOString().split('T')[0];
      
      if (!dailyStats[date]) {
        dailyStats[date] = {
          total: 0,
          'definitely-ai': 0,
          'likely-ai': 0,
          'likely-not': 0,
          'definitely-not': 0
        };
      }
      
      dailyStats[date].total++;
      dailyStats[date][data.classification]++;
    });
    
    console.log('✅ Trends analyzed');
    
    return dailyStats;
  } catch (error) {
    console.error('Error analyzing trends:', error);
    throw error;
  }
}

/**
 * Get classification distribution
 * @returns {Promise<object>}
 */
export async function getClassificationDistribution() {
  try {
    console.log('📊 Calculating classification distribution...');
    
    const detectionsRef = collection(db, 'detections');
    
    // Get counts for each classification
    const classifications = ['definitely-ai', 'likely-ai', 'likely-not', 'definitely-not'];
    const counts = {};
    
    for (const classification of classifications) {
      const q = query(
        detectionsRef,
        where('classification', '==', classification)
      );
      const snapshot = await getCountFromServer(q);
      counts[classification] = snapshot.data().count;
    }
    
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    // Calculate percentages
    const distribution = {};
    for (const [classification, count] of Object.entries(counts)) {
      distribution[classification] = {
        count,
        percentage: total > 0 ? (count / total * 100).toFixed(2) : 0
      };
    }
    
    console.log('✅ Distribution calculated');
    
    return distribution;
  } catch (error) {
    console.error('Error calculating distribution:', error);
    throw error;
  }
}

/**
 * Get user details
 * @param {string} uid - User ID
 * @returns {Promise<object>}
 */
export async function getUserDetails(uid) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('__name__', '==', uid));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error('User not found');
    }
    
    return {
      uid,
      ...snapshot.docs[0].data()
    };
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw error;
  }
}

/**
 * Get user's recent detections
 * @param {string} uid - User ID
 * @param {number} limitCount - Number of detections to fetch
 * @returns {Promise<Array>}
 */
export async function getUserDetections(uid, limitCount = 20) {
  try {
    const detectionsRef = collection(db, 'detections');
    const q = query(
      detectionsRef,
      where('userId', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching user detections:', error);
    throw error;
  }
}
