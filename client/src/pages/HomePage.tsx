import { RoomCodeInput } from '../components/RoomCodeInput';

interface HomePageProps {
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  error: string | null;
  locationLoading: boolean;
  locationError: string | null;
}

export function HomePage({ onCreateRoom, onJoinRoom, error, locationLoading, locationError }: HomePageProps) {
  return (
    <div className="page page--home">
      <div className="home-hero">
        <h1 className="home-hero__title">Where Should We Eat?</h1>
        <p className="home-hero__subtitle">Stop arguing. Start swiping.</p>
      </div>

      {locationError && (
        <div className="alert alert--error">{locationError}</div>
      )}

      {error && (
        <div className="alert alert--error">{error}</div>
      )}

      <div className="home-actions">
        <button
          className="btn btn--primary btn--large"
          onClick={onCreateRoom}
          disabled={locationLoading || !!locationError}
        >
          {locationLoading ? 'Getting location...' : 'Create a Room'}
        </button>

        <div className="home-divider">
          <span>or join one</span>
        </div>

        <RoomCodeInput onJoin={onJoinRoom} />
      </div>
    </div>
  );
}
