import { GOOGLE_PLACES_API_KEY, USE_MOCK_DATA, SERVER_URL } from '../config.js';
import { getMockRestaurants } from './mockPlaces.js';
import type { Restaurant, MergedFilters, CuisineType, DistanceType, BudgetType } from '../types.js';

const CUISINE_TO_KEYWORD: Record<CuisineType, string> = {
  mexican: 'mexican restaurant',
  italian: 'italian restaurant',
  chinese: 'chinese restaurant',
  japanese: 'japanese restaurant',
  indian: 'indian restaurant',
  thai: 'thai restaurant',
  korean: 'korean restaurant',
  american: 'american restaurant',
  mediterranean: 'mediterranean restaurant',
  seafood: 'seafood restaurant',
  barbecue: 'bbq restaurant',
  pizza: 'pizza',
  sushi: 'sushi restaurant',
  vietnamese: 'vietnamese restaurant',
};

const DISTANCE_TO_RADIUS: Record<DistanceType, number> = {
  5: 3000,
  15: 10000,
  30: 25000,
};

const BUDGET_TO_MAX_LEVEL: Record<BudgetType, number> = {
  '$': 1,
  '$$': 2,
  '$$$': 4,
};

const FOOD_TYPES = new Set([
  'restaurant', 'food', 'meal_delivery', 'meal_takeaway',
  'cafe', 'bakery', 'bar',
]);

const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

// Haversine distance in meters between two lat/lng points
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function transformPlace(place: any): Restaurant {
  let photoUrl: string | null = null;
  if (place.photos?.length > 0) {
    photoUrl = `${SERVER_URL}/api/places/photo?ref=${encodeURIComponent(place.photos[0].photo_reference)}&maxWidth=400`;
  }

  return {
    placeId: place.place_id,
    name: place.name || 'Unknown',
    address: place.vicinity || '',
    rating: place.rating || 0,
    userRatingCount: place.user_ratings_total || 0,
    priceLevel: place.price_level ?? 0,
    types: place.types || [],
    photoUrl,
    googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || '')}&query_place_id=${place.place_id}`,
    location: {
      lat: place.geometry?.location?.lat || 0,
      lng: place.geometry?.location?.lng || 0,
    },
    openNow: place.opening_hours?.open_now ?? true,
    distanceMiles: 0, // calculated after dedup
  };
}

function isActualFoodPlace(place: any): boolean {
  const types: string[] = place.types || [];
  return types.some(t => FOOD_TYPES.has(t));
}

async function fetchNearby(
  lat: number,
  lng: number,
  radius: number,
  keyword: string
): Promise<Restaurant[]> {
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(radius),
    type: 'restaurant',
    keyword,
    opennow: 'true',
    key: GOOGLE_PLACES_API_KEY,
  });

  const url = `${BASE_URL}/nearbysearch/json?${params}`;
  const response = await fetch(url);
  const data = await response.json() as any;

  console.log(`  keyword="${keyword}": status=${data.status}, results=${data.results?.length ?? 0}`);

  if (data.status !== 'OK') {
    if (data.status !== 'ZERO_RESULTS') {
      console.error('  API error:', data.status, data.error_message);
    }
    return [];
  }

  return (data.results || [])
    .filter(isActualFoodPlace)
    .map(transformPlace);
}

export async function searchRestaurants(
  lat: number,
  lng: number,
  filters: MergedFilters
): Promise<Restaurant[]> {
  if (USE_MOCK_DATA) {
    const mockData = getMockRestaurants();
    const allowedTypes = filters.cuisines.map(c => CUISINE_TO_KEYWORD[c]);
    return mockData.filter(r =>
      r.types.some(t => allowedTypes.some(a => t.includes(a.split(' ')[0]))) || allowedTypes.length === 0
    );
  }

  const radius = DISTANCE_TO_RADIUS[filters.maxDistance];
  const maxPriceLevel = BUDGET_TO_MAX_LEVEL[filters.budget];
  const seenIds = new Set<string>();
  const allRestaurants: Restaurant[] = [];

  // Build vibe modifier for keyword
  const vibeModifiers: Record<string, string> = {
    fast_casual: 'casual',
    sit_down: 'dine in',
    takeout: 'takeout',
  };
  const vibeKeyword = filters.vibes.map(v => vibeModifiers[v] || '').filter(Boolean).join(' ');

  // Search for each selected cuisine using keyword — max 5 to control API usage
  const cuisinesToSearch = filters.cuisines.slice(0, 5);

  console.log(`Searching ${cuisinesToSearch.length} cuisine(s) within ${radius}m, vibe: "${vibeKeyword}"...`);

  // Run cuisine searches in parallel (up to 5 concurrent)
  const results = await Promise.all(
    cuisinesToSearch.map(cuisine => {
      const keyword = vibeKeyword
        ? `${CUISINE_TO_KEYWORD[cuisine]} ${vibeKeyword}`
        : CUISINE_TO_KEYWORD[cuisine];
      return fetchNearby(lat, lng, radius, keyword)
        .catch(err => {
          console.error(`Failed to fetch ${cuisine}:`, err);
          return [] as Restaurant[];
        });
    })
  );

  for (const restaurants of results) {
    for (const r of restaurants) {
      if (!seenIds.has(r.placeId)) {
        seenIds.add(r.placeId);
        allRestaurants.push(r);
      }
    }
  }

  // Deduplicate chains — same name = keep only the closest location
  const byName = new Map<string, Restaurant & { dist: number }>();
  for (const r of allRestaurants) {
    const dist = distanceMeters(lat, lng, r.location.lat, r.location.lng);
    const nameKey = r.name.toLowerCase().trim();
    const existing = byName.get(nameKey);
    if (!existing || dist < existing.dist) {
      byName.set(nameKey, { ...r, dist });
    }
  }

  const deduplicated = [...byName.values()].map(({ dist, ...r }) => ({
    ...r,
    distanceMiles: Math.round(dist / 1609.34 * 10) / 10,
  }));
  console.log(`Total: ${allRestaurants.length} results -> ${deduplicated.length} after dedup`);

  // Sort: closest first, then by rating as tiebreaker
  deduplicated.sort((a, b) => {
    // Primary: distance (closest first)
    const distDiff = a.distanceMiles - b.distanceMiles;
    if (Math.abs(distDiff) > 0.3) return distDiff; // only break ties within ~0.3 mi

    // Tiebreaker: prefer within budget
    const aInBudget = (a.priceLevel === 0 || a.priceLevel <= maxPriceLevel) ? 1 : 0;
    const bInBudget = (b.priceLevel === 0 || b.priceLevel <= maxPriceLevel) ? 1 : 0;
    if (bInBudget !== aInBudget) return bInBudget - aInBudget;

    // Then by rating
    return b.rating - a.rating;
  });

  return deduplicated.slice(0, 20);
}

export async function getPhotoUrl(photoRef: string, maxWidth: number): Promise<Response | null> {
  if (USE_MOCK_DATA) return null;

  const url = `${BASE_URL}/photo?maxwidth=${maxWidth}&photo_reference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`;
  try {
    return await fetch(url, { redirect: 'follow' });
  } catch {
    return null;
  }
}
