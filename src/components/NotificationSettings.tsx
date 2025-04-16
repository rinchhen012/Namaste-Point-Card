import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
  isPushNotificationSupported,
  getNotificationPermissionState,
  requestNotificationPermission,
  registerPushSubscription,
  saveSubscriptionToUserProfile,
  updateNotificationPreferences,
  disableNotifications,
  getDefaultNotificationPreferences
} from '../utils/notificationUtils';

const NotificationSettings: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, userProfile, setUserProfile } = useAuth();

  const [permissionState, setPermissionState] = useState<NotificationPermission | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [preferences, setPreferences] = useState({
    pointsUpdates: true,
    expiringRewards: true,
    specialOffers: true
  });

  useEffect(() => {
    // Check if notifications are supported and current permission
    const checkNotificationStatus = async () => {
      const supported = isPushNotificationSupported();
      setIsSupported(supported);

      if (supported) {
        const permission = await getNotificationPermissionState();
        setPermissionState(permission);

        // Show permission prompt if permission is default (not yet decided)
        setShowPermissionPrompt(permission === 'default');
      }
    };

    checkNotificationStatus();

    // Set preferences from user profile if available
    if (userProfile?.notifications?.preferences) {
      setPreferences(userProfile.notifications.preferences);
    } else {
      setPreferences(getDefaultNotificationPreferences());
    }
  }, [userProfile]);

  // Disabled function - no-op
  const handleRequestPermission = async () => {
    console.log('Notification permission handling is temporarily disabled');
    setIsLoading(false);
  };

  // Disabled function - no-op
  const handleToggleAll = async (enabled: boolean) => {
    console.log('Notification toggle functionality is temporarily disabled');
    setIsLoading(false);
  };

  // Disabled function - no-op
  const handleTogglePreference = async (key: keyof typeof preferences, value: boolean) => {
    console.log('Notification preference updates are temporarily disabled');
    setIsLoading(false);
  };

  if (!isSupported) {
    return (
      <div className="mb-6 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-3">{t('profile.notifications')}</h3>
        <p className="text-sm text-gray-500">
          {t('notifications.notSupported')}
        </p>
      </div>
    );
  }

  const isEnabled = userProfile?.notifications?.isEnabled && permissionState === 'granted';

  return (
    <div className="mb-6 bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-3">{t('profile.notifications')}</h3>

      {/* Permission Request Prompt */}
      {showPermissionPrompt && (
        <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0 text-primary text-xl mr-3">
              🔔
            </div>
            <div>
              <h4 className="font-medium mb-1">{t('notifications.permissionTitle', 'Enable Notifications')}</h4>
              <p className="text-sm text-gray-700 mb-3">
                {t('notifications.permissionDescription', 'Get notified about point updates, expiring rewards, and special offers. You can customize these later.')}
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleRequestPermission}
                  disabled={isLoading}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('common.loading')}
                    </span>
                  ) : (
                    t('notifications.allowButton', 'Allow Notifications')
                  )}
                </button>
                <button
                  onClick={() => setShowPermissionPrompt(false)}
                  disabled={isLoading}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t('common.maybeLater', 'Maybe Later')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
        <div className="pr-4">
          <p className="font-medium">{t('notifications.enable', 'Enable')}</p>
          <p className="text-sm text-gray-500">{t('notifications.enableDescription')}</p>
        </div>
        <div className="relative inline-block w-12 align-middle select-none flex-shrink-0">
          <input
            type="checkbox"
            name="toggle-all"
            id="toggle-all"
            className="sr-only"
            checked={isEnabled}
            disabled={isLoading || permissionState === 'denied'}
            onChange={(e) => handleToggleAll(e.target.checked)}
          />
          <label
            htmlFor="toggle-all"
            className={`block h-6 overflow-hidden rounded-full cursor-pointer transition-colors ${isEnabled ? 'bg-primary' : 'bg-gray-300'} ${(isLoading || permissionState === 'denied') ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className={`block h-6 w-6 rounded-full transform transition-transform bg-white border shadow ${isEnabled ? 'translate-x-6' : ''}`}></span>
          </label>
        </div>
      </div>

      {permissionState === 'denied' && (
        <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded-md text-sm">
          <p>{t('notifications.permissionDenied')}</p>
          <p className="mt-1">{t('notifications.permissionDeniedHint', 'You need to enable notifications in your browser settings to receive updates.')}</p>
        </div>
      )}

      {isEnabled && (
        <div>
          <p className="font-medium mb-2">{t('notifications.preferences')}</p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="points-updates" className="text-sm">
                {t('notifications.pointsUpdates')}
              </label>
              <div className="relative inline-block w-10 align-middle select-none">
                <input
                  type="checkbox"
                  name="points-updates"
                  id="points-updates"
                  className="sr-only"
                  checked={preferences.pointsUpdates}
                  disabled={isLoading}
                  onChange={(e) => handleTogglePreference('pointsUpdates', e.target.checked)}
                />
                <label
                  htmlFor="points-updates"
                  className={`block h-5 overflow-hidden rounded-full cursor-pointer transition-colors ${preferences.pointsUpdates ? 'bg-primary' : 'bg-gray-300'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`block h-5 w-5 rounded-full transform transition-transform bg-white border shadow ${preferences.pointsUpdates ? 'translate-x-5' : ''}`}></span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="expiring-rewards" className="text-sm">
                {t('notifications.expiringRewards')}
              </label>
              <div className="relative inline-block w-10 align-middle select-none">
                <input
                  type="checkbox"
                  name="expiring-rewards"
                  id="expiring-rewards"
                  className="sr-only"
                  checked={preferences.expiringRewards}
                  disabled={isLoading}
                  onChange={(e) => handleTogglePreference('expiringRewards', e.target.checked)}
                />
                <label
                  htmlFor="expiring-rewards"
                  className={`block h-5 overflow-hidden rounded-full cursor-pointer transition-colors ${preferences.expiringRewards ? 'bg-primary' : 'bg-gray-300'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`block h-5 w-5 rounded-full transform transition-transform bg-white border shadow ${preferences.expiringRewards ? 'translate-x-5' : ''}`}></span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="special-offers" className="text-sm">
                {t('notifications.specialOffers')}
              </label>
              <div className="relative inline-block w-10 align-middle select-none">
                <input
                  type="checkbox"
                  name="special-offers"
                  id="special-offers"
                  className="sr-only"
                  checked={preferences.specialOffers}
                  disabled={isLoading}
                  onChange={(e) => handleTogglePreference('specialOffers', e.target.checked)}
                />
                <label
                  htmlFor="special-offers"
                  className={`block h-5 overflow-hidden rounded-full cursor-pointer transition-colors ${preferences.specialOffers ? 'bg-primary' : 'bg-gray-300'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`block h-5 w-5 rounded-full transform transition-transform bg-white border shadow ${preferences.specialOffers ? 'translate-x-5' : ''}`}></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
