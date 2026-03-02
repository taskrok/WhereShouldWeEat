import { useState, useEffect, useCallback } from 'react';
import socket from '../socket';
import type { CuisineType, VibeType, BudgetType, DistanceType, UserFilters, Restaurant } from '../types';

export function useFilters(setPhase: (phase: string) => void) {
  const [cuisines, setCuisines] = useState<CuisineType[]>([]);
  const [vibe, setVibe] = useState<VibeType | null>(null);
  const [budget, setBudget] = useState<BudgetType | null>(null);
  const [maxDistance, setMaxDistance] = useState<DistanceType | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [noResultsMessage, setNoResultsMessage] = useState<string | null>(null);

  const toggleCuisine = useCallback((cuisine: CuisineType) => {
    setCuisines(prev =>
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  }, []);

  const isValid = cuisines.length > 0 && vibe !== null && budget !== null && maxDistance !== null;

  const submitFilters = useCallback(() => {
    if (!isValid) return;
    const filters: UserFilters = {
      cuisines,
      vibe: vibe!,
      budget: budget!,
      maxDistance: maxDistance!,
    };
    socket.emit('filters:submit', { filters });
    setPhase('waiting');
  }, [cuisines, vibe, budget, maxDistance, isValid, setPhase]);

  const resetFilters = useCallback(() => {
    setCuisines([]);
    setVibe(null);
    setBudget(null);
    setMaxDistance(null);
    setRestaurants([]);
    setNoResultsMessage(null);
  }, []);

  useEffect(() => {
    const onPartnerReady = () => {
      // Partner submitted their filters
    };

    const onBothReady = ({ restaurants: r }: { restaurants: Restaurant[] }) => {
      setRestaurants(r);
      setPhase('swiping');
    };

    const onNoResults = ({ message }: { message: string }) => {
      setNoResultsMessage(message);
      setPhase('filters');
    };

    socket.on('filters:partner_ready', onPartnerReady);
    socket.on('filters:both_ready', onBothReady);
    socket.on('filters:no_results', onNoResults);

    return () => {
      socket.off('filters:partner_ready', onPartnerReady);
      socket.off('filters:both_ready', onBothReady);
      socket.off('filters:no_results', onNoResults);
    };
  }, [setPhase]);

  return {
    cuisines, toggleCuisine,
    vibe, setVibe,
    budget, setBudget,
    maxDistance, setMaxDistance,
    isValid, submitFilters, resetFilters,
    restaurants, noResultsMessage,
  };
}
