// Pure Snake simulation — no DOM, so it stays testable and the component only
// wires input, timing and drawing.
import type { Dir } from '../lib/gameTypes';

export const COLS = 20;
export const ROWS = 20;
const START_SPEED = 7; // cells per second
const MAX_SPEED = 18;
const SPEED_STEP = 0.45;

export interface Cell {
  x: number;
  y: number;
}

export interface SnakeState {
  snake: Cell[]; // head first
  dir: Dir;
  queue: Dir[];
  food: Cell;
  speed: number;
  acc: number;
  score: number;
  alive: boolean;
  eaten: number;
  /** Ticks since the last food, for the food pulse animation. */
  t: number;
}

const DELTA: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

const randomFood = (snake: Cell[]): Cell => {
  const taken = new Set(snake.map((c) => c.y * COLS + c.x));
  const free: number[] = [];
  for (let i = 0; i < COLS * ROWS; i++) if (!taken.has(i)) free.push(i);
  const i = free[Math.floor(Math.random() * free.length)] ?? 0;
  return { x: i % COLS, y: Math.floor(i / COLS) };
};

export function createSnake(): SnakeState {
  const cx = Math.floor(COLS / 2);
  const cy = Math.floor(ROWS / 2);
  const snake = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  return {
    snake,
    dir: 'right',
    queue: [],
    food: randomFood(snake),
    speed: START_SPEED,
    acc: 0,
    score: 0,
    alive: true,
    eaten: 0,
    t: 0,
  };
}

/** Queue a turn. Reversals against the last effective direction are ignored;
 *  at most two turns are buffered so quick double-taps still register. */
export function turn(s: SnakeState, dir: Dir): void {
  const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
  if (dir === last || dir === OPPOSITE[last]) return;
  if (s.queue.length >= 2) return;
  s.queue.push(dir);
}

/** Advance by `dt` seconds; returns true when the snake died this call. */
export function advance(s: SnakeState, dt: number): boolean {
  if (!s.alive) return false;
  s.t += dt;
  s.acc += dt * s.speed;
  while (s.acc >= 1) {
    s.acc -= 1;
    if (!step(s)) return true;
  }
  return false;
}

function step(s: SnakeState): boolean {
  if (s.queue.length) s.dir = s.queue.shift() as Dir;
  const d = DELTA[s.dir];
  const head = { x: s.snake[0].x + d.x, y: s.snake[0].y + d.y };
  // Wrap-around is OFF: walls kill.
  if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
    s.alive = false;
    return false;
  }
  const ate = head.x === s.food.x && head.y === s.food.y;
  // The tail moves away this tick unless we grow, so it is not a collision.
  const body = ate ? s.snake : s.snake.slice(0, -1);
  if (body.some((c) => c.x === head.x && c.y === head.y)) {
    s.alive = false;
    return false;
  }
  s.snake.unshift(head);
  if (ate) {
    s.eaten += 1;
    s.score += 10 * (1 + Math.floor(s.eaten / 5));
    s.speed = Math.min(MAX_SPEED, s.speed + SPEED_STEP);
    s.food = randomFood(s.snake);
    s.t = 0;
  } else {
    s.snake.pop();
  }
  return true;
}
