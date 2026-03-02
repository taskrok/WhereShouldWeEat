import type { Restaurant } from '../types';

interface RestaurantDetailsProps {
  restaurant: Restaurant;
}

export function RestaurantDetails({ restaurant }: RestaurantDetailsProps) {
  const priceDollars = restaurant.priceLevel > 0
    ? '$'.repeat(restaurant.priceLevel)
    : '$$';

  const stars = '★'.repeat(Math.round(restaurant.rating)) + '☆'.repeat(5 - Math.round(restaurant.rating));

  return (
    <div className="restaurant-details">
      <div className="restaurant-details__photo">
        {restaurant.photoUrl ? (
          <img src={restaurant.photoUrl} alt={restaurant.name} />
        ) : (
          <div className="restaurant-details__photo-placeholder">
            <span>🍽️</span>
          </div>
        )}
      </div>
      <h2 className="restaurant-details__name">{restaurant.name}</h2>
      <div className="restaurant-details__meta">
        <span className="restaurant-details__stars">{stars}</span>
        <span>{restaurant.rating.toFixed(1)}</span>
        <span>({restaurant.userRatingCount} reviews)</span>
        <span>{priceDollars}</span>
        <span>{restaurant.distanceMiles} mi away</span>
      </div>
      <p className="restaurant-details__address">{restaurant.address}</p>
      <a
        href={restaurant.googleMapsUri}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn--primary restaurant-details__directions"
      >
        Open in Google Maps
      </a>
    </div>
  );
}
