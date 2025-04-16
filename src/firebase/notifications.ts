import { Timestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from './config';

// NOTICE: Firebase Messaging functionality is temporarily disabled
console.log('Firebase Cloud Messaging functionality is temporarily disabled');

// Messaging is set to null to prevent any actual messaging functionality
const messaging = null;

// Service worker registration for push notifications - disabled
export const registerServiceWorker = async () => {
  console.log('Firebase messaging service worker registration is disabled');
  return null;
};

// Request permission for notifications - disabled
export const requestNotificationPermission = async () => {
  console.log('Notification permission requests are temporarily disabled');
  return 'default';
};

// Register FCM token for current user - disabled
export const registerFCMToken = async (userId: string) => {
  console.log('FCM token registration is temporarily disabled');
  return null;
};

// Unregister FCM token for current user - disabled
export const unregisterFCMToken = async (userId: string) => {
  console.log('FCM token unregistration is temporarily disabled');
  return true;
};

// Set up foreground messaging - disabled
export const setupForegroundNotifications = () => {
  console.log('Foreground notifications are temporarily disabled');
};

// User notification preferences - maintains database structure but doesn't enable notifications
export const updateUserNotificationPreferences = async (
  userId: string,
  preferences: {
    pointsUpdates?: boolean;
    expiringPoints?: boolean;
    newRewards?: boolean;
    specialOffers?: boolean;
  }
) => {
  try {
    // Only update the preferences in the database, but don't enable actual notifications
    const userRef = doc(db, 'users', userId);

    // Build update object
    const updates: Record<string, any> = {};
    Object.entries(preferences).forEach(([key, value]) => {
      updates[`notificationPreferences.${key}`] = value;
    });

    // Update the user document
    await updateDoc(userRef, updates);

    console.log('Notification preferences updated in database (notifications disabled)');
    return true;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return false;
  }
};

// Get user notification preferences
export const getUserNotificationPreferences = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return userDoc.data().notificationPreferences || {
        pointsUpdates: true,
        expiringPoints: true,
        newRewards: true,
        specialOffers: true
      };
    }

    return {
      pointsUpdates: true,
      expiringPoints: true,
      newRewards: true,
      specialOffers: true
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return {
      pointsUpdates: true,
      expiringPoints: true,
      newRewards: true,
      specialOffers: true
    };
  }
};

// Send notification to user - disabled
export const sendNotificationToUser = async (
  userId: string,
  notification: {
    title: string;
    body: string;
    icon?: string;
    data?: Record<string, string>;
  }
) => {
  console.log('Push notifications are temporarily disabled');
  return false;
};

// The following functions are maintained for API compatibility but disabled

export const sendPointsUpdateNotification = async (
  userId: string,
  points: number,
  total: number
) => {
  console.log('Points update notifications are temporarily disabled');
  return false;
};

export const sendExpiringRewardsNotification = async (
  userId: string,
  daysToExpiration: number,
  redemptionId: string,
  rewardName: string
) => {
  console.log('Expiring rewards notifications are temporarily disabled');
  return false;
};

export const sendSpecialOfferNotification = async (
  userId: string,
  offerTitle: string,
  offerDescription: string,
  offerId?: string
) => {
  console.log('Special offer notifications are temporarily disabled');
  return false;
};

export const checkAndNotifyExpiringRewards = async () => {
  console.log('Expiring rewards check and notification is temporarily disabled');
  return false;
};

export const broadcastNotificationToUsers = async (
  notificationType: 'pointsUpdates' | 'expiringRewards' | 'specialOffers',
  notification: {
    title: string;
    body: string;
    icon?: string;
    data?: Record<string, string>;
  }
) => {
  console.log('Broadcast notifications are temporarily disabled');
  return false;
};
