import { useCallback, useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import type { GameMeta } from '../data/games';
import type { GameProps } from '../lib/gameTypes';
import type { ScoreResult } from '../lib/arcadeContext';
import { formatScore } from '../lib/canvas';
import { useArcade } from '../hooks/useArcade';
import { useKeys } from '../hooks/useKeys';
import Icon from './Icon';

type Status = 'ready' | 'playing' | 'paused' | 'over';

interface GameShellProps {
  game: GameMeta;
  Game: ComponentType<GameProps>;
  onBack: () => void;
}

const IGNORED_START_KEYS = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Escape', 'CapsLock']);

/** Full-screen game view: consistent HUD + the ready/playing/paused/over state
 *  machine. The game itself only simulates and draws. */
function GameShell({ game, Game, onBack }: GameShellProps) {
  const { bests, recordScore, shared } = useArcade();
  const [status, setStatus] = useState<Status>('ready');
  const [score, setScore] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const best = Math.max(bests[game.id], score);

  const start = useCallback(() => setStatus('playing'), []);
  const restart = useCallback(() => {
    setScore(0);
    setResult(null);
    setResetToken((t) => t + 1);
    setStatus('playing');
  }, []);
  const togglePause = useCallback(() => {
    setStatus((s) => (s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s));
  }, []);

  const onScore = useCallback((s: number) => setScore(s), []);
  const onGameOver = useCallback(
    (finalScore: number) => {
      setScore(finalScore);
      setStatus('over');
      void recordScore(game.id, finalScore).then((r) => {
        if (alive.current) setResult(r);
      });
    },
    [game.id, recordScore],
  );

  // Pause when the tab/iframe is hidden.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') setStatus((s) => (s === 'playing' ? 'paused' : s));
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useKeys(true, (key) => {
    if (key === 'Escape' || key === 'p' || key === 'P') {
      togglePause();
      return;
    }
    if (status === 'ready' && !IGNORED_START_KEYS.has(key)) start();
    else if (status === 'over' && key === 'Enter') restart();
  });

  const style = { '--game-accent': game.accent, '--game-board': game.board } as CSSProperties;
  const running = status === 'playing';

  return (
    <div className="game" data-game={game.id} style={style}>
      <header className="hud">
        <button className="hud-btn" type="button" onClick={onBack} aria-label="Back to the cabinet">
          <Icon name="back" />
        </button>
        <h1 className="hud-title">{game.name}</h1>
        <div className="hud-stat">
          <span>Score</span>
          <b>{formatScore(score)}</b>
        </div>
        <div className="hud-stat">
          <span>Best</span>
          <b>{formatScore(best)}</b>
        </div>
        <button
          className="hud-btn"
          type="button"
          onClick={togglePause}
          disabled={status === 'ready' || status === 'over'}
          aria-label={status === 'paused' ? 'Resume' : 'Pause'}
        >
          <Icon name={status === 'paused' ? 'play' : 'pause'} />
        </button>
        <button className="hud-btn" type="button" onClick={restart} aria-label="Restart">
          <Icon name="restart" />
        </button>
      </header>

      <div className="stage">
        <Game key={resetToken} running={running} onScore={onScore} onGameOver={onGameOver} />

        {status !== 'playing' && (
          <div
            className="overlay"
            onClick={status === 'ready' ? start : status === 'paused' ? togglePause : undefined}
            role="presentation"
          >
            <div className="overlay-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-live="polite">
              {status === 'ready' && (
                <>
                  <h2>{game.name}.</h2>
                  <p>{game.controls}.</p>
                  <button className="btn btn-primary" type="button" onClick={start} autoFocus>
                    <Icon name="play" size={16} /> Start
                  </button>
                  <p className="hint">Any key or a tap also starts.</p>
                </>
              )}
              {status === 'paused' && (
                <>
                  <h2>Paused.</h2>
                  <button className="btn btn-primary" type="button" onClick={togglePause} autoFocus>
                    <Icon name="play" size={16} /> Resume
                  </button>
                  <p className="hint">Esc or P toggles pause.</p>
                </>
              )}
              {status === 'over' && (
                <>
                  <h2>Game over.</h2>
                  <p className="final">{formatScore(score)}</p>
                  {result?.newBest && score > 0 && <p className="badge">New personal best</p>}
                  {result && !result.newBest && result.rank >= 0 && (
                    <p className="hint">#{result.rank + 1} in your top 10</p>
                  )}
                  {result?.shared && <p className="hint">Published to the shared leaderboard.</p>}
                  {shared && result && !result.shared && score > 0 && (
                    <p className="hint">Your shared best still stands.</p>
                  )}
                  <div className="row">
                    <button className="btn btn-primary" type="button" onClick={restart} autoFocus>
                      <Icon name="restart" size={16} /> Play again
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={onBack}>
                      Cabinet
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameShell;
