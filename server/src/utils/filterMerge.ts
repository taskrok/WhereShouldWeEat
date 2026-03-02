import type { UserFilters, MergedFilters, BudgetType } from '../types.js';

const BUDGET_RANK: Record<BudgetType, number> = { '$': 1, '$$': 2, '$$$': 3 };
const RANK_TO_BUDGET: Record<number, BudgetType> = { 1: '$', 2: '$$', 3: '$$$' };

export function mergeFilters(a: UserFilters, b: UserFilters): MergedFilters {
  // Cuisines: intersection first; if empty, fall back to union
  const intersection = a.cuisines.filter(c => b.cuisines.includes(c));
  const cuisines = intersection.length > 0
    ? intersection
    : [...new Set([...a.cuisines, ...b.cuisines])];

  // Budget: take the lower (more restrictive)
  const budgetRankVal = Math.min(BUDGET_RANK[a.budget], BUDGET_RANK[b.budget]);
  const budget = RANK_TO_BUDGET[budgetRankVal];

  // Distance: take the shorter
  const maxDistance = Math.min(a.maxDistance, b.maxDistance) as 5 | 15 | 30;

  // Vibe: if same use it, otherwise include both
  const vibes = a.vibe === b.vibe
    ? [a.vibe]
    : [a.vibe, b.vibe];

  return { cuisines, budget, maxDistance, vibes };
}
