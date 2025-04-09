import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout/Layout';
import QRScanner from '../components/Scanner/QRScanner';
import { useAuth } from '../contexts/AuthContext';
import { validateOnlineOrderCode } from '../firebase/services';
import { ScanResult } from '../types';

const ScanPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, userProfile, setUserProfile } = useAuth();

  const [isScanning, setIsScanning] = useState(true);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleScan = async (code: string) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setIsScanning(false);
    setIsProcessing(true);
    setError(null);

    try {
      const result = await validateOnlineOrderCode(code, currentUser.uid);

      setScanResult(result as ScanResult);

      // Update user profile if points were added
      if (result.success && userProfile && result.pointsAdded) {
        setUserProfile({
          ...userProfile,
          points: userProfile.points + result.pointsAdded
        });
      }
    } catch (err) {
      setError((err as Error).message || t('common.error'));
      console.error('Scan error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
    }
  };

  const resetScan = () => {
    setIsScanning(true);
    setScanResult(null);
    setError(null);
    setManualCode('');
    setIsManualEntry(false);
  };

  return (
    <Layout
      title={t('scan.scanQrCode')}
      showBackButton
      onBack={() => navigate('/')}
    >
      <div className="flex flex-col items-center p-4">
        {isScanning ? (
          <>
            <div className="mb-6 w-full">
              <QRScanner
                onScan={handleScan}
                onError={(error) => setError(error.message)}
                onPermissionDenied={() => setError(t('errors.cameraDenied'))}
              />
            </div>

            <div className="w-full mb-6">
              <div className="border-t border-gray-200 my-6"></div>

              {isManualEntry ? (
                <form onSubmit={handleManualSubmit} className="w-full">
                  <div className="mb-4">
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('scan.enterCodeHere')}
                    </label>
                    <input
                      type="text"
                      id="code"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="NAMASTE-XXXXX"
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsManualEntry(false)}
                      className="btn-secondary w-1/2"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={!manualCode.trim()}
                      className="btn-primary w-1/2 disabled:opacity-50"
                    >
                      {t('scan.submit')}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsManualEntry(true)}
                  className="w-full btn-secondary"
                >
                  {t('scan.manualEntry')}
                </button>
              )}
            </div>

            {/* Help Instructions Section */}
            <div className="w-full bg-gray-100 rounded-lg p-4">
              <h2 className="font-semibold mb-2">{t('code.help.title')}</h2>
              <p className="text-sm text-gray-700 mb-2">
                {t('code.help.description')}
              </p>
              <ul className="list-disc list-inside text-sm text-gray-700">
                <li>{t('code.help.item1')}</li>
                <li>{t('code.help.item2')}</li>
                <li>{t('code.help.item3')}</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="w-full bg-white rounded-lg shadow-md p-6 my-8">
            {isProcessing ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                <p className="mt-4">{t('common.loading')}</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-500 text-5xl mb-4">✗</div>
                <h3 className="text-xl font-medium text-red-500 mb-4">{t('common.error')}</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <button onClick={resetScan} className="btn-primary">
                  {t('scan.scanAgain')}
                </button>
              </div>
            ) : scanResult && scanResult.success ? (
              <div className="text-center py-8">
                <div className="text-green-500 text-5xl mb-4">✓</div>
                <h3 className="text-xl font-medium text-green-500 mb-4">{t('scan.success')}</h3>
                <p className="text-gray-600 mb-2">{scanResult.message}</p>
                <p className="text-lg font-medium text-primary mb-6">
                  {t('scan.pointAdded')}
                </p>
                <div className="flex space-x-4">
                  <button onClick={resetScan} className="btn-primary">
                    {t('scan.scanAgain')}
                  </button>
                  <button onClick={() => navigate('/')} className="btn-secondary">
                    {t('common.back')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <h3 className="text-xl font-medium text-red-500 mb-4">{t('scan.invalidCode')}</h3>
                <button onClick={resetScan} className="btn-primary">
                  {t('scan.scanAgain')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ScanPage;
