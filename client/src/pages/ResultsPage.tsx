import { useState } from 'react';
import { RestaurantDetails } from '../components/RestaurantDetails';
import type { Restaurant } from '../types';

interface ResultsPageProps {
  matches: Restaurant[];
  onPlayAgain: () => void;
  onStartBracket?: () => void;
}

export function ResultsPage({ matches, onPlayAgain, onStartBracket }: ResultsPageProps) {
  const [selected, setSelected] = useState<Restaurant | null>(null);

  if (selected) {
    return (
      <div className="page page--match">
        <div className="match-celebration">
          <h1 className="match-title">Let's Go!</h1>
        </div>

        <RestaurantDetails restaurant={selected} />

        <div className="results-actions">
          <button className="btn btn--secondary" onClick={() => setSelected(null)}>
            Back to Matches
          </button>
          <button className="btn btn--ghost" onClick={onPlayAgain}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page page--results">
      <div className="match-celebration">
        <h1 className="match-title">
          {matches.length} Match{matches.length !== 1 ? 'es' : ''}!
        </h1>
        <p className="match-subtitle">The group said yes to these spots</p>
      </div>

      <div className="results-list">
        {matches.map(restaurant => {
          const priceDollars = restaurant.priceLevel > 0
            ? '$'.repeat(restaurant.priceLevel)
            : '$$';

          return (
            <button
              key={restaurant.placeId}
              className="results-card"
              onClick={() => setSelected(restaurant)}
            >
              <div className="results-card__photo">
                {restaurant.photoUrl ? (
                  <img src={restaurant.photoUrl} alt={restaurant.name} />
                ) : (
                  <div className="results-card__photo-placeholder">🍽️</div>
                )}
              </div>
              <div className="results-card__info">
                <h3 className="results-card__name">{restaurant.name}</h3>
                <div className="results-card__meta">
                  <span className="results-card__rating">★ {restaurant.rating.toFixed(1)}</span>
                  <span>{priceDollars}</span>
                  <span>{restaurant.distanceMiles} mi</span>
                </div>
                <p className="results-card__address">{restaurant.address}</p>
                {!restaurant.openNow && <span className="closed-tag">Currently closed</span>}
              </div>
              <div className="results-card__arrow">›</div>
            </button>
          );
        })}
      </div>

      {onStartBracket && matches.length >= 2 && (
        <button className="btn btn--primary btn--large results-bracket" onClick={onStartBracket}>
          Can't decide? Start the bracket!
        </button>
      )}

      <button className="btn btn--ghost results-restart" onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  );
}
