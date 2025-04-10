import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  getAuth,
  OAuthProvider,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword as fbUpdatePassword
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  Timestamp,
  increment,
  limit,
  deleteDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, functions, storage } from './config';
import { UserProfile, Reward, Redemption, PointsTransaction, OnlineOrderCode } from '../types';
import { verifyCodeChecksum } from './adminServices';

// Mock data for development
const mockData = {
  rewards: [
    {
      id: 'reward-1',
      name: {
        en: 'Free Naan Bread',
        ja: '無料ナン'
      },
      description: {
        en: 'Enjoy one complimentary naan bread with your meal.',
        ja: 'お食事と一緒に無料のナンをお楽しみください。'
      },
      pointsCost: 10,
      type: 'in_store_item',
      active: true,
      imageUrl: 'https://via.placeholder.com/150'
    },
    {
      id: 'reward-2',
      name: {
        en: '20% Off Your Bill',
        ja: '20%割引'
      },
      description: {
        en: 'Get 20% off your total bill (food only).',
        ja: 'お会計から20%オフ（フードのみ）。'
      },
      pointsCost: 30,
      type: 'in_store_discount',
      active: true,
      imageUrl: 'https://via.placeholder.com/150'
    },
    {
      id: 'reward-3',
      name: {
        en: 'Free Delivery',
        ja: '配達料無料'
      },
      description: {
        en: 'Free delivery on your next online order.',
        ja: '次回のオンライン注文の配達料が無料。'
      },
      pointsCost: 15,
      type: 'direct_order_coupon',
      active: true,
      imageUrl: 'https://via.placeholder.com/150'
    }
  ],
  redemptions: [
    {
      id: 'redemption-1',
      userId: 'dev-user-123',
      rewardId: 'reward-1',
      rewardName: 'Free Naan Bread',
      rewardDescription: 'Enjoy one complimentary naan bread with your meal.',
      rewardType: 'in_store_item',
      pointsCost: 10,
      code: 'RDEM-123A',
      createdAt: { toDate: () => new Date(Date.now() - 2 * 60 * 60 * 1000) },
      expiresAt: { toDate: () => new Date(Date.now() + 10 * 60 * 1000) },
      used: false
    }
  ],
  pointsHistory: [
    {
      id: 'history-1',
      userId: 'dev-user-123',
      points: 1,
      type: 'earn',
      source: 'in_store_visit',
      timestamp: { toDate: () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      metadata: { latitude: 35.7765, longitude: 139.6314 }
    },
    {
      id: 'history-2',
      userId: 'dev-user-123',
      points: 1,
      type: 'earn',
      source: 'delivery_order',
      timestamp: { toDate: () => new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      metadata: { orderCode: 'ORDER123' }
    }
  ]
};

/**
 * Rate limit configuration
 */
const RATE_LIMITS = {
  USER_MAX_ATTEMPTS: 5,       // Max 5 attempts per user per day
  USER_WINDOW_HOURS: 24,      // Reset user attempts after 24 hours
  IP_MAX_ATTEMPTS: 10,        // Max 10 attempts per IP per hour
  IP_WINDOW_HOURS: 1,         // Reset IP attempts after 1 hour
  GLOBAL_MAX_ATTEMPTS: 100,   // Alert threshold: 100 failed attempts
  GLOBAL_WINDOW_MINUTES: 10   // Within 10 minute window
};

/**
 * Check rate limits before processing redemption
 * Returns true if within limits, false if exceeded
 */
async function checkRateLimits(userId: string, ipAddress: string): Promise<boolean> {
  try {
    const now = Timestamp.now();
    const rateLimitsRef = collection(db, 'rate_limits');

    // 1. Check user-based rate limit
    const userLimitRef = doc(rateLimitsRef, `user_${userId}`);
    const userLimitDoc = await getDoc(userLimitRef);

    if (userLimitDoc.exists()) {
      const userData = userLimitDoc.data();
      const resetTime = new Date(userData.resetTime.toDate().getTime() + (RATE_LIMITS.USER_WINDOW_HOURS * 60 * 60 * 1000));

      if (now.toDate() < resetTime) {
        // Window still active, check attempts
        if (userData.attempts >= RATE_LIMITS.USER_MAX_ATTEMPTS) {
          console.warn(`Rate limit exceeded for user ${userId}: ${userData.attempts} attempts`);
          return false; // Exceeded limit
        }
        // Update attempt count
        await updateDoc(userLimitRef, {
          attempts: increment(1)
        });
      } else {
        // Window expired, reset
        await setDoc(userLimitRef, {
          userId,
          attempts: 1,
          resetTime: now
        });
      }
    } else {
      // First attempt for this user
      await setDoc(userLimitRef, {
        userId,
        attempts: 1,
        resetTime: now
      });
    }

    // 2. Check IP-based rate limit (if IP provided)
    if (ipAddress) {
      const ipLimitRef = doc(rateLimitsRef, `ip_${ipAddress.replace(/\./g, '_')}`);
      const ipLimitDoc = await getDoc(ipLimitRef);

      if (ipLimitDoc.exists()) {
        const ipData = ipLimitDoc.data();
        const resetTime = new Date(ipData.resetTime.toDate().getTime() + (RATE_LIMITS.IP_WINDOW_HOURS * 60 * 60 * 1000));

        if (now.toDate() < resetTime) {
          // Window still active, check attempts
          if (ipData.attempts >= RATE_LIMITS.IP_MAX_ATTEMPTS) {
            console.warn(`Rate limit exceeded for IP ${ipAddress}: ${ipData.attempts} attempts`);
            return false; // Exceeded limit
          }
          // Update attempt count
          await updateDoc(ipLimitRef, {
            attempts: increment(1)
          });
        } else {
          // Window expired, reset
          await setDoc(ipLimitRef, {
            ipAddress,
            attempts: 1,
            resetTime: now
          });
        }
      } else {
        // First attempt for this IP
        await setDoc(ipLimitRef, {
          ipAddress,
          attempts: 1,
          resetTime: now
        });
      }
    }

    // 3. Check global rate limit
    await runTransaction(db, async (transaction) => {
      const globalLimitRef = doc(rateLimitsRef, 'global');
      const globalLimitDoc = await transaction.get(globalLimitRef);

      if (globalLimitDoc.exists()) {
        const globalData = globalLimitDoc.data();
        const resetTime = new Date(globalData.resetTime.toDate().getTime() + (RATE_LIMITS.GLOBAL_WINDOW_MINUTES * 60 * 1000));

        if (now.toDate() < resetTime) {
          // Window still active
          transaction.update(globalLimitRef, {
            attempts: increment(1)
          });

          // Check if we need to send an alert
          if (globalData.attempts >= RATE_LIMITS.GLOBAL_MAX_ATTEMPTS && !globalData.alerted) {
            transaction.update(globalLimitRef, { alerted: true });

            // Send alert to an admin notification collection
            const alertRef = doc(collection(db, 'admin_alerts'));
            transaction.set(alertRef, {
              type: 'rate_limit',
              message: `Global rate limit threshold of ${RATE_LIMITS.GLOBAL_MAX_ATTEMPTS} redemption attempts exceeded in ${RATE_LIMITS.GLOBAL_WINDOW_MINUTES} minutes`,
              timestamp: now
            });
          }
        } else {
          // Window expired, reset
          transaction.set(globalLimitRef, {
            attempts: 1,
            resetTime: now,
            alerted: false
          });
        }
      } else {
        // Initialize global counter
        transaction.set(globalLimitRef, {
          attempts: 1,
          resetTime: now,
          alerted: false
        });
      }
    });

    return true; // Within limits
  } catch (error) {
    console.error('Error checking rate limits:', error);
    // On error, allow the attempt but log the issue
    return true;
  }
}

/**
 * Track failed redemption attempt
 */
async function trackFailedAttempt(userId: string, ipAddress: string, code: string) {
  try {
    // Log the failed attempt for auditing
    await addDoc(collection(db, 'failed_redemptions'), {
      userId,
      ipAddress,
      code,
      timestamp: Timestamp.now()
    });
  } catch (error) {
    console.error('Error tracking failed attempt:', error);
  }
}

/**
 * Redeem a coupon code
 * Modified to include rate limiting and checksum verification
 */
export const redeemCouponCode = async (code: string, userId: string, ipAddress: string = '') => {
  try {
    // First check rate limits
    const withinLimits = await checkRateLimits(userId, ipAddress);
    if (!withinLimits) {
      return {
        success: false,
        error: 'Too many attempts. Please try again later.',
        rateLimited: true
      };
    }

    // Verify the checksum
    if (!verifyCodeChecksum(code)) {
      await trackFailedAttempt(userId, ipAddress, code);
      return {
        success: false,
        error: 'Invalid coupon code format'
      };
    }

    // Continue with existing redemption logic
    const couponsRef = collection(db, 'delivery_coupons');
    const couponQuery = query(couponsRef, where('code', '==', code));
    const couponSnapshot = await getDocs(couponQuery);

    if (couponSnapshot.empty) {
      await trackFailedAttempt(userId, ipAddress, code);
      return {
        success: false,
        error: 'Invalid coupon code'
      };
    }

    const couponDoc = couponSnapshot.docs[0];
    const couponData = couponDoc.data();

    // Check if already used
    if (couponData.used) {
      await trackFailedAttempt(userId, ipAddress, code);
      return {
        success: false,
        error: 'This coupon has already been used'
      };
    }

    // Check if expired
    const expiryDate = couponData.expiresAt.toDate();
    if (expiryDate < new Date()) {
      await trackFailedAttempt(userId, ipAddress, code);
      return {
        success: false,
        error: 'This coupon has expired'
      };
    }

    // Mark as used
    await updateDoc(couponDoc.ref, {
      used: true,
      usedBy: userId,
      usedAt: serverTimestamp()
    });

    // Award points to user
    const POINTS_PER_COUPON = 5; // Adjust as needed
    const userRef = doc(db, 'users', userId);

    // Get current user data
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    const userData = userSnap.data();
    const currentPoints = userData.points || 0;

    // Update user points
    await updateDoc(userRef, {
      points: currentPoints + POINTS_PER_COUPON
    });

    // Record transaction in points_history
    await addDoc(collection(db, 'points_history'), {
      userId,
      points: POINTS_PER_COUPON,
      type: 'earn',
      source: 'delivery_coupon',
      timestamp: serverTimestamp(),
      metadata: {
        couponCode: code
      }
    });

    return {
      success: true,
      points: POINTS_PER_COUPON,
      totalPoints: currentPoints + POINTS_PER_COUPON
    };
  } catch (error) {
    console.error('Error redeeming coupon:', error);
    return {
      success: false,
      error: 'Failed to redeem coupon'
    };
  }
};

// User Authentication
export const registerUser = async (email: string, password: string, displayName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      displayName,
      points: 0,
      createdAt: Timestamp.now(),
      lastVisitScan: null,
      language: 'ja'
    });

    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = async () => {
  return signOut(auth);
};

export const resetPassword = async (email: string) => {
  return sendPasswordResetEmail(auth, email);
};

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user exists in Firestore
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    // If user doesn't exist, create their profile
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        points: 0,
        createdAt: Timestamp.now(),
        lastVisitScan: null,
        language: 'ja'
      });
    }

    return user;
  } catch (error) {
    throw error;
  }
};

export const signInWithApple = async () => {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user exists in Firestore
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    // If user doesn't exist, create their profile
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName || 'Apple User',
        points: 0,
        createdAt: Timestamp.now(),
        lastVisitScan: null,
        language: 'ja'
      });
    }

    return user;
  } catch (error) {
    throw error;
  }
};

// User Profile
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  } else {
    return null;
  }
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  const docRef = doc(db, 'users', userId);
  await updateDoc(docRef, data);
}

// Update user display name in both Auth and Firestore
export async function updateUserDisplayName(userId: string, newDisplayName: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) {
    throw new Error("User not authenticated or mismatch.");
  }

  if (!newDisplayName.trim()) {
    throw new Error("Display name cannot be empty.");
  }

  try {
    // Update Firebase Auth profile
    await updateProfile(user, { displayName: newDisplayName });

    // Update Firestore document
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { displayName: newDisplayName });

  } catch (error) {
    console.error("Error updating display name:", error);
    // Rethrow the error for the calling component to handle
    throw error;
  }
}

export const setUserLanguage = async (userId: string, language: 'en' | 'ja') => {
  const userRef = doc(db, 'users', userId);
  return updateDoc(userRef, { language });
};

// Points Management
export async function validateOnlineOrderCode(code: string): Promise<{
  success: boolean;
  message: string;
  points?: number;
}> {
  try {
    // Call the Cloud Function
    const validateFunction = httpsCallable(functions, 'validateOnlineCode'); // Renamed back to original
    const result = await validateFunction({ code });
    return result.data as any;
  } catch (error) {
    console.error('Error validating online order code:', error);
    return { success: false, message: 'An error occurred while validating code' };
  }
}

export async function validateQRCode(
  qrCode: string,
  latitude: number,
  longitude: number
): Promise<{
  success: boolean;
  message: string;
  distance?: number;
}> {
  try {
    // Call the Cloud Function
    const validateFunction = httpsCallable(functions, 'validateQRCheckIn'); // Renamed back to original
    const result = await validateFunction({ qrCode, latitude, longitude });
    return result.data as any;
  } catch (error) {
    console.error('Error validating QR code:', error);
    return { success: false, message: 'An error occurred while validating QR code' };
  }
}

// Rewards and Redemption
export async function getRewards(): Promise<Reward[]> {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
    return mockData.rewards;
  }

  try {
    const rewardsRef = collection(db, 'rewards');
    const rewardsSnapshot = await getDocs(rewardsRef);
    const rewards: Reward[] = [];

    rewardsSnapshot.forEach(doc => {
      const data = doc.data();
      rewards.push({
        id: doc.id,
        ...data
      });
    });

    return rewards;
  } catch (error) {
    console.error('Error getting rewards:', error);
    throw error;
  }
}

/**
 * Get available rewards (active rewards only)
 */
export async function getAvailableRewards(): Promise<Reward[]> {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
    return mockData.rewards.filter(reward => reward.active);
  }

  try {
    const rewardsRef = collection(db, 'rewards');
    const rewardsQuery = query(rewardsRef, where('active', '==', true));
    const rewardsSnapshot = await getDocs(rewardsQuery);
    const rewards: Reward[] = [];

    rewardsSnapshot.forEach(doc => {
      const data = doc.data();

      // Transform the data structure to match what the RewardsPage expects
      rewards.push({
        id: doc.id,
        name: {
          en: data.name || '',
          ja: data.nameJa || ''
        },
        description: {
          en: data.description || '',
          ja: data.descriptionJa || ''
        },
        pointsCost: data.points || 0,
        type: data.type || 'in_store_item',
        active: data.active || false,
        imageUrl: data.imageUrl || ''
      } as Reward);
    });

    return rewards;
  } catch (error) {
    console.error('Error getting available rewards:', error);
    throw error;
  }
}

export async function getReward(rewardId: string): Promise<Reward | null> {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
    const reward = mockData.rewards.find(r => r.id === rewardId);
    return reward || null;
  }

  const docRef = doc(db, 'rewards', rewardId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    // Transform the data structure to match what the RewardsPage expects
    return {
      id: docSnap.id,
      name: {
        en: data.name || '',
        ja: data.nameJa || ''
      },
      description: {
        en: data.description || '',
        ja: data.descriptionJa || ''
      },
      pointsCost: data.points || 0,
      type: data.type || 'in_store_item',
      active: data.active || false,
      imageUrl: data.imageUrl || ''
    } as Reward;
  } else {
    return null;
  }
}

export const redeemReward = async (userId: string, rewardId: string, rewardType: string) => {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
    console.log('Using mock redemption process');

    // Find the reward in mock data
    const reward = mockData.rewards.find(r => r.id === rewardId);

    if (!reward) {
      throw new Error('Reward not found');
    }

    // Calculate expiration date: 15 minutes for in-store, 30 days for direct orders
    const expirationDate = rewardType === 'direct_order_coupon'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create a new redemption
    const newRedemption = {
      id: 'redemption-' + Date.now(),
      userId,
      rewardId,
      rewardName: reward.name.en,
      rewardDescription: reward.description.en,
      rewardType,
      pointsCost: reward.pointsCost,
      createdAt: { toDate: () => new Date() },
      expiresAt: { toDate: () => expirationDate },
      used: false
    };

    // Add to mock redemptions
    mockData.redemptions.push(newRedemption);

    // Add to mock points history
    mockData.pointsHistory.push({
      id: 'history-' + Date.now(),
      userId,
      points: -reward.pointsCost,
      type: 'redeem',
      source: rewardType,
      timestamp: { toDate: () => new Date() },
      metadata: {
        rewardId,
        redemptionId: newRedemption.id
      }
    });

    return {
      redemptionId: newRedemption.id,
      expiresAt: expirationDate,
      rewardName: reward.name.en,
      rewardDescription: reward.description.en
    };
  }

  try {
    // Get the reward details
    const rewardRef = doc(db, 'rewards', rewardId);
    const rewardSnap = await getDoc(rewardRef);

    if (!rewardSnap.exists()) {
      throw new Error('Reward not found');
    }

    const rewardData = rewardSnap.data();
    // Create a transformed reward object
    const reward = {
      id: rewardId,
      name: {
        en: rewardData.name || '',
        ja: rewardData.nameJa || ''
      },
      description: {
        en: rewardData.description || '',
        ja: rewardData.descriptionJa || ''
      },
      pointsCost: rewardData.points || 0,
      type: rewardData.type || 'in_store_item',
      active: rewardData.active || false,
      imageUrl: rewardData.imageUrl || ''
    };

    // Get user profile
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    const user = userSnap.data();

    // Check if user has enough points
    if (user.points < reward.pointsCost) {
      throw new Error('Not enough points');
    }

    // Calculate expiration date: 15 minutes for in-store, 30 days for direct orders
    const expirationDate = rewardType === 'direct_order_coupon'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create redemption record
    const redemptionRef = await addDoc(collection(db, 'redemptions'), {
      userId,
      rewardId,
      rewardName: reward.name.en,
      rewardDescription: reward.description.en,
      rewardType,
      pointsCost: reward.pointsCost,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expirationDate),
      used: false
    });

    // Deduct points from user
    await updateDoc(userRef, {
      points: increment(-reward.pointsCost)
    });

    // Add to points history
    await addDoc(collection(db, 'points_history'), {
      userId,
      points: -reward.pointsCost,
      type: 'redeem',
      source: rewardType,
      timestamp: Timestamp.now(),
      metadata: {
        rewardId,
        redemptionId: redemptionRef.id
      }
    });

    return {
      redemptionId: redemptionRef.id,
      expiresAt: expirationDate,
      rewardName: reward.name.en,
      rewardDescription: reward.description.en
    };
  } catch (error) {
    throw error;
  }
};

export const getUserRedemptions = async (userId: string): Promise<Redemption[]> => {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
    // Return mock active redemptions
    return mockData.redemptions
      .filter(r => r.userId === userId && !r.used && !isDateExpired(r.expiresAt))
      .map(r => ({
        id: r.id,
        userId: r.userId,
        rewardId: r.rewardId,
        rewardName: r.rewardName,
        rewardNameJa: r.rewardName, // Use same name for both in mock
        rewardDescription: r.rewardDescription,
        rewardType: r.rewardType,
        pointsCost: r.pointsCost || 0,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        used: r.used
      }));
  }

  try {
    const redemptionsRef = collection(db, 'redemptions');
    const q = query(
      redemptionsRef,
      where('userId', '==', userId),
      where('used', '==', false),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const redemptions: Redemption[] = [];

    // Current timestamp to filter out expired redemptions in memory
    const now = new Date();

    snapshot.forEach(doc => {
      const data = doc.data();

      // Skip if already expired
      if (data.expiresAt.toDate() < now) return;

      redemptions.push({
        id: doc.id,
        userId: data.userId,
        rewardId: data.rewardId,
        rewardName: data.rewardName,
        rewardNameJa: data.rewardNameJa || data.rewardName,
        rewardDescription: data.rewardDescription,
        rewardType: data.rewardType,
        pointsCost: data.pointsCost || 0,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        used: data.used
      });
    });

    console.log('[getUserRedemptions] Returning redemption IDs:', redemptions.map(r => r.id));
    return redemptions;
  } catch (error) {
    console.error('Error getting user redemptions:', error);
    throw error;
  }
};

export const getRedemption = async (redemptionId: string): Promise<Redemption | null> => {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
    // Return mock redemption
    const redemption = mockData.redemptions.find(r => r.id === redemptionId);
    if (!redemption) return null;

    return {
      id: redemption.id,
      userId: redemption.userId,
      rewardId: redemption.rewardId,
      rewardName: redemption.rewardName,
      rewardNameJa: redemption.rewardName, // Use same name for both in mock
      rewardDescription: redemption.rewardDescription,
      rewardType: redemption.rewardType,
      pointsCost: redemption.pointsCost || 0,
      createdAt: redemption.createdAt,
      expiresAt: redemption.expiresAt,
      used: redemption.used
    };
  }

  try {
    const redemptionRef = doc(db, 'redemptions', redemptionId);
    const redemptionSnap = await getDoc(redemptionRef);

    if (!redemptionSnap.exists()) {
      return null;
    }

    const data = redemptionSnap.data();
    return {
      id: redemptionSnap.id,
      userId: data.userId,
      rewardId: data.rewardId,
      rewardName: data.rewardName,
      rewardNameJa: data.rewardNameJa || data.rewardName,
      rewardDescription: data.rewardDescription,
      rewardType: data.rewardType,
      pointsCost: data.pointsCost || 0,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      used: data.used
    };
  } catch (error) {
    console.error('Error getting redemption:', error);
    throw error;
  }
};

export async function markRedemptionAsUsed(redemptionId: string): Promise<void> {
  const docRef = doc(db, 'redemptions', redemptionId);
  await updateDoc(docRef, {
    used: true
  });
}

// Point History
export async function getUserPointsHistory(userId: string): Promise<PointsTransaction[]> {
  const q = query(
    collection(db, 'points_transactions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as PointsTransaction));
}

/**
 * Image Upload Services
 */

// Upload image to Firebase Storage
export async function uploadImage(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/**
 * Admin Services
 */

// Create new reward (admin only)
export async function createReward(rewardData: Omit<Reward, 'id'>): Promise<string> {
  const rewardRef = await addDoc(collection(db, 'rewards'), rewardData);
  return rewardRef.id;
}

// Update reward (admin only)
export async function updateReward(rewardId: string, data: Partial<Reward>): Promise<void> {
  const docRef = doc(db, 'rewards', rewardId);
  await updateDoc(docRef, data);
}

// Generate online order codes (admin only)
export async function generateOnlineOrderCodes(
  count: number,
  prefix: string,
  pointsAwarded: number,
  expiryDays: number
): Promise<string[]> {
  const generateCodes = httpsCallable(functions, 'generateOnlineOrderCodes');
  const result = await generateCodes({ count, prefix, pointsAwarded, expiryDays });
  return (result.data as { codes: string[] }).codes;
}

// Add points to user account and record transaction
export async function addPoints(
  userId: string,
  points: number,
  type: PointsTransaction['type'],
  metadata: {
    codeId?: string;
    rewardId?: string;
    adminId?: string;
    note?: string;
  } = {}
): Promise<void> {
  // Update user points
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  const currentPoints = userDoc.data().points || 0;
  await updateDoc(userRef, {
    points: currentPoints + points
  });

  // Record transaction
  const transactionData: Omit<PointsTransaction, 'id'> = {
    userId,
    points,
    type,
    createdAt: Timestamp.now(),
    ...metadata
  };

  await addDoc(collection(db, 'points_transactions'), transactionData);
}

// Get all users (admin only)
export async function getAllUsers(limitCount: number = 50): Promise<UserProfile[]> {
  const q = query(
    collection(db, 'users'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    ...doc.data()
  } as UserProfile));
}

// Get all online order codes (admin only)
export async function getOnlineOrderCodes(limitCount: number = 100): Promise<OnlineOrderCode[]> {
  const q = query(
    collection(db, 'online_order_codes'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    ...doc.data()
  } as OnlineOrderCode));
}

// Get admin dashboard stats
export async function getAdminStats(): Promise<{
  totalUsers: number;
  activeUsers: number;
  totalPoints: number;
  totalRedemptions: number;
}> {
  const getStats = httpsCallable(functions, 'getAdminStats');
  const result = await getStats();
  return result.data as {
    totalUsers: number;
    activeUsers: number;
    totalPoints: number;
    totalRedemptions: number;
  };
}

// Get user's redemption history, including both used and unused redemptions
export const getUserRedemptionHistory = async (userId: string): Promise<Redemption[]> => {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
    // Return mock redemption history
    return mockData.redemptions
      .filter(r => r.userId === userId)
      .map(r => ({
        id: r.id,
        userId: r.userId,
        rewardId: r.rewardId,
        rewardName: r.rewardName,
        rewardNameJa: r.rewardName, // Use same name for both in mock
        rewardDescription: r.rewardDescription,
        rewardType: r.rewardType,
        pointsCost: r.pointsCost || 0,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        used: r.used
      }));
  }

  try {
    const redemptionsRef = collection(db, 'redemptions');
    const q = query(
      redemptionsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const redemptions: Redemption[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      redemptions.push({
        id: doc.id,
        userId: data.userId,
        rewardId: data.rewardId,
        rewardName: data.rewardName,
        rewardNameJa: data.rewardNameJa || data.rewardName,
        rewardDescription: data.rewardDescription,
        rewardType: data.rewardType,
        pointsCost: data.pointsCost || 0,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        used: data.used
      });
    });

    return redemptions;
  } catch (error) {
    console.error('Error getting user redemption history:', error);
    throw error;
  }
};

// Delete the user's account and all associated data
export const deleteUserAccount = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user found');

  try {
    // Delete user data from Firestore
    const userRef = doc(db, 'users', user.uid);

    // Delete user authentication
    await deleteDoc(userRef);
    return user.delete();
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
};

// Change user password
export async function updateUserPassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) { // Need email for credential
    throw new Error("User not authenticated or email unavailable.");
  }

  if (!currentPassword || !newPassword) {
    throw new Error("Current and new passwords are required.");
  }
  if (newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters long.");
  }

  try {
    // Re-authenticate the user first for security
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // If re-authentication is successful, update the password
    await fbUpdatePassword(user, newPassword);

  } catch (error: any) {
    console.error("Error updating password:", error);
    // Provide more specific error messages if possible
    if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect current password.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('New password is too weak.');
    } else {
      throw new Error('Failed to update password. Please try again.');
    }
  }
}

// Get the next expiration date for the user's points (oldest earned points)
export async function getNextPointsExpirationInfo(userId: string): Promise<{ expiresAt: Date } | null> {
  try {
    const pointsQuery = query(
      collection(db, 'points_transactions'),
      where('userId', '==', userId),
      where('points', '>', 0), // Only consider earning transactions
      orderBy('createdAt', 'asc'), // Find the oldest first
      limit(1) // We only need the very oldest one
    );

    const querySnapshot = await getDocs(pointsQuery);

    if (querySnapshot.empty) {
      // User has never earned points
      return null;
    }

    const oldestTransaction = querySnapshot.docs[0].data();
    const createdAt = oldestTransaction.createdAt;

    if (!createdAt || typeof createdAt.toDate !== 'function') {
      console.warn('Oldest transaction missing valid createdAt timestamp');
      return null;
    }

    const earnedDate = createdAt.toDate();
    const expirationDate = new Date(earnedDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + 1); // Add 1 year

    // Optional: Only return if expiring relatively soon (e.g., within 90 days)
    const now = new Date();
    const ninetyDaysFromNow = new Date(now);
    ninetyDaysFromNow.setDate(now.getDate() + 90);

    if (expirationDate > now && expirationDate <= ninetyDaysFromNow) {
      return { expiresAt: expirationDate };
    } else {
      // Oldest points not expiring soon, or already expired (we don't show past expirations)
      return null;
    }

  } catch (error) {
    console.error("Error fetching next points expiration info:", error);
    // Don't throw, just return null - this is informational
    return null;
  }
}
