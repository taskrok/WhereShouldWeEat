interface RoomCodeDisplayProps {
  code: string;
}

export function RoomCodeDisplay({ code }: RoomCodeDisplayProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="room-code-display">
      <p className="room-code-display__label">Share this code with your partner</p>
      <div className="room-code-display__code" onClick={handleCopy}>
        {code.split('').map((char, i) => (
          <span key={i} className="room-code-display__letter">{char}</span>
        ))}
      </div>
      <p className="room-code-display__hint">Tap to copy</p>
    </div>
  );
}
