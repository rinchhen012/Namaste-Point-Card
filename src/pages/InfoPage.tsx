import React from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout/Layout';
import { useLanguage } from '../contexts/LanguageContext';

const InfoPage: React.FC = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  
  const restaurantInfo = {
    name: 'Namaste Indian Nepalese Restaurant & Bar',
    address: {
      en: '〒175-0094, Tokyo-to, Itabashi-ku, Narimasu 2-5-3, Green Biru 102',
      ja: '〒175-0094, 東京都, 板橋区, 成増２丁目5-3, グリーンビル 102'
    },
    phone: '03-6684-8269',
    email: 'support@namastenarimasu.com',
    hours: {
      en: 'Monday - Sunday: 10:30 AM - 10:30 PM',
      ja: '月曜 - 日曜: 10:30 - 22:30'
    },
    website: 'https://www.namastenarimasu.com',
    googleMapsUrl: 'https://goo.gl/maps/exampleMapLink'
  };

  const faqItems = [
    {
      question: {
        en: 'How does the point system work?',
        ja: 'ポイントシステムはどのように機能しますか？'
      },
      answer: {
        en: 'You earn 1 point for each in-store visit and 1 point for each delivery order. Points can be redeemed for various rewards in the app.',
        ja: '店舗でのご来店1回につき1ポイント、デリバリーご注文1回につき1ポイントが貯まります。ポイントはアプリ内で様々な特典と交換できます。'
      }
    },
    {
      question: {
        en: 'How long are my points valid?',
        ja: 'ポイントの有効期限はどのくらいですか？'
      },
      answer: {
        en: 'Points are valid for 1 year from the date they are earned.',
        ja: 'ポイントは獲得日から1年間有効です。'
      }
    },
    {
      question: {
        en: 'Can I transfer my points to someone else?',
        ja: '他の人にポイントを譲渡できますか？'
      },
      answer: {
        en: 'Points cannot be transferred between accounts at this time.',
        ja: '現在、アカウント間でのポイント譲渡はできません。'
      }
    },
    {
      question: {
        en: 'What if I forget to scan the QR code during my visit?',
        ja: '来店時にQRコードのスキャンを忘れた場合はどうなりますか？'
      },
      answer: {
        en: 'Please speak with our staff who can provide you with a special code to enter in the app.',
        ja: 'スタッフにお申し出ください。アプリで入力できる特別なコードをご提供します。'
      }
    }
  ];

  return (
    <Layout title={t('info.title')}>
      <div className="p-4 bg-gray-50 min-h-screen">
        {/* Restaurant Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-center">{restaurantInfo.name}</h2>
          
          <div className="mb-6">
            <div className="h-48 bg-gray-200 rounded-lg mb-4">
              {/* This would be a restaurant image */}
              <div className="h-full flex items-center justify-center text-gray-400">
                {t('info.restaurantImage')}
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{restaurantInfo.address[language as 'en' | 'ja']}</span>
              </p>
              
              <p className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span>{restaurantInfo.phone}</span>
              </p>
              
              <p className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <a href={`mailto:${restaurantInfo.email}`} className="text-primary hover:underline">
                  {restaurantInfo.email}
                </a>
              </p>
              
              <p className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>{restaurantInfo.hours[language as 'en' | 'ja']}</span>
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <a href={restaurantInfo.googleMapsUrl} 
              className="flex justify-center items-center py-3 px-4 bg-blue-200 text-blue-800 rounded-lg hover:bg-blue-300 transition duration-200" 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label={t('info.viewMap')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </a>
            
            <a href={`tel:${restaurantInfo.phone}`} 
              className="flex justify-center items-center py-3 px-4 bg-green-200 text-green-800 rounded-lg hover:bg-green-300 transition duration-200"
              aria-label={t('info.call')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            </a>
          </div>
        </div>
        
        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="font-medium mb-4">{t('info.faq')}</h3>
          
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <h4 className="font-medium mb-2">{item.question[language as 'en' | 'ja']}</h4>
                <p className="text-gray-600">{item.answer[language as 'en' | 'ja']}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* App Version */}
        <p className="text-center text-xs text-gray-500 mt-6">
          {t('info.appVersion')} 1.0.0
        </p>
      </div>
    </Layout>
  );
};

export default InfoPage; 