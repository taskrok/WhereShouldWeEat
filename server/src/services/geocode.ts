import { reverseGeocodeLabel } from './reverseGeocode.js';

export async function geocodeZip(zip: string): Promise<{ lat: number; lng: number; label?: string } | { error: string }> {
  // Use the free Nominatim geocoder (OpenStreetMap) — no API key needed
  const url = `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'WhereShouldWeEat/1.0' },
    });
    const data = await res.json() as any[];

    if (!data.length) {
      return { error: 'Could not find that zip code. Please try another.' };
    }

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    const label = await reverseGeocodeLabel(lat, lng);
    return { lat, lng, label: label || zip };
  } catch {
    return { error: 'Failed to look up zip code. Please try again.' };
  }
}
