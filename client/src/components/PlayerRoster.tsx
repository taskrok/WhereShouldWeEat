import { useRef, useEffect } from 'react';

interface PlayerRosterProps {
  playerCount: number;
  isCreator: boolean;
}

const FOOD_EMOJIS = ['🍕','🌮','🍣','🍔','🍜','🥗','🍱','🧁','🥘','🍝','🌯','🥟','🍛','🥐','🍩'];

const AVATAR_COLORS = [
  '#e94560', '#7c5cbf', '#f5a623', '#2ecc71', '#3498db',
  '#e74c3c', '#1abc9c', '#9b59b6', '#e67e22', '#2980b9',
  '#27ae60', '#c0392b', '#16a085', '#8e44ad', '#d35400',
];

export function PlayerRoster({ playerCount, isCreator }: PlayerRosterProps) {
  const prevCountRef = useRef(playerCount);

  useEffect(() => {
    prevCountRef.current = playerCount;
  });

  const prevCount = prevCountRef.current;

  return (
    <div className="roster">
      <div className="roster__avatars">
        {Array.from({ length: playerCount }, (_, i) => {
          const isNew = i >= prevCount && playerCount > prevCount;
          return (
            <div
              key={i}
              className={`roster__avatar${isNew ? ' roster__avatar--bounce' : ''}`}
              style={{
                '--avatar-color': i === 0 ? AVATAR_COLORS[0] : AVATAR_COLORS[i % AVATAR_COLORS.length],
                '--i': i,
              } as React.CSSProperties}
            >
              {i === 0 && isCreator && (
                <span className="roster__crown">👑</span>
              )}
              <span className="roster__emoji">{FOOD_EMOJIS[i % FOOD_EMOJIS.length]}</span>
            </div>
          );
        })}
      </div>
      <p className="roster__count">
        {playerCount} player{playerCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
