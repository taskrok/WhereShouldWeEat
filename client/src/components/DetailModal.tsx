import { useEffect, useState } from 'react';
import type { Restaurant } from '../types';

interface PlaceDetails {
  formattedAddress: string;
  formattedPhone: string | null;
  website: string | null;
  weekdayHours: string[] | null;
  openNow: boolean | null;
}

interface DetailModalProps {
  restaurant: Restaurant;
  onClose: () => void;
}

export function DetailModal({ restaurant, onClose }: DetailModalProps) {
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/places/details?placeId=${encodeURIComponent(restaurant.placeId)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setDetails(data))
      .catch(() => setDetails(null))
      .finally(() => setLoading(false));
  }, [restaurant.placeId]);

  const priceDollars = restaurant.priceLevel > 0
    ? '$'.repeat(restaurant.priceLevel)
    : '$$';

  const stars = '★'.repeat(Math.round(restaurant.rating)) + '☆'.repeat(5 - Math.round(restaurant.rating));

  return (
    <div className="detail-modal__backdrop" onClick={onClose}>
      <div className="detail-modal__content" onClick={(e) => e.stopPropagation()}>
        <button className="detail-modal__close" onClick={onClose}>
          &times;
        </button>

        <div className="detail-modal__photo">
          {restaurant.photoUrl ? (
            <img src={restaurant.photoUrl} alt={restaurant.name} />
          ) : (
            <div className="detail-modal__photo-placeholder">
              <span>🍽️</span>
            </div>
          )}
        </div>

        <div className="detail-modal__body">
          <h2 className="detail-modal__name">{restaurant.name}</h2>

          <div className="detail-modal__meta">
            <span className="detail-modal__stars">{stars}</span>
            <span className="detail-modal__rating">{restaurant.rating.toFixed(1)}</span>
            <span>({restaurant.userRatingCount})</span>
            <span className="detail-modal__price">{priceDollars}</span>
            <span className="detail-modal__distance">{restaurant.distanceMiles} mi</span>
          </div>

          {loading ? (
            <div className="detail-modal__loading">
              <div className="spinner" />
            </div>
          ) : (
            <>
              <p className="detail-modal__address">
                {details?.formattedAddress || restaurant.address}
              </p>

              {details?.formattedPhone && (
                <a href={`tel:${details.formattedPhone}`} className="detail-modal__phone">
                  {details.formattedPhone}
                </a>
              )}

              {details?.weekdayHours && (
                <div className="detail-modal__hours">
                  <h3 className="detail-modal__section-title">Hours</h3>
                  <ul>
                    {details.weekdayHours.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}

              {details?.website && (
                <a
                  href={details.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-modal__website"
                >
                  Visit Website
                </a>
              )}
            </>
          )}

          <a
            href={restaurant.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--primary detail-modal__directions"
          >
            Open in Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}
