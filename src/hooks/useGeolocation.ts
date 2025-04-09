import { useState, useEffect } from 'react';

interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface UseGeolocationReturn {
  position: GeolocationPosition | null;
  error: string | null;
  loading: boolean;
  getPosition: () => Promise<GeolocationPosition>;
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
}

const useGeolocation = (): UseGeolocationReturn => {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSuccess = (position: GeolocationPosition) => {
    setPosition({
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy
    });
    setLoading(false);
    setError(null);
  };

  const handleError = (error: GeolocationPositionError) => {
    setLoading(false);
    setError(error.message);
  };

  const getPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      setLoading(true);

      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser');
        setLoading(false);
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          handleSuccess(coords);
          resolve(coords);
        },
        (error) => {
          handleError(error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  };

  // Calculate distance between two points in meters using the haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  return { position, error, loading, getPosition, calculateDistance };
};

export default useGeolocation;
