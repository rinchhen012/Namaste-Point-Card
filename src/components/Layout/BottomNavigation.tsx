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
    return location.pathname === path ||
           (path === '/coupons' && location.pathname === '/rewards');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20 pb-safe">
      {/* Spacer for the floating scan button */}
      <div className="h-1"></div>

      {/* The floating scan button */}
      <div className="absolute left-1/2 transform -translate-x-1/2 -top-2 flex flex-col items-center">
        <Link
          to="/scan"
          className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-primary to-primary-dark shadow-xl"
          aria-label={t('scan.scan')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </Link>
        <span className="text-xs font-medium text-primary mt-1.5">{t('nav.scan')}</span>
      </div>

      {/* Navigation bar items */}
      <div className="flex justify-around items-center py-2">
        {/* Home */}
        <NavItem
          to="/"
          isActive={isActive('/')}
          label={t('nav.home')}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        />

        {/* Coupons */}
        <NavItem
          to="/coupons"
          isActive={isActive('/coupons')}
          label={t('nav.coupons')}
          badge={availableCoupons > 0 ? availableCoupons : undefined}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          }
        />

        {/* Spacer for scan button */}
        <div className="w-14"></div>

        {/* Info */}
        <NavItem
          to="/info"
          isActive={isActive('/info')}
          label={t('nav.info')}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        {/* Profile */}
        <NavItem
          to="/profile"
          isActive={isActive('/profile')}
          label={t('nav.profile')}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
      </div>
    </nav>
  );
};

interface NavItemProps {
  to: string;
  isActive: boolean;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const NavItem: React.FC<NavItemProps> = ({ to, isActive, label, icon, badge }) => {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center w-16 mx-2"
    >
      <div className="relative flex items-center justify-center">
        <div className={`flex items-center justify-center h-10 transition-all duration-200 ${
          isActive
            ? 'text-primary'
            : 'text-gray-400 hover:text-gray-600'
        }`}>
          {icon}
        </div>
        {badge !== undefined && (
          <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      <span className={`text-xs font-medium transition-colors duration-200 ${
        isActive ? 'text-primary' : 'text-gray-500'
      }`}>
        {label}
      </span>
      {isActive && <div className="mt-1.5 w-6 h-1 bg-primary rounded-full" />}
    </Link>
  );
};

export default BottomNavigation;
