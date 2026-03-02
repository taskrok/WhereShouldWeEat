import { SwipeCard } from './SwipeCard';
import type { Restaurant } from '../types';

interface SwipeStackProps {
  restaurants: Restaurant[];
  currentIndex: number;
  onSwipe: (direction: 'left' | 'right') => void;
  onTap?: (restaurant: Restaurant) => void;
}

export function SwipeStack({ restaurants, currentIndex, onSwipe, onTap }: SwipeStackProps) {
  // Show current card and next card (for peek effect)
  const visibleCards = restaurants.slice(currentIndex, currentIndex + 2);

  return (
    <div className="swipe-stack">
      <div className="swipe-stack__cards">
        {visibleCards.map((restaurant, i) => (
          <SwipeCard
            key={restaurant.placeId}
            restaurant={restaurant}
            onSwipe={onSwipe}
            onTap={onTap}
            active={i === 0}
          />
        )).reverse()}
      </div>

      <div className="swipe-stack__buttons">
        <button
          className="swipe-btn swipe-btn--nope"
          onClick={() => onSwipe('left')}
          disabled={currentIndex >= restaurants.length}
        >
          ✕
        </button>
        <button
          className="swipe-btn swipe-btn--yes"
          onClick={() => onSwipe('right')}
          disabled={currentIndex >= restaurants.length}
        >
          ♥
        </button>
      </div>
    </div>
  );
}
