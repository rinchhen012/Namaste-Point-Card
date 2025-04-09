import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getAvailableRewards } from '../../firebase/services';
import { Coupon } from '../../types';

const BottomNavigation: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [availableCoupons, setAvailableCoupons] = useState<number>(0);

  useEffect(() => {
    const fetchAvailableCoupons = async () => {
      if (!currentUser) return;

      try {
        const coupons = await getAvailableRewards();
        setAvailableCoupons(coupons.length);
      } catch (error) {
        console.error('Error fetching available coupons:', error);
      }
    };

    fetchAvailableCoupons();
  }, [currentUser]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-20 z-10 pb-1 pt-1">
      <Link
        to="/"
        className={`flex flex-col items-center justify-center w-full h-full ${isActive('/') ? 'text-primary' : 'text-gray-500'}`}
        aria-label={t('home.home')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="text-xs mt-1">{t('nav.home')}</span>
      </Link>

      <Link
        to="/coupons"
        className={`flex flex-col items-center justify-center w-full h-full relative ${
          isActive('/coupons') || isActive('/rewards') ? 'text-primary' : 'text-gray-500'
        }`}
        aria-label={t('rewards.availableRewards')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>

        {availableCoupons > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {availableCoupons}
          </span>
        )}
        <span className="text-xs mt-1">{t('nav.coupons')}</span>
      </Link>

      <Link
        to="/scan"
        className="flex flex-col items-center justify-center w-full h-full"
        aria-label={t('scan.scan')}
      >
        <div className="bg-primary text-white rounded-full p-3 -mt-8 shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </div>
        <span className="text-xs mt-7">{t('nav.scan')}</span>
      </Link>

      <Link
        to="/info"
        className={`flex flex-col items-center justify-center w-full h-full ${isActive('/info') ? 'text-primary' : 'text-gray-500'}`}
        aria-label={t('info.info')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs mt-1">{t('nav.info')}</span>
      </Link>

      <Link
        to="/profile"
        className={`flex flex-col items-center justify-center w-full h-full ${isActive('/profile') ? 'text-primary' : 'text-gray-500'}`}
        aria-label={t('profile.profile')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="text-xs mt-1">{t('nav.profile')}</span>
      </Link>
    </nav>
  );
};

export default BottomNavigation;
