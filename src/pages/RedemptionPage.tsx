import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Timestamp } from 'firebase/firestore';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { redeemReward, markRedemptionAsUsed, getRedemption, getReward } from '../firebase/services';
import { Reward, Redemption, RedemptionResult } from '../types';
import { formatDate, formatDateTime, isDateExpired } from '../utils/dateUtils';

const RedemptionPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { currentUser, userProfile, setUserProfile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redemption, setRedemption] = useState<RedemptionResult | Redemption | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [confirming, setConfirming] = useState(false);

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
        console.log('Fetched redemption data on mount/nav back:', redemptionData);
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
        console.log('[RedemptionPage] Initiating new redemption based on state:', reward);
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
      console.log('[RedemptionPage] Attempting to fetch existing redemption for ID:', id);
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
      setRedemption(result);

      // Update user profile points
      setUserProfile({
        ...userProfile,
        points: userProfile.points - reward.pointsCost
      });

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

    console.log('Redemption object:', redemption);

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
      console.log('Marking redemption as used with ID:', redemptionId);
      await markRedemptionAsUsed(redemptionId);
      navigate('/rewards');
    } catch (err) {
      console.error('Error marking redemption as used:', err);
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || !userProfile) {
    return null;
  }

  // Step 1: Confirmation screen for redeeming
  if (reward && !redemption && !confirming) {
    return (
      <Layout
        title={t('rewards.redeemReward')}
        showBackButton
        onBack={() => navigate('/rewards')}
      >
        <div className="p-4">
          <div className="bg-white rounded-lg shadow-md p-6 my-4">
            <h2 className="text-xl font-medium mb-4">
              {reward.name[userProfile.language]}
            </h2>
            <p className="text-gray-600 mb-6">
              {reward.description[userProfile.language]}
            </p>

            <div className="border-t border-gray-100 pt-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('common.points')}:</span>
                <span className="font-medium text-primary">{reward.pointsCost}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-600">{t('home.currentPoints')}:</span>
                <span className="font-medium">{userProfile.points}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-600">{t('rewards.remainingPoints')}:</span>
                <span className="font-medium">{userProfile.points - reward.pointsCost}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/rewards')}
                className="btn-secondary w-1/2"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => setConfirming(true)}
                className="btn-primary w-1/2"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Step 2: Final confirmation before redeeming
  if (reward && !redemption && confirming) {
    return (
      <Layout
        title={t('rewards.redeemReward')}
        showBackButton
        onBack={() => setConfirming(false)}
      >
        <div className="p-4">
          <div className="bg-white rounded-lg shadow-md p-6 my-4 text-center">
            <p className="mb-6">
              {t('rewards.confirmRedeem', {
                reward: reward.name[userProfile.language],
                points: reward.pointsCost
              })}
            </p>

            <div className="text-red-600 text-sm mb-6 bg-red-50 p-3 rounded-md">
              {t('rewards.redemptionWarning')}
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setConfirming(false)}
                disabled={loading}
                className="btn-secondary w-1/2"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmRedeem}
                disabled={loading}
                className="btn-primary w-1/2"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                    {t('common.loading')}
                  </span>
                ) : (
                  t('rewards.redeem')
                )}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Step 3: Redemption result screen - simplified for all reward types
  if (redemption) {
    return (
      <Layout
        title={t('rewards.redemption')}
        showBackButton
        onBack={() => navigate('/rewards')}
      >
        <div className="p-4">
          <div className="bg-white rounded-lg shadow-md p-6 my-4">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">
                {'rewardName' in redemption ? redemption.rewardName : reward?.name[userProfile.language]}
              </h2>
              <p className="text-gray-600 mb-6">
                {'rewardDescription' in redemption ? redemption.rewardDescription : reward?.description[userProfile.language]}
              </p>

              <div className="p-4 bg-gray-50 rounded-lg mb-4">
                {/* Countdown timer */}
                <div className="text-2xl font-bold text-primary my-3">
                  {countdown}
                </div>

                <p className="text-sm text-gray-600">
                  {t('rewards.showToStaffInstructions')}
                </p>
              </div>

              <button
                onClick={handleMarkAsUsed}
                disabled={loading}
                className="btn-primary w-full mt-4"
              >
                {loading ? t('common.loading') : t('rewards.markAsUsed')}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Fallback - shouldn't reach here normally
  return (
    <Layout title={t('rewards.redemption')} showBackButton onBack={() => navigate('/rewards')}>
      <div className="p-4 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
      </div>
    </Layout>
  );
};

export default RedemptionPage;
