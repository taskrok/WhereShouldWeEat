import { FilterOption } from '../components/FilterOption';
import type { CuisineType, VibeType, BudgetType, DistanceType } from '../types';

const CUISINES: { value: CuisineType; label: string; emoji: string }[] = [
  { value: 'mexican', label: 'Mexican', emoji: '🌮' },
  { value: 'italian', label: 'Italian', emoji: '🍝' },
  { value: 'chinese', label: 'Chinese', emoji: '🥡' },
  { value: 'japanese', label: 'Japanese', emoji: '🍱' },
  { value: 'indian', label: 'Indian', emoji: '🍛' },
  { value: 'thai', label: 'Thai', emoji: '🍜' },
  { value: 'korean', label: 'Korean', emoji: '🥘' },
  { value: 'american', label: 'American', emoji: '🍔' },
  { value: 'mediterranean', label: 'Mediterranean', emoji: '🥙' },
  { value: 'seafood', label: 'Seafood', emoji: '🦐' },
  { value: 'barbecue', label: 'BBQ', emoji: '🍖' },
  { value: 'pizza', label: 'Pizza', emoji: '🍕' },
  { value: 'sushi', label: 'Sushi', emoji: '🍣' },
  { value: 'vietnamese', label: 'Vietnamese', emoji: '🍲' },
];

const VIBES: { value: VibeType; label: string; emoji: string }[] = [
  { value: 'fast_casual', label: 'Fast & Casual', emoji: '⚡' },
  { value: 'sit_down', label: 'Sit Down', emoji: '🪑' },
  { value: 'takeout', label: 'Takeout', emoji: '📦' },
];

const BUDGETS: { value: BudgetType; label: string }[] = [
  { value: '$', label: '$ Cheap' },
  { value: '$$', label: '$$ Mid' },
  { value: '$$$', label: '$$$ Fancy' },
];

const DISTANCES: { value: DistanceType; label: string }[] = [
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
];

interface FiltersPageProps {
  cuisines: CuisineType[];
  toggleCuisine: (c: CuisineType) => void;
  vibe: VibeType | null;
  setVibe: (v: VibeType) => void;
  budget: BudgetType | null;
  setBudget: (b: BudgetType) => void;
  maxDistance: DistanceType | null;
  setMaxDistance: (d: DistanceType) => void;
  isValid: boolean;
  onSubmit: () => void;
  noResultsMessage: string | null;
}

export function FiltersPage({
  cuisines, toggleCuisine,
  vibe, setVibe,
  budget, setBudget,
  maxDistance, setMaxDistance,
  isValid, onSubmit,
  noResultsMessage,
}: FiltersPageProps) {
  return (
    <div className="page page--filters">
      <h1 className="filters-title">What are you feeling?</h1>

      {noResultsMessage && (
        <div className="alert alert--warning">{noResultsMessage}</div>
      )}

      <section className="filter-section">
        <h2 className="filter-section__title">Craving</h2>
        <p className="filter-section__hint">Pick all that sound good</p>
        <div className="filter-chips">
          {CUISINES.map(c => (
            <FilterOption
              key={c.value}
              label={c.label}
              emoji={c.emoji}
              selected={cuisines.includes(c.value)}
              onClick={() => toggleCuisine(c.value)}
            />
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h2 className="filter-section__title">Vibe</h2>
        <div className="filter-chips">
          {VIBES.map(v => (
            <FilterOption
              key={v.value}
              label={v.label}
              emoji={v.emoji}
              selected={vibe === v.value}
              onClick={() => setVibe(v.value)}
            />
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h2 className="filter-section__title">Budget</h2>
        <div className="filter-chips">
          {BUDGETS.map(b => (
            <FilterOption
              key={b.value}
              label={b.label}
              selected={budget === b.value}
              onClick={() => setBudget(b.value)}
            />
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h2 className="filter-section__title">How far?</h2>
        <div className="filter-chips">
          {DISTANCES.map(d => (
            <FilterOption
              key={d.value}
              label={d.label}
              selected={maxDistance === d.value}
              onClick={() => setMaxDistance(d.value)}
            />
          ))}
        </div>
      </section>

      <button
        className="btn btn--primary btn--large filters-submit"
        disabled={!isValid}
        onClick={onSubmit}
      >
        I'm Ready!
      </button>
    </div>
  );
}
