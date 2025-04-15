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
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(userProfile?.displayName || '');
  const [editError, setEditError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [nextExpiration, setNextExpiration] = useState<Date | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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
    <Layout title={t('profile.myProfile')}>
      <div className="p-4 max-w-md mx-auto">
        {/* User Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start mb-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl font-bold text-gray-600 mr-4 flex-shrink-0">
              {userProfile.displayName.charAt(0)}
            </div>
            <div className="flex-grow min-w-0">
              {isEditingName ? (
                <div className="mb-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    maxLength={50}
                  />
                  {editError && <p className="text-red-600 text-xs mt-1">{editError}</p>}
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={handleSaveName}
                      disabled={loading}
                      className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
                    >
                      {loading ? t('common.saving') : t('common.save')}
                    </button>
                    <button
                      onClick={handleCancelEditName}
                      disabled={loading}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <h2 className="text-xl font-medium truncate mr-2">{userProfile.displayName}</h2>
                  <button onClick={handleEditName} className="text-primary hover:text-primary-dark">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                </div>
              )}
              <p className="text-gray-600 break-words">{userProfile.email}</p>
            </div>
          </div>

          <div className="flex items-baseline mb-1">
            <span className="text-2xl font-bold text-primary">{userProfile.points}</span>
            <span className="ml-2 text-sm text-gray-500">{t('common.points')}</span>
          </div>

          {nextExpiration && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
              <p>{t('profile.pointsExpiringSoon', { date: formatDate(nextExpiration, language) })}</p>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-medium">{t('profile.settings')}</h3>
          </div>

          <button
            onClick={toggleLanguage}
            className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 border-b border-gray-100"
          >
            <div>
              <p className="font-medium">{t('profile.language')}</p>
              <p className="text-sm text-gray-600">
                {language === 'ja' ? '日本語' : 'English'}
              </p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>

          {(currentUser?.providerData?.some(provider => provider.providerId === 'password') || currentUser?.email) && (
            <button
              onClick={handleOpenPasswordModal}
              className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 border-b border-gray-100"
            >
              <div className="flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M18 8a6 6 0 11-12 0 6 6 0 0112 0zM7 8a3 3 0 116 0 3 3 0 01-6 0zm0 7a4 4 0 00-4 4v1a1 1 0 001 1h8a1 1 0 001-1v-1a4 4 0 00-4-4z" clipRule="evenodd" />
                 </svg>
                <p className="font-medium">{t('profile.changePassword')}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {/* View History Button */}
          <button
            onClick={() => navigate('/redemption-history')}
            className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50"
          >
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium">{t('rewards.viewHistory')}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Buttons */}
        <div className="space-y-4">
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-lg border border-red-300 text-red-600 font-medium"
          >
            {t('auth.logout')}
          </button>

          {/* Delete Account Button */}
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-full py-3 rounded-lg bg-red-600 text-white font-medium"
          >
            {t('auth.deleteAccount')}
          </button>
        </div>

        {/* App Version */}
        <p className="text-center text-xs text-gray-500 mt-4">
          {t('profile.version')} 1.0.0
        </p>
      </div>

      {/* Delete Account Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
        title={t('auth.deleteAccountConfirmTitle')}
        message={
          <div>
            <p>{t('auth.deleteAccountConfirmMessage')}</p>
            <p className="mt-2 font-bold text-red-600">{t('auth.deleteAccountWarning')}</p>
          </div>
        }
        confirmButtonText={t('common.delete')}
        cancelButtonText={t('common.cancel')}
        confirmButtonColor="red"
        isLoading={isDeleting}
      />
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </Layout>
  );
};

export default ProfilePage;
