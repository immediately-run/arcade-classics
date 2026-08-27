import type { CSSProperties } from 'react';
import type { GameMeta } from '../data/games';
import { formatScore } from '../lib/canvas';

interface GameCardProps {
  game: GameMeta;
  best: number;
  loading: boolean;
  onPlay: () => void;
}

function GameCard({ game, best, loading, onPlay }: GameCardProps) {
  const style = { '--game-accent': game.accent, '--game-board': game.board } as CSSProperties;
  return (
    <button className="gcard" type="button" onClick={onPlay} style={style}>
      <span className={`preview preview-${game.id}`} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="gcard-body">
        <span className="gcard-name">{game.name}</span>
        <span className="gcard-tag">{game.tagline}</span>
        <span className="gcard-foot">
          <span className="gcard-best">
            <span>Best</span>
            <b>{loading ? '…' : best > 0 ? formatScore(best) : '—'}</b>
          </span>
          <span className="gcard-play">Play →</span>
        </span>
      </span>
    </button>
  );
}

export default GameCard;
