import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  location: { lat: number; lng: number } | null;
  error: string | null;
  loading: boolean;
  denied: boolean;
  setLocationFromZip: (zip: string) => Promise<void>;
  zipLoading: boolean;
  zipError: string | null;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

export function useGeolocation(): GeolocationState {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setDenied(true);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      () => {
        setDenied(true);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const setLocationFromZip = useCallback(async (zip: string) => {
    setZipLoading(true);
    setZipError(null);
    try {
      const res = await fetch(`${SERVER_URL}/api/geocode?zip=${encodeURIComponent(zip)}`);
      const data = await res.json();
      if (data.error) {
        setZipError(data.error);
      } else {
        setLocation({ lat: data.lat, lng: data.lng });
        setError(null);
        setDenied(false);
      }
    } catch {
      setZipError('Failed to look up zip code. Try again.');
    } finally {
      setZipLoading(false);
    }
  }, []);

  return { location, error, loading, denied, setLocationFromZip, zipLoading, zipError };
}
