import { useState } from 'react';
import { SwipeStack } from '../components/SwipeStack';
import { DetailModal } from '../components/DetailModal';
import type { Restaurant } from '../types';

interface SwipePageProps {
  restaurants: Restaurant[];
  currentIndex: number;
  onSwipe: (direction: 'left' | 'right') => void;
  isDone: boolean;
  swipeProgress: { done: number; total: number } | null;
  total: number;
  limitedResults?: boolean;
}

export function SwipePage({ restaurants, currentIndex, onSwipe, isDone, swipeProgress, total, limitedResults }: SwipePageProps) {
  const [detailRestaurant, setDetailRestaurant] = useState<Restaurant | null>(null);

  return (
    <div className="page page--swipe">
      <div className="swipe-header">
        <h2>Swipe right on places you'd eat</h2>
        <p className="swipe-counter">{Math.min(currentIndex + 1, total)} / {total}</p>
        {swipeProgress && !isDone && (
          <p className="swipe-partner-status">
            {swipeProgress.done} of {swipeProgress.total} players done swiping
          </p>
        )}
        {limitedResults && (
          <p className="swipe-limited-notice">Fewer options right now — some places are closed</p>
        )}
      </div>

      {!isDone ? (
        <SwipeStack
          restaurants={restaurants}
          currentIndex={currentIndex}
          onSwipe={onSwipe}
          onTap={setDetailRestaurant}
        />
      ) : (
        <div className="waiting-content">
          <div className="spinner" />
          <h2>All swiped!</h2>
          <p>
            Waiting for everyone to finish...
            {swipeProgress && ` (${swipeProgress.done} of ${swipeProgress.total} done)`}
          </p>
        </div>
      )}

      {detailRestaurant && (
        <DetailModal
          restaurant={detailRestaurant}
          onClose={() => setDetailRestaurant(null)}
        />
      )}
    </div>
  );
}
