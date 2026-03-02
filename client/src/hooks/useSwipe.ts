import { useState, useEffect, useCallback, useRef } from 'react';
import socket from '../socket';
import type { Restaurant } from '../types';

export function useSwipe(restaurants: Restaurant[], setPhase: (phase: string) => void) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState<Restaurant[]>([]);
  const [partnerWaiting, setPartnerWaiting] = useState(false);
  const swiping = useRef(false);

  const currentRestaurant = restaurants[currentIndex] || null;
  const isDone = currentIndex >= restaurants.length;

  const swipe = useCallback((direction: 'left' | 'right') => {
    if (!currentRestaurant || swiping.current) return;
    swiping.current = true;

    const isLast = currentIndex + 1 >= restaurants.length;
    socket.emit('swipe', { placeId: currentRestaurant.placeId, direction });
    setCurrentIndex(prev => prev + 1);

    // Emit done AFTER the swipe event so server records the swipe first
    if (isLast) {
      setTimeout(() => socket.emit('swipe:done'), 50);
    }

    setTimeout(() => { swiping.current = false; }, 400);
  }, [currentRestaurant, currentIndex, restaurants.length]);

  const resetSwipe = useCallback(() => {
    setCurrentIndex(0);
    setMatches([]);
    setPartnerWaiting(false);
    swiping.current = false;
  }, []);

  useEffect(() => {
    const onResults = ({ matches: m }: { matches: Restaurant[] }) => {
      setMatches(m);
      setPhase('results');
    };

    const onPartnerWaiting = () => {
      setPartnerWaiting(true);
    };

    const onNoMatch = () => {
      setPhase('no_match');
    };

    socket.on('swipe:results', onResults);
    socket.on('swipe:partner_waiting', onPartnerWaiting);
    socket.on('swipe:no_match', onNoMatch);

    return () => {
      socket.off('swipe:results', onResults);
      socket.off('swipe:partner_waiting', onPartnerWaiting);
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
    partnerWaiting,
    resetSwipe,
  };
}
