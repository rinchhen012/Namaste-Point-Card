/**
 * Seed script for creating initial data in Firestore
 * Run this manually using Firebase Functions Shell
 * firebase functions:shell
 * seed.createInitialData()
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
try {
  admin.initializeApp();
} catch (error) {
  // App already initialized
}

const db = admin.firestore();

/**
 * Creates initial rewards for the app
 */
export const createInitialRewards = async () => {
  const rewards = [
    {
      name: 'Free Masala Chai',
      nameJa: '無料マサラチャイ',
      description: 'Enjoy a complimentary cup of our signature Masala Chai',
      descriptionJa: '当店自慢のマサラチャイを1杯無料でお楽しみください',
      pointsCost: 10,
      isActive: true,
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/namaste-point-card.appspot.com/o/public%2Frewards%2Fchai.jpg?alt=media'
    },
    {
      name: 'Free Naan',
      nameJa: '無料ナン',
      description: 'One free plain naan with any curry order',
      descriptionJa: 'カレーご注文でプレーンナン1枚無料',
      pointsCost: 15,
      isActive: true,
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/namaste-point-card.appspot.com/o/public%2Frewards%2Fnaan.jpg?alt=media'
    },
    {
      name: '10% Off Dinner',
      nameJa: 'ディナー10%オフ',
      description: '10% discount on your entire dinner bill',
      descriptionJa: 'ディナータイムのお会計が10%オフ',
      pointsCost: 30,
      isActive: true,
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/namaste-point-card.appspot.com/o/public%2Frewards%2Fdinner.jpg?alt=media'
    },
    {
      name: 'Free Dessert',
      nameJa: '無料デザート',
      description: 'Complimentary dessert with any meal',
      descriptionJa: 'お食事と一緒に無料デザート',
      pointsCost: 20,
      isActive: true,
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/namaste-point-card.appspot.com/o/public%2Frewards%2Fdessert.jpg?alt=media'
    },
    {
      name: 'Free Lunch Upgrade',
      nameJa: 'ランチアップグレード無料',
      description: 'Upgrade your lunch set to deluxe for free',
      descriptionJa: 'ランチセットを無料でデラックスにアップグレード',
      pointsCost: 25,
      isActive: true,
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/namaste-point-card.appspot.com/o/public%2Frewards%2Flunch.jpg?alt=media'
    }
  ];

  const batch = db.batch();

  for (const reward of rewards) {
    const rewardRef = db.collection('rewards').doc();
    batch.set(rewardRef, {
      ...reward,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`Created ${rewards.length} initial rewards`);
};

/**
 * Creates an admin user
 * @param email Admin email
 * @param password Admin password
 */
export const createAdminUser = async (email: string, password: string) => {
  try {
    // Create the user with Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: 'Admin User',
    });

    // Set custom claims to mark as admin
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      displayName: 'Admin User',
      points: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastVisit: admin.firestore.FieldValue.serverTimestamp(),
      role: 'admin'
    });

    console.log(`Created admin user ${email} with ID ${userRecord.uid}`);
    return userRecord.uid;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
};

/**
 * Creates sample online order codes
 */
export const createSampleCodes = async () => {
  const now = admin.firestore.Timestamp.now();

  // Create 5 sample codes
  const codes = [
    {
      code: 'NAMASTE-SAMPLE1',
      isUsed: false,
      createdAt: now,
      expiresAt: new admin.firestore.Timestamp(
        now.seconds + (60 * 24 * 60 * 60), // 60 days (2 months)
        now.nanoseconds
      ),
      pointsAwarded: 5
    },
    {
      code: 'NAMASTE-SAMPLE2',
      isUsed: false,
      createdAt: now,
      expiresAt: new admin.firestore.Timestamp(
        now.seconds + (60 * 24 * 60 * 60), // 60 days (2 months)
        now.nanoseconds
      ),
      pointsAwarded: 5
    },
    {
      code: 'NAMASTE-SAMPLE3',
      isUsed: false,
      createdAt: now,
      expiresAt: new admin.firestore.Timestamp(
        now.seconds + (60 * 24 * 60 * 60), // 60 days (2 months)
        now.nanoseconds
      ),
      pointsAwarded: 5
    },
    {
      code: 'NAMASTE-SAMPLE4',
      isUsed: false,
      createdAt: now,
      expiresAt: new admin.firestore.Timestamp(
        now.seconds + (60 * 24 * 60 * 60), // 60 days (2 months)
        now.nanoseconds
      ),
      pointsAwarded: 10
    },
    {
      code: 'NAMASTE-SAMPLE5',
      isUsed: false,
      createdAt: now,
      expiresAt: new admin.firestore.Timestamp(
        now.seconds + (60 * 24 * 60 * 60), // 60 days (2 months)
        now.nanoseconds
      ),
      pointsAwarded: 10
    }
  ];

  const batch = db.batch();

  for (const code of codes) {
    const codeRef = db.collection('online_order_codes').doc();
    batch.set(codeRef, code);
  }

  await batch.commit();
  console.log(`Created ${codes.length} sample online order codes`);
};

/**
 * Run all seed functions
 */
export const createInitialData = async () => {
  console.log('Starting to seed initial data...');

  try {
    await createInitialRewards();
    console.log('✅ Created initial rewards');

    // Add more seed functions here as needed
    await createSampleCodes();
    console.log('✅ Created sample online order codes');

    console.log('✅ Seeding completed successfully');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
};

// Export as Cloud Function for HTTP trigger if needed
// export const seedData = functions.https.onRequest(async (req, res) => {
//   // Check for admin token or other security
//   await createInitialData();
//   res.status(200).send({ success: true, message: 'Seeding completed!' });
// });
