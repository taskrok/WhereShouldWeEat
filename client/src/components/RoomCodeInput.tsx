import { useState } from 'react';

interface RoomCodeInputProps {
  onJoin: (code: string) => void;
}

export function RoomCodeInput({ onJoin }: RoomCodeInputProps) {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length >= 3) {
      onJoin(code);
    }
  };

  return (
    <form className="room-code-input" onSubmit={handleSubmit}>
      <input
        type="text"
        className="room-code-input__field"
        placeholder="Enter room code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={8}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
      />
      <button
        type="submit"
        className="btn btn--secondary"
        disabled={code.trim().length < 3}
      >
        Join
      </button>
    </form>
  );
}
