import { RoomCodeDisplay } from '../components/RoomCodeDisplay';

interface LobbyPageProps {
  roomCode: string;
  playerCount: number;
  isCreator: boolean;
  onStartGame: () => void;
}

export function LobbyPage({ roomCode, playerCount, isCreator, onStartGame }: LobbyPageProps) {
  return (
    <div className="page page--lobby">
      <RoomCodeDisplay code={roomCode} />
      <p className="lobby-player-count">
        {playerCount} player{playerCount !== 1 ? 's' : ''} in room
      </p>
      <div className="lobby-waiting">
        {isCreator ? (
          <button
            className="btn btn--primary btn--large"
            disabled={playerCount < 2}
            onClick={onStartGame}
          >
            Start Game
          </button>
        ) : (
          <>
            <div className="spinner" />
            <p>Waiting for the host to start...</p>
          </>
        )}
      </div>
    </div>
  );
}
