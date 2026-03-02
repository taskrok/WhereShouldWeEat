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
}

export function HomePage({
  onCreateRoom, onJoinRoom, error,
  locationLoading,
  locationDenied, onZipSubmit, zipLoading, zipError,
  hasLocation, locationLabel,
}: HomePageProps) {
  const [zip, setZip] = useState('');

  const handleZipSubmit = () => {
    if (zip.trim().length === 5) {
      onZipSubmit(zip.trim());
    }
  };

  const showZipInput = locationDenied && !hasLocation;

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
