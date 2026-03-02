import { RoomCodeDisplay } from '../components/RoomCodeDisplay';

interface LobbyPageProps {
  roomCode: string;
}

export function LobbyPage({ roomCode }: LobbyPageProps) {
  return (
    <div className="page page--lobby">
      <RoomCodeDisplay code={roomCode} />
      <div className="lobby-waiting">
        <div className="spinner" />
        <p>Waiting for your partner to join...</p>
      </div>
    </div>
  );
}
