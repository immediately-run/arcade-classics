import { useCallback, useEffect, useRef } from 'react';
import { useElementSize } from '../hooks/useElementSize';
import { useGameLoop } from '../hooks/useGameLoop';
import { useKeys } from '../hooks/useKeys';
import { fitCanvas, roundRect } from '../lib/canvas';
import type { GameProps } from '../lib/gameTypes';
import {
  BALL_R,
  H,
  PADDLE_H,
  PADDLE_W,
  PADDLE_Y,
  W,
  advance,
  createBreakout,
  launch,
  setPaddle,
  type BreakoutState,
} from './breakoutLogic';
import './breakout.css';

const ROW_COLORS = ['#ff5c7a', '#ff8a4c', '#ffb648', '#ffe066', '#8ee36b', '#5fd4ff'];
const BOARD_BG = '#1a1208';
const PADDLE_SPEED = 520; // logical px/s via keyboard

function Breakout({ running, onScore, onGameOver }: GameProps) {
  const area = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = useElementSize(area);
  const state = useRef<BreakoutState>(createBreakout());
  const keys = useRef({ left: false, right: false });

  const scale = Math.max(0, Math.min((size.width - 8) / W, (size.height - 8) / H));
  const cw = Math.floor(W * scale);
  const ch = Math.floor(H * scale);

  const draw = useCallback(() => {
    const c = canvas.current;
    if (!c || scale <= 0) return;
    const ctx = fitCanvas(c, cw, ch);
    if (!ctx) return;
    ctx.scale(cw / W, ch / H);
    const s = state.current;
    ctx.fillStyle = BOARD_BG;
    ctx.fillRect(0, 0, W, H);

    // bricks
    for (const b of s.bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = ROW_COLORS[b.row % ROW_COLORS.length];
      roundRect(ctx, b.x, b.y, b.w, b.h, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      roundRect(ctx, b.x, b.y, b.w, b.h * 0.4, 3);
      ctx.fill();
    }

    // paddle
    ctx.fillStyle = '#ffb648';
    ctx.shadowColor = 'rgba(255,182,72,.5)';
    ctx.shadowBlur = 14;
    roundRect(ctx, s.paddleX - PADDLE_W / 2, PADDLE_Y, PADDLE_W, PADDLE_H, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    // ball
    ctx.fillStyle = '#fff4dc';
    ctx.beginPath();
    ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    if (s.hit) {
      ctx.strokeStyle = `rgba(255,255,255,${s.hit.t * 3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.hit.x, s.hit.y, 10 + (0.2 - s.hit.t) * 80, 0, Math.PI * 2);
      ctx.stroke();
    }

    // HUD inside the board: lives + level
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = '700 13px "Space Mono", monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    for (let i = 0; i < s.lives; i++) {
      ctx.beginPath();
      ctx.arc(20 + i * 16, 22, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'right';
    ctx.fillText(`LEVEL ${s.level}`, W - 14, 14);

    if (s.stuck && !s.over) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.font = '600 14px "Public Sans", system-ui, sans-serif';
      ctx.fillText(s.banner > 0 ? `Level ${s.level}` : 'Tap, click or press space to launch', W / 2, H * 0.62);
    }
  }, [scale, cw, ch]);

  useEffect(draw, [draw]);

  useGameLoop(running, (dt) => {
    const s = state.current;
    const before = s.score;
    const vel = (keys.current.right ? PADDLE_SPEED : 0) - (keys.current.left ? PADDLE_SPEED : 0);
    advance(s, dt, vel);
    if (s.score !== before) onScore(s.score);
    draw();
    if (s.over) onGameOver(s.score);
  });

  useKeys(
    running,
    (key) => {
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') keys.current.left = true;
      else if (key === 'ArrowRight' || key === 'd' || key === 'D') keys.current.right = true;
      else if (key === ' ' || key === 'Spacebar' || key === 'ArrowUp' || key === 'w' || key === 'W') launch(state.current);
    },
    (key) => {
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') keys.current.left = false;
      if (key === 'ArrowRight' || key === 'd' || key === 'D') keys.current.right = false;
    },
  );

  useEffect(() => {
    if (!running) keys.current = { left: false, right: false };
  }, [running]);

  // Paddle follows the pointer's x in logical units; a tap/click launches.
  const toLogicalX = (clientX: number): number => {
    const c = canvas.current;
    if (!c) return W / 2;
    const r = c.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * W;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!running) return;
    if (e.pointerType === 'mouse' || e.buttons > 0 || e.pointerType === 'touch' || e.pointerType === 'pen')
      setPaddle(state.current, toLogicalX(e.clientX));
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (!running) return;
    setPaddle(state.current, toLogicalX(e.clientX));
    launch(state.current);
  };

  return (
    <div className="breakout" ref={area} onPointerMove={onPointerMove} onPointerDown={onPointerDown}>
      <canvas ref={canvas} className="breakout-canvas" aria-label="Breakout board" />
    </div>
  );
}

export default Breakout;
