import { useState } from 'react';
import { RoomCodeInput } from '../components/RoomCodeInput';
import { Logo } from '../components/Logo';

interface HomePageProps {
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  error: string | null;
  locationLoading: boolean;
  locationDenied: boolean;
  onZipSubmit: (zip: string) => Promise<void>;
  zipLoading: boolean;
  zipError: string | null;
  hasLocation: boolean;
  locationLabel: string | null;
  creating: boolean;
}

export function HomePage({
  onCreateRoom, onJoinRoom, error,
  locationLoading,
  locationDenied, onZipSubmit, zipLoading, zipError,
  hasLocation, locationLabel, creating,
}: HomePageProps) {
  const [zip, setZip] = useState('');

  const handleZipSubmit = () => {
    if (zip.trim().length === 5) {
      onZipSubmit(zip.trim());
    }
  };

  const showZipInput = locationDenied && !hasLocation;

  if (creating) {
    return (
      <div className="page page--home">
        <div className="creating-room">
          <div className="creating-room__icon">🍽️</div>
          <div className="creating-room__spinner" />
          <h2 className="creating-room__title">Setting the table...</h2>
          <p className="creating-room__message">
            We're on free servers, so this may take up to 30 seconds on first load. Hang tight!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page page--home">
      <div className="home-hero">
        <Logo size={88} />
        <h1 className="home-hero__title">Where Should We Eat?</h1>
        <p className="home-hero__subtitle">Stop arguing. Start swiping.</p>
        {locationLabel && (
          <p className="home-hero__location">Searching near {locationLabel}</p>
        )}
      </div>

      {error && (
        <div className="alert alert--error">{error}</div>
      )}

      {showZipInput ? (
        <div className="home-actions">
          <p className="zip-prompt">Enter your zip code to find nearby restaurants</p>
          {zipError && (
            <div className="alert alert--error">{zipError}</div>
          )}
          <div className="zip-input-group">
            <input
              className="zip-input__field"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              placeholder="e.g. 84020"
              value={zip}
              onChange={e => setZip(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleZipSubmit()}
            />
            <button
              className="btn btn--primary"
              onClick={handleZipSubmit}
              disabled={zip.length !== 5 || zipLoading}
            >
              {zipLoading ? 'Looking up...' : 'Go'}
            </button>
          </div>
        </div>
      ) : (
        <div className="home-actions">
          <button
            className="btn btn--primary btn--large"
            onClick={onCreateRoom}
            disabled={locationLoading || !hasLocation}
          >
            {locationLoading ? 'Getting location...' : 'Create a Room'}
          </button>

          <div className="home-divider">
            <span>or join one</span>
          </div>

          <RoomCodeInput onJoin={onJoinRoom} disabled={!hasLocation} />
        </div>
      )}
    </div>
  );
}
