// App-wide state: the private store, per-game bests, the optional shared space.
// Lives outside any component file (Fast Refresh rule); App.tsx provides it and
// `useArcade()` reads it.
import { createContext } from 'react';
import type { GameId } from '../data/games';
import type { Store } from './store';

export interface ScoreResult {
  /** 0-based rank in the private top 10, -1 when it did not make it. */
  rank: number;
  /** True when this run is the new personal best. */
  newBest: boolean;
  /** True when the run was published to the shared leaderboard. */
  shared: boolean;
}

export type Bests = Record<GameId, number>;

export interface ArcadeState {
  /** False until the private store has been opened and bests read. */
  ready: boolean;
  privateStore: Store | null;
  bests: Bests;
  /** The signed-in login, else the user's chosen display name, or '' when unknown. */
  login: string;
  /** True when `login` came from the host (the name setting is then hidden). */
  loginFromHost: boolean;
  setDisplayName: (name: string) => Promise<void>;
  shared: Store | null;
  /** Name of a remembered space whose grant could not be re-opened silently
   *  (e.g. one created with `createSharedStore`, which records no durable
   *  grant). The user must pick it again via `openShared('pick')`. */
  sharedPending: string | null;
  sharedBusy: boolean;
  sharedError: string | null;
  recordScore: (game: GameId, score: number) => Promise<ScoreResult>;
  openShared: (mode: 'pick' | 'create') => Promise<void>;
  forgetShared: () => Promise<void>;
}

export const EMPTY_BESTS: Bests = { snake: 0, tetris: 0, breakout: 0, '2048': 0 };

export const ArcadeContext = createContext<ArcadeState>({
  ready: false,
  privateStore: null,
  bests: EMPTY_BESTS,
  login: '',
  loginFromHost: false,
  setDisplayName: async () => {},
  shared: null,
  sharedPending: null,
  sharedBusy: false,
  sharedError: null,
  recordScore: async () => ({ rank: -1, newBest: false, shared: false }),
  openShared: async () => {},
  forgetShared: async () => {},
});
