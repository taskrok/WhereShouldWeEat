import { useCallback, useRef } from 'react';
import { useGeolocation } from './hooks/useGeolocation';
import { useRoom } from './hooks/useRoom';
import { useFilters } from './hooks/useFilters';
import { useSwipe } from './hooks/useSwipe';
import { useBracket } from './hooks/useBracket';
import { HomePage } from './pages/HomePage';
import { LobbyPage } from './pages/LobbyPage';
import { FiltersPage } from './pages/FiltersPage';
import { WaitingPage } from './pages/WaitingPage';
import { SwipePage } from './pages/SwipePage';
import { BracketPage } from './pages/BracketPage';
import { ResultsPage } from './pages/ResultsPage';
import './styles/global.css';

function App() {
  const { location, locationLabel, loading: locationLoading, denied: locationDenied, setLocationFromZip, zipLoading, zipError } = useGeolocation();
  const resetRef = useRef<() => void>(() => {});
  const onRestarted = useCallback(() => resetRef.current(), []);
  const { roomCode, phase, setPhase, error, connected, createRoom, joinRoom, leaveRoom, restartRoom } = useRoom(onRestarted);
  const filters = useFilters(setPhase as (phase: string) => void);
  const swipe = useSwipe(filters.restaurants, setPhase as (phase: string) => void);
  const bracket = useBracket(setPhase as (phase: string) => void);

  resetRef.current = () => {
    filters.resetFilters();
    swipe.resetSwipe();
    bracket.resetBracket();
  };

  const handleCreateRoom = () => {
    if (location) {
      createRoom(location.lat, location.lng);
    }
  };

  const handleJoinRoom = (code: string) => {
    if (location) {
      joinRoom(code, location.lat, location.lng);
    }
  };

  const handleLeave = () => {
    leaveRoom();
    filters.resetFilters();
    swipe.resetSwipe();
    bracket.resetBracket();
  };

  const handlePlayAgain = () => {
    restartRoom();
  };

  const showHeader = phase !== 'home';

  return (
    <>
      {!connected && phase !== 'home' && (
        <div className="connection-banner">
          Connection lost — reconnecting...
        </div>
      )}

      {showHeader && (
        <header className="app-header">
          <button className="app-header__leave" onClick={handleLeave}>
            Leave
          </button>
          <span className="app-header__room">
            {roomCode || ''}
          </span>
          <div className="app-header__spacer" />
        </header>
      )}

      {phase === 'home' && (
        <HomePage
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          error={error}
          locationLoading={locationLoading}
          locationDenied={locationDenied}
          onZipSubmit={setLocationFromZip}
          zipLoading={zipLoading}
          zipError={zipError}
          hasLocation={!!location}
          locationLabel={locationLabel}
        />
      )}

      {phase === 'lobby' && <LobbyPage roomCode={roomCode!} />}

      {phase === 'filters' && (
        <FiltersPage
          cuisines={filters.cuisines}
          toggleCuisine={filters.toggleCuisine}
          vibe={filters.vibe}
          setVibe={filters.setVibe}
          budget={filters.budget}
          setBudget={filters.setBudget}
          maxDistance={filters.maxDistance}
          setMaxDistance={filters.setMaxDistance}
          isValid={filters.isValid}
          onSubmit={filters.submitFilters}
          noResultsMessage={filters.noResultsMessage}
          locationLabel={locationLabel}
        />
      )}

      {phase === 'waiting' && <WaitingPage />}

      {phase === 'swiping' && (
        <SwipePage
          restaurants={filters.restaurants}
          currentIndex={swipe.currentIndex}
          onSwipe={swipe.swipe}
          isDone={swipe.isDone}
          partnerWaiting={swipe.partnerWaiting}
          total={swipe.total}
        />
      )}

      {phase === 'bracket' && (
        <BracketPage
          matchup={bracket.matchup}
          round={bracket.round}
          remaining={bracket.remaining}
          voted={bracket.voted}
          partnerVoted={bracket.partnerVoted}
          result={bracket.result}
          showingResult={bracket.showingResult}
          onVote={bracket.vote}
        />
      )}

      {phase === 'results' && swipe.matches.length > 0 && (
        <ResultsPage
          matches={swipe.matches}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {phase === 'no_match' && (
        <div className="page page--no-match">
          <h1>No matches this time</h1>
          <p>You didn't swipe right on any of the same places.</p>
          <button className="btn btn--primary" onClick={handlePlayAgain}>
            Try Again
          </button>
        </div>
      )}
    </>
  );
}

export default App;
