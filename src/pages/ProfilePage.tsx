import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { logoutUser, getUserPointsHistory, deleteUserAccount, updateUserDisplayName, updateUserPassword, getNextPointsExpirationInfo } from '../firebase/services';
import { PointsTransaction } from '../types/index';
import ConfirmationModal from '../components/Admin/ConfirmationModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { formatDate } from '../utils/dateUtils';
import NotificationSettings from '../components/NotificationSettings';
import { getNotificationPermissionState, isPushNotificationSupported, requestNotificationPermission, registerPushSubscription, saveSubscriptionToUserProfile } from '../utils/notificationUtils';
import { APP_VERSION } from '../config/appConfig';

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const { language, changeLanguage } = useLanguage();

  const [pointsHistory, setPointsHistory] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(userProfile?.displayName || '');
  const [editError, setEditError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [nextExpiration, setNextExpiration] = useState<Date | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const hasCheckedPermission = useRef(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  useEffect(() => {
    // Check notification permission state silently (without showing UI)
    const checkNotificationPermission = async () => {
      if (!currentUser || hasCheckedPermission.current) return;

      hasCheckedPermission.current = true;

      if (isPushNotificationSupported()) {
        const permission = await getNotificationPermissionState();
        setNotificationPermission(permission);
      }
    };

    if (userProfile) {
      checkNotificationPermission();
    }
  }, [currentUser, userProfile]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (userProfile) {
      setNewName(userProfile.displayName);
    }

    const fetchData = async () => {
      setIsLoadingHistory(true);
      setError(null);

      try {
        // Fetch points history
        const history = await getUserPointsHistory(currentUser.uid);
        setPointsHistory(history);

        // Fetch next expiration info
        const expirationInfo = await getNextPointsExpirationInfo(currentUser.uid);
        setNextExpiration(expirationInfo ? expirationInfo.expiresAt : null);

        setIsLoadingHistory(false);
      } catch (err: any) {
        console.error('Error fetching profile data:', err);
        setError('Failed to load profile data');
        setIsLoadingHistory(false);
      }
    };

    fetchData();
  }, [currentUser, navigate, userProfile]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setError(t('common.error'));
    }
  };

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteUserAccount();
      navigate('/login');
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(t('common.error'));
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'ja' : 'en';
    changeLanguage(newLanguage);
  };

  const handleEditName = () => {
    setEditError(null);
    setNewName(userProfile?.displayName || '');
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditError(null);
  };

  const handleSaveName = async () => {
    if (!currentUser || !userProfile) return;

    const trimmedName = newName.trim();

    if (!trimmedName) {
      setEditError(t('auth.errors.nameRequired'));
      return;
    }
    // Basic check for potentially harmful characters
    if (/[<>]/g.test(trimmedName)) {
      setEditError(t('auth.errors.invalidNameChars'));
      return;
    }
    if (trimmedName.length > 50) {
      setEditError(t('auth.errors.nameTooLong'));
      return;
    }
    if (trimmedName === userProfile.displayName) {
      setIsEditingName(false);
      return;
    }

    setLoading(true);
    setEditError(null);
    try {
      await updateUserDisplayName(currentUser.uid, trimmedName);
      setUserProfile({ ...userProfile, displayName: trimmedName });
      setIsEditingName(false);
    } catch (err: any) {
      console.error('Error saving display name:', err);
      setEditError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPasswordModal = () => {
    if (currentUser?.providerData?.some(provider => provider.providerId === 'password') || currentUser?.email) {
      setIsPasswordModalOpen(true);
    } else {
      setError(t('profile.passwordChangeNotApplicable'));
    }
  };

  const handleToggleNotifications = async () => {
    if (!isPushNotificationSupported()) return;

    if (notificationPermission === 'granted') {
      setShowNotificationSettings(true);
    } else {
      try {
        const permission = await requestNotificationPermission();
        setNotificationPermission(permission);

        if (permission === 'granted' && currentUser && userProfile) {
          const subscription = await registerPushSubscription();
          if (subscription) {
            await saveSubscriptionToUserProfile(
              currentUser.uid,
              subscription,
              {
                pointsUpdates: true,
                expiringRewards: true,
                specialOffers: true
              }
            );

            // Show detailed settings after enabling
            setShowNotificationSettings(true);
          }
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };

  if (!currentUser || !userProfile) {
    return null;
  }

  const formatTimestamp = (timestamp: any) => {
    if (timestamp && typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return date.toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      });
    } else if (timestamp instanceof Date) {
      return timestamp.toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      });
    }
    return 'Invalid Date';
  };

  const renderPointHistoryItem = (entry: PointsTransaction) => {
    let icon, label, pointsText;

    if (entry.points > 0) {
      icon = '➕';
      pointsText = `+${entry.points}`;
      switch (entry.type) {
        case 'in-store':
          label = t('pointsHistory.inStoreVisit');
          break;
        case 'online-order':
          label = t('pointsHistory.deliveryOrder');
          break;
        case 'admin-adjustment':
          label = t('pointsHistory.adminAdjustment') || 'Admin Adjustment';
          break;
        default:
          label = t('pointsHistory.pointsEarned') || 'Points Earned';
      }
    } else {
      icon = '➖';
      pointsText = `${entry.points}`;
      if (entry.type === 'reward-redemption') {
        label = t('pointsHistory.redemption', { reward: 'Reward' });
      } else if (entry.type === 'admin-adjustment') {
        label = t('pointsHistory.adminAdjustment') || 'Admin Adjustment';
      } else {
        label = t('pointsHistory.pointsUsed') || 'Points Used';
      }
    }

    return (
      <div key={entry.id} className="flex items-center p-3 border-b border-gray-100 last:border-0">
        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full mr-3 text-sm">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex justify-between">
            <div className="font-medium text-sm">{label}</div>
            <div className={`font-medium text-sm ${entry.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {pointsText}
            </div>
          </div>
          <div className="text-xs text-gray-500">{formatTimestamp(entry.createdAt)}</div>
        </div>
      </div>
    );
  };

  return (
    <Layout title={language === 'ja' ? 'プロフィール' : 'Profile'}>
      <div className="p-4 pt-4 pb-0 bg-gray-50 flex flex-col">
        {/* Point Summary Card */}
        <div className="mb-4 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-primary text-white p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-semibold">{userProfile.displayName}</h2>
              <button
                onClick={handleEditName}
                className="text-white/80 hover:text-white transition-colors text-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {t('common.edit')}
              </button>
            </div>
            <p className="text-white/80 text-sm">{userProfile.email}</p>
          </div>

          {isEditingName && (
            <div className="px-6 py-4 bg-gray-50 border-b">
              <div className="flex">
                <input
                  type="text"
                  ref={nameInputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="p-2 border rounded-l-md flex-grow text-sm"
                  disabled={loading}
                  placeholder={t('profile.displayName')}
                />
                <button
                  onClick={handleSaveName}
                  className="px-3 py-2 bg-primary text-white rounded-none text-sm hover:bg-primary-dark disabled:opacity-50"
                  disabled={loading}
                >
                  {t('common.save')}
                </button>
                <button
                  onClick={handleCancelEditName}
                  className="px-3 py-2 border-t border-r border-b rounded-r-md text-sm hover:bg-gray-50 disabled:opacity-50"
                  disabled={loading}
                >
                  {t('common.cancel')}
                </button>
              </div>
              {editError && <p className="text-red-500 text-xs mt-1">{editError}</p>}
            </div>
          )}
        </div>

        {/* Settings Card */}
        <div className="mb-0 bg-white rounded-lg shadow-sm divide-y">
          {/* Account Management */}
          <div className="p-5">
            <h3 className="text-lg font-medium mb-4">{t('profile.settings')}</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/redemption-history')}
                className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {language === 'ja' ? '履歴を見る' : 'View History'}
              </button>

              <button
                onClick={toggleLanguage}
                className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  {t('profile.language')}
                </div>
                <span className="text-gray-500">{language === 'ja' ? '日本語' : 'English'}</span>
              </button>

              <button
                onClick={handleToggleNotifications}
                className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {t('profile.notifications')}
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">
                    {notificationPermission === 'granted'
                      ? t('common.enabled')
                      : notificationPermission === 'denied'
                        ? t('common.blocked')
                        : t('common.disabled')}
                  </span>
                  <div className={`h-3 w-3 rounded-full ${
                    notificationPermission === 'granted'
                      ? 'bg-green-500'
                      : notificationPermission === 'denied'
                        ? 'bg-red-500'
                        : 'bg-gray-300'
                  }`}></div>
                </div>
              </button>

              {notificationPermission === 'denied' && (
                <div className="mt-1 p-3 bg-amber-50 text-amber-800 rounded-md text-xs">
                  <p className="font-medium mb-1">{t('notifications.blockedTitle', 'Notifications are blocked')}</p>
                  <p>{t('notifications.blockedMessage', 'To enable notifications, please update your browser settings:')}</p>
                  <ol className="ml-4 mt-1 list-decimal">
                    <li>{t('notifications.step1', 'Click the lock/info icon in your browser address bar')}</li>
                    <li>{t('notifications.step2', 'Find "Notifications" in the site settings')}</li>
                    <li>{t('notifications.step3', 'Change from "Block" to "Allow"')}</li>
                  </ol>
                </div>
              )}

              {showNotificationSettings && notificationPermission === 'granted' && (
                <div className="mt-2 p-4 bg-gray-50 rounded-md text-sm">
                  <NotificationSettings />
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => setShowNotificationSettings(false)}
                      className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                    >
                      {t('common.close')}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleOpenPasswordModal}
                className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {t('profile.changePassword')}
              </button>

              <button
                onClick={handleLogoutClick}
                className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t('auth.logout')}
              </button>

              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full py-2 px-4 border border-red-300 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('auth.deleteAccount')}
              </button>

              <div className="pt-4 mt-4 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-500">App Version {APP_VERSION}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title={t('profile.confirmDelete')}
        message={t('profile.deleteWarning')}
        confirmButtonText={t('common.delete')}
        cancelButtonText={t('common.cancel')}
        onConfirm={handleDeleteAccount}
        onClose={() => setIsDeleteModalOpen(false)}
        isLoading={isDeleting}
        confirmButtonColor="red"
      />

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        title={t('auth.logout')}
        message={t('profile.logoutConfirmation', 'Are you sure you want to log out?')}
        confirmButtonText={t('auth.logout')}
        cancelButtonText={t('common.cancel')}
        onConfirm={handleLogout}
        onClose={() => setIsLogoutModalOpen(false)}
        confirmButtonColor="blue"
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </Layout>
  );
};

export default ProfilePage;
