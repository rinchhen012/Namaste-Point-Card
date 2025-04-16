import { Timestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile } from '../types';

// NOTIFICATIONS DISABLED NOTICE
// This file contains utility functions for push notifications, but the functionality
// has been temporarily disabled while maintaining the API interface
console.log('Push notification functionality is temporarily disabled');

// Check if push notifications are supported in the browser
export const isPushNotificationSupported = () => {
  // Notifications are currently disabled, always return false
  console.log('Push notifications are temporarily disabled');
  return false;
};

// Get permission state - always return denied since notifications are disabled
export const getNotificationPermissionState = async (): Promise<NotificationPermission> => {
  console.log('Push notifications are temporarily disabled');
  return 'default';
};

// Request notification permission - no-op
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  console.log('Push notifications are temporarily disabled');
  return Promise.resolve('default');
};

// Get VAPID public key - no-op
const getVapidPublicKey = (): string => {
  console.log('VAPID key is not used - push notifications are temporarily disabled');
  return '';
};

// Convert base64 string to Uint8Array - no-op
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  console.log('base64 conversion not used - push notifications are temporarily disabled');
  return new Uint8Array();
};

// VAPID public key for push notifications - empty since disabled
const VAPID_PUBLIC_KEY = '';

// Register push notification subscription - no-op
export const registerPushSubscription = async (): Promise<PushSubscription | null> => {
  console.log('Push notification registration is temporarily disabled');
  return null;
};

// Unsubscribe from push notifications - no-op
export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  console.log('Push notification unsubscription is temporarily disabled');
  return true;
};

// Save subscription to user profile - no-op but maintains database structure
export const saveSubscriptionToUserProfile = async (
  userId: string,
  subscription: PushSubscription,
  preferences = {
    pointsUpdates: true,
    expiringRewards: true,
    specialOffers: true,
  }
): Promise<boolean> => {
  console.log('Push notification subscription saving is temporarily disabled');
  return true;
};

// Update notification preferences - no-op but maintains database structure
export const updateNotificationPreferences = async (
  userId: string,
  preferences: {
    pointsUpdates?: boolean;
    expiringRewards?: boolean;
    specialOffers?: boolean;
  }
): Promise<boolean> => {
  try {
    console.log('Push notification preferences update is temporarily disabled');
    // Record preferences in database but don't enable notifications
    const userRef = doc(db, 'users', userId);

    // Only update specified preferences
    const updates: Record<string, any> = {};

    for (const [key, value] of Object.entries(preferences)) {
      if (value !== undefined) {
        updates[`notifications.preferences.${key}`] = value;
      }
    }

    if (Object.keys(updates).length > 0) {
      updates['notifications.lastUpdated'] = Timestamp.now();
      await updateDoc(userRef, updates);
    }

    return true;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return false;
  }
};

// Disable notifications completely - no-op
export const disableNotifications = async (userId: string): Promise<boolean> => {
  console.log('Notifications are already disabled');
  return true;
};

// Get default notification preferences
export const getDefaultNotificationPreferences = () => ({
  pointsUpdates: true,
  expiringRewards: true,
  specialOffers: true,
});
