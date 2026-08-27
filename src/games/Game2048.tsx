import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Icon from '../components/Icon';
import { useElementSize } from '../hooks/useElementSize';
import { useGestures } from '../hooks/useGestures';
import { useKeys } from '../hooks/useKeys';
import type { Dir, GameProps } from '../lib/gameTypes';
import { SIZE, create2048, move, settle, type State2048 } from './logic2048';
import './game2048.css';

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right',
};

const SETTLE_MS = 140;

function Game2048({ running, onScore, onGameOver }: GameProps) {
  const area = useRef<HTMLDivElement>(null);
  const size = useElementSize(area);
  const [state, setState] = useState<State2048>(() => create2048());
  const [prev, setPrev] = useState<State2048 | null>(null);
  const [dismissedWin, setDismissedWin] = useState(false);
  const settleTimer = useRef(0);

  // After each move, let the slide finish, then drop consumed tiles.
  useEffect(() => {
    if (!state.tiles.some((t) => t.dying || t.isNew || t.merged)) return;
    settleTimer.current = window.setTimeout(() => setState((s) => settle(s)), SETTLE_MS);
    return () => window.clearTimeout(settleTimer.current);
  }, [state]);

  const step = useCallback(
    (dir: Dir) => {
      if (!running) return;
      const { state: next, moved } = move(state, dir);
      if (!moved) return;
      setPrev(state);
      setState(next);
      onScore(next.score);
      if (next.over) onGameOver(next.score);
    },
    [running, state, onScore, onGameOver],
  );

  const undo = useCallback(() => {
    if (!running || !prev) return;
    setState(settle(prev));
    onScore(prev.score);
    setPrev(null);
  }, [running, prev, onScore]);

  useKeys(running, (key) => {
    const dir = KEY_DIRS[key];
    if (dir) step(dir);
    else if (key === 'u' || key === 'U' || key === 'Backspace') undo();
  });

  const gestures = useMemo(() => ({ onSwipe: step, enabled: running }), [step, running]);
  useGestures(area, gestures);

  const board = Math.max(0, Math.floor(Math.min(size.width, size.height)) - 8);
  const gap = Math.max(6, Math.round(board * 0.03));
  const cell = (board - gap * (SIZE + 1)) / SIZE;
  const boardStyle = { width: board, height: board, '--cell': `${cell}px`, '--gap': `${gap}px` } as CSSProperties;

  return (
    <div className="g2048">
      <div className="g2048-bar">
        <span className="g2048-hint">Slide to merge. One undo per move.</span>
        <button className="btn btn-ghost small" type="button" onClick={undo} disabled={!prev || !running}>
          <Icon name="undo" size={16} /> Undo
        </button>
      </div>
      <div className="g2048-area" ref={area}>
        {board > 0 && (
          <div className="g2048-board" style={boardStyle} aria-label="2048 board">
            {Array.from({ length: SIZE * SIZE }, (_, i) => (
              <span key={i} className="g2048-slot" />
            ))}
            {state.tiles.map((t) => (
              <span
                key={t.id}
                className={[
                  'tile',
                  `v${t.value <= 2048 ? t.value : 'big'}`,
                  t.isNew ? 'new' : '',
                  t.merged ? 'merged' : '',
                  t.dying ? 'dying' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ transform: `translate(${gap + t.c * (cell + gap)}px, ${gap + t.r * (cell + gap)}px)` }}
              >
                {t.value}
              </span>
            ))}
            {state.won && !dismissedWin && (
              <div className="g2048-win">
                <b>2048 reached.</b>
                <button className="btn btn-primary small" type="button" onClick={() => setDismissedWin(true)}>
                  Keep going
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Game2048;
