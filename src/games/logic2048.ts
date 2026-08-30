// Pure 2048 with stable tile ids so the DOM can animate slides and merges.
import type { Dir } from '../lib/gameTypes';

export const SIZE = 4;
export const WIN = 2048;

export interface Tile {
  id: number;
  value: number;
  r: number;
  c: number;
  /** Just spawned this move (scale-in). */
  isNew?: boolean;
  /** Result of a merge this move (pop). */
  merged?: boolean;
  /** Consumed by a merge: still drawn sliding into the target, then removed. */
  dying?: boolean;
}

export interface State2048 {
  tiles: Tile[];
  score: number;
  won: boolean;
  over: boolean;
  nextId: number;
}

const rand = (n: number): number => Math.floor(Math.random() * n);

const live = (tiles: Tile[]): Tile[] => tiles.filter((t) => !t.dying);

function spawn(s: State2048): void {
  const taken = new Set(live(s.tiles).map((t) => t.r * SIZE + t.c));
  const free: number[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (!taken.has(i)) free.push(i);
  if (!free.length) return;
  const i = free[rand(free.length)];
  s.tiles.push({
    id: s.nextId++,
    value: Math.random() < 0.9 ? 2 : 4,
    r: Math.floor(i / SIZE),
    c: i % SIZE,
    isNew: true,
  });
}

export function create2048(): State2048 {
  const s: State2048 = { tiles: [], score: 0, won: false, over: false, nextId: 1 };
  spawn(s);
  spawn(s);
  return s;
}

/** Drop dying tiles and clear per-move animation flags. */
export function settle(s: State2048): State2048 {
  return {
    ...s,
    tiles: live(s.tiles).map((t) => (t.isNew || t.merged ? { ...t, isNew: false, merged: false } : t)),
  };
}

/** Which way the chaos twist turns: clockwise (to the right) or not. */
export type SpinDir = 'cw' | 'ccw';

/** Quarter-turn the whole board. A rotation is an automorphism of the grid —
 *  adjacencies and corners survive, so the structure is as good as it was; only
 *  the player's mental map of "which key does what" is destroyed. Tile ids are
 *  kept so the DOM keeps animating the same nodes. Call this on a settled
 *  state (no dying/spawn flags). */
export function rotateBoard(prev: State2048, dir: SpinDir): State2048 {
  const turn = (t: Tile): Tile =>
    dir === 'cw' ? { ...t, r: t.c, c: SIZE - 1 - t.r } : { ...t, r: SIZE - 1 - t.c, c: t.r };
  return { ...prev, tiles: prev.tiles.map(turn) };
}

const canMove = (tiles: Tile[]): boolean => {
  const grid: (number | null)[][] = Array.from({ length: SIZE }, () => Array<number | null>(SIZE).fill(null));
  for (const t of tiles) grid[t.r][t.c] = t.value;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      if (v === null) return true;
      if (c + 1 < SIZE && grid[r][c + 1] === v) return true;
      if (r + 1 < SIZE && grid[r + 1][c] === v) return true;
    }
  return false;
};

/** Slide + merge. Returns a new state (moved=false → identical board). */
export function move(prev: State2048, dir: Dir): { state: State2048; moved: boolean } {
  const s: State2048 = { ...prev, tiles: live(prev.tiles).map((t) => ({ ...t, isNew: false, merged: false })) };
  const grid: (Tile | null)[][] = Array.from({ length: SIZE }, () => Array<Tile | null>(SIZE).fill(null));
  for (const t of s.tiles) grid[t.r][t.c] = t;

  const out: Tile[] = [];
  let moved = false;
  let gained = 0;

  // Walk each line from the edge we're moving toward.
  const lines: [number, number][][] = [];
  for (let i = 0; i < SIZE; i++) {
    const line: [number, number][] = [];
    for (let j = 0; j < SIZE; j++) {
      switch (dir) {
        case 'left':
          line.push([i, j]);
          break;
        case 'right':
          line.push([i, SIZE - 1 - j]);
          break;
        case 'up':
          line.push([j, i]);
          break;
        case 'down':
          line.push([SIZE - 1 - j, i]);
          break;
      }
    }
    lines.push(line);
  }

  for (const line of lines) {
    let target = 0; // index into `line` where the next tile lands
    let last: Tile | null = null; // tile at target-1 that may still merge
    for (const [r, c] of line) {
      const t = grid[r][c];
      if (!t) continue;
      if (last && last.value === t.value && !last.merged) {
        // merge into `last`: both slide to last's cell, a new tile pops there
        const [tr, tc] = line[target - 1];
        out.push({ ...t, r: tr, c: tc, dying: true });
        const idx = out.indexOf(last);
        out[idx] = { ...last, dying: true };
        const merged: Tile = { id: s.nextId++, value: t.value * 2, r: tr, c: tc, merged: true };
        out.push(merged);
        gained += merged.value;
        if (merged.value >= WIN) s.won = true;
        last = merged; // already merged → cannot merge again this move
        moved = true;
      } else {
        const [tr, tc] = line[target];
        if (tr !== t.r || tc !== t.c) moved = true;
        const placed: Tile = { ...t, r: tr, c: tc };
        out.push(placed);
        last = placed;
        target += 1;
      }
    }
  }

  if (!moved) return { state: prev, moved: false };
  s.tiles = out;
  s.score += gained;
  spawn(s);
  s.over = !canMove(live(s.tiles));
  return { state: s, moved: true };
}
