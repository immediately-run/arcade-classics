// Pure Tetris simulation: 7-bag, SRS-style rotation with simple wall kicks,
// ghost, hold, next queue, lock delay, line-clear scoring and level speed-up.

export type Kind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export const KINDS: Kind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2;
export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

const LOCK_DELAY = 0.45; // s
const MAX_LOCK_RESETS = 12;
const LINE_SCORES = [0, 100, 300, 500, 800];

type Matrix = number[][];
const BASE: Record<Kind, Matrix> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

const rotateCW = (m: Matrix): Matrix => {
  const n = m.length;
  return m.map((_, r) => m.map((__, c) => m[n - 1 - c][r]));
};

/** Four rotation states per kind as [x, y] cell offsets from the piece origin. */
export const SHAPES: Record<Kind, [number, number][][]> = KINDS.reduce(
  (acc, k) => {
    const rots: [number, number][][] = [];
    let m = BASE[k];
    for (let r = 0; r < 4; r++) {
      const cells: [number, number][] = [];
      m.forEach((row, y) => row.forEach((v, x) => v && cells.push([x, y])));
      rots.push(cells);
      m = rotateCW(m);
    }
    acc[k] = rots;
    return acc;
  },
  {} as Record<Kind, [number, number][][]>,
);

// Simplified SRS: try in place, then the common horizontal and upward kicks.
const KICKS: [number, number][] = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [-2, 0],
  [2, 0],
  [-1, -1],
  [1, -1],
  [0, -2],
];

export interface Piece {
  kind: Kind;
  rot: number;
  x: number;
  y: number;
}

export type Board = (Kind | null)[][];

export interface TetrisState {
  board: Board;
  cur: Piece;
  queue: Kind[];
  hold: Kind | null;
  holdUsed: boolean;
  score: number;
  lines: number;
  level: number;
  gravityAcc: number;
  lockTimer: number;
  lockResets: number;
  softDrop: boolean;
  over: boolean;
  /** Rows cleared on the last lock — for a brief flash. */
  flash: number[];
  flashT: number;
}

const bag = (): Kind[] => {
  const b = [...KINDS];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

const spawn = (kind: Kind): Piece => ({ kind, rot: 0, x: kind === 'O' ? 4 : 3, y: 0 });

export const cellsOf = (p: Piece): [number, number][] => SHAPES[p.kind][p.rot].map(([x, y]) => [p.x + x, p.y + y]);

export function collides(board: Board, p: Piece): boolean {
  for (const [x, y] of cellsOf(p)) {
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y >= 0 && board[y][x]) return true;
  }
  return false;
}

export function createTetris(): TetrisState {
  const queue = [...bag(), ...bag()];
  const first = queue.shift() as Kind;
  return {
    board: Array.from({ length: ROWS }, () => Array<Kind | null>(COLS).fill(null)),
    cur: spawn(first),
    queue,
    hold: null,
    holdUsed: false,
    score: 0,
    lines: 0,
    level: 1,
    gravityAcc: 0,
    lockTimer: 0,
    lockResets: 0,
    softDrop: false,
    over: false,
    flash: [],
    flashT: 0,
  };
}

export const gravityInterval = (level: number): number => Math.max(0.06, Math.pow(0.82, level - 1));

const grounded = (s: TetrisState): boolean => collides(s.board, { ...s.cur, y: s.cur.y + 1 });

const touchLock = (s: TetrisState): void => {
  if (grounded(s) && s.lockResets < MAX_LOCK_RESETS) {
    s.lockTimer = 0;
    s.lockResets += 1;
  }
};

export function move(s: TetrisState, dx: number): boolean {
  if (s.over) return false;
  const p = { ...s.cur, x: s.cur.x + dx };
  if (collides(s.board, p)) return false;
  s.cur = p;
  touchLock(s);
  return true;
}

export function rotate(s: TetrisState, dir: 1 | -1): boolean {
  if (s.over || s.cur.kind === 'O') return false;
  const rot = (s.cur.rot + dir + 4) % 4;
  for (const [kx, ky] of KICKS) {
    const p = { ...s.cur, rot, x: s.cur.x + kx, y: s.cur.y + ky };
    if (!collides(s.board, p)) {
      s.cur = p;
      touchLock(s);
      return true;
    }
  }
  return false;
}

export const ghostY = (s: TetrisState): number => {
  let y = s.cur.y;
  while (!collides(s.board, { ...s.cur, y: y + 1 })) y++;
  return y;
};

/** One soft-drop step (scores 1). Returns false when the piece is grounded. */
export function softStep(s: TetrisState): boolean {
  if (s.over) return false;
  if (grounded(s)) return false;
  s.cur = { ...s.cur, y: s.cur.y + 1 };
  s.score += 1;
  s.gravityAcc = 0;
  return true;
}

export function hardDrop(s: TetrisState): void {
  if (s.over) return;
  const y = ghostY(s);
  s.score += (y - s.cur.y) * 2;
  s.cur = { ...s.cur, y };
  lock(s);
}

export function holdPiece(s: TetrisState): boolean {
  if (s.over || s.holdUsed) return false;
  const kind = s.cur.kind;
  const next = s.hold ?? (s.queue.shift() as Kind);
  s.hold = kind;
  s.holdUsed = true;
  s.cur = spawn(next);
  s.gravityAcc = 0;
  s.lockTimer = 0;
  s.lockResets = 0;
  refill(s);
  if (collides(s.board, s.cur)) s.over = true;
  return true;
}

const refill = (s: TetrisState): void => {
  if (s.queue.length < 7) s.queue.push(...bag());
};

function lock(s: TetrisState): void {
  for (const [x, y] of cellsOf(s.cur)) {
    if (y < 0) {
      s.over = true;
      return;
    }
    s.board[y][x] = s.cur.kind;
  }
  const full: number[] = [];
  for (let y = 0; y < ROWS; y++) if (s.board[y].every(Boolean)) full.push(y);
  if (full.length) {
    s.board = s.board.filter((_, y) => !full.includes(y));
    while (s.board.length < ROWS) s.board.unshift(Array<Kind | null>(COLS).fill(null));
    s.lines += full.length;
    s.score += LINE_SCORES[full.length] * s.level;
    s.level = 1 + Math.floor(s.lines / 10);
    s.flash = full;
    s.flashT = 0.18;
  }
  s.cur = spawn(s.queue.shift() as Kind);
  refill(s);
  s.holdUsed = false;
  s.gravityAcc = 0;
  s.lockTimer = 0;
  s.lockResets = 0;
  // Top-out: the new piece overlaps the stack, or the stack reaches the hidden rows.
  if (collides(s.board, s.cur) || s.board[HIDDEN_ROWS - 1].some(Boolean)) s.over = true;
}

/** Advance gravity and lock delay by `dt` seconds. */
export function tick(s: TetrisState, dt: number): void {
  if (s.over) return;
  if (s.flashT > 0) s.flashT = Math.max(0, s.flashT - dt);
  const interval = s.softDrop ? Math.min(0.04, gravityInterval(s.level) / 8) : gravityInterval(s.level);
  if (grounded(s)) {
    s.lockTimer += dt;
    if (s.lockTimer >= LOCK_DELAY) lock(s);
    return;
  }
  s.gravityAcc += dt;
  while (s.gravityAcc >= interval && !s.over) {
    s.gravityAcc -= interval;
    if (grounded(s)) break;
    s.cur = { ...s.cur, y: s.cur.y + 1 };
    if (s.softDrop) s.score += 1;
  }
}
