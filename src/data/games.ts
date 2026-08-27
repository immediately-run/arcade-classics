// The cabinet's catalog. Pure data — components read it, never define it.

export type GameId = 'snake' | 'tetris' | 'breakout' | '2048';

export interface GameMeta {
  id: GameId;
  name: string;
  tagline: string;
  /** One-line control hint shown on the card and on the start overlay. */
  controls: string;
  /** In-game palette: the game's own accent + board background. */
  accent: string;
  board: string;
}

export const GAMES: GameMeta[] = [
  {
    id: 'snake',
    name: 'Snake',
    tagline: 'Eat, grow, do not touch the walls. It gets faster.',
    controls: 'Arrows / WASD, swipe or the D-pad',
    accent: '#5ef2a0',
    board: '#0b1a12',
  },
  {
    id: 'tetris',
    name: 'Tetris',
    tagline: 'Seven tetrominoes, ghost piece, hold and a three-piece preview.',
    controls: 'Arrows to move, up to rotate, space to drop; tap, drag and double-tap on touch',
    accent: '#7cc4ff',
    board: '#0d1020',
  },
  {
    id: 'breakout',
    name: 'Breakout',
    tagline: 'One paddle, one ball, three lives, a few walls of bricks.',
    controls: 'Move the pointer or your finger, tap or space to launch',
    accent: '#ffb648',
    board: '#1a1208',
  },
  {
    id: '2048',
    name: '2048',
    tagline: 'Slide, merge, reach the tile. One undo when it goes wrong.',
    controls: 'Arrows / WASD or swipe',
    accent: '#f4c26a',
    board: '#2b2418',
  },
];

export const GAME_IDS: GameId[] = GAMES.map((g) => g.id);

export const gameById = (id: GameId): GameMeta => GAMES.find((g) => g.id === id) ?? GAMES[0];
