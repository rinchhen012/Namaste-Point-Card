import { Timestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile } from '../types';

// Check if push notifications are supported in the browser
export const isPushNotificationSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Get permission state
export const getNotificationPermissionState = async (): Promise<NotificationPermission> => {
  if (!isPushNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isPushNotificationSupported()) {
    return Promise.resolve('denied');
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

// Convert base64 string to Uint8Array
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Get VAPID public key from environment variables
const getVapidPublicKey = (): string => {
  // First try to get from import.meta.env (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_VAPID_PUBLIC_KEY) {
    return import.meta.env.VITE_VAPID_PUBLIC_KEY;
  }

  // Fallback to process.env (if using Create React App)
  if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_VAPID_PUBLIC_KEY) {
    return process.env.REACT_APP_VAPID_PUBLIC_KEY;
  }

  // Fallback for development only - never use in production
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
    console.warn('Using fallback VAPID key. Set VITE_VAPID_PUBLIC_KEY in your environment variables.');
    return 'BEQDzKSohxbgR4wMPYrOJUgaZ9XhUoV-6xjcR_MOcBeNnWrUmV3Q5m4jNkhnnr6JXLd24IxGHx5mPG5qnBP6ZA4';
  }

  console.error('Missing VAPID public key in environment variables!');
  return '';
};

// VAPID public key for push notifications
// In a real app, this would be stored in environment variables
const VAPID_PUBLIC_KEY = getVapidPublicKey();

// Register push notification subscription
export const registerPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushNotificationSupported()) {
    return null;
  }

  try {
    // Request permission if not already granted
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return null;
    }

    // Get service worker registration
    const swRegistration = await navigator.serviceWorker.ready;

    // Get existing subscription or create new one
    let subscription = await swRegistration.pushManager.getSubscription();

    if (!subscription) {
      if (!VAPID_PUBLIC_KEY) {
        console.error('VAPID public key is not available');
        return null;
      }

      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      try {
        subscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      } catch (error) {
        console.error('Push subscription failed:', error);
        return null;
      }
    }

    return subscription;
  } catch (error) {
    console.error('Error registering push subscription:', error);
    return null;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    const swRegistration = await navigator.serviceWorker.ready;
    const subscription = await swRegistration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
};

// Save subscription to user profile
export const saveSubscriptionToUserProfile = async (
  userId: string,
  subscription: PushSubscription,
  preferences = {
    pointsUpdates: true,
    expiringRewards: true,
    specialOffers: true,
  }
): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      'notifications.isEnabled': true,
      'notifications.token': JSON.stringify(subscription),
      'notifications.lastUpdated': Timestamp.now(),
      'notifications.preferences': preferences,
    });

    return true;
  } catch (error) {
    console.error('Error saving subscription to user profile:', error);
    return false;
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (
  userId: string,
  preferences: {
    pointsUpdates?: boolean;
    expiringRewards?: boolean;
    specialOffers?: boolean;
  }
): Promise<boolean> => {
  try {
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

// Disable notifications completely
export const disableNotifications = async (userId: string): Promise<boolean> => {
  try {
    // Unsubscribe from push notifications
    await unsubscribeFromPushNotifications();

    // Update user profile
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'notifications.isEnabled': false,
      'notifications.lastUpdated': Timestamp.now(),
    });

    return true;
  } catch (error) {
    console.error('Error disabling notifications:', error);
    return false;
  }
};

// Get default notification preferences
export const getDefaultNotificationPreferences = () => ({
  pointsUpdates: true,
  expiringRewards: true,
  specialOffers: true,
});
