import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getUserRedemptionHistory } from '../firebase/services';
import { Redemption } from '../types';
import { formatDate, isDateExpired } from '../utils/dateUtils';

const RedemptionHistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const loadRedemptionHistory = async () => {
      try {
        setLoading(true);
        const history = await getUserRedemptionHistory(currentUser.uid);
        setRedemptions(history);
      } catch (err) {
        console.error('Error loading redemption history:', err);
        setError(t('common.error'));
      } finally {
        setLoading(false);
      }
    };

    loadRedemptionHistory();
  }, [currentUser, navigate, t]);

  // Function to render the status badge based on expiry and usage
  const renderStatusBadge = (redemption: Redemption) => {
    const expired = isDateExpired(redemption.expiresAt);

    if (redemption.used) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
          {t('rewards.used')}
        </span>
      );
    } else if (expired) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          {t('rewards.expired')}
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          {t('rewards.active')}
        </span>
      );
    }
  };

  const handleViewRedemption = (redemption: Redemption) => {
    // Only allow viewing active redemptions
    const expired = isDateExpired(redemption.expiresAt);
    if (!redemption.used && !expired) {
      navigate(`/redemption/${redemption.id}`, {
        state: { existingRedemption: redemption }
      });
    }
  };

  return (
    <Layout
      title={t('rewards.redemptionHistory')}
      showBackButton
      onBack={() => navigate(-1)}
    >
      <div className="p-4">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : redemptions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 my-4 text-center">
            <p className="text-gray-600">{t('rewards.noRedemptionHistory')}</p>
            <button
              onClick={() => navigate('/rewards')}
              className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
            >
              {t('rewards.browseRewards')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              {t('rewards.yourRedemptionHistory')}
            </h2>

            {redemptions.map(redemption => {
              console.log(`Rendering history item, Redemption ID: ${redemption.id}, Reward Name: ${redemption.rewardName}`);
              return (
                <div
                  key={redemption.id}
                  className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
                    redemption.used
                      ? 'border-gray-300'
                      : isDateExpired(redemption.expiresAt)
                        ? 'border-red-300'
                        : 'border-green-400 cursor-pointer'
                  }`}
                  onClick={() => !redemption.used && !isDateExpired(redemption.expiresAt) && handleViewRedemption(redemption)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-md font-medium">
                      {redemption.rewardName}
                    </h3>
                    {renderStatusBadge(redemption)}
                  </div>

                  <div className="flex justify-between text-xs text-gray-500">
                    <div>
                      {t('rewards.redeemed')}: {formatDate(redemption.createdAt)}
                    </div>
                    <div>
                      {t('rewards.expires')}: {formatDate(redemption.expiresAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RedemptionHistoryPage;
