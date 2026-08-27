import { useCallback, useEffect, useMemo, useRef } from 'react';
import DPad from '../components/DPad';
import { useElementSize } from '../hooks/useElementSize';
import { useGameLoop } from '../hooks/useGameLoop';
import { useGestures } from '../hooks/useGestures';
import { useKeys } from '../hooks/useKeys';
import { useTouchDevice } from '../hooks/useTouchDevice';
import { fitCanvas, roundRect } from '../lib/canvas';
import type { Dir, GameProps } from '../lib/gameTypes';
import { COLS, ROWS, advance, createSnake, turn, type SnakeState } from './snakeLogic';
import './snake.css';

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

const PALETTE = {
  board: '#0b1a12',
  grid: 'rgba(94,242,160,.06)',
  body: '#3ecf7f',
  head: '#8ff7bd',
  food: '#ff6b8a',
  glow: 'rgba(94,242,160,.35)',
};

function Snake({ running, onScore, onGameOver }: GameProps) {
  const area = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = useElementSize(area);
  const touch = useTouchDevice();
  const state = useRef<SnakeState>(createSnake());

  const board = Math.max(0, Math.floor(Math.min(size.width, size.height)) - 4);
  const cell = board / COLS;

  const draw = useCallback(() => {
    const c = canvas.current;
    if (!c || board <= 0) return;
    const ctx = fitCanvas(c, board, board);
    if (!ctx) return;
    const s = state.current;
    ctx.fillStyle = PALETTE.board;
    ctx.fillRect(0, 0, board, board);
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < COLS; i++) {
      ctx.moveTo(i * cell + 0.5, 0);
      ctx.lineTo(i * cell + 0.5, board);
    }
    for (let j = 1; j < ROWS; j++) {
      ctx.moveTo(0, j * cell + 0.5);
      ctx.lineTo(board, j * cell + 0.5);
    }
    ctx.stroke();

    // food pulses
    const pulse = 0.78 + 0.1 * Math.sin(s.t * 6);
    ctx.fillStyle = PALETTE.food;
    ctx.beginPath();
    ctx.arc((s.food.x + 0.5) * cell, (s.food.y + 0.5) * cell, (cell / 2) * pulse, 0, Math.PI * 2);
    ctx.fill();

    const pad = Math.max(1, cell * 0.1);
    const r = Math.max(2, cell * 0.28);
    for (let i = s.snake.length - 1; i >= 0; i--) {
      const seg = s.snake[i];
      const isHead = i === 0;
      ctx.fillStyle = isHead ? PALETTE.head : s.alive ? PALETTE.body : '#6c8a78';
      if (isHead) {
        ctx.shadowColor = PALETTE.glow;
        ctx.shadowBlur = 12;
      }
      roundRect(ctx, seg.x * cell + pad, seg.y * cell + pad, cell - pad * 2, cell - pad * 2, r);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [board, cell]);

  useEffect(draw, [draw]);

  useGameLoop(running, (dt) => {
    const s = state.current;
    const before = s.score;
    const died = advance(s, dt);
    if (s.score !== before) onScore(s.score);
    draw();
    if (died) onGameOver(s.score);
  });

  const steer = useCallback(
    (dir: Dir) => {
      if (running) turn(state.current, dir);
    },
    [running],
  );

  useKeys(running, (key) => {
    const dir = KEY_DIRS[key];
    if (dir) steer(dir);
  });

  const gestures = useMemo(() => ({ onSwipe: steer, enabled: running }), [steer, running]);
  useGestures(area, gestures);

  return (
    <div className="snake">
      <div className="snake-area" ref={area}>
        <canvas ref={canvas} className="snake-canvas" aria-label="Snake board" />
      </div>
      {touch && <DPad onDir={steer} />}
    </div>
  );
}

export default Snake;
