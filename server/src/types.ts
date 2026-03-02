export type CuisineType =
  | 'mexican' | 'italian' | 'chinese' | 'japanese' | 'indian'
  | 'thai' | 'korean' | 'american' | 'mediterranean'
  | 'seafood' | 'barbecue' | 'pizza' | 'sushi' | 'vietnamese';

export type VibeType = 'fast_casual' | 'sit_down' | 'takeout';
export type BudgetType = '$' | '$$' | '$$$';
export type DistanceType = 5 | 15 | 30;

export interface UserFilters {
  cuisines: CuisineType[];
  vibe: VibeType;
  budget: BudgetType;
  maxDistance: DistanceType;
}

export interface MergedFilters {
  cuisines: CuisineType[];
  vibes: VibeType[];
  budget: BudgetType;
  maxDistance: DistanceType;
}

export interface Restaurant {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  userRatingCount: number;
  priceLevel: number;
  types: string[];
  photoUrl: string | null;
  googleMapsUri: string;
  location: { lat: number; lng: number };
  openNow: boolean;
  distanceMiles: number;
}

export interface RoomUser {
  socketId: string;
  role: 'creator' | 'joiner';
  location: { lat: number; lng: number };
}

export interface Room {
  code: string;
  users: Record<string, RoomUser>;
  filters: Record<string, UserFilters | null>;
  restaurants: Restaurant[];
  swipes: Record<string, Record<string, boolean>>;
  status: 'waiting' | 'filtering' | 'swiping' | 'matched';
  matchedRestaurant: Restaurant | null;
  doneUsers?: Set<string>;
  bracket?: import('./socket/bracketManager.js').BracketState;
  location: { lat: number; lng: number } | null;
  lastActivity: number;
}
