import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getAvailableRewards, getUserRedemptions } from '../firebase/services';
import { Reward, Redemption } from '../types';
import { formatDate } from '../utils/dateUtils';

// --- START RedemptionTimer Component (Copied from UnauthorizedPage) ---
// Ensure useTranslation is imported above

interface RedemptionTimerProps {
  expiryDate: Date;
  // rewardType: string; // Add back if different formats needed
}

const RedemptionTimer: React.FC<RedemptionTimerProps> = ({ expiryDate }) => {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const diff = expiryDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown(t('rewards.expired'));
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);

  }, [expiryDate, t]);

  return (
    <span className="text-xs font-medium text-primary">
      {countdown}
    </span>
  );
};
// --- END RedemptionTimer Component ---

const RewardsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [activeRedemptions, setActiveRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch available rewards
        const rewardsData = await getAvailableRewards();
        setRewards(rewardsData as Reward[]);

        // Fetch user's active redemptions
        const redemptionsData = await getUserRedemptions(currentUser.uid);
        setActiveRedemptions(redemptionsData as Redemption[]);
      } catch (err) {
        console.error('Error fetching rewards data:', err);
        setError(t('common.error'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate, t]);

  const canRedeemReward = (pointsCost: number) => {
    return userProfile && userProfile.points >= pointsCost;
  };

  const handleRedeemReward = (reward: Reward) => {
    console.log('[RewardsPage] handleRedeemReward initiating for Reward ID:', reward.id);
    navigate(`/redemption/initiate`, { state: { reward } });
  };

  const handleViewRedemption = (redemption: Redemption) => {
    console.log('[RewardsPage] handleViewRedemption received object:', redemption);
    console.log('[RewardsPage] handleViewRedemption navigating with ID:', redemption.id);
    const targetUrl = `/redemption/${redemption.id}`;
    console.log('[RewardsPage] Navigating to URL:', targetUrl);
    navigate(targetUrl, {
      state: { existingRedemption: redemption }
    });
  };

  if (!currentUser || !userProfile) {
    return null;
  }

  return (
    <Layout title={t('rewards.availableRewards')}>
      <div className="p-4 space-y-6">
        {/* Current Points Display Section */}
        <div> {/* Added wrapper div for points card + history button */}
          <div className="bg-white rounded-lg shadow-md p-5 mb-0 w-full">
            <div className="flex justify-between items-center mb-1">
              <p className="text-sm font-medium text-gray-600">{t('home.currentPoints')}</p>
              {/* Removed View History Button from here */}
            </div>
            <div className="flex items-baseline mt-1">
              <span className="text-3xl font-bold text-primary">{userProfile.points}</span>
              <span className="ml-2 text-sm text-gray-500">{t('common.points')}</span>
            </div>
          </div>
          {/* Moved View History Button below the card */}
          <div className="flex justify-end mt-3">
            <button
              className="text-xs text-primary font-medium hover:underline flex items-center"
              onClick={() => navigate('/redemption-history')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('rewards.viewHistory')}
            </button>
          </div>
        </div>

        {/* Active Redemptions */}
        {activeRedemptions.length > 0 && (
          <div className="mb-0">
            <h2 className="text-xl font-semibold mb-4">{t('rewards.activeRedemptions')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRedemptions.map((redemption) => {
                // Convert Firestore Timestamp to Date object if necessary
                const expiryDate = typeof redemption.expiresAt.toDate === 'function'
                                   ? redemption.expiresAt.toDate()
                                   : redemption.expiresAt;

                console.log('[RewardsPage] Rendering active redemption card for ID:', redemption.id);
                return (
                  <div
                    key={redemption.id}
                    onClick={() => handleViewRedemption(redemption)}
                    className="bg-white rounded-lg shadow-md p-5 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-semibold text-base mb-1">{redemption.rewardName}</h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{redemption.rewardDescription}</p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
                        {t('rewards.active')}
                      </div>
                      {/* Use the RedemptionTimer component here */}
                      {expiryDate instanceof Date ? (
                        <RedemptionTimer expiryDate={expiryDate} />
                      ) : (
                        <span className="text-xs text-red-500">Invalid Date</span> // Fallback
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Rewards */}
        <div>
          <h2 className="text-xl font-semibold mb-4">{t('rewards.availableRewards')}</h2>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-md">
              {error}
              <button
                onClick={() => window.location.reload()}
                className="block mt-2 text-sm underline"
              >
                {t('common.retry')}
              </button>
            </div>
          ) : rewards.length === 0 ? (
            <div className="bg-gray-50 p-6 rounded-md text-center">
              <p className="text-gray-600">{t('rewards.noRewards')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rewards.map((reward) => (
                <div key={reward.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
                  {/* Image Section */}
                  {reward.imageUrl && (
                    <div className="w-full h-40 bg-gray-200 flex-shrink-0">
                      <img
                        src={reward.imageUrl}
                        alt={reward.name[userProfile.language]}
                        className="w-full h-40 object-contain"
                      />
                    </div>
                  )}

                  {/* Content Section */}
                  <div className="p-5 flex-grow flex flex-col">
                    <div className="flex-grow">
                      <h3 className="font-semibold text-lg mb-2">{reward.name[userProfile.language]}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                        {reward.description[userProfile.language]}
                      </p>
                    </div>
                    {/* Action Section (moved inside content section for better flex behavior) */}
                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center mt-auto">
                      <p className="text-xl font-bold text-primary mr-3">
                        {reward.pointsCost} <span className="text-sm font-medium text-gray-600">pts</span>
                      </p>
                      <button
                        onClick={() => handleRedeemReward(reward)}
                        disabled={!canRedeemReward(reward.pointsCost)}
                        className={`px-5 py-2 rounded-md text-sm font-medium transition duration-150 ${
                          canRedeemReward(reward.pointsCost)
                            ? 'bg-primary text-white hover:bg-primary-dark shadow-sm'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {t('rewards.redeem')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default RewardsPage;
