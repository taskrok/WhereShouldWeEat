export async function geocodeZip(zip: string): Promise<{ lat: number; lng: number } | { error: string }> {
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

    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return { error: 'Failed to look up zip code. Please try again.' };
  }
}
