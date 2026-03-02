import { useRef, useState } from 'react';
import type { Restaurant } from '../types';

interface SwipeCardProps {
  restaurant: Restaurant;
  onSwipe: (direction: 'left' | 'right') => void;
  active: boolean;
}

const SWIPE_THRESHOLD = 80;

export function SwipeCard({ restaurant, onSwipe, active }: SwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null);

  const priceDollars = restaurant.priceLevel > 0
    ? '$'.repeat(restaurant.priceLevel)
    : '$$';

  const stars = '★'.repeat(Math.round(restaurant.rating)) + '☆'.repeat(5 - Math.round(restaurant.rating));

  const handleStart = (clientX: number) => {
    if (!active) return;
    setStartX(clientX);
    setDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!dragging) return;
    setOffset(clientX - startX);
  };

  const handleEnd = () => {
    if (!dragging) return;
    setDragging(false);

    if (Math.abs(offset) > SWIPE_THRESHOLD) {
      const direction = offset > 0 ? 'right' : 'left';
      setExiting(direction);
      onSwipe(direction);
    } else {
      setOffset(0);
    }
  };

  const rotation = offset * 0.1;
  const opacity = Math.max(0, 1 - Math.abs(offset) / 300);

  return (
    <div
      ref={cardRef}
      className={`swipe-card ${exiting ? `swipe-card--exit-${exiting}` : ''} ${!active ? 'swipe-card--behind' : ''}`}
      style={active && !exiting ? {
        transform: `translateX(${offset}px) rotate(${rotation}deg)`,
        opacity,
        transition: dragging ? 'none' : 'transform 0.3s, opacity 0.3s',
      } : undefined}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={() => dragging && handleEnd()}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      {/* Swipe indicator overlays */}
      {active && offset > 30 && (
        <div className="swipe-card__indicator swipe-card__indicator--yes">YES</div>
      )}
      {active && offset < -30 && (
        <div className="swipe-card__indicator swipe-card__indicator--nope">NOPE</div>
      )}

      <div className="swipe-card__photo">
        {restaurant.photoUrl ? (
          <img src={restaurant.photoUrl} alt={restaurant.name} loading="lazy" />
        ) : (
          <div className="swipe-card__photo-placeholder">
            <span>🍽️</span>
          </div>
        )}
      </div>
      <div className="swipe-card__info">
        <h2 className="swipe-card__name">{restaurant.name}</h2>
        <div className="swipe-card__meta">
          <span className="swipe-card__stars">{stars}</span>
          <span className="swipe-card__rating">{restaurant.rating.toFixed(1)}</span>
          <span className="swipe-card__reviews">({restaurant.userRatingCount})</span>
          <span className="swipe-card__price">{priceDollars}</span>
          <span className="swipe-card__distance">{restaurant.distanceMiles} mi</span>
        </div>
        <p className="swipe-card__address">{restaurant.address}</p>
      </div>
    </div>
  );
}
