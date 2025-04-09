import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import QrScanner from 'qr-scanner';

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (error: Error) => void;
  onPermissionDenied?: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onError,
  onPermissionDenied
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [qrScanner, setQrScanner] = useState<QrScanner | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        onScan(result.data);
        // Optionally pause scanner after successful scan
        // scanner.pause();
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
      }
    );

    setQrScanner(scanner);

    scanner.start()
      .then(() => {
        setHasCamera(true);
      })
      .catch((error) => {
        console.error('Scanner error:', error);

        if (error.name === 'NotAllowedError') {
          setHasCamera(false);
          if (onPermissionDenied) {
            onPermissionDenied();
          }
        } else if (onError) {
          onError(error);
        }
      });

    // Cleanup function
    return () => {
      scanner.destroy();
    };
  }, [onScan, onError, onPermissionDenied]);

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {hasCamera ? (
        <div className="relative w-full max-w-sm">
          <video
            ref={videoRef}
            className="w-full h-full rounded-lg shadow-inner border-2 border-gray-300"
          />
          <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-white rounded opacity-70"></div>
          </div>
          <p className="text-center mt-4 text-sm text-gray-600">
            {t('scan.alignQrCode')}
          </p>
        </div>
      ) : (
        <div className="p-4 bg-white rounded-lg shadow-md">
          <p className="text-center text-red-500 mb-4">
            {t('scan.cameraPermission')}
          </p>
          <button
            className="btn-primary w-full"
            onClick={() => {
              if (qrScanner) {
                qrScanner.start()
                  .then(() => setHasCamera(true))
                  .catch((err) => console.error(err));
              }
            }}
          >
            {t('scan.requestPermission')}
          </button>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
