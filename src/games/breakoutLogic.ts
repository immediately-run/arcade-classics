// Pure Breakout simulation in a fixed logical space (W×H), scaled at draw time.

export const W = 400;
export const H = 560;
export const PADDLE_W = 72;
export const PADDLE_H = 12;
export const PADDLE_Y = H - 40;
export const BALL_R = 6;
const BRICK_COLS = 10;
const BRICK_ROWS = 6;
const BRICK_H = 18;
const BRICK_GAP = 4;
const BRICK_TOP = 64;
const MARGIN = 12;
const BRICK_W = (W - MARGIN * 2 - BRICK_GAP * (BRICK_COLS - 1)) / BRICK_COLS;
const ROW_POINTS = [70, 60, 50, 40, 30, 20];
const MAX_ANGLE = (65 * Math.PI) / 180;
const LIVES = 3;

export interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  row: number;
  points: number;
  alive: boolean;
}

export interface BreakoutState {
  paddleX: number; // centre
  ballX: number;
  ballY: number;
  vx: number;
  vy: number;
  speed: number;
  stuck: boolean;
  bricks: Brick[];
  lives: number;
  level: number;
  score: number;
  over: boolean;
  /** Set for one frame when something worth a flash happened. */
  hit: { x: number; y: number; t: number } | null;
  /** Level-cleared banner timer. */
  banner: number;
}

type Layout = (r: number, c: number) => boolean;
const LAYOUTS: Layout[] = [
  () => true,
  (r, c) => (r + c) % 2 === 0,
  (r, c) => Math.abs(c - (BRICK_COLS - 1) / 2) <= r + 0.5,
  (r, c) => !(r >= 2 && r <= 3 && c >= 3 && c <= 6),
];

const baseSpeed = (level: number): number => 270 + (level - 1) * 35;

function makeBricks(level: number): Brick[] {
  const layout = LAYOUTS[(level - 1) % LAYOUTS.length];
  const bricks: Brick[] = [];
  for (let r = 0; r < BRICK_ROWS; r++)
    for (let c = 0; c < BRICK_COLS; c++) {
      if (!layout(r, c)) continue;
      bricks.push({
        x: MARGIN + c * (BRICK_W + BRICK_GAP),
        y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
        w: BRICK_W,
        h: BRICK_H,
        row: r,
        points: ROW_POINTS[r] ?? 10,
        alive: true,
      });
    }
  return bricks;
}

export function createBreakout(): BreakoutState {
  return {
    paddleX: W / 2,
    ballX: W / 2,
    ballY: PADDLE_Y - BALL_R - 1,
    vx: 0,
    vy: 0,
    speed: baseSpeed(1),
    stuck: true,
    bricks: makeBricks(1),
    lives: LIVES,
    level: 1,
    score: 0,
    over: false,
    hit: null,
    banner: 0,
  };
}

export function setPaddle(s: BreakoutState, x: number): void {
  s.paddleX = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, x));
  if (s.stuck) s.ballX = s.paddleX;
}

export function launch(s: BreakoutState): void {
  if (!s.stuck || s.over) return;
  const a = (Math.random() * 0.6 - 0.3) * MAX_ANGLE;
  s.vx = Math.sin(a) * s.speed;
  s.vy = -Math.cos(a) * s.speed;
  s.stuck = false;
}

const resetBall = (s: BreakoutState): void => {
  s.stuck = true;
  s.ballX = s.paddleX;
  s.ballY = PADDLE_Y - BALL_R - 1;
  s.vx = 0;
  s.vy = 0;
};

function nextLevel(s: BreakoutState): void {
  s.level += 1;
  s.speed = baseSpeed(s.level);
  s.bricks = makeBricks(s.level);
  s.banner = 1.4;
  resetBall(s);
}

export function advance(s: BreakoutState, dt: number, paddleVel: number): void {
  if (s.over) return;
  if (s.banner > 0) s.banner = Math.max(0, s.banner - dt);
  if (s.hit) {
    s.hit.t -= dt;
    if (s.hit.t <= 0) s.hit = null;
  }
  if (paddleVel) setPaddle(s, s.paddleX + paddleVel * dt);
  if (s.stuck) return;

  // Sub-step so a fast ball never tunnels through a brick.
  const steps = Math.max(1, Math.ceil((Math.hypot(s.vx, s.vy) * dt) / (BALL_R * 0.8)));
  const sdt = dt / steps;
  for (let i = 0; i < steps; i++) {
    s.ballX += s.vx * sdt;
    s.ballY += s.vy * sdt;

    if (s.ballX - BALL_R <= 0) {
      s.ballX = BALL_R;
      s.vx = Math.abs(s.vx);
    } else if (s.ballX + BALL_R >= W) {
      s.ballX = W - BALL_R;
      s.vx = -Math.abs(s.vx);
    }
    if (s.ballY - BALL_R <= 0) {
      s.ballY = BALL_R;
      s.vy = Math.abs(s.vy);
    }

    // Paddle: angle depends on where the ball lands.
    const px = s.paddleX - PADDLE_W / 2;
    if (
      s.vy > 0 &&
      s.ballY + BALL_R >= PADDLE_Y &&
      s.ballY - BALL_R <= PADDLE_Y + PADDLE_H &&
      s.ballX >= px - BALL_R &&
      s.ballX <= px + PADDLE_W + BALL_R
    ) {
      const rel = Math.max(-1, Math.min(1, (s.ballX - s.paddleX) / (PADDLE_W / 2)));
      const a = rel * MAX_ANGLE;
      s.speed = Math.min(baseSpeed(s.level) * 1.6, s.speed * 1.015);
      s.vx = Math.sin(a) * s.speed;
      s.vy = -Math.cos(a) * s.speed;
      s.ballY = PADDLE_Y - BALL_R;
      s.hit = { x: s.ballX, y: PADDLE_Y, t: 0.15 };
    }

    // Lost the ball.
    if (s.ballY - BALL_R > H) {
      s.lives -= 1;
      if (s.lives <= 0) {
        s.over = true;
        return;
      }
      s.speed = baseSpeed(s.level);
      resetBall(s);
      return;
    }

    // Bricks: AABB vs the ball's square, reflect on the shallower axis.
    for (const b of s.bricks) {
      if (!b.alive) continue;
      if (
        s.ballX + BALL_R < b.x ||
        s.ballX - BALL_R > b.x + b.w ||
        s.ballY + BALL_R < b.y ||
        s.ballY - BALL_R > b.y + b.h
      )
        continue;
      const overlapX = Math.min(s.ballX + BALL_R - b.x, b.x + b.w - (s.ballX - BALL_R));
      const overlapY = Math.min(s.ballY + BALL_R - b.y, b.y + b.h - (s.ballY - BALL_R));
      if (overlapX < overlapY) {
        s.vx = s.ballX < b.x + b.w / 2 ? -Math.abs(s.vx) : Math.abs(s.vx);
      } else {
        s.vy = s.ballY < b.y + b.h / 2 ? -Math.abs(s.vy) : Math.abs(s.vy);
      }
      b.alive = false;
      s.score += b.points * s.level;
      s.hit = { x: b.x + b.w / 2, y: b.y + b.h / 2, t: 0.2 };
      break;
    }
    if (s.bricks.every((b) => !b.alive)) {
      s.score += 500 * s.level;
      nextLevel(s);
      return;
    }
  }
}
