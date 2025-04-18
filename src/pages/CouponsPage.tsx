import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getAvailableRewards, getUserRedemptions } from '../firebase/services';
import { Coupon, Redemption } from '../types';
import usePointAnimation from '../hooks/usePointAnimation';

// --- START RedemptionTimer Component ---
interface RedemptionTimerProps {
  expiryDate: Date;
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
    <span className="text-xs font-medium text-primary whitespace-nowrap">
      {countdown}
    </span>
  );
};
// --- END RedemptionTimer Component ---

const CouponsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const { PointAnimationComponent } = usePointAnimation();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [activeRedemptions, setActiveRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animatedCoupons, setAnimatedCoupons] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'active' | 'available'>('active');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const couponsData = await getAvailableRewards();
        setCoupons(couponsData as Coupon[]);
        const redemptionsData = await getUserRedemptions(currentUser?.uid || '');
        setActiveRedemptions(redemptionsData as Redemption[]);

        // If there are no active redemptions, switch to available tab automatically
        if (redemptionsData.length === 0) {
          setActiveTab('available');
        }

        // Set a delay before showing animations to ensure DOM is ready
        setTimeout(() => {
          setAnimatedCoupons(true);
        }, 100);
      } catch (err) {
        console.error('Error fetching coupons data:', err);
        setError(t('common.error'));
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchData();
    }
  }, [currentUser, t]);

  const canRedeemCoupon = (pointsCost: number) => {
    return userProfile && userProfile.points >= pointsCost;
  };

  const handleRedeemCoupon = (coupon: Coupon) => {
    navigate(`/redemption/initiate`, { state: { reward: coupon } });
  };

  const handleViewRedemption = (redemption: Redemption) => {
    navigate(`/redemption/${redemption.id}`, { state: { existingRedemption: redemption } });
  };

  if (!userProfile) {
    return null;
  }

  const renderActiveRedemptions = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
        </div>
      );
    }

    if (activeRedemptions.length === 0) {
      return (
        <div className="bg-gray-50 p-6 rounded-lg text-center shadow-inner">
          <p className="text-gray-600 italic">{t('rewards.noRedemptions')}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeRedemptions.map((redemption, index) => {
          const expiryDate = typeof redemption.expiresAt.toDate === 'function' ? redemption.expiresAt.toDate() : redemption.expiresAt;
          return (
            <div
              key={redemption.id}
              onClick={() => handleViewRedemption(redemption)}
              className={`bg-white rounded-lg shadow p-4 cursor-pointer flex flex-col justify-between transition hover:shadow-md h-full ${
                animatedCoupons ? 'animate-slide-up-fade' : 'opacity-0'
              }`}
              style={{
                animationDelay: animatedCoupons ? `${index * 0.1}s` : '0s'
              }}
            >
              <div className="flex-grow mb-2 overflow-hidden">
                <h3 className="font-semibold text-gray-800 truncate">
                  {userProfile.language === 'ja' && 'rewardNameJa' in redemption
                    ? redemption.rewardNameJa
                    : redemption.rewardName}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 break-words mt-1">{redemption.rewardDescription}</p>
              </div>
              <div className="flex items-center justify-between flex-shrink-0 space-x-3 mt-auto">
                <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
                  {t('rewards.active')}
                </div>
                {expiryDate instanceof Date ? (
                  <RedemptionTimer expiryDate={expiryDate} />
                ) : (
                  <span className="text-xs text-red-500">{t('common.invalidDate')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAvailableCoupons = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg shadow">
          {error}
          <button onClick={() => window.location.reload()} className="block mt-2 text-sm font-medium underline">
            {t('common.retry')}
          </button>
        </div>
      );
    }

    if (coupons.length === 0) {
      return (
        <div className="bg-gray-50 p-6 rounded-lg text-center shadow-inner">
          <p className="text-gray-600 italic">{t('rewards.noRewards')}</p>
        </div>
      );
    }

    // Sort coupons: redeemable ones first, then by points cost (lowest to highest)
    const sortedCoupons = [...coupons].sort((a, b) => {
      // First check if user can redeem a but not b
      const canRedeemA = canRedeemCoupon(a.pointsCost);
      const canRedeemB = canRedeemCoupon(b.pointsCost);

      if (canRedeemA && !canRedeemB) return -1;
      if (!canRedeemA && canRedeemB) return 1;

      // If both are redeemable or both are not, sort by pointsCost
      return a.pointsCost - b.pointsCost;
    });

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sortedCoupons.map((coupon, index) => (
          <div
            key={coupon.id}
            className={`bg-white rounded-lg shadow p-4 w-full box-border overflow-hidden flex flex-col justify-between h-full ${
              animatedCoupons ? 'animate-slide-up-fade' : 'opacity-0'
            } ${canRedeemCoupon(coupon.pointsCost) ? 'border-l-4 border-green-500' : ''}`}
            style={{
              animationDelay: animatedCoupons ? `${index * 0.1}s` : '0s'
            }}
          >
            <div className="mb-3 min-w-0 flex-grow">
              {/* Coupon Type Badge (single language) */}
              <div className="mb-1">
                <span className={`px-2 py-1 text-xs rounded font-semibold ${coupon.couponType === 'in_store' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                  {(() => {
                    const lang = userProfile?.language || 'en';
                    if (coupon.couponType === 'in_store') {
                      return lang === 'ja' ? '店内' : 'In-store';
                    } else {
                      return lang === 'ja' ? 'デリバリー' : 'Delivery';
                    }
                  })()}
                </span>
              </div>
              <h3 className="font-semibold text-lg text-gray-800 mb-1 break-words line-clamp-2 overflow-hidden">
                {typeof coupon.name === 'string'
                  ? coupon.name
                  : (userProfile?.language && coupon.name?.[userProfile.language])
                    ? coupon.name[userProfile.language]
                    : ''}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-3 break-words overflow-hidden">
                {typeof coupon.description === 'string'
                  ? coupon.description
                  : (userProfile?.language && coupon.description?.[userProfile.language])
                    ? coupon.description[userProfile.language]
                    : ''}
              </p>
            </div>

            <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-100 gap-4 flex-shrink-0">
              <p className="text-lg font-bold text-primary overflow-hidden text-ellipsis whitespace-nowrap flex-shrink mr-2">
                {coupon.pointsCost} <span className="text-xs font-medium text-gray-600">{t('common.pts')}</span>
              </p>
              <button
                onClick={() => handleRedeemCoupon(coupon)}
                disabled={!canRedeemCoupon(coupon.pointsCost)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition duration-150 flex-shrink-0 ${
                  canRedeemCoupon(coupon.pointsCost)
                    ? 'bg-primary text-white hover:bg-primary-dark shadow-sm'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {t('rewards.redeem')}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Layout title={t('rewards.coupons')}>
      {PointAnimationComponent}
      <div className="w-full max-w-3xl mx-auto px-4 py-6 space-y-8 overflow-hidden">
        {/* Current Points Display Section */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl shadow-lg p-5">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-medium opacity-90">{t('home.currentPoints')}</p>
            <button
              className="text-xs font-medium hover:underline opacity-90 flex items-center"
              onClick={() => navigate('/redemption-history')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('rewards.viewHistory')}
            </button>
          </div>
          <div className="flex items-baseline mt-1">
            <span className="text-4xl font-bold">{userProfile.points}</span>
            <span className="ml-2 text-base font-medium opacity-90">{t('common.points')}</span>
          </div>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-3 px-4 font-medium text-sm flex items-center transition-colors duration-200 relative ${
                activeTab === 'active'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('rewards.active')}
              {activeRedemptions.length > 0 && (
                <span className="ml-1.5 bg-primary text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {activeRedemptions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`py-3 px-4 font-medium text-sm flex items-center transition-colors duration-200 ${
                activeTab === 'available'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {t('rewards.availableRewards')}
              {coupons.length > 0 && (
                <span className="ml-1.5 bg-gray-200 text-gray-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {coupons.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'active' ? (
              <section>
                {renderActiveRedemptions()}
              </section>
            ) : (
              <section>
                {renderAvailableCoupons()}
              </section>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CouponsPage;
