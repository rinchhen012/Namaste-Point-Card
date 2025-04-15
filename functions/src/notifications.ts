import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Function to send a push notification to a specific user
export const sendPushNotification = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to send notifications'
    );
  }

  // Get data from request
  const { userId, notification } = data;

  // Verify permissions (only allow users to send notifications to themselves or admins to send to anyone)
  const isAdmin = context.auth.token.admin === true;
  if (context.auth.uid !== userId && !isAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You can only send notifications to yourself'
    );
  }

  try {
    // Get user's FCM tokens from the database
    const userDoc = await admin.firestore().collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User not found'
      );
    }

    const userData = userDoc.data();
    if (!userData) {
      throw new functions.https.HttpsError(
        'not-found',
        'User data not found'
      );
    }

    // Check if user has enabled notifications
    if (!userData.notifications?.isEnabled) {
      return { success: false, reason: 'notifications-disabled' };
    }

    // Get FCM tokens
    const fcmTokens = userData.fcmTokens || [];
    if (fcmTokens.length === 0) {
      return { success: false, reason: 'no-tokens' };
    }

    // Check notification type against user preferences
    if (notification.data?.type) {
      const type = notification.data.type;
      let preferenceKey: string | null = null;

      if (type === 'points_update') preferenceKey = 'pointsUpdates';
      if (type === 'expiring_reward') preferenceKey = 'expiringRewards';
      if (type === 'special_offer') preferenceKey = 'specialOffers';

      if (preferenceKey && !userData.notifications.preferences[preferenceKey]) {
        return { success: false, reason: 'preference-disabled' };
      }
    }

    // Send notification to all user's devices
    const invalidTokens: string[] = [];

    // Process tokens in batches to avoid overloading
    const batchSize = 10;
    for (let i = 0; i < fcmTokens.length; i += batchSize) {
      const batch = fcmTokens.slice(i, i + batchSize);
      const messages = batch.map(token => ({
        token,
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.icon ? { icon: notification.icon } : {})
        },
        data: notification.data || {}
      }));

      try {
        const response = await admin.messaging().sendAll(messages);

        // Check for invalid tokens
        response.responses.forEach((resp, index) => {
          if (resp.error) {
            if (
              resp.error.code === 'messaging/invalid-registration-token' ||
              resp.error.code === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(batch[index]);
            }
          }
        });
      } catch (error) {
        console.error('Error sending notifications batch:', error);
      }
    }

    // Remove invalid tokens from the user's document
    if (invalidTokens.length > 0) {
      const validTokens = fcmTokens.filter(token => !invalidTokens.includes(token));
      await admin.firestore().collection('users').doc(userId).update({
        fcmTokens: validTokens
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send notification'
    );
  }
});

// Function to broadcast a notification to all users with a specific preference enabled
export const broadcastPushNotification = functions.https.onCall(async (data, context) => {
  // Verify authentication and admin privileges
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to broadcast notifications'
    );
  }

  // Only admins can broadcast notifications
  const isAdmin = context.auth.token.admin === true;
  if (!isAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can broadcast notifications'
    );
  }

  // Get data from request
  const { notificationType, notification } = data;

  try {
    // Get users who have enabled the specific notification type
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('notifications.isEnabled', '==', true)
      .where(`notifications.preferences.${notificationType}`, '==', true)
      .get();

    if (usersSnapshot.empty) {
      return { success: true, count: 0 };
    }

    const sendPromises = usersSnapshot.docs.map(async (userDoc) => {
      const userData = userDoc.data();
      const fcmTokens = userData.fcmTokens || [];

      if (fcmTokens.length === 0) return null;

      // Send to each token for this user
      const messages = fcmTokens.map(token => ({
        token,
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.icon ? { icon: notification.icon } : {})
        },
        data: notification.data || {}
      }));

      try {
        return admin.messaging().sendAll(messages);
      } catch (error) {
        console.error(`Error sending to user ${userDoc.id}:`, error);
        return null;
      }
    });

    await Promise.all(sendPromises);

    return { success: true, count: usersSnapshot.size };
  } catch (error) {
    console.error('Error in broadcastPushNotification:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to broadcast notification'
    );
  }
});

// Function to register or update an FCM token for a user
export const registerFCMToken = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to register FCM token'
    );
  }

  const { token } = data;
  const userId = context.auth.uid;

  if (!token) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'FCM token is required'
    );
  }

  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User not found'
      );
    }

    const userData = userDoc.data();
    if (!userData) {
      throw new functions.https.HttpsError(
        'not-found',
        'User data not found'
      );
    }

    // Get existing tokens and add the new one if it doesn't exist
    const fcmTokens = userData.fcmTokens || [];
    if (!fcmTokens.includes(token)) {
      fcmTokens.push(token);
      await userRef.update({ fcmTokens });
    }

    return { success: true };
  } catch (error) {
    console.error('Error in registerFCMToken:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to register FCM token'
    );
  }
});

// Function to unregister an FCM token
export const unregisterFCMToken = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to unregister FCM token'
    );
  }

  const { token } = data;
  const userId = context.auth.uid;

  if (!token) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'FCM token is required'
    );
  }

  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User not found'
      );
    }

    const userData = userDoc.data();
    if (!userData) {
      throw new functions.https.HttpsError(
        'not-found',
        'User data not found'
      );
    }

    // Filter out the token to remove
    const fcmTokens = (userData.fcmTokens || []).filter(t => t !== token);
    await userRef.update({ fcmTokens });

    return { success: true };
  } catch (error) {
    console.error('Error in unregisterFCMToken:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to unregister FCM token'
    );
  }
});
