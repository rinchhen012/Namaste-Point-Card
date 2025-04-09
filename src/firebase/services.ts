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
  deleteDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, functions, storage } from './config';
import { UserProfile, Reward, Redemption, PointsTransaction, OnlineOrderCode } from '../types';

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
export const validateOnlineOrderCode = async (code: string, userId: string) => {
  const validateCode = httpsCallable(functions, 'validateOnlineCode');
  try {
    const result = await validateCode({ code, userId });
    return result.data;
  } catch (error) {
    throw error;
  }
};

export const validateQRCheckIn = async (
  userId: string,
  qrCode: string,
  latitude: number,
  longitude: number
) => {
  try {
    // Check if this is dev mode with mock auth
    if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
      console.log('Using mock QR validation in dev mode');

      // Simulate checking timestamp of last visit
      const lastVisit = mockData.pointsHistory.find(
        h => h.userId === userId &&
             h.source === 'in_store_visit' &&
             h.metadata?.qrCode === qrCode
      );

      if (lastVisit) {
        const lastVisitTime = lastVisit.timestamp.toDate();
        const hoursElapsed = (Date.now() - lastVisitTime.getTime()) / (1000 * 60 * 60);

        if (hoursElapsed < 22) {
          return {
            success: false,
            message: 'You have already checked in today. Please come back tomorrow!'
          };
        }
      }

      // Add to mock points history
      mockData.pointsHistory.push({
        id: 'history-' + Date.now(),
        userId,
        points: 1,
        type: 'earn',
        source: 'in_store_visit',
        timestamp: { toDate: () => new Date() },
        metadata: { latitude, longitude, qrCode }
      });

      return { success: true, message: 'Check-in successful! 1 point added.' };
    }

    // For production, call the Cloud Function
    const validateQRCheckIn = httpsCallable(functions, 'validateQRCheckIn');
    const result = await validateQRCheckIn({
      userId,
      qrCode,
      latitude,
      longitude
    });

    // If validation succeeds, update user's points and record visit
    if (result.data && (result.data as any).success) {
      const userRef = doc(db, 'users', userId);

      // Get the current user data
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      // Update user profile with points and timestamp
      await updateDoc(userRef, {
        points: increment(1),
        lastQRCheckIn: {
          timestamp: Timestamp.now(),
          qrCode: qrCode
        }
      });

      // Record in points history
      await addDoc(collection(db, 'points_history'), {
        userId,
        points: 1,
        type: 'earn',
        source: 'in_store_visit',
        timestamp: Timestamp.now(),
        metadata: {
          latitude,
          longitude,
          qrCode
        }
      });
    }

    return result.data;
  } catch (error) {
    console.error('Error validating QR check-in:', error);
    throw error;
  }
};

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
