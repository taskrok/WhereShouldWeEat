import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  location: { lat: number; lng: number } | null;
  locationLabel: string | null;
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
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  // Reverse geocode GPS coordinates to a city name
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
        { headers: { 'User-Agent': 'WhereShouldWeEat/1.0' } }
      );
      const data = await res.json() as any;
      const addr = data.address || {};
      const name = addr.city || addr.town || addr.suburb || addr.village || addr.county || '';
      const state = addr.state || '';
      if (name && state) {
        setLocationLabel(`${name}, ${state}`);
      } else if (name) {
        setLocationLabel(name);
      }
    } catch {
      // Silent fail — label is nice-to-have, not critical
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setDenied(true);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });
        setLoading(false);
        reverseGeocode(lat, lng);
      },
      () => {
        setDenied(true);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, [reverseGeocode]);

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
        setLocationLabel(zip);
        setError(null);
        setDenied(false);
      }
    } catch {
      setZipError('Failed to look up zip code. Try again.');
    } finally {
      setZipLoading(false);
    }
  }, []);

  return { location, locationLabel, error, loading, denied, setLocationFromZip, zipLoading, zipError };
}
