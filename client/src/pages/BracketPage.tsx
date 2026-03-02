import type { Restaurant } from '../types';

interface BracketMatchup {
  a: Restaurant;
  b: Restaurant;
}

interface BracketResult {
  winner: Restaurant;
  agreed: boolean;
  coinFlip: boolean;
  bothAdvance: boolean;
  done: boolean;
}

interface BracketPageProps {
  matchup: BracketMatchup | null;
  round: number;
  remaining: number;
  totalMatches: number;
  voted: boolean;
  partnerVoted: boolean;
  result: BracketResult | null;
  showingResult: boolean;
  onVote: (placeId: string) => void;
}

function BracketCard({ restaurant, onPick, disabled, isWinner, isLoser }: {
  restaurant: Restaurant;
  onPick: () => void;
  disabled: boolean;
  isWinner: boolean;
  isLoser: boolean;
}) {
  const priceDollars = restaurant.priceLevel > 0
    ? '$'.repeat(restaurant.priceLevel)
    : '$$';

  return (
    <button
      className={`bracket-card ${isWinner ? 'bracket-card--winner' : ''} ${isLoser ? 'bracket-card--loser' : ''}`}
      onClick={onPick}
      disabled={disabled}
    >
      <div className="bracket-card__photo">
        {restaurant.photoUrl ? (
          <img src={restaurant.photoUrl} alt={restaurant.name} />
        ) : (
          <div className="bracket-card__photo-placeholder">🍽️</div>
        )}
      </div>
      <div className="bracket-card__info">
        <h3 className="bracket-card__name">{restaurant.name}</h3>
        <div className="bracket-card__meta">
          <span className="bracket-card__rating">★ {restaurant.rating.toFixed(1)}</span>
          <span>{priceDollars}</span>
          <span>{restaurant.distanceMiles} mi</span>
        </div>
      </div>
    </button>
  );
}

export function BracketPage({
  matchup, round, remaining, totalMatches,
  voted, partnerVoted, result, showingResult, onVote,
}: BracketPageProps) {
  if (!matchup) return null;

  const resultMessage = result
    ? result.agreed
      ? 'You both agree!'
      : result.coinFlip
        ? 'Fate decides!'
        : 'Split decision — both advance!'
    : null;

  const isWinnerA = result?.winner.placeId === matchup.a.placeId;
  const isWinnerB = result?.winner.placeId === matchup.b.placeId;
  const isLoserA = result != null && !result.bothAdvance && !isWinnerA;
  const isLoserB = result != null && !result.bothAdvance && !isWinnerB;

  return (
    <div className="page page--bracket">
      <div className="bracket-header">
        <h2 className="bracket-header__title">Finals</h2>
        <p className="bracket-header__info">
          Round {round} · {remaining} remaining
        </p>
      </div>

      {showingResult && resultMessage && (
        <div className={`bracket-result-banner ${result?.coinFlip ? 'bracket-result-banner--flip' : result?.agreed ? 'bracket-result-banner--agree' : 'bracket-result-banner--split'}`}>
          {resultMessage}
        </div>
      )}

      <div className="bracket-matchup">
        <BracketCard
          restaurant={matchup.a}
          onPick={() => onVote(matchup.a.placeId)}
          disabled={voted || showingResult}
          isWinner={showingResult && isWinnerA}
          isLoser={showingResult && isLoserA}
        />

        <div className="bracket-vs">VS</div>

        <BracketCard
          restaurant={matchup.b}
          onPick={() => onVote(matchup.b.placeId)}
          disabled={voted || showingResult}
          isWinner={showingResult && isWinnerB}
          isLoser={showingResult && isLoserB}
        />
      </div>

      {!showingResult && (
        <div className={`bracket-status ${voted ? 'bracket-status--waiting' : ''}`}>
          {!voted ? (
            <p>Tap your pick!</p>
          ) : (
            <>
              <div className="spinner" />
              <p>{partnerVoted ? 'Revealing...' : 'Waiting for your partner...'}</p>
            </>
          )}
        </div>
      )}

      {showingResult && result?.done && (
        <p className="bracket-final-text">We have a winner!</p>
      )}
    </div>
  );
}
