import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Icon from '../components/Icon';
import { useElementSize } from '../hooks/useElementSize';
import { useGestures } from '../hooks/useGestures';
import { useKeys } from '../hooks/useKeys';
import type { Dir, GameProps } from '../lib/gameTypes';
import { SIZE, create2048, move, rotateBoard, settle, type SpinDir, type State2048 } from './logic2048';
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

/** The chaos twist: odds that a move ends with the board quarter-turning.
 *  Twist-free for the first few moves, then the odds ramp up — the board you
 *  are planning on does not stay put. */
const TWIST_ODDS = 0.35;
const TWIST_ODDS_CAP = 0.65;
const TWIST_RAMP_MOVES = 14;
const TWIST_GRACE_MOVES = 3;
/** How long a twist locks input — the spin (.4s) plus a beat to land. */
const TWIST_MS = 440;

const rollSpin = (): SpinDir => (Math.random() < 0.5 ? 'cw' : 'ccw');

/** A twist in flight. The tile data has already quarter-turned; the board
 *  element animates from the matching counter-rotation back to upright, which
 *  reads as the whole board turning `dir`. Input stays locked until it lands. */
interface Twist {
  dir: SpinDir;
}

function Game2048({ running, onScore, onGameOver }: GameProps) {
  const area = useRef<HTMLDivElement>(null);
  const size = useElementSize(area);
  const [state, setState] = useState<State2048>(() => create2048());
  const [prev, setPrev] = useState<State2048 | null>(null);
  const [dismissedWin, setDismissedWin] = useState(false);
  const [twist, setTwist] = useState<Twist | null>(null);
  const moves = useRef(0);
  const settleTimer = useRef(0);
  const twistTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(twistTimer.current), []);

  // After each move, let the slide finish, then drop consumed tiles — and roll
  // the chaos twist. The roll happens out here, not inside the state updater,
  // so it is made exactly once per move.
  useEffect(() => {
    if (!state.tiles.some((t) => t.dying || t.isNew || t.merged)) return;
    const m = moves.current;
    const ramp = Math.min(Math.max(m - TWIST_GRACE_MOVES, 0) / TWIST_RAMP_MOVES, 1);
    const odds = TWIST_ODDS + ramp * (TWIST_ODDS_CAP - TWIST_ODDS);
    const spin: SpinDir | null =
      !state.over && m >= TWIST_GRACE_MOVES && Math.random() < odds ? rollSpin() : null;
    settleTimer.current = window.setTimeout(() => {
      setState((s) => {
        const settled = settle(s);
        return spin ? rotateBoard(settled, spin) : settled;
      });
      if (spin) {
        setTwist({ dir: spin });
        twistTimer.current = window.setTimeout(() => setTwist(null), TWIST_MS);
      }
    }, SETTLE_MS);
    return () => window.clearTimeout(settleTimer.current);
  }, [state]);

  const step = useCallback(
    (dir: Dir) => {
      if (!running || twist) return; // mid-twist: the board is turning, hold input
      const { state: next, moved } = move(state, dir);
      if (!moved) return;
      moves.current += 1;
      setPrev(state);
      setState(next);
      onScore(next.score);
      if (next.over) onGameOver(next.score);
    },
    [running, twist, state, onScore, onGameOver],
  );

  const undo = useCallback(() => {
    if (!running || !prev || twist) return;
    setState(settle(prev));
    onScore(prev.score);
    setPrev(null);
  }, [running, prev, twist, onScore]);

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
  // While twisting, the element sits at the counter-rotation and the keyframe
  // animation carries it to upright — so the frame the animation starts on is
  // pixel-identical to the board the player was just looking at.
  const angle = twist ? (twist.dir === 'cw' ? -90 : 90) : 0;
  const boardStyle = {
    width: board,
    height: board,
    '--cell': `${cell}px`,
    '--gap': `${gap}px`,
    transform: `rotate(${angle}deg)`,
  } as CSSProperties;

  return (
    <div className="g2048">
      <div className="g2048-bar">
        <span className="g2048-hint">Slide to merge. The board twists without warning.</span>
        <button className="btn btn-ghost small" type="button" onClick={undo} disabled={!prev || !running || !!twist}>
          <Icon name="undo" size={16} /> Undo
        </button>
      </div>
      <div className="g2048-area" ref={area}>
        {board > 0 && (
          <div className="g2048-wrap" style={{ width: board, height: board }}>
            <div
              className={['g2048-board', twist && `twisting twist-${twist.dir}`].filter(Boolean).join(' ')}
              style={boardStyle}
              aria-label="2048 board"
            >
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
            </div>
            {twist && (
              <div className="g2048-twist" role="status">
                <Icon name="rotate" size={13} /> Board turned {twist.dir === 'cw' ? 'right' : 'left'}
              </div>
            )}
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
