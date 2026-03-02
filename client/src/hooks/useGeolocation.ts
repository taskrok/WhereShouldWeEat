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

const STATE_ABBR: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
};

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
      const stateAbbr = STATE_ABBR[state] || state;
      if (name && stateAbbr) {
        setLocationLabel(`${name}, ${stateAbbr}`);
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
        // Try to resolve a city name for the zip
        reverseGeocode(data.lat, data.lng);
      }
    } catch {
      setZipError('Failed to look up zip code. Try again.');
    } finally {
      setZipLoading(false);
    }
  }, []);

  return { location, locationLabel, error, loading, denied, setLocationFromZip, zipLoading, zipError };
}
