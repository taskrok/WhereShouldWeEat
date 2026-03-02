interface FilterOptionProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  emoji?: string;
}

export function FilterOption({ label, selected, onClick, emoji }: FilterOptionProps) {
  return (
    <button
      className={`filter-chip ${selected ? 'filter-chip--selected' : ''}`}
      onClick={onClick}
      type="button"
    >
      {emoji && <span className="filter-chip__emoji">{emoji}</span>}
      {label}
    </button>
  );
}
