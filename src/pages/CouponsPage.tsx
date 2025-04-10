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

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const couponsData = await getAvailableRewards();
        setCoupons(couponsData as Coupon[]);
        const redemptionsData = await getUserRedemptions(currentUser.uid);
        setActiveRedemptions(redemptionsData as Redemption[]);

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

    fetchData();
  }, [currentUser, navigate, t]);

  const canRedeemCoupon = (pointsCost: number) => {
    return userProfile && userProfile.points >= pointsCost;
  };

  const handleRedeemCoupon = (coupon: Coupon) => {
    navigate(`/redemption/initiate`, { state: { reward: coupon } });
  };

  const handleViewRedemption = (redemption: Redemption) => {
    navigate(`/redemption/${redemption.id}`, { state: { existingRedemption: redemption } });
  };

  if (!currentUser || !userProfile) {
    return null;
  }

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

        {/* Active Redemptions */}
        {loading ? null : activeRedemptions.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">{t('rewards.activeRedemptions')}</h2>
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
                      <h3 className="font-semibold text-gray-800 truncate">{redemption.rewardName}</h3>
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
          </section>
        )}

        {/* Available Coupons */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">{t('rewards.availableRewards')}</h2>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg shadow">
              {error}
              <button onClick={() => window.location.reload()} className="block mt-2 text-sm font-medium underline">
                {t('common.retry')}
              </button>
            </div>
          ) : coupons.length === 0 ? (
            <div className="bg-gray-50 p-6 rounded-lg text-center shadow-inner">
              <p className="text-gray-600 italic">{t('rewards.noRewards')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {coupons.map((coupon, index) => (
                <div
                  key={coupon.id}
                  className={`bg-white rounded-lg shadow p-4 w-full box-border overflow-hidden flex flex-col justify-between h-full ${
                    animatedCoupons ? 'animate-slide-up-fade' : 'opacity-0'
                  }`}
                  style={{
                    animationDelay: animatedCoupons ? `${index * 0.1}s` : '0s'
                  }}
                >
                  <div className="mb-3 min-w-0 flex-grow">
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
          )}
        </section>
      </div>
    </Layout>
  );
};

export default CouponsPage;
