import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Timestamp } from 'firebase/firestore';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { redeemReward, markRedemptionAsUsed, getRedemption, getReward } from '../firebase/services';
import { Reward, Redemption, RedemptionResult } from '../types';
import { formatDate, formatDateTime, isDateExpired } from '../utils/dateUtils';
import useRewardAnimation from '../hooks/useRewardAnimation';
import usePointAnimation from '../hooks/usePointAnimation';

const RedemptionPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const { showRewardAnimation, RewardAnimationComponent } = useRewardAnimation();
  const { animatePoints, PointAnimationComponent } = usePointAnimation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redemption, setRedemption] = useState<RedemptionResult | Redemption | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [confirming, setConfirming] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Get reward or existing redemption from location state
  const reward = location.state?.reward as Reward;
  const existingRedemption = location.state?.existingRedemption as Redemption;

  // Function to fetch redemption details using the ID from the URL
  const fetchRedemptionDetails = async () => {
    if (!currentUser || !id) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch the redemption directly using its ID
      const redemptionData = await getRedemption(id);

      if (redemptionData) {
        setRedemption(redemptionData);
      } else {
        // If no active redemption found for this ID, show error
        console.error('No active redemption found for ID:', id);
        setError(t('rewards.errorNoActiveRedemption')); // Consider adding this translation key
        // Optionally navigate away or show reward selection
        // navigate('/rewards');
      }
    } catch (err) {
      console.error('Error fetching redemption details:', err);
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (!id) {
      // If no ID in URL (should not happen with current routes), navigate away
      console.error('[RedemptionPage] No ID found in URL params.');
      navigate('/rewards');
      return;
    }

    // Check if we are viewing an existing redemption or initiating a new one
    if (id === 'initiate') {
      // Initiating a new redemption - rely on location.state.reward
      if (reward) {
        setConfirming(true); // Go directly to confirmation step
        setLoading(false);
      } else {
        // Missing reward state - cannot initiate
        console.error('[RedemptionPage] Cannot initiate redemption: Missing reward object in location state.');
        setError(t('common.error'));
        setLoading(false);
        // Optionally navigate back
        // navigate('/rewards');
      }
    } else {
      // Viewing an existing redemption - fetch its details using the ID from URL
      fetchRedemptionDetails();
    }

    // Cleanup function if needed (currently handled by loading states)
    // return () => { /* cleanup logic */ };

  }, [currentUser, id, navigate, reward, t]); // Added reward and t to dependency array

  // Set up countdown timer for redemptions
  useEffect(() => {
    if (!redemption) {
      setCountdown(''); // Clear countdown if redemption is null
      return;
    }

    // Determine expiryDate from redemption object
    const expiryDate = 'expiresAt' in redemption && typeof redemption.expiresAt.toDate === 'function'
      ? redemption.expiresAt.toDate()
      : 'expiresAt' in redemption && redemption.expiresAt instanceof Date
        ? redemption.expiresAt
        : null;

    if (!expiryDate) {
      setCountdown(''); // Clear countdown if no valid expiry date
      return;
    }

    // Function to update the countdown state
    const updateCountdown = () => {
      const now = new Date();
      const diff = expiryDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown(t('rewards.expired'));
        // Interval will be cleared by the cleanup function
        return;
      }

      // Determine format based on redemption type
      // For simplicity, always show mm:ss for active redemptions
      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);

      // // Previous logic based on type (kept for reference if needed)
      // const isInStore =
      //   ('rewardType' in redemption &&
      //    (redemption.rewardType === 'in_store_item' || redemption.rewardType === 'in_store_discount')) ||
      //   (reward && (reward.type === 'in_store_item' || reward.type === 'in_store_discount'));

      // // Calculate and set countdown string
      // if (isInStore) {
      //   // ... minutes/seconds logic ...
      // } else {
      //   // ... days logic ...
      // }
    };

    // Update once immediately to avoid initial empty state
    updateCountdown();

    // Set interval to update every second
    const interval = setInterval(updateCountdown, 1000);

    // Cleanup function to clear interval when component unmounts or redemption changes
    return () => {
      clearInterval(interval);
    };
  }, [redemption, t]); // Dependencies: Removed 'reward'

  const handleConfirmRedeem = async () => {
    if (!currentUser || !userProfile || !reward || !id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await redeemReward(currentUser.uid, reward.id, reward.type);

      // After redemption, fetch the complete redemption data
      if (result.redemptionId) {
        const fullRedemptionData = await getRedemption(result.redemptionId);
        if (fullRedemptionData) {
          setRedemption(fullRedemptionData);
        } else {
          // Fallback to result if full data not available
          setRedemption(result);
        }
      } else {
        setRedemption(result);
      }

      // Update user profile points
      const pointsChange = -reward.pointsCost;
      setUserProfile({
        ...userProfile,
        points: userProfile.points + pointsChange
      });

      // Show animation for points reduction
      animatePoints(pointsChange);

      // Show success animation
      showRewardAnimation(t('rewards.redeemSuccess'));
      setShowSuccessAnimation(true);

      setConfirming(false);
    } catch (err: any) {
      console.error('Redemption error:', err);
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsUsed = async () => {
    if (!currentUser) {
      console.error('No current user found');
      return;
    }

    if (!redemption) {
      console.error('No redemption found');
      return;
    }

    // Check if we have the redemption ID
    let redemptionId: string;

    if ('id' in redemption) {
      // Regular Redemption type
      redemptionId = redemption.id;
    } else if ('redemptionId' in redemption) {
      // RedemptionResult type
      redemptionId = redemption.redemptionId;
    } else {
      console.error('Could not find redemption ID in the redemption object', redemption);
      setError(t('common.errorProcessingRedemption'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await markRedemptionAsUsed(redemptionId);

      // Show animation before navigating away
      showRewardAnimation(t('rewards.usedSuccess'));

      // Wait for animation to complete before navigating
      setTimeout(() => {
        navigate('/rewards');
      }, 1500);
    } catch (err) {
      console.error('Error marking redemption as used:', err);
      setError(t('common.error'));
      setLoading(false);
    }
  };

  if (!currentUser || !userProfile) {
    return null;
  }

  // Step 1: Confirmation screen for redeeming
  if (reward && !redemption && confirming) {
    return (
      <Layout
        title={t('rewards.redeemReward')}
        showBackButton
        onBack={() => navigate('/coupons')}
      >
        {PointAnimationComponent}
        {RewardAnimationComponent}
        <div className="w-full max-w-3xl mx-auto px-4 py-6 space-y-8 overflow-hidden">
          <div className="bg-white rounded-lg shadow-md p-6 max-w-sm mx-auto overflow-hidden">
            <h2 className="text-xl font-medium mb-4 text-center">
              {t('rewards.confirmRedeem', { reward: reward.name[userProfile.language], points: reward.pointsCost })}
            </h2>
            {reward.imageUrl && (
              <div className="mb-4 rounded-lg overflow-hidden max-h-36">
                <img
                  src={reward.imageUrl}
                  alt={reward.name[userProfile.language]}
                  className="w-full h-36 object-contain"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            <p className="text-gray-600 text-center mb-6">
              {reward.description[userProfile.language]}
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <p className="text-sm text-yellow-700">{t('rewards.redemptionWarning')}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleConfirmRedeem}
                disabled={loading}
                className={`w-full py-3 rounded-lg text-white font-semibold transition duration-150 flex items-center justify-center ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'}`}
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                {loading ? "processing" : t('rewards.redeem')}
              </button>
              <button
                onClick={() => navigate('/coupons')}
                disabled={loading}
                className="w-full py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition duration-150"
              >
                {t('common.cancel')}
              </button>
            </div>
            {error && <p className="text-red-600 text-center mt-4">{error}</p>}
          </div>
        </div>
      </Layout>
    );
  }

  // Step 2: Active Redemption display
  if (redemption) {
    const expiryDate = 'expiresAt' in redemption && typeof redemption.expiresAt.toDate === 'function'
      ? redemption.expiresAt.toDate()
      : 'expiresAt' in redemption && redemption.expiresAt instanceof Date
        ? redemption.expiresAt
        : null;

    const isExpired = expiryDate ? expiryDate.getTime() <= Date.now() : true;
    const isUsed = 'used' in redemption && redemption.used;

    return (
      <Layout
        title={t('rewards.redemption')}
        showBackButton
        onBack={() => navigate('/coupons')}
      >
        {PointAnimationComponent}
        {RewardAnimationComponent}
        <div className="w-full max-w-sm mx-auto px-4 py-6 overflow-hidden">
          <div className={`bg-white rounded-lg shadow-md p-6 max-w-xs mx-auto overflow-hidden w-full ${showSuccessAnimation ? 'animate-slide-up-fade' : ''}`}>
            <h2 className="text-xl font-semibold mb-2 text-gray-800 break-words overflow-hidden">
              {userProfile.language === 'ja' && 'rewardNameJa' in redemption ? redemption.rewardNameJa : redemption.rewardName}
            </h2>
            {'imageUrl' in redemption && redemption.imageUrl && (
              <div className="mb-4 rounded-lg overflow-hidden max-h-36">
                <img
                  src={redemption.imageUrl}
                  alt={userProfile.language === 'ja' && 'rewardNameJa' in redemption ? redemption.rewardNameJa : redemption.rewardName}
                  className="w-full h-36 object-contain"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            <p className="text-sm text-gray-600 mb-4 break-words overflow-hidden">
              {redemption.rewardDescription}
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 text-center">
              <p className="text-sm text-blue-700 font-medium mb-2">
                {t('rewards.showToStaffInstructions')}
              </p>
              {expiryDate && !isExpired && !isUsed ? (
                <div className="flex justify-center items-baseline">
                  <span className="text-2xl font-bold text-primary mr-1">{countdown}</span>
                  <span className="text-xs text-gray-600">{t('rewards.validUntilTime')}</span>
                </div>
              ) : isUsed ? (
                <p className="text-lg font-bold text-gray-500">{t('rewards.alreadyUsed')}</p>
              ) : (
                <p className="text-lg font-bold text-red-600">{t('rewards.expired')}</p>
              )}
            </div>

            <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 mb-6 text-sm min-w-0">
              <span className="text-gray-600 whitespace-nowrap">{t('rewards.redeemed')}:</span>
              <span className="font-medium text-gray-800 text-right overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                {
                  'createdAt' in redemption && redemption.createdAt instanceof Date
                    ? formatDateTime(redemption.createdAt, userProfile.language)
                    : 'createdAt' in redemption && typeof redemption.createdAt?.toDate === 'function'
                      ? formatDateTime(redemption.createdAt.toDate(), userProfile.language)
                      : '-'
                }
              </span>

              <span className="text-gray-600 whitespace-nowrap">{t('rewards.expires')}:</span>
              <span className="font-medium text-gray-800 text-right overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                {expiryDate ? formatDateTime(expiryDate, userProfile.language) : '-'}
              </span>

              <span className="text-gray-600 whitespace-nowrap">{t('common.points')}:</span>
              <span className="font-medium text-gray-800 text-right overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                {redemption.pointsCost || 0}
              </span>
            </div>

            {!isUsed && !isExpired && (
              <button
                onClick={handleMarkAsUsed}
                disabled={loading}
                className={`w-full py-3 rounded-lg text-white font-semibold transition duration-150 flex items-center justify-center ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'}`}
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                {loading ? "processing" : t('rewards.markAsUsed')}
              </button>
            )}

            {error && <p className="text-red-600 text-center mt-4">{error}</p>}
          </div>
        </div>
      </Layout>
    );
  }

  // Fallback - shouldn't reach here normally
  return (
    <Layout title={t('rewards.redemption')} showBackButton onBack={() => navigate('/coupons')}>
      <div className="p-4 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
      </div>
    </Layout>
  );
};

export default RedemptionPage;
