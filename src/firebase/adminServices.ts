import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  Timestamp,
  limit as firestoreLimit,
  serverTimestamp,
  startAfter as firestoreStartAfter
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, functions, storage } from './config';
import { UserProfile, Reward, Redemption, OnlineOrderCode, PointsTransaction } from '../types';
import crypto from 'crypto';

// Dashboard statistics
export const getStatsData = async () => {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
    return {
      totalUsers: 124,
      activeUsers: 45,
      totalRewards: 5,
      totalRedemptions: 67,
      pointsIssued: 289,
      pointsRedeemed: 152
    };
  }

  try {
    // Count total users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const totalUsers = usersSnapshot.size;

    // Count active users in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsersQuery = query(
      usersRef,
      where('lastVisitScan', '>=', Timestamp.fromDate(thirtyDaysAgo))
    );
    const activeUsersSnapshot = await getDocs(activeUsersQuery);
    const activeUsers = activeUsersSnapshot.size;

    // Count rewards and redemptions
    const rewardsRef = collection(db, 'rewards');
    const rewardsSnapshot = await getDocs(rewardsRef);
    const totalRewards = rewardsSnapshot.size;

    const redemptionsRef = collection(db, 'redemptions');
    const redemptionsSnapshot = await getDocs(redemptionsRef);
    const totalRedemptions = redemptionsSnapshot.size;

    // Calculate points
    const pointsHistoryRef = collection(db, 'points_history');

    const earnedPointsQuery = query(
      pointsHistoryRef,
      where('type', '==', 'earn')
    );
    const redeemedPointsQuery = query(
      pointsHistoryRef,
      where('type', '==', 'redeem')
    );

    const earnedPointsSnapshot = await getDocs(earnedPointsQuery);
    const redeemedPointsSnapshot = await getDocs(redeemedPointsQuery);

    let pointsIssued = 0;
    let pointsRedeemed = 0;

    earnedPointsSnapshot.forEach(doc => {
      pointsIssued += doc.data().points;
    });

    redeemedPointsSnapshot.forEach(doc => {
      pointsRedeemed += Math.abs(doc.data().points);
    });

    return {
      totalUsers,
      activeUsers,
      totalRewards,
      totalRedemptions,
      pointsIssued,
      pointsRedeemed
    };
  } catch (error) {
    console.error('Error getting stats data:', error);
    throw error;
  }
};

// Recent activity for dashboard
export const getRecentOrders = async (limitCount = 10) => {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
    return [
      {
        id: 'order1',
        userName: 'Tanaka Yuki',
        type: 'delivery_order',
        code: 'DEL-12345',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: 'order2',
        userName: 'Suzuki Keita',
        type: 'in_store_visit',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
      },
      {
        id: 'order3',
        userName: 'John Smith',
        type: 'delivery_order',
        code: 'DEL-54321',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000)
      }
    ];
  }

  try {
    const ordersRef = collection(db, 'points_history');
    const ordersQuery = query(
      ordersRef,
      where('type', '==', 'earn'),
      orderBy('timestamp', 'desc'),
      firestoreLimit(limitCount)
    );

    const snapshot = await getDocs(ordersQuery);
    const orders: any[] = [];

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();

      // Get user name from user id
      const userRef = doc(db, 'users', data.userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      orders.push({
        id: docSnapshot.id,
        userName: userData?.displayName || 'Unknown User',
        type: data.source,
        code: data.metadata?.orderCode || null,
        timestamp: data.timestamp.toDate()
      });
    }

    return orders;
  } catch (error) {
    console.error('Error getting recent orders:', error);
    throw error;
  }
};

// Coupon management
export const getCoupons = async () => {
  try {
    const couponsRef = collection(db, 'delivery_coupons');
    const couponsQuery = query(
      couponsRef,
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(couponsQuery);
    const coupons: any[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      coupons.push({
        id: doc.id,
        code: data.code,
        used: data.used,
        createdAt: data.createdAt.toDate(),
        expiresAt: data.expiresAt.toDate(),
        usedBy: data.usedBy || null,
        usedAt: data.usedAt ? data.usedAt.toDate() : null
      });
    });

    return coupons;
  } catch (error) {
    console.error('Error getting coupons:', error);
    throw error;
  }
};

/**
 * Calculate a validation checksum for a coupon code
 * Returns a single character (0-9, A-Z) checksum
 */
function calculateChecksum(code: string): string {
  // Simple but effective algorithm:
  // 1. Sum the character codes
  // 2. Add the position-weighted values (multiply each char code by its position)
  // 3. Apply a prime multiplier for additional complexity
  // 4. Take modulo 36 to get a value 0-35
  // 5. Convert to character (0-9, A-Z)

  let sum = 0;
  const PRIME = 17; // A prime number for better distribution

  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    sum += charCode + (charCode * (i + 1));
  }

  sum = (sum * PRIME) % 36;

  // Convert to alphanumeric character (0-9, A-Z)
  if (sum < 10) {
    return sum.toString();
  } else {
    // 10 -> A, 11 -> B, etc.
    return String.fromCharCode(55 + sum); // ASCII 'A' is 65, so 55 + 10 = 65
  }
}

/**
 * Verify if a coupon code with checksum is valid
 */
export function verifyCodeChecksum(fullCode: string): boolean {
  if (fullCode.length < 2) return false;

  // Last character is the checksum
  const code = fullCode.slice(0, -1);
  const providedChecksum = fullCode.slice(-1);
  const calculatedChecksum = calculateChecksum(code);

  return providedChecksum === calculatedChecksum;
}

export const createCoupon = async (
  codePrefix: string,
  count: number,
  expiryDays: number
) => {
  try {
    const batch = [];
    const generatedCodes: string[] = []; // Array to store generated codes

    // Query existing codes to check for uniqueness
    const couponsRef = collection(db, 'delivery_coupons');
    const existingCodesSnapshot = await getDocs(couponsRef);
    const existingCodes = new Set<string>();

    // Build a set of existing codes for efficient lookups
    existingCodesSnapshot.forEach(doc => {
      const data = doc.data();
      existingCodes.add(data.code);
    });

    for (let i = 0; i < count; i++) {
      let code: string;
      let fullCode: string;
      let isUnique = false;

      // Keep generating new codes until we get a unique one
      while (!isUnique) {
        // Always use cryptographically secure random generation
        let randomString;
        // For browser or Node environment
        if (typeof window !== 'undefined' && window.crypto) {
          // Browser environment
          const array = new Uint8Array(4);
          window.crypto.getRandomValues(array);
          randomString = Array.from(array, byte =>
            ('0' + (byte & 0xFF).toString(16)).slice(-2)
          ).join('').substring(0, 8).toUpperCase();
        } else {
          // Node.js environment
          const buffer = crypto.randomBytes(4);
          randomString = buffer.toString('hex').substring(0, 8).toUpperCase();
        }

        code = `${codePrefix}-${randomString}`;

        // Calculate and append the checksum character
        const checksum = calculateChecksum(code);
        fullCode = `${code}${checksum}`;

        // Check if this code already exists in the database or was just generated
        isUnique = !existingCodes.has(fullCode) && !generatedCodes.includes(fullCode);
      }

      generatedCodes.push(fullCode!); // Store the generated unique code
      existingCodes.add(fullCode!); // Add to our set to prevent duplicates within this batch

      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      // Create coupon document
      const couponData = {
        code: fullCode!,
        used: false,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiryDate)
      };

      // Add to batch
      batch.push(addDoc(collection(db, 'delivery_coupons'), couponData));
    }

    // Execute all adds
    await Promise.all(batch);

    return {
      success: true,
      count,
      codes: generatedCodes // Include the array of codes in the return value
    };
  } catch (error) {
    console.error('Error creating coupons:', error);
    throw error;
  }
};

export const deactivateCoupon = async (couponId: string) => {
  try {
    // Change from updating expiry to permanently deleting the document
    const couponRef = doc(db, 'delivery_coupons', couponId);
    // await updateDoc(couponRef, {
    //   expiresAt: Timestamp.now()
    // });
    await deleteDoc(couponRef); // Use deleteDoc to remove the coupon

    return {
      success: true
    };
  } catch (error) {
    console.error('Error deactivating coupon:', error);
    throw error;
  }
};

// Advanced functions with TypeScript interfaces
// NOTE: These replace the older functions above with more type safety

/**
 * Get paginated list of users
 */
export async function getUsersList(
  limitCount: number = 20,
  startAfterUser?: UserProfile
): Promise<{ users: UserProfile[], hasMore: boolean }> {
  try {
    let usersQuery;

    if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
      // Return mock data for development
      return {
        users: [
          {
            uid: 'user1',
            email: 'john@example.com',
            displayName: 'John Smith',
            points: 25,
            role: 'user',
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          },
          {
            uid: 'user2',
            email: 'tanaka@example.com',
            displayName: 'Tanaka Yuki',
            points: 42,
            role: 'user',
            createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
          },
          {
            uid: 'admin1',
            email: 'admin@namaste.com',
            displayName: 'Admin User',
            points: 0,
            role: 'admin',
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
          }
        ],
        hasMore: false
      };
    }

    const usersRef = collection(db, 'users');

    if (startAfterUser) {
      const lastDocRef = doc(db, 'users', startAfterUser.uid);
      const lastDocSnapshot = await getDoc(lastDocRef);

      usersQuery = query(
        usersRef,
        orderBy('createdAt', 'desc'),
        firestoreStartAfter(lastDocSnapshot),
        firestoreLimit(limitCount + 1)
      );
    } else {
      usersQuery = query(
        usersRef,
        orderBy('createdAt', 'desc'),
        firestoreLimit(limitCount + 1)
      );
    }

    const snapshot = await getDocs(usersQuery);
    const users: UserProfile[] = [];

    snapshot.docs.slice(0, limitCount).forEach(doc => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        email: data.email || '',
        displayName: data.displayName || '',
        points: data.points || 0,
        role: data.role || 'user',
        createdAt: data.createdAt
      });
    });

    const hasMore = snapshot.docs.length > limitCount;

    return { users, hasMore };
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
}

/**
 * Set user as admin
 */
export async function setUserAsAdmin(userId: string, isAdmin: boolean): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: isAdmin ? 'admin' : 'user'
    });
  } catch (error) {
    console.error('Error setting user as admin:', error);
    throw error;
  }
}

/**
 * Adjust user points and record the transaction
 */
export async function adjustUserPoints(
  userId: string,
  points: number,
  adminId: string,
  note: string
): Promise<void> {
  try {
    // Support development mode
    if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
      console.log('DEV MODE: Adjusting points:', { userId, points, adminId, note });
      // Mock successful operation
      return;
    }

    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    // Get current user data
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    const userData = userSnap.data();
    const currentPoints = userData.points || 0;
    const newPoints = currentPoints + points;

    // Update user points
    await updateDoc(userRef, {
      points: newPoints
    });

    // Record transaction in points_history
    await addDoc(collection(db, 'points_history'), {
      userId,
      points,
      type: points > 0 ? 'earn' : 'redeem',
      source: 'admin_adjustment',
      timestamp: serverTimestamp(),
      metadata: {
        adminId: adminId || 'unknown',
        note: note || 'Points adjustment'
      }
    });
  } catch (error) {
    console.error('Error adjusting user points:', error);
    throw error;
  }
}

/**
 * Get all rewards
 */
export async function getAllRewardsList(): Promise<Reward[]> {
  try {
    if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
      // Return mock data for development
      return [
        {
          id: 'reward1',
          name: 'Free Naan',
          nameJa: 'ナンが無料',
          description: 'Get a free naan with your next order',
          descriptionJa: '次回の注文でナンが無料',
          points: 10,
          active: true,
          imageUrl: 'https://example.com/naan.jpg'
        },
        {
          id: 'reward2',
          name: '10% Discount',
          nameJa: '10%割引',
          description: 'Get 10% off your next order',
          descriptionJa: '次回の注文で10%割引',
          points: 20,
          active: true,
          imageUrl: 'https://example.com/discount.jpg'
        }
      ];
    }

    const rewardsRef = collection(db, 'rewards');
    const snapshot = await getDocs(rewardsRef);

    const rewards: Reward[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      rewards.push({
        id: doc.id,
        name: data.name || '',
        nameJa: data.nameJa || '',
        description: data.description || '',
        descriptionJa: data.descriptionJa || '',
        points: data.points || 0,
        active: data.active || false,
        imageUrl: data.imageUrl || ''
      });
    });

    return rewards;
  } catch (error) {
    console.error('Error getting rewards:', error);
    throw error;
  }
}

/**
 * Create a new reward
 */
export async function createNewReward(rewardData: Omit<Reward, 'id'>): Promise<Reward> {
  try {
    const docRef = await addDoc(collection(db, 'rewards'), rewardData);

    // Return the full reward object with the id
    return {
      id: docRef.id,
      ...rewardData
    };
  } catch (error) {
    console.error('Error creating reward:', error);
    throw error;
  }
}

/**
 * Update an existing reward
 */
export async function updateExistingReward(rewardId: string, data: Partial<Reward>): Promise<void> {
  try {
    const rewardRef = doc(db, 'rewards', rewardId);
    await updateDoc(rewardRef, data);
  } catch (error) {
    console.error('Error updating reward:', error);
    throw error;
  }
}

/**
 * Delete a reward
 */
export async function deleteExistingReward(rewardId: string): Promise<void> {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
    console.warn(`Mock deleting reward ${rewardId} - Not actually deleted in mock mode.`);
    // In a real mock scenario, you might filter the mockData.rewards array
    return;
  }
  const docRef = doc(db, 'rewards', rewardId);
  await deleteDoc(docRef);
}

/**
 * Upload a reward image
 */
export async function uploadRewardImage(file: File, rewardId?: string): Promise<string> {
  try {
    // If rewardId is not provided (new reward), use a timestamp
    const path = rewardId
      ? `rewards/${rewardId}/${file.name}`
      : `rewards/new_${Date.now()}_${file.name}`;

    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.error('Error uploading reward image:', error);
    throw error;
  }
}

/**
 * Get online order codes
 */
export async function getOnlineOrderCodes(
  filters: {
    used?: boolean;
    prefix?: string;
  } = {},
  limitCount: number = 50
): Promise<OnlineOrderCode[]> {
  try {
    if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
      // Return mock data for development
      return [
        {
          id: 'code1',
          code: 'NAMASTE-12345',
          used: false,
          pointsAwarded: 5,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'code2',
          code: 'NAMASTE-67890',
          used: true,
          pointsAwarded: 5,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          usedBy: 'user123',
          usedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        }
      ];
    }

    const codesRef = collection(db, 'unique_order_codes');
    let codesQuery = query(codesRef, orderBy('createdAt', 'desc'), firestoreLimit(limitCount));

    if (filters.used !== undefined) {
      codesQuery = query(codesQuery, where('used', '==', filters.used));
    }

    if (filters.prefix) {
      // This is a startsWith query, which requires a compound index
      const endPrefix = filters.prefix.slice(0, -1) + String.fromCharCode(filters.prefix.charCodeAt(filters.prefix.length - 1) + 1);
      codesQuery = query(
        codesQuery,
        where('code', '>=', filters.prefix),
        where('code', '<', endPrefix)
      );
    }

    const snapshot = await getDocs(codesQuery);

    const codes: OnlineOrderCode[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      codes.push({
        id: doc.id,
        code: data.code,
        used: data.used || false,
        pointsAwarded: data.pointsAwarded || 5,
        createdAt: data.createdAt.toDate(),
        expiresAt: data.expiresAt.toDate(),
        usedBy: data.usedBy || undefined,
        usedAt: data.usedAt ? data.usedAt.toDate() : undefined
      });
    });

    return codes;
  } catch (error) {
    console.error('Error getting online order codes:', error);
    throw error;
  }
}

/**
 * Generate online order codes
 */
export async function generateNewOnlineOrderCodes(
  count: number,
  prefix: string,
  pointsAwarded: number,
  expiryDays: number
): Promise<string[]> {
  try {
    // Call the Cloud Function
    const generateFunction = httpsCallable(functions, 'generateOnlineOrderCodes');
    const result = await generateFunction({ count, prefix, pointsAwarded, expiryDays });
    const data = result.data as { success: boolean; codes: string[] };

    if (!data.success) {
      throw new Error('Failed to generate codes');
    }

    return data.codes;
  } catch (error) {
    console.error('Error generating online order codes:', error);
    throw error;
  }
}

/**
 * Invalidate an online order code
 */
export async function invalidateOnlineOrderCode(code: string): Promise<void> {
  try {
    // Find the code document first
    const codesRef = collection(db, 'unique_order_codes');
    const codeQuery = query(codesRef, where('code', '==', code));
    const snapshot = await getDocs(codeQuery);

    if (snapshot.empty) {
      throw new Error('Code not found');
    }

    // Update the expiry to now (makes it invalid)
    const codeDoc = snapshot.docs[0];
    await updateDoc(codeDoc.ref, {
      expiresAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error invalidating online order code:', error);
    throw error;
  }
}

/**
 * Get dashboard stats
 */
export async function getDashboardStats(): Promise<{
  totalUsers: number;
  activeUsers: number;
  totalPoints: number;
  totalRedemptions: number;
  recentTransactions: PointsTransaction[];
}> {
  try {
    // Call the Cloud Function
    const statsFunction = httpsCallable(functions, 'getAdminStats');
    const result = await statsFunction();
    return result.data as any;
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    throw error;
  }
}
