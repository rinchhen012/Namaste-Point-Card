import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { logoutUser, getUserPointsHistory, deleteUserAccount } from '../firebase/services';
import { PointsTransaction } from '../types/index';
import ConfirmationModal from '../components/Admin/ConfirmationModal';

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const { language, changeLanguage } = useLanguage();

  const [pointsHistory, setPointsHistory] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchPointsHistory = async () => {
      setLoading(true);
      try {
        const history = await getUserPointsHistory(currentUser.uid);
        setPointsHistory(history);
      } catch (err) {
        console.error('Error fetching points history:', err);
        setError(t('common.error'));
      } finally {
        setLoading(false);
      }
    };

    fetchPointsHistory();
  }, [currentUser, navigate, t]);

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
      // After successful deletion, redirect to login page
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
      <div className="p-4">
        {/* User Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl font-bold text-gray-600">
              {userProfile.displayName.charAt(0)}
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-medium">{userProfile.displayName}</h2>
              <p className="text-gray-600">{userProfile.email}</p>
            </div>
          </div>

          <div className="flex items-baseline mb-2">
            <span className="text-2xl font-bold text-primary">{userProfile.points}</span>
            <span className="ml-2 text-sm text-gray-500">{t('common.points')}</span>
          </div>
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
    </Layout>
  );
};

export default ProfilePage;
