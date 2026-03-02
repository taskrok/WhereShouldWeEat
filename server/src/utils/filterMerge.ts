import type { UserFilters, MergedFilters, BudgetType } from '../types.js';

const BUDGET_RANK: Record<BudgetType, number> = { '$': 1, '$$': 2, '$$$': 3 };
const RANK_TO_BUDGET: Record<number, BudgetType> = { 1: '$', 2: '$$', 3: '$$$' };

export function mergeFilters(allFilters: UserFilters[]): MergedFilters {
  if (allFilters.length === 0) {
    return { cuisines: [], budget: '$$', maxDistance: 15, vibes: [], dietary: [] };
  }

  // Cuisines: union of all picks, sorted by how many players picked each (shared first)
  const cuisineCounts = new Map<string, number>();
  for (const f of allFilters) {
    for (const c of f.cuisines) {
      cuisineCounts.set(c, (cuisineCounts.get(c) || 0) + 1);
    }
  }
  const cuisines = [...cuisineCounts.keys()].sort((a, b) => cuisineCounts.get(b)! - cuisineCounts.get(a)!) as typeof allFilters[0]['cuisines'];

  // Budget: take the lowest (most restrictive)
  const budgetRankVal = Math.min(...allFilters.map(f => BUDGET_RANK[f.budget]));
  const budget = RANK_TO_BUDGET[budgetRankVal];

  // Distance: take the shortest
  const maxDistance = Math.min(...allFilters.map(f => f.maxDistance)) as 5 | 15 | 30;

  // Vibes: union of all unique vibes
  const vibes = [...new Set(allFilters.map(f => f.vibe))];

  // Dietary: union of all dietary needs
  const dietary = [...new Set(allFilters.flatMap(f => f.dietary || []))];

  return { cuisines, budget, maxDistance, vibes, dietary };
}
