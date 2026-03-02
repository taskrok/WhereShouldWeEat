import { useState, useEffect, useCallback, useRef } from 'react';
import socket from '../socket';
import type { Restaurant } from '../types';

export function useSwipe(restaurants: Restaurant[], setPhase: (phase: string) => void) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState<Restaurant[]>([]);
  const [swipeProgress, setSwipeProgress] = useState<{ done: number; total: number } | null>(null);
  const pendingSwipe = useRef(false);

  const currentRestaurant = restaurants[currentIndex] || null;
  const isDone = restaurants.length > 0 && currentIndex >= restaurants.length;

  const swipe = useCallback((direction: 'left' | 'right') => {
    if (!currentRestaurant || pendingSwipe.current) return;
    pendingSwipe.current = true;

    const isLast = currentIndex + 1 >= restaurants.length;
    socket.emit('swipe', { placeId: currentRestaurant.placeId, direction });
    setCurrentIndex(prev => prev + 1);

    if (isLast) {
      setTimeout(() => socket.emit('swipe:done'), 50);
    }
  }, [currentRestaurant, currentIndex, restaurants.length]);

  // Reset the pending flag whenever currentIndex changes (card advanced)
  useEffect(() => {
    pendingSwipe.current = false;
  }, [currentIndex]);

  const resetSwipe = useCallback(() => {
    setCurrentIndex(0);
    setMatches([]);
    setSwipeProgress(null);
    pendingSwipe.current = false;
  }, []);

  // Auto-reset when a new restaurant list arrives (new round starting)
  useEffect(() => {
    if (restaurants.length > 0) {
      setCurrentIndex(0);
      setSwipeProgress(null);
      pendingSwipe.current = false;
    }
  }, [restaurants]);

  useEffect(() => {
    const onResults = ({ matches: m }: { matches: Restaurant[] }) => {
      setMatches(m);
      setPhase('results');
    };

    const onSwipeProgress = ({ done, total }: { done: number; total: number }) => {
      setSwipeProgress({ done, total });
    };

    const onNoMatch = () => {
      setPhase('no_match');
    };

    socket.on('swipe:results', onResults);
    socket.on('swipe:progress', onSwipeProgress);
    socket.on('swipe:no_match', onNoMatch);

    return () => {
      socket.off('swipe:results', onResults);
      socket.off('swipe:progress', onSwipeProgress);
      socket.off('swipe:no_match', onNoMatch);
    };
  }, [setPhase]);

  return {
    currentRestaurant,
    currentIndex,
    total: restaurants.length,
    isDone,
    swipe,
    matches,
    swipeProgress,
    resetSwipe,
  };
}
