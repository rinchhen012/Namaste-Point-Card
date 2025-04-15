import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
  isPushNotificationSupported,
  getNotificationPermissionState,
  requestNotificationPermission,
  registerPushSubscription,
  saveSubscriptionToUserProfile,
  getDefaultNotificationPreferences
} from '../utils/notificationUtils';

interface NotificationPermissionProps {
  onComplete?: () => void;
}

// Function to detect Safari browser
const isSafari = (): boolean => {
  const userAgent = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(userAgent);
};

// Function to detect iOS device
const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

const NotificationPermission: React.FC<NotificationPermissionProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const [permissionState, setPermissionState] = useState<NotificationPermission | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detect browser/device info for specific instructions
  const safari = isSafari();
  const ios = isIOS();

  useEffect(() => {
    // Check current permission state on mount
    const checkPermission = async () => {
      if (isPushNotificationSupported()) {
        const permission = await getNotificationPermissionState();
        setPermissionState(permission);
      } else {
        setPermissionState('denied');
        if (safari && ios) {
          setErrorMessage(t('notifications.errors.safariIOS', 'Safari on iOS does not support web push notifications.'));
        } else if (!('PushManager' in window)) {
          setErrorMessage(t('notifications.errors.noPushManager', 'Your browser does not support push notifications.'));
        } else if (!('serviceWorker' in navigator)) {
          setErrorMessage(t('notifications.errors.noServiceWorker', 'Your browser does not support service workers, which are required for notifications.'));
        }
      }
    };

    checkPermission();
  }, [t]);

  const handleEnableNotifications = async () => {
    if (!currentUser || isRequesting) return;

    setIsRequesting(true);
    setErrorMessage(null);

    try {
      // Request permission
      const permission = await requestNotificationPermission();
      setPermissionState(permission);

      if (permission === 'granted') {
        // Register subscription
        const subscription = await registerPushSubscription();

        if (subscription && userProfile) {
          // Save subscription to user profile
          await saveSubscriptionToUserProfile(
            currentUser.uid,
            subscription,
            getDefaultNotificationPreferences()
          );

          // Update local state
          setUserProfile({
            ...userProfile,
            notifications: {
              isEnabled: true,
              token: JSON.stringify(subscription),
              preferences: getDefaultNotificationPreferences()
            }
          });
        } else {
          setErrorMessage(t('notifications.errors.subscriptionFailed', 'Failed to register for notifications. Please try again later.'));
        }
      } else if (permission === 'denied') {
        setErrorMessage(t('notifications.errors.permissionDenied', 'Notification permission was denied.'));
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      setErrorMessage(t('notifications.errors.general', 'An error occurred while enabling notifications.'));
    } finally {
      setIsRequesting(false);
      if (onComplete) onComplete();
    }
  };

  const handleSkip = () => {
    if (onComplete) onComplete();
  };

  const getInstructions = (): string => {
    if (safari && ios) {
      return t('notifications.instructions.safariIOS', 'On iPhone, you need to open this site in Chrome or Firefox to enable notifications.');
    } else if (safari) {
      return t('notifications.instructions.safari', 'In Safari, you may need to allow notifications in your browser settings.');
    } else if (isIOS()) {
      return t('notifications.instructions.iOS', 'On iOS, you need to allow notifications when prompted.');
    } else {
      return t('notifications.instructions.default', 'Allow notifications to stay updated on your points and rewards.');
    }
  };

  // Don't render anything if notification support check is in progress
  if (permissionState === null) return null;

  // Don't render if notifications are already granted
  if (permissionState === 'granted') {
    if (onComplete) onComplete();
    return null;
  }

  // Special message for completely unsupported browsers
  if (!isPushNotificationSupported()) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="text-center mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h3 className="text-lg font-medium text-center mb-2">
          {t('notifications.notSupported')}
        </h3>

        <p className="text-sm text-gray-600 mb-4 text-center">
          {errorMessage || t('notifications.browserNotSupported')}
        </p>

        <div className="flex justify-center">
          <button
            onClick={handleSkip}
            className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('common.continue')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="text-center mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>

      <h3 className="text-lg font-medium text-center mb-2">
        {t('notifications.enableTitle')}
      </h3>

      <p className="text-sm text-gray-600 mb-2 text-center">
        {t('notifications.enableDescription')}
      </p>

      <p className="text-xs text-gray-500 mb-4 text-center">
        {getInstructions()}
      </p>

      {errorMessage && (
        <p className="text-xs text-amber-600 mb-4 text-center">
          {errorMessage}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <button
          onClick={handleSkip}
          className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          disabled={isRequesting}
        >
          {t('common.notNow')}
        </button>

        <button
          onClick={handleEnableNotifications}
          className="py-2 px-4 bg-primary border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary-dark transition-colors"
          disabled={isRequesting || permissionState === 'denied'}
        >
          {isRequesting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('common.loading')}
            </span>
          ) : (
            permissionState === 'denied' ? t('notifications.openSettings') : t('notifications.enable')
          )}
        </button>
      </div>
    </div>
  );
};

export default NotificationPermission;
