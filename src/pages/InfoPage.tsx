import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout/Layout';
import { useLanguage } from '../contexts/LanguageContext';
import { getStoreInfoForUser, getFAQsForUser } from '../firebase/services'; // Import fetching functions
import { Timestamp } from 'firebase/firestore'; // Import Timestamp for type checking
import { APP_VERSION } from '../config/appConfig'; // Import app version

// Define interfaces for the fetched data for better type safety
interface StoreInfo {
  name: string;
  address: { en: string; ja: string };
  phone: string;
  email: string;
  hours: { en: string; ja: string };
  website: string;
  googleMapsUrl: string;
  imageUrl?: string; // Image is optional
}

interface FAQItem {
  id: string;
  question: { en: string; ja: string };
  answer: { en: string; ja: string };
  createdAt?: Timestamp; // Optional timestamp
}

const InfoPage: React.FC = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();

  // State for fetched data
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [fetchedStoreInfo, fetchedFaqs] = await Promise.all([
          getStoreInfoForUser(),
          getFAQsForUser()
        ]);
        setStoreInfo(fetchedStoreInfo);
        setFaqItems(fetchedFaqs);
      } catch (err: unknown) {
        console.error("Error fetching info page data:", err);
        let errorMessage = 'Failed to load information. Please try again later.';
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Render loading state
  if (loading) {
    return (
      <Layout title={t('info.info')}>
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  // Render error state
  if (error) {
    return (
      <Layout title={t('info.info')}>
        <div className="p-4 bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-center">
            <p className="font-bold">{t('common.error')}</p>
            <p>{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Render content when data is available
  return (
    <Layout title={t('info.info')}>
      <div className="p-4 bg-gray-50 min-h-screen">
        {/* Restaurant Section - Only render if storeInfo is available */}
        {storeInfo && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-center">{storeInfo.name}</h2>

            <div className="mb-6">
              {/* Display fetched image or a placeholder */}
              <div className="aspect-video md:aspect-[16/9] lg:aspect-[16/8] w-full rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                {storeInfo.imageUrl ? (
                  <img
                    src={storeInfo.imageUrl}
                    alt={storeInfo.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-gray-400 bg-gray-100 w-full h-full flex items-center justify-center rounded-lg">{t('info.restaurantImage')}</div>
                )}
              </div>

              {/* Display fetched store details */}
              <div className="space-y-2">
                <p className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span>{storeInfo.address[language as 'en' | 'ja']}</span>
                </p>

                <p className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span>{storeInfo.phone}</span>
                </p>

                <p className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <a href={`mailto:${storeInfo.email}`} className="text-primary hover:underline break-all">
                    {storeInfo.email}
                  </a>
                </p>

                <p className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>{storeInfo.hours[language as 'en' | 'ja']}</span>
                </p>
                 <p className="flex items-start">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                   <a href={storeInfo.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                     {storeInfo.website}
                   </a>
                 </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <a href={storeInfo.googleMapsUrl}
                className="flex justify-center items-center py-3 px-4 bg-blue-200 text-blue-800 rounded-lg hover:bg-blue-300 transition duration-200"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('info.viewMap')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </a>

              <a href={`tel:${storeInfo.phone}`}
                className="flex justify-center items-center py-3 px-4 bg-green-200 text-green-800 rounded-lg hover:bg-green-300 transition duration-200"
                aria-label={t('info.call')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </a>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{t('info.faq')}</h3>

          {faqItems.length > 0 ? (
             <div className="space-y-4">
              {faqItems.map((item) => (
                <div key={item.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <h4 className="font-medium mb-2">{item.question[language as 'en' | 'ja']}</h4>
                  <p className="text-gray-600">{item.answer[language as 'en' | 'ja']}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">{t('info.noFaqItems')}</p>
          )}
        </div>

        {/* App Version (Consider making this dynamic if needed) */}
        <p className="text-center text-xs text-gray-500 mt-6">
          App Version {APP_VERSION}
        </p>
      </div>
    </Layout>
  );
};

export default InfoPage;
