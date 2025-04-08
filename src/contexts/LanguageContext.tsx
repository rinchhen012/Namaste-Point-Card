import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import i18n from '../locales/i18n';
import { useAuth } from './AuthContext';
import { setUserLanguage } from '../firebase/services';

interface LanguageContextType {
  language: 'en' | 'ja';
  changeLanguage: (lang: 'en' | 'ja') => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ja',
  changeLanguage: async () => {},
});

export const useLanguage = () => useContext(LanguageContext);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const { currentUser, userProfile } = useAuth();
  const [language, setLanguage] = useState<'en' | 'ja'>('ja');

  useEffect(() => {
    // Set language from user profile if available
    if (userProfile && userProfile.language) {
      setLanguage(userProfile.language);
      i18n.changeLanguage(userProfile.language);
    }
  }, [userProfile]);

  const changeLanguage = async (lang: 'en' | 'ja') => {
    try {
      await i18n.changeLanguage(lang);
      setLanguage(lang);
      
      // Update user profile in Firestore if logged in
      if (currentUser) {
        await setUserLanguage(currentUser.uid, lang);
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const value = {
    language,
    changeLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}; 