import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import usePointAnimation from '../hooks/usePointAnimation';
import { getAvailableRewards } from '../firebase/services';

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const { PointAnimationComponent } = usePointAnimation();

  // Track points for animation
  const [animatedPoints, setAnimatedPoints] = useState<number>(0);
  const prevPointsRef = useRef<number | null>(null);
  const [minPointsNeeded, setMinPointsNeeded] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  // Fetch the available rewards to determine minimum points needed
  useEffect(() => {
    const fetchMinPointsNeeded = async () => {
      try {
        const rewards = await getAvailableRewards();
        if (rewards.length > 0) {
          // Find the cheapest reward available
          const minPoints = Math.min(...rewards.map(reward => reward.pointsCost));
          setMinPointsNeeded(minPoints);
        }
      } catch (error) {
        console.error('Error fetching rewards:', error);
      }
    };

    fetchMinPointsNeeded();
  }, []);

  // Handle point animation when points change
  useEffect(() => {
    if (!userProfile) return;

    // Initialize on first load
    if (prevPointsRef.current === null) {
      prevPointsRef.current = userProfile.points;
      setAnimatedPoints(userProfile.points);
      return;
    }

    // If points changed, animate from previous to new value
    if (prevPointsRef.current !== userProfile.points) {
      setAnimatedPoints(prevPointsRef.current);

      // Animate to new value
      const step = userProfile.points > prevPointsRef.current ? 1 : -1;
      const interval = setInterval(() => {
        setAnimatedPoints(prev => {
          if ((step > 0 && prev >= userProfile.points) ||
              (step < 0 && prev <= userProfile.points)) {
            clearInterval(interval);
            return userProfile.points;
          }
          return prev + step;
        });
      }, 50); // Adjust speed as needed

      prevPointsRef.current = userProfile.points;

      return () => clearInterval(interval);
    }
  }, [userProfile?.points]);

  if (!currentUser || !userProfile) {
    return null;
  }

  // Determine appropriate progress bar message
  const hasEnoughPoints = minPointsNeeded !== null && userProfile.points >= minPointsNeeded;
  const pointsNeededForReward = minPointsNeeded !== null ? Math.max(0, minPointsNeeded - userProfile.points) : 0;

  // Calculate progress percentage toward minimum reward
  const progressPercent = minPointsNeeded !== null && minPointsNeeded > 0
    ? Math.min(100, (userProfile.points / minPointsNeeded) * 100)
    : 0;

  // Check if current language is Japanese
  const isJapanese = i18n.language === 'ja' || i18n.language.startsWith('ja-');

  return (
    <Layout title={t('app.name')}>
      {PointAnimationComponent}
      <div className="flex flex-col items-center p-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-medium text-gray-700">
            {t('home.welcomeMessage')}, {userProfile.displayName}
          </h2>
        </div>

        <div className="w-full bg-white rounded-xl shadow-md p-6 mb-6">
          <p className="text-gray-600 text-sm mb-2">{t('home.currentPoints')}</p>
          <div className="flex items-baseline">
            <span className={`text-4xl font-bold text-primary ${userProfile.points !== animatedPoints ? 'animate-pulse-scale' : ''}`}>
              {animatedPoints}
            </span>
            <span className="ml-2 text-gray-500">{t('common.points')}</span>
          </div>

          <div className="mt-4 mb-6 relative">
            {/* Progress Bar */}
            <div className="bg-gray-100 rounded-full h-4 overflow-hidden relative">
              <div
                className={`${hasEnoughPoints ? 'bg-green-500' : 'bg-primary'} h-4 rounded-full transition-all duration-500 ease-out`}
                style={{ width: hasEnoughPoints ? '100%' : `${progressPercent}%` }}
              ></div>
            </div>

            {/* Redemption Banner - now with direct language check */}
            {hasEnoughPoints && (
              <div
                className="absolute right-0 bottom-0 transform translate-y-full cursor-pointer"
                onClick={() => navigate('/coupons')}
              >
                <div className="redeem-banner bounce-animation">
                  <div className="banner-arrow banner-arrow-top"></div>
                  <span className="text-white text-xs font-bold text-center block px-2 py-1">
                    {isJapanese ? 'クーポン' : 'Coupon'}
                  </span>
                </div>
              </div>
            )}

            {/* Instruction Text - now with direct language check */}
            {!hasEnoughPoints && (
              <p className="text-xs mt-2 text-gray-500">
                {pointsNeededForReward} {isJapanese ? 'ポイントでクーポン獲得可能' : 'more points until coupon'}
              </p>
            )}
          </div>
        </div>

        <div className="w-full grid gap-4 mb-6">
          <button
            onClick={() => navigate('/scan')}
            className="btn-primary py-4 flex items-center justify-center text-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
              <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z" />
            </svg>
            {t('home.scanDeliveryCode')}
          </button>

          <button
            onClick={() => navigate('/in-store')}
            className="btn-primary py-4 flex items-center justify-center text-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {t('home.scanQrInStore')}
          </button>
        </div>

        <div className="w-full bg-white rounded-xl shadow-md p-4 mb-6">
          <h3 className="font-medium text-lg mb-3">{t('home.howItWorks')}</h3>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
            <li>{t('info.earnDelivery')}</li>
            <li>{t('info.earnInStore')}</li>
            <li>{t('info.onePointPerDay')}</li>
          </ul>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => navigate('/coupons')}
              className="flex items-center justify-between w-full p-2 bg-gray-50 rounded"
            >
              <span className="font-medium">{t('home.viewRewards')}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Add these CSS animations to the global style or consider adding them to a global stylesheet
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes minimal-pulse {
    0% {
      opacity: 0.9;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.9;
    }
  }

  .minimal-pulse {
    animation: minimal-pulse 3s ease infinite;
  }

  @keyframes subtle-bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }

  .bounce-animation {
    animation: banner-pop-in 0.7s ease-out, subtle-bounce 2s ease-in-out 0.7s infinite;
  }

  .redeem-banner {
    position: relative;
    background-color: #22c55e;
    border-radius: 4px;
    margin-top: 5px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    transform-origin: top center;
    max-width: 120px;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: box-shadow 0.2s ease;
    padding: 1px 0;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .banner-arrow {
    position: absolute;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
  }

  .banner-arrow-top {
    top: -5px;
    right: 10px;
    left: auto;
    transform: none;
    border-bottom: 6px solid #22c55e;
  }

  @keyframes banner-pop-in {
    0% {
      transform: translateY(-30%);
      opacity: 0;
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .absolute.cursor-pointer:hover .redeem-banner {
    transform: translateY(2px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
  }
`;
document.head.appendChild(styleSheet);

export default HomePage;
