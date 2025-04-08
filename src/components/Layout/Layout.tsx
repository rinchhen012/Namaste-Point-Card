import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import BottomNavigation from './BottomNavigation';

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
      
      <main className={`flex-grow container-app ${title ? 'pt-16' : ''}`}>
        {children}
      </main>
      
      {!hideNavigation && <BottomNavigation />}
    </div>
  );
};

export default Layout; 