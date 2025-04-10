import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import usePointAnimation from '../hooks/usePointAnimation';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const { PointAnimationComponent } = usePointAnimation();

  // Track points for animation
  const [animatedPoints, setAnimatedPoints] = useState<number>(0);
  const prevPointsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

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

          <div className="mt-4 bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="bg-primary h-4 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, (userProfile.points % 10) * 10)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {10 - (userProfile.points % 10)} {t('common.points')} {t('rewards.insufficientPoints', { more: 10 - (userProfile.points % 10) })}
          </p>
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

export default HomePage;
