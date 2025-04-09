import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './en/translation.json';
import jaTranslation from './ja/translation.json';

// the translations
const resources = {
  en: {
    translation: enTranslation
  },
  ja: {
    translation: jaTranslation
  }
};

i18n
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  .init({
    resources,
    lng: 'ja', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // not needed for react as it escapes by default
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;
