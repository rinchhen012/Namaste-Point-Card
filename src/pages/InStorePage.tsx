import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Timestamp } from 'firebase/firestore';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import useGeolocation from '../hooks/useGeolocation';
import { validateQRCode } from '../firebase/services';
import QRScanner from '../components/Scanner/QRScanner';

// Restaurant coordinates are now determined by the QR code scanned
// No need for hardcoded coordinates anymore

const InStorePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, userProfile, setUserProfile } = useAuth();
  const { getPosition, error: geoError } = useGeolocation();

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    // Check if user has already checked in today
    if (userProfile && userProfile.lastQRCheckIn) {
      const lastScan = userProfile.lastQRCheckIn.timestamp as Timestamp;
      const lastScanDate = lastScan.toDate();
      const today = new Date();

      // Check if the last scan was within the last 22 hours
      const hoursSinceLastScan = (today.getTime() - lastScanDate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastScan < 22) {
        setHasCheckedInToday(true);
      }
    }
  }, [userProfile]);

  const handleQRValidation = async (qrCode: string) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current position
      const position = await getPosition();

      // Call the validateQRCode function with QR code and location
      const result = await validateQRCode(
        qrCode,
        position.latitude,
        position.longitude
      );

      if (result.success) {
        setSuccess(true);
        setSuccessMessage(result.message || t('inStore.successfulCheckIn'));

        // Update user profile
        if (userProfile) {
          setUserProfile({
            ...userProfile,
            points: userProfile.points + 1,
            lastQRCheckIn: {
              timestamp: Timestamp.now(),
              qrCode: qrCode
            }
          });
        }
      } else {
        setError(result.message || t('inStore.checkInFailed'));
      }
    } catch (err) {
      console.error('QR validation error:', err);
      setError((err as Error).message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (code: string) => {
    setIsScanning(false);

    // Check if the QR code matches any of our valid restaurant QR codes
    // Valid QR codes should be in the format "NAMASTE-{LOCATION}-MAIN"
    const validQRPattern = /^NAMASTE-[A-Z]+-MAIN$/;

    if (validQRPattern.test(code)) {
      handleQRValidation(code);
    } else {
      setError(t('scan.invalidCode'));
    }
  };

  return (
    <Layout
      title={t('inStore.checkIn')}
      showBackButton
      onBack={() => navigate('/')}
    >
      <div className="flex flex-col items-center p-4">
        {!currentUser ? (
          <div className="w-full bg-white rounded-lg shadow-md p-6 my-8">
            <p className="text-center mb-4">{t('auth.loginRequired')}</p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary w-full"
            >
              {t('auth.login')}
            </button>
          </div>
        ) : hasCheckedInToday ? (
          <div className="w-full bg-white rounded-lg shadow-md p-6 my-8 text-center">
            <div className="text-yellow-500 text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-medium mb-4">{t('inStore.alreadyCheckedIn')}</h3>
            <p className="text-gray-600 mb-6">{t('inStore.comeBackTomorrow')}</p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary"
            >
              {t('common.back')}
            </button>
          </div>
        ) : isScanning ? (
          <div className="w-full">
            <p className="mb-4 text-center">{t('scan.alignQrCode')}</p>
            <QRScanner
              onScan={handleScan}
              onError={(error) => setError(error.message)}
              onPermissionDenied={() => setError(t('errors.cameraDenied'))}
            />
            <button
              onClick={() => setIsScanning(false)}
              className="btn-secondary w-full mt-6"
            >
              {t('common.cancel')}
            </button>
          </div>
        ) : success ? (
          <div className="w-full bg-white rounded-lg shadow-md p-6 my-8 text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h3 className="text-xl font-medium text-green-500 mb-4">{t('inStore.successfulCheckIn')}</h3>
            <p className="text-gray-600 mb-2">{successMessage || t('inStore.earnedPoint')}</p>
            <p className="text-gray-500 mb-6 text-sm">{t('inStore.comeBackTomorrow')}</p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary"
            >
              {t('common.back')}
            </button>
          </div>
        ) : (
          <div className="w-full">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="font-medium text-lg mb-4">{t('inStore.checkIn')}</h3>
              <p className="text-gray-600 mb-6">
                {t('inStore.scanQRInstructions')}
              </p>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
                  {error}
                </div>
              )}

              {geoError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
                  {t('inStore.locationRequired')}
                </div>
              )}

              <button
                onClick={() => setIsScanning(true)}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                    {t('common.loading')}
                  </span>
                ) : (
                  t('scan.scanQrCode')
                )}
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4">
              <h4 className="font-medium mb-2">{t('info.howItWorks')}</h4>
              <div className="text-sm text-gray-600 space-y-2">
                <p>1. {t('inStore.step1')}</p>
                <p>2. {t('inStore.step2')}</p>
                <p>3. {t('inStore.step3')}</p>
                <p className="text-primary mt-4">{t('inStore.limitOnePoint')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InStorePage;
