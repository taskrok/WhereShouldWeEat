import { useGeolocation } from './hooks/useGeolocation';
import { useRoom } from './hooks/useRoom';
import { useFilters } from './hooks/useFilters';
import { useSwipe } from './hooks/useSwipe';
import { HomePage } from './pages/HomePage';
import { LobbyPage } from './pages/LobbyPage';
import { FiltersPage } from './pages/FiltersPage';
import { WaitingPage } from './pages/WaitingPage';
import { SwipePage } from './pages/SwipePage';
import { ResultsPage } from './pages/ResultsPage';
import './styles/global.css';

function App() {
  const { location, error: locationError, loading: locationLoading } = useGeolocation();
  const { roomCode, phase, setPhase, error, connected, createRoom, joinRoom, leaveRoom, restartRoom } = useRoom();
  const filters = useFilters(setPhase as (phase: string) => void);
  const swipe = useSwipe(filters.restaurants, setPhase as (phase: string) => void);

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
  };

  const handlePlayAgain = () => {
    filters.resetFilters();
    swipe.resetSwipe();
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
          locationError={locationError}
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
