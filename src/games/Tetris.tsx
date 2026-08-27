import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import { useElementSize } from '../hooks/useElementSize';
import { useGameLoop } from '../hooks/useGameLoop';
import { useGestures } from '../hooks/useGestures';
import { useKeys } from '../hooks/useKeys';
import { useTouchDevice } from '../hooks/useTouchDevice';
import { fitCanvas, roundRect } from '../lib/canvas';
import type { GameProps } from '../lib/gameTypes';
import {
  COLS,
  HIDDEN_ROWS,
  VISIBLE_ROWS,
  cellsOf,
  createTetris,
  ghostY,
  hardDrop,
  holdPiece,
  move,
  rotate,
  softStep,
  tick,
  type Kind,
  type TetrisState,
} from './tetrisLogic';
import MiniPiece from './MiniPiece';
import './tetris.css';

const COLORS: Record<Kind, string> = {
  I: '#4fd3ff',
  O: '#ffd75e',
  T: '#c084fc',
  S: '#6ee7a0',
  Z: '#ff6b6b',
  J: '#6b8cff',
  L: '#ffa94d',
};
const BOARD_BG = '#0d1020';
const GRID = 'rgba(124,196,255,.07)';

const DAS = 0.16; // s before auto-repeat
const ARR = 0.045; // s between repeats

interface Panel {
  hold: Kind | null;
  holdUsed: boolean;
  next: Kind[];
  level: number;
  lines: number;
}

function Tetris({ running, onScore, onGameOver }: GameProps) {
  const area = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = useElementSize(area);
  const touch = useTouchDevice();
  const [initial] = useState(createTetris);
  const state = useRef<TetrisState>(initial);
  const held = useRef<{ dir: -1 | 1 | 0; das: number; arr: number }>({ dir: 0, das: 0, arr: 0 });
  const [panel, setPanel] = useState<Panel>(() => snapshot(initial));
  const lastPanel = useRef<Panel>(snapshot(initial));

  const cell = Math.max(0, Math.floor(Math.min(size.width / COLS, size.height / VISIBLE_ROWS)));
  const w = cell * COLS;
  const h = cell * VISIBLE_ROWS;

  const draw = useCallback(() => {
    const c = canvas.current;
    if (!c || cell <= 0) return;
    const ctx = fitCanvas(c, w, h);
    if (!ctx) return;
    const s = state.current;
    ctx.fillStyle = BOARD_BG;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < COLS; i++) {
      ctx.moveTo(i * cell + 0.5, 0);
      ctx.lineTo(i * cell + 0.5, h);
    }
    for (let j = 1; j < VISIBLE_ROWS; j++) {
      ctx.moveTo(0, j * cell + 0.5);
      ctx.lineTo(w, j * cell + 0.5);
    }
    ctx.stroke();

    const block = (x: number, y: number, color: string, ghost = false) => {
      const vy = y - HIDDEN_ROWS;
      if (vy < 0) return;
      const pad = Math.max(1, cell * 0.08);
      const r = Math.max(2, cell * 0.2);
      roundRect(ctx, x * cell + pad, vy * cell + pad, cell - pad * 2, cell - pad * 2, r);
      if (ghost) {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, cell * 0.08);
        ctx.globalAlpha = 0.55;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        roundRect(ctx, x * cell + pad, vy * cell + pad, cell - pad * 2, (cell - pad * 2) * 0.35, r);
        ctx.fill();
      }
    };

    s.board.forEach((row, y) => row.forEach((k, x) => k && block(x, y, s.over ? '#4a5068' : COLORS[k])));
    if (!s.over) {
      const gy = ghostY(s);
      for (const [x, y] of cellsOf({ ...s.cur, y: gy })) block(x, y, COLORS[s.cur.kind], true);
      for (const [x, y] of cellsOf(s.cur)) block(x, y, COLORS[s.cur.kind]);
    }
    if (s.flashT > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(s.flashT / 0.18) * 0.5})`;
      ctx.fillRect(0, 0, w, h);
    }
  }, [cell, w, h]);

  const sync = useCallback(() => {
    const p = snapshot(state.current);
    lastPanel.current = p;
    setPanel(p);
  }, []);

  useEffect(draw, [draw]);

  useGameLoop(running, (dt) => {
    const s = state.current;
    const before = s.score;
    const linesBefore = s.lines;
    const hk = held.current;
    if (hk.dir !== 0) {
      hk.das += dt;
      if (hk.das >= DAS) {
        hk.arr += dt;
        while (hk.arr >= ARR) {
          hk.arr -= ARR;
          move(s, hk.dir);
        }
      }
    }
    tick(s, dt);
    if (s.score !== before) onScore(s.score);
    const lp = lastPanel.current;
    if (s.lines !== linesBefore || s.holdUsed !== lp.holdUsed || s.queue[0] !== lp.next[0]) sync();
    draw();
    if (s.over) onGameOver(s.score);
  });

  // Actions: every one reports score and re-syncs the side panel where relevant.
  const after = useCallback(() => {
    const s = state.current;
    onScore(s.score);
    sync();
    draw();
    if (s.over) onGameOver(s.score);
  }, [onScore, sync, draw, onGameOver]);

  const act = useMemo(
    () => ({
      left: () => running && move(state.current, -1) && draw(),
      right: () => running && move(state.current, 1) && draw(),
      cw: () => running && rotate(state.current, 1) && draw(),
      ccw: () => running && rotate(state.current, -1) && draw(),
      soft: () => {
        if (!running) return;
        softStep(state.current);
        after();
      },
      hard: () => {
        if (!running) return;
        hardDrop(state.current);
        after();
      },
      hold: () => {
        if (!running) return;
        holdPiece(state.current);
        after();
      },
    }),
    [running, draw, after],
  );

  useKeys(
    running,
    (key, e) => {
      if (e.repeat && (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'a' || key === 'd')) return;
      switch (key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          held.current = { dir: -1, das: 0, arr: 0 };
          act.left();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          held.current = { dir: 1, das: 0, arr: 0 };
          act.right();
          break;
        case 'ArrowUp':
        case 'x':
        case 'X':
        case 'w':
        case 'W':
          act.cw();
          break;
        case 'z':
        case 'Z':
          act.ccw();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          state.current.softDrop = true;
          break;
        case ' ':
        case 'Spacebar':
          act.hard();
          break;
        case 'c':
        case 'C':
        case 'Shift':
          act.hold();
          break;
      }
    },
    (key) => {
      const hk = held.current;
      if ((key === 'ArrowLeft' || key === 'a' || key === 'A') && hk.dir === -1) hk.dir = 0;
      if ((key === 'ArrowRight' || key === 'd' || key === 'D') && hk.dir === 1) hk.dir = 0;
      if (key === 'ArrowDown' || key === 's' || key === 'S') state.current.softDrop = false;
    },
  );

  // Keys released while not running (e.g. paused) must not keep auto-repeating.
  useEffect(() => {
    if (!running) {
      held.current.dir = 0;
      state.current.softDrop = false;
    }
  }, [running]);

  const gestures = useMemo(
    () => ({
      enabled: running,
      dragStep: Math.max(18, cell || 24),
      onTap: () => act.cw(),
      onDoubleTap: () => act.hard(),
      onDrag: (dx: number, dy: number) => {
        for (let i = 0; i < Math.abs(dx); i++) (dx > 0 ? act.right : act.left)();
        for (let i = 0; i < dy; i++) act.soft();
      },
    }),
    [running, cell, act],
  );
  useGestures(area, gestures);

  const pressSoft = (down: boolean) => {
    state.current.softDrop = down && running;
  };

  return (
    <div className="tetris">
      <div className="tetris-top">
        <aside className="tetris-side">
          <div className="side-box">
            <span className="side-label">Hold</span>
            <MiniPiece kind={panel.hold} dim={panel.holdUsed} />
          </div>
          <div className="side-box">
            <span className="side-label">Next</span>
            {panel.next.map((k, i) => (
              <MiniPiece key={`${i}-${k}`} kind={k} />
            ))}
          </div>
          <div className="side-box stats">
            <span className="side-label">Level</span>
            <b>{panel.level}</b>
            <span className="side-label">Lines</span>
            <b>{panel.lines}</b>
          </div>
        </aside>
        <div className="tetris-area" ref={area}>
          <canvas ref={canvas} className="tetris-canvas" aria-label="Tetris board" />
        </div>
      </div>
      {touch && (
        <div className="tetris-pad">
          <button type="button" aria-label="Hold" onPointerDown={act.hold}>
            <Icon name="hold" />
          </button>
          <button type="button" aria-label="Move left" onPointerDown={act.left}>
            <Icon name="left" />
          </button>
          <button type="button" aria-label="Move right" onPointerDown={act.right}>
            <Icon name="right" />
          </button>
          <button type="button" aria-label="Rotate" onPointerDown={act.cw}>
            <Icon name="rotate" />
          </button>
          <button
            type="button"
            aria-label="Soft drop"
            onPointerDown={() => pressSoft(true)}
            onPointerUp={() => pressSoft(false)}
            onPointerLeave={() => pressSoft(false)}
            onPointerCancel={() => pressSoft(false)}
          >
            <Icon name="down" />
          </button>
          <button type="button" aria-label="Hard drop" onPointerDown={act.hard}>
            <Icon name="drop" />
          </button>
        </div>
      )}
    </div>
  );
}

function snapshot(s: TetrisState): Panel {
  return { hold: s.hold, holdUsed: s.holdUsed, next: s.queue.slice(0, 3), level: s.level, lines: s.lines };
}

export default Tetris;
