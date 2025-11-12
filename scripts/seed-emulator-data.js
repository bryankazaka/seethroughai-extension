#!/usr/bin/env node
/**
 * Seed Firebase Emulators with Test Data
 * Run with: npm run seed-data
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin for emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';

admin.initializeApp({ projectId: 'seethrough-ai' });

const db = admin.firestore();
const auth = admin.auth();

console.log('🌱 Seeding Firebase Emulators with test data...\n');

async function seedAuth() {
  console.log('👤 Creating test users...');
  
  const users = [
    { email: 'user@test.com', password: 'password123', displayName: 'Test User' },
    { email: 'admin@test.com', password: 'admin123', displayName: 'Admin User' },
    { email: 'demo@test.com', password: 'demo123', displayName: 'Demo User' }
  ];
  
  const createdUsers = [];
  
  for (const user of users) {
    try {
      const userRecord = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
        emailVerified: true
      });
      createdUsers.push(userRecord);
      console.log(`  ✓ Created: ${user.email} (uid: ${userRecord.uid})`);
    } catch (error) {
      console.error(`  ✗ Failed to create ${user.email}:`, error.message);
    }
  }
  
  return createdUsers;
}

async function seedFirestore(users) {
  console.log('\n📄 Creating Firestore documents...');
  
  // Create user profiles
  for (const user of users) {
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      displayName: user.displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      settings: {
        autoSync: true,
        autoUpload: false,
        theme: 'light',
        notifications: true
      }
    });
    console.log(`  ✓ Created user profile: ${user.email}`);
  }
  
  // Create admin entry
  const adminUser = users.find(u => u.email === 'admin@test.com');
  if (adminUser) {
    await db.collection('admins').doc(adminUser.uid).set({
      role: 'admin',
      permissions: ['view_analytics', 'manage_users', 'delete_content'],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('  ✓ Created admin role');
  }
  
  // Create sample detection history for demo user
  const demoUser = users.find(u => u.email === 'demo@test.com');
  if (demoUser) {
    const detections = [
      {
        userId: demoUser.uid,
        result: 'ai',
        confidence: 95.5,
        aiScore: 95.5,
        classification: 'definitely-ai',
        timestamp: new Date(Date.now() - 3600000),
        imageUrl: 'https://picsum.photos/seed/ai1/400/400',
        metadata: { source: 'context-menu', size: 245678 }
      },
      {
        userId: demoUser.uid,
        result: 'human',
        confidence: 12.3,
        aiScore: 12.3,
        classification: 'likely-not',
        timestamp: new Date(Date.now() - 7200000),
        imageUrl: 'https://picsum.photos/seed/real1/400/400',
        metadata: { source: 'popup', size: 189234 }
      },
      {
        userId: demoUser.uid,
        result: 'ai',
        confidence: 76.8,
        aiScore: 76.8,
        classification: 'likely-ai',
        timestamp: new Date(Date.now() - 86400000),
        imageUrl: 'https://picsum.photos/seed/ai2/400/400',
        metadata: { source: 'context-menu', size: 312456 }
      }
    ];
    
    for (const detection of detections) {
      await db.collection('detections').add(detection);
    }
    console.log(`  ✓ Created ${detections.length} sample detections`);
  }
  
  // Create analytics
  await db.collection('system_analytics').doc('overview').set({
    totalUsers: users.length,
    totalDetections: 3,
    aiDetected: 2,
    humanDetected: 1,
    avgConfidence: 61.5,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log('  ✓ Created system analytics');
  
  for (const user of users) {
    await db.collection('analytics').doc(user.uid).set({
      totalDetections: user.email === 'demo@test.com' ? 3 : 0,
      aiDetected: user.email === 'demo@test.com' ? 2 : 0,
      humanDetected: user.email === 'demo@test.com' ? 1 : 0,
      avgAiScore: user.email === 'demo@test.com' ? 61.5 : 0,
      lastScan: user.email === 'demo@test.com' ? new Date() : null
    });
  }
  console.log('  ✓ Created user analytics');
}

async function main() {
  try {
    const users = await seedAuth();
    await seedFirestore(users);
    
    console.log('\n✅ Seeding complete!\n');
    console.log('Test accounts:');
    console.log('  user@test.com / password123');
    console.log('  admin@test.com / admin123');
    console.log('  demo@test.com / demo123 (has sample data)\n');
    console.log('Access Emulator UI at: http://localhost:4000\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
