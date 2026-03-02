import { GOOGLE_PLACES_API_KEY, USE_MOCK_DATA, SERVER_URL } from '../config.js';
import { getMockRestaurants } from './mockPlaces.js';
import type { Restaurant, MergedFilters, CuisineType, DistanceType, BudgetType, DietaryType } from '../types.js';

const DIETARY_TO_KEYWORD: Record<DietaryType, string> = {
  vegetarian: 'vegetarian',
  vegan: 'vegan',
  halal: 'halal',
  gluten_free: 'gluten free',
};

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

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const FOOD_TYPES = new Set([
  'restaurant', 'food', 'meal_delivery', 'meal_takeaway',
  'cafe', 'bakery', 'bar',
]);

const BASE_URL = 'https://places.googleapis.com/v1';

const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.types',
  'places.photos',
  'places.googleMapsUri',
  'places.location',
  'places.currentOpeningHours',
].join(',');

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
    photoUrl = `${SERVER_URL}/api/places/photo?name=${encodeURIComponent(place.photos[0].name)}&maxWidth=400`;
  }

  const priceLevel = typeof place.priceLevel === 'string'
    ? (PRICE_LEVEL_MAP[place.priceLevel] ?? 0)
    : (place.priceLevel ?? 0);

  return {
    placeId: place.id,
    name: place.displayName?.text || 'Unknown',
    address: place.formattedAddress || '',
    rating: place.rating || 0,
    userRatingCount: place.userRatingCount || 0,
    priceLevel,
    types: place.types || [],
    photoUrl,
    googleMapsUri: place.googleMapsUri || '',
    location: {
      lat: place.location?.latitude || 0,
      lng: place.location?.longitude || 0,
    },
    openNow: place.currentOpeningHours?.openNow ?? true,
    distanceMiles: 0, // calculated after dedup
  };
}

async function fetchNearby(
  lat: number,
  lng: number,
  radius: number,
  textQuery: string,
  openOnly: boolean
): Promise<Restaurant[]> {
  // Convert center + radius to a bounding box for strict location restriction
  const degLat = radius / 111_320;
  const degLng = radius / (111_320 * Math.cos(lat * Math.PI / 180));

  const body: any = {
    textQuery,
    locationRestriction: {
      rectangle: {
        low: { latitude: lat - degLat, longitude: lng - degLng },
        high: { latitude: lat + degLat, longitude: lng + degLng },
      },
    },
    includedType: 'restaurant',
  };
  if (openOnly) {
    body.openNow = true;
  }

  const url = `${BASE_URL}/places:searchText`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json() as any;

  const results = data.places || [];
  console.log(`  query="${textQuery}"${openOnly ? ' (open now)' : ''}: results=${results.length}`);

  if (!response.ok) {
    console.error('  API error:', data.error?.message || response.statusText);
    return [];
  }

  return results
    .filter((p: any) => (p.types || []).some((t: string) => FOOD_TYPES.has(t)))
    .map(transformPlace);
}

export interface SearchResult {
  restaurants: Restaurant[];
  limitedResults: boolean;
}

export async function searchRestaurants(
  lat: number,
  lng: number,
  filters: MergedFilters
): Promise<SearchResult> {
  if (USE_MOCK_DATA) {
    const mockData = getMockRestaurants();
    const allowedTypes = filters.cuisines.map(c => CUISINE_TO_KEYWORD[c]);
    const filtered = mockData.filter(r =>
      r.types.some(t => allowedTypes.some(a => t.includes(a.split(' ')[0]))) || allowedTypes.length === 0
    );
    return { restaurants: filtered, limitedResults: false };
  }

  const radius = DISTANCE_TO_RADIUS[filters.maxDistance];
  const maxPriceLevel = BUDGET_TO_MAX_LEVEL[filters.budget];
  const seenIds = new Set<string>();
  const allRestaurants: Restaurant[] = [];

  // Search for each selected cuisine using keyword — max 5 to control API usage
  // Vibe is used for sorting, NOT as a search keyword (it kills results)
  const cuisinesToSearch = filters.cuisines.slice(0, 5);

  // Build dietary suffix (e.g., "vegetarian vegan")
  const dietarySuffix = (filters.dietary || [])
    .map(d => DIETARY_TO_KEYWORD[d])
    .join(' ');

  console.log(`Searching ${cuisinesToSearch.length} cuisine(s) within ${radius}m, vibes: ${filters.vibes.join(', ')}${dietarySuffix ? `, dietary: ${dietarySuffix}` : ''}...`);

  // First pass: search for open restaurants only
  const openResults = await Promise.all(
    cuisinesToSearch.map(cuisine => {
      const textQuery = dietarySuffix
        ? `${CUISINE_TO_KEYWORD[cuisine]} ${dietarySuffix}`
        : CUISINE_TO_KEYWORD[cuisine];
      return fetchNearby(lat, lng, radius, textQuery, true)
        .catch(err => {
          console.error(`Failed to fetch ${cuisine}:`, err);
          return [] as Restaurant[];
        });
    })
  );

  for (const restaurants of openResults) {
    for (const r of restaurants) {
      if (!seenIds.has(r.placeId)) {
        seenIds.add(r.placeId);
        allRestaurants.push(r);
      }
    }
  }

  // Track if results are limited (many places closed)
  const LIMITED_THRESHOLD = 8;
  const limitedResults = allRestaurants.length < LIMITED_THRESHOLD;
  if (limitedResults) {
    console.log(`  Only ${allRestaurants.length} open results — results are limited (many places likely closed)`);
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

  // Vibe matching: score places by how well they match the selected vibes
  const vibeTypes: Record<string, string[]> = {
    fast_casual: ['cafe', 'meal_takeaway', 'meal_delivery'],
    sit_down: ['restaurant'],
    takeout: ['meal_takeaway', 'meal_delivery'],
  };
  const vibeMatchTypes = new Set(filters.vibes.flatMap(v => vibeTypes[v] || []));

  // Sort: budget > vibe > distance > rating (all results are open)
  deduplicated.sort((a, b) => {
    // Prefer within budget
    const aInBudget = (a.priceLevel === 0 || a.priceLevel <= maxPriceLevel) ? 1 : 0;
    const bInBudget = (b.priceLevel === 0 || b.priceLevel <= maxPriceLevel) ? 1 : 0;
    if (bInBudget !== aInBudget) return bInBudget - aInBudget;

    // Prefer vibe match
    const aVibeMatch = a.types.some(t => vibeMatchTypes.has(t)) ? 1 : 0;
    const bVibeMatch = b.types.some(t => vibeMatchTypes.has(t)) ? 1 : 0;
    if (bVibeMatch !== aVibeMatch) return bVibeMatch - aVibeMatch;

    // Distance (closest first)
    const distDiff = a.distanceMiles - b.distanceMiles;
    if (Math.abs(distDiff) > 0.3) return distDiff;

    // Then by rating
    return b.rating - a.rating;
  });

  return { restaurants: deduplicated.slice(0, 20), limitedResults };
}

export interface PlaceDetails {
  formattedAddress: string;
  formattedPhone: string | null;
  website: string | null;
  weekdayHours: string[] | null;
  openNow: boolean | null;
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (USE_MOCK_DATA) {
    return {
      formattedAddress: '123 Mock St, Anytown, USA',
      formattedPhone: '(555) 123-4567',
      website: null,
      weekdayHours: [
        'Monday: 11:00 AM – 10:00 PM',
        'Tuesday: 11:00 AM – 10:00 PM',
        'Wednesday: 11:00 AM – 10:00 PM',
        'Thursday: 11:00 AM – 10:00 PM',
        'Friday: 11:00 AM – 11:00 PM',
        'Saturday: 10:00 AM – 11:00 PM',
        'Sunday: 10:00 AM – 9:00 PM',
      ],
      openNow: true,
    };
  }

  const fieldMask = 'formattedAddress,nationalPhoneNumber,websiteUri,regularOpeningHours';

  try {
    const url = `${BASE_URL}/places/${placeId}`;
    const response = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': fieldMask,
      },
    });
    const data = await response.json() as any;

    if (!response.ok) {
      console.error('Place Details API error:', data.error?.message || response.statusText);
      return null;
    }

    return {
      formattedAddress: data.formattedAddress || '',
      formattedPhone: data.nationalPhoneNumber || null,
      website: data.websiteUri || null,
      weekdayHours: data.regularOpeningHours?.weekdayDescriptions || null,
      openNow: data.regularOpeningHours?.openNow ?? null,
    };
  } catch (err) {
    console.error('Failed to fetch place details:', err);
    return null;
  }
}

export async function getPhotoUrl(photoName: string, maxWidth: number): Promise<Response | null> {
  if (USE_MOCK_DATA) return null;

  const url = `${BASE_URL}/${photoName}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_PLACES_API_KEY}`;
  try {
    return await fetch(url, { redirect: 'follow' });
  } catch {
    return null;
  }
}
