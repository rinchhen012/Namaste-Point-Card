import { getFirestore, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { app } from './firebase';
import { getAuth } from 'firebase/auth';
import { firestore } from './firebase';
import { doc, updateDoc, getDoc, setDoc, deleteField } from 'firebase/firestore';
import { db } from './config';
import { UserProfile, Redemption } from '../types';
import { getUser } from './services';

// Add type declaration for window.FIREBASE_CONFIG
declare global {
  interface Window {
    FIREBASE_CONFIG: any;
  }
}

let messaging: any = null;

try {
  messaging = getMessaging(app);
} catch (error) {
  console.error('Error initializing messaging:', error);
}

// Service worker registration for push notifications
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Pass Firebase config to the service worker
      const publicVapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;
      if (!publicVapidKey) {
        throw new Error('VAPID key is not defined');
      }

      // Set Firebase config in the window for SW to access
      window.FIREBASE_CONFIG = app.options;

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });

      console.log('Service worker registered successfully:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  } else {
    console.warn('Service workers are not supported in this browser');
    return null;
  }
};

// Request permission for notifications
export const requestNotificationPermission = async () => {
  try {
    if (!messaging) {
      console.warn('Messaging is not initialized');
      return false;
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission status:', permission);
    return permission === 'granted';
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
};

// Register FCM token for current user
export const registerFCMToken = async (userId: string) => {
  try {
    if (!messaging) {
      console.warn('Messaging is not initialized');
      return null;
    }

    const serviceWorkerRegistration = await registerServiceWorker();
    if (!serviceWorkerRegistration) {
      throw new Error('Service worker registration failed');
    }

    const currentToken = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration
    });

    if (!currentToken) {
      console.warn('No token currently available');
      return null;
    }

    console.log('FCM Token:', currentToken);

    // Save the token to the user's document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      let tokens = userData.fcmTokens || [];

      // Don't add duplicate tokens
      if (!tokens.includes(currentToken)) {
        tokens.push(currentToken);
        await updateDoc(userRef, { fcmTokens: tokens });
      }
    }

    return currentToken;
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return null;
  }
};

// Unregister FCM token for current user
export const unregisterFCMToken = async (userId: string) => {
  try {
    if (!messaging) {
      console.warn('Messaging is not initialized');
      return false;
    }

    const currentToken = await getToken(messaging);

    if (!currentToken) {
      console.warn('No FCM token available to unregister');
      return false;
    }

    // Remove token from Firestore
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      let tokens = userData.fcmTokens || [];

      // Remove the current token
      tokens = tokens.filter((token: string) => token !== currentToken);
      await updateDoc(userRef, { fcmTokens: tokens });
    }

    // Delete the token from FCM
    await deleteToken(messaging);
    console.log('FCM token unregistered successfully');
    return true;
  } catch (error) {
    console.error('Error unregistering FCM token:', error);
    return false;
  }
};

// Set up foreground messaging
export const setupForegroundNotifications = () => {
  if (!messaging) {
    console.warn('Messaging is not initialized');
    return;
  }

  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    const { title, body, icon } = payload.notification || {};

    if (Notification.permission === 'granted' && title) {
      const notificationOptions = {
        body: body || '',
        icon: icon || '/logo192.png',
        data: payload.data
      };

      new Notification(title, notificationOptions);
    }
  });
};

// User notification preferences
export const updateUserNotificationPreferences = async (
  userId: string,
  preferences: {
    pointsUpdates?: boolean;
    expiringPoints?: boolean;
    newRewards?: boolean;
    specialOffers?: boolean;
  }
) => {
  if (!userId) {
    console.error('User ID is required to update notification preferences');
    return false;
  }

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      notificationPreferences: preferences
    });
    return true;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return false;
  }
};

export const getUserNotificationPreferences = async (userId: string) => {
  if (!userId) {
    console.error('User ID is required to get notification preferences');
    return null;
  }

  try {
    const user = await getUser(userId);
    return user?.notificationPreferences || {
      pointsUpdates: true,
      expiringPoints: true,
      newRewards: true,
      specialOffers: true
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return null;
  }
};

// Function to send notification to a specific user
export const sendNotificationToUser = async (
  userId: string,
  notification: {
    title: string;
    body: string;
    icon?: string;
    data?: Record<string, string>;
  }
) => {
  try {
    const functions = getFunctions();
    const sendPushNotification = httpsCallable(functions, 'sendPushNotification');

    await sendPushNotification({
      userId,
      notification
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error };
  }
};

// Function to send notification about points update
export const sendPointsUpdateNotification = async (
  userId: string,
  points: number,
  total: number
) => {
  return sendNotificationToUser(userId, {
    title: 'Points Update',
    body: `You've earned ${points} points! Your total is now ${total} points.`,
    data: {
      type: 'points_update',
      points: points.toString(),
      total: total.toString()
    }
  });
};

// Function to send notification about expiring rewards
export const sendExpiringRewardsNotification = async (
  userId: string,
  daysToExpiration: number,
  redemptionId: string,
  rewardName: string
) => {
  return sendNotificationToUser(userId, {
    title: 'Reward Expiring Soon',
    body: `Your ${rewardName} reward expires in ${daysToExpiration} days. Don't forget to use it!`,
    data: {
      type: 'expiring_reward',
      redemptionId,
      daysToExpiration: daysToExpiration.toString()
    }
  });
};

// Function to send notification about special offers
export const sendSpecialOfferNotification = async (
  userId: string,
  offerTitle: string,
  offerDescription: string,
  offerId?: string
) => {
  return sendNotificationToUser(userId, {
    title: 'Special Offer Available',
    body: `${offerTitle}: ${offerDescription}`,
    data: {
      type: 'special_offer',
      offerId: offerId || ''
    }
  });
};

// Function to check and send notifications for expiring rewards
export const checkAndNotifyExpiringRewards = async () => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    // Get redemptions expiring in the next 3-7 days
    const redemptionsRef = collection(db, 'redemptions');
    const q = query(
      redemptionsRef,
      where('expiresAt', '>', Timestamp.fromDate(threeDaysFromNow)),
      where('expiresAt', '<', Timestamp.fromDate(sevenDaysFromNow)),
      where('notifiedExpiration', '==', false)
    );

    const querySnapshot = await getDocs(q);
    const notificationPromises: Promise<any>[] = [];

    querySnapshot.forEach(doc => {
      const redemption = doc.data() as Redemption;

      // Fetch user profile to check notification preferences
      const userPromise = getDocs(
        query(collection(db, 'users'), where('uid', '==', redemption.userId))
      ).then(async userSnapshot => {
        if (!userSnapshot.empty) {
          const userProfile = userSnapshot.docs[0].data() as UserProfile;

          // Check if user has enabled expiring rewards notifications
          if (
            userProfile.notifications?.isEnabled &&
            userProfile.notifications.preferences.expiringRewards
          ) {
            // Calculate days until expiration
            const expirationDate = (redemption.expiresAt as unknown as Timestamp).toDate();
            const daysToExpiration = Math.ceil(
              (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Send notification
            return sendExpiringRewardsNotification(
              redemption.userId,
              daysToExpiration,
              doc.id,
              redemption.rewardName || 'reward'
            );
          }
        }
        return null;
      });

      notificationPromises.push(userPromise);
    });

    await Promise.all(notificationPromises);
    return { success: true, count: notificationPromises.length };
  } catch (error) {
    console.error('Error checking expiring rewards:', error);
    return { success: false, error };
  }
};

// Function to broadcast a notification to all users with a specific preference
export const broadcastNotificationToUsers = async (
  notificationType: 'pointsUpdates' | 'expiringRewards' | 'specialOffers',
  notification: {
    title: string;
    body: string;
    icon?: string;
    data?: Record<string, string>;
  }
) => {
  try {
    const functions = getFunctions();
    const broadcastPushNotification = httpsCallable(functions, 'broadcastPushNotification');

    await broadcastPushNotification({
      notificationType,
      notification
    });

    return { success: true };
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    return { success: false, error };
  }
};
