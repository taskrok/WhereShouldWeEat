import { RestaurantDetails } from '../components/RestaurantDetails';
import type { Restaurant } from '../types';

interface MatchPageProps {
  restaurant: Restaurant;
  onPlayAgain: () => void;
}

export function MatchPage({ restaurant, onPlayAgain }: MatchPageProps) {
  return (
    <div className="page page--match">
      <div className="match-celebration">
        <h1 className="match-title">It's a Match!</h1>
        <p className="match-subtitle">The group picked the same spot!</p>
      </div>

      <RestaurantDetails restaurant={restaurant} />

      <button className="btn btn--ghost match-restart" onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  );
}
