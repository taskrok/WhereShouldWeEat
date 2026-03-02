import { useState, useEffect, useCallback } from 'react';
import socket from '../socket';
import type { Restaurant } from '../types';

interface BracketMatchup {
  a: Restaurant;
  b: Restaurant;
}

interface BracketResultData {
  winner: Restaurant;
  agreed: boolean;
  coinFlip: boolean;
  bothAdvance: boolean;
  done: boolean;
  nextMatchup?: BracketMatchup;
  round?: number;
  remaining?: number;
  newRound?: boolean;
}

export function useBracket(setPhase: (phase: string) => void) {
  const [matchup, setMatchup] = useState<BracketMatchup | null>(null);
  const [round, setRound] = useState(1);
  const [remaining, setRemaining] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [voted, setVoted] = useState(false);
  const [voteProgress, setVoteProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<BracketResultData | null>(null);
  const [showingResult, setShowingResult] = useState(false);

  const vote = useCallback((placeId: string) => {
    if (voted) return;
    setVoted(true);
    socket.emit('bracket:vote', { placeId });
  }, [voted]);

  const resetBracket = useCallback(() => {
    setMatchup(null);
    setRound(1);
    setRemaining(0);
    setTotalMatches(0);
    setVoted(false);
    setVoteProgress(null);
    setResult(null);
    setShowingResult(false);
  }, []);

  useEffect(() => {
    const onStart = ({ matchup: m, round: r, remaining: rem, totalMatches: total }: {
      matchup: BracketMatchup; round: number; remaining: number; totalMatches: number;
    }) => {
      setMatchup(m);
      setRound(r);
      setRemaining(rem);
      setTotalMatches(total);
      setVoted(false);
      setVoteProgress(null);
      setResult(null);
      setShowingResult(false);
      setPhase('bracket');
    };

    const onVoteProgress = ({ done, total }: { done: number; total: number }) => {
      setVoteProgress({ done, total });
    };

    const onResult = (data: BracketResultData) => {
      setResult(data);
      setShowingResult(true);

      if (!data.done) {
        // After showing result, advance to next matchup
        setTimeout(() => {
          setMatchup(data.nextMatchup!);
          if (data.round != null) setRound(data.round);
          if (data.remaining != null) setRemaining(data.remaining);
          setVoted(false);
          setVoteProgress(null);
          setResult(null);
          setShowingResult(false);
        }, 2500);
      }
      // If done, the server will emit swipe:results after 3s
      // which useSwipe handles → sets phase to 'results'
    };

    socket.on('bracket:start', onStart);
    socket.on('bracket:vote_progress', onVoteProgress);
    socket.on('bracket:result', onResult);

    return () => {
      socket.off('bracket:start', onStart);
      socket.off('bracket:vote_progress', onVoteProgress);
      socket.off('bracket:result', onResult);
    };
  }, [setPhase]);

  return {
    matchup,
    round,
    remaining,
    totalMatches,
    voted,
    voteProgress,
    result,
    showingResult,
    vote,
    resetBracket,
  };
}
