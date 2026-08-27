// High-score persistence on top of the store.
//
// Private: `<private>/scores/<game>.json` — the user's own top 10 with dates.
// Shared:  `<shared>/scores/<game>/<login>.json` — one file per player per game.
//          Each player only ever writes their own file, so last-write-wins can't
//          clobber anyone else; the leaderboard merges all files at read time.
import { listFiles, readJson, writeJson, type Store } from './store';
import type { GameId } from '../data/games';

export const TOP_N = 10;

export interface ScoreEntry {
  score: number;
  /** ISO timestamp of the run. */
  date: string;
}

export interface ScoreFile {
  entries: ScoreEntry[];
}

export interface SharedScore {
  login: string;
  score: number;
  date: string;
}

export const privateScoresPath = (store: Store, game: GameId): string =>
  `${store.root}/scores/${game}.json`;

export const sharedGameDir = (store: Store, game: GameId): string =>
  `${store.root}/scores/${game}`;

/** A login is a GitHub handle, but be defensive: filenames must stay simple. */
export const safeName = (login: string): string =>
  (login.replace(/[^A-Za-z0-9_.-]/g, '_') || 'someone').slice(0, 64);

export async function readScores(store: Store, game: GameId): Promise<ScoreEntry[]> {
  const file = await readJson<ScoreFile>(privateScoresPath(store, game), { entries: [] });
  return Array.isArray(file.entries) ? file.entries : [];
}

export const bestOf = (entries: ScoreEntry[]): number =>
  entries.reduce((m, e) => (e.score > m ? e.score : m), 0);

/**
 * Insert a run into the private top 10. Returns the new list plus the
 * 0-based rank the run landed at (-1 when it did not make the table).
 */
export async function recordScore(
  store: Store,
  game: GameId,
  score: number,
): Promise<{ entries: ScoreEntry[]; rank: number }> {
  const prev = await readScores(store, game);
  if (score <= 0) return { entries: prev, rank: -1 };
  const entry: ScoreEntry = { score, date: new Date().toISOString() };
  const entries = [...prev, entry]
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, TOP_N);
  const rank = entries.indexOf(entry);
  if (store.mode === 'rw') await writeJson(privateScoresPath(store, game), { entries });
  return { entries, rank };
}

export async function readSharedScores(store: Store, game: GameId): Promise<SharedScore[]> {
  const dir = sharedGameDir(store, game);
  const names = await listFiles(dir, '.json');
  const rows = await Promise.all(
    names.map(async (n) => {
      const r = await readJson<Partial<SharedScore> | null>(`${dir}/${n}`, null);
      if (!r || typeof r.score !== 'number') return null;
      return {
        login: typeof r.login === 'string' && r.login ? r.login : n.replace(/\.json$/, ''),
        score: r.score,
        date: typeof r.date === 'string' ? r.date : '',
      } satisfies SharedScore;
    }),
  );
  return rows
    .filter((r): r is SharedScore => r !== null)
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
}

/**
 * Publish the player's best to the shared space — but only when it beats what
 * their own file already says. Returns true when a write happened.
 */
export async function submitSharedScore(
  store: Store,
  game: GameId,
  login: string,
  score: number,
): Promise<boolean> {
  if (store.mode !== 'rw' || score <= 0) return false;
  const path = `${sharedGameDir(store, game)}/${safeName(login)}.json`;
  const current = await readJson<Partial<SharedScore> | null>(path, null);
  if (current && typeof current.score === 'number' && current.score >= score) return false;
  await writeJson(path, { login, score, date: new Date().toISOString() } satisfies SharedScore);
  return true;
}
