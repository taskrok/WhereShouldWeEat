import { GOOGLE_PLACES_API_KEY } from '../config.js';

export async function geocodeZip(zip: string): Promise<{ lat: number; lng: number } | { error: string }> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&key=${GOOGLE_PLACES_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json() as any;

    if (data.status !== 'OK' || !data.results?.length) {
      return { error: 'Could not find that zip code. Please try another.' };
    }

    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  } catch {
    return { error: 'Failed to look up zip code. Please try again.' };
  }
}
