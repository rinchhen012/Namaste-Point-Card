import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import BottomNavigation from './BottomNavigation';
import { useAuth } from '../../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  hideNavigation?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  hideNavigation = false,
  showBackButton = false,
  onBack
}) => {
  const { t } = useTranslation();
  const { authError } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {title && (
        <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-10">
          <div className="px-4 py-4 flex items-center">
            {showBackButton && (
              <button
                onClick={onBack}
                className="mr-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-medium text-center flex-1">{title}</h1>
            {showBackButton && <div className="w-6" />}
          </div>
        </header>
      )}

      {authError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 fixed top-16 left-0 right-0 z-50 shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{authError}</p>
            </div>
          </div>
        </div>
      )}

      <main className={`flex-grow ${title ? 'pt-16' : ''} ${!hideNavigation ? 'pb-24' : ''} ${authError ? 'pt-32' : ''}`}>
        {children}
      </main>

      {!hideNavigation && <BottomNavigation />}
    </div>
  );
};

export default Layout;
