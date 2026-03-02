import type { Restaurant } from '../types.js';

export interface BracketMatchup {
  a: Restaurant;
  b: Restaurant;
}

export interface BracketState {
  pool: Restaurant[];
  matchups: BracketMatchup[];
  currentMatchupIndex: number;
  votes: Record<string, string>;
  round: number;
  roundWinners: Restaurant[];
  byes: Restaurant[];
  forceCoinFlip: boolean;
  totalStarting: number;
}

export interface MatchupResult {
  winner: Restaurant;
  loser: Restaurant | null;
  agreed: boolean;
  coinFlip: boolean;
  bothAdvance: boolean;
}

export interface AdvanceResult {
  done: boolean;
  winner?: Restaurant;
  nextMatchup?: BracketMatchup;
  newRound: boolean;
  round: number;
  remaining: number;
}

function generateRound(state: BracketState): void {
  const pool = [...state.pool];
  const matchups: BracketMatchup[] = [];
  const byes: Restaurant[] = [];

  // If odd, highest rated gets a bye
  if (pool.length % 2 === 1) {
    byes.push(pool.shift()!);
  }

  // Pair: first vs last, second vs second-to-last
  while (pool.length >= 2) {
    const a = pool.shift()!;
    const b = pool.pop()!;
    matchups.push({ a, b });
  }

  state.matchups = matchups;
  state.currentMatchupIndex = 0;
  state.roundWinners = [];
  state.byes = byes;
  state.votes = {};
}

export function initBracket(matches: Restaurant[]): BracketState {
  const sorted = [...matches].sort((a, b) => b.rating - a.rating);
  const state: BracketState = {
    pool: sorted,
    matchups: [],
    currentMatchupIndex: 0,
    votes: {},
    round: 1,
    roundWinners: [],
    byes: [],
    forceCoinFlip: false,
    totalStarting: sorted.length,
  };
  generateRound(state);
  return state;
}

export function getCurrentMatchup(state: BracketState): BracketMatchup | null {
  if (state.currentMatchupIndex >= state.matchups.length) return null;
  return state.matchups[state.currentMatchupIndex];
}

export function recordBracketVote(state: BracketState, socketId: string, placeId: string): void {
  state.votes[socketId] = placeId;
}

export function bothVoted(state: BracketState, userIds: string[]): boolean {
  return userIds.every(id => state.votes[id] != null);
}

export function resolveMatchup(state: BracketState, userIds: string[]): MatchupResult {
  const matchup = state.matchups[state.currentMatchupIndex];
  const [userA, userB] = userIds;
  const voteA = state.votes[userA];
  const voteB = state.votes[userB];
  const agreed = voteA === voteB;

  if (agreed) {
    const winner = voteA === matchup.a.placeId ? matchup.a : matchup.b;
    const loser = voteA === matchup.a.placeId ? matchup.b : matchup.a;
    state.roundWinners.push(winner);
    return { winner, loser, agreed: true, coinFlip: false, bothAdvance: false };
  }

  // Disagreement
  const isFinalTwo = state.pool.length === 2;

  if (state.forceCoinFlip || isFinalTwo) {
    const winner = Math.random() < 0.5 ? matchup.a : matchup.b;
    const loser = winner.placeId === matchup.a.placeId ? matchup.b : matchup.a;
    state.roundWinners.push(winner);
    return { winner, loser, agreed: false, coinFlip: true, bothAdvance: false };
  }

  // Both advance
  state.roundWinners.push(matchup.a);
  state.roundWinners.push(matchup.b);
  return { winner: matchup.a, loser: null, agreed: false, coinFlip: false, bothAdvance: true };
}

export function advanceToNext(state: BracketState): AdvanceResult {
  state.currentMatchupIndex++;
  state.votes = {};

  // More matchups in this round?
  if (state.currentMatchupIndex < state.matchups.length) {
    return {
      done: false,
      nextMatchup: state.matchups[state.currentMatchupIndex],
      newRound: false,
      round: state.round,
      remaining: state.pool.length,
    };
  }

  // Round complete — build next pool
  const previousPoolSize = state.pool.length;
  state.pool = [...state.byes, ...state.roundWinners];
  state.pool.sort((a, b) => b.rating - a.rating);

  if (state.pool.length === 1) {
    return { done: true, winner: state.pool[0], newRound: false, round: state.round, remaining: 1 };
  }

  // If pool didn't shrink, force coin flips next round
  state.forceCoinFlip = state.pool.length >= previousPoolSize;

  state.round++;
  generateRound(state);

  return {
    done: false,
    nextMatchup: state.matchups[0],
    newRound: true,
    round: state.round,
    remaining: state.pool.length,
  };
}
