// Root component — immediately.run renders the default export of THIS file.
// Global CSS is imported here (not in main.tsx) because immediately.run's
// runtime never loads main.tsx; anything the rendered tree needs must be
// reachable from App.tsx.
import './index.css';
import './App.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@immediately-run/sdk/auth';
import { GAME_IDS, gameById, type GameId } from './data/games';
import { ArcadeContext, EMPTY_BESTS, type ArcadeState, type Bests, type ScoreResult } from './lib/arcadeContext';
import { readConfig, writeConfig, type ArcadeConfig } from './lib/config';
import { bestOf, readScores, recordScore as persistScore, submitSharedScore } from './lib/scores';
import {
  createSharedStore,
  openPrivateStore,
  openRememberedSpace,
  pickSharedStore,
  type Store,
} from './lib/store';
import Cabinet from './components/Cabinet';
import GameShell from './components/GameShell';
import Leaderboard from './components/Leaderboard';
import Snake from './games/Snake';
import Tetris from './games/Tetris';
import Breakout from './games/Breakout';
import Game2048 from './games/Game2048';

type Screen = 'home' | 'leaderboard' | GameId;

const GAME_COMPONENTS = { snake: Snake, tetris: Tetris, breakout: Breakout, '2048': Game2048 } as const;

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const auth = useAuth();
  const hostLogin = auth.user?.login ?? '';
  // Stage apps get no user from the host: fall back to a name the player picks.
  const [displayName, setDisplayNameState] = useState('');
  const login = hostLogin || displayName.trim();

  const [ready, setReady] = useState(false);
  const [privateStore, setPrivateStore] = useState<Store | null>(null);
  // Last config written/read, so partial updates never drop the other keys.
  const configRef = useRef<ArcadeConfig>({});
  const saveConfig = useCallback(
    async (patch: ArcadeConfig) => {
      configRef.current = { ...configRef.current, ...patch };
      if (privateStore) await writeConfig(privateStore, configRef.current);
    },
    [privateStore],
  );
  const [bests, setBests] = useState<Bests>(EMPTY_BESTS);
  const bestsRef = useRef(bests);
  useEffect(() => {
    bestsRef.current = bests;
  }, [bests]);
  const [shared, setShared] = useState<Store | null>(null);
  const [sharedPending, setSharedPending] = useState<string | null>(null);
  const [sharedBusy, setSharedBusy] = useState(false);
  const [sharedError, setSharedError] = useState<string | null>(null);

  // Boot: open the private store FIRST (and keep it), read bests + config, then
  // silently re-open a remembered shared space. StrictMode runs this twice in
  // dev — the `cancelled` flag makes the first run a no-op before any state lands.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let store: Store | null = null;
      try {
        store = await openPrivateStore('data');
      } catch {
        store = null; // no host / not signed in → play with in-memory bests
      }
      if (cancelled) return;
      if (store) {
        const s = store;
        const [lists, cfg] = await Promise.all([
          Promise.all(GAME_IDS.map((g) => readScores(s, g))),
          readConfig(s),
        ]);
        if (cancelled) return;
        const b: Bests = { ...EMPTY_BESTS };
        GAME_IDS.forEach((g, i) => {
          b[g] = bestOf(lists[i]);
        });
        setPrivateStore(s);
        setBests(b);
        configRef.current = cfg;
        if (cfg.displayName) setDisplayNameState(cfg.displayName);
        if (cfg.sharedSpaceId) {
          const remembered = await openRememberedSpace(cfg.sharedSpaceId);
          if (cancelled) return;
          if (remembered) setShared({ ...remembered, name: remembered.name ?? cfg.sharedName });
          else setSharedPending(cfg.sharedName ?? 'Arcade'); // grant gone or never durable → re-pick
        }
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const recordScore = useCallback(
    async (game: GameId, score: number): Promise<ScoreResult> => {
      const newBest = score > bestsRef.current[game];
      if (newBest) setBests((b) => ({ ...b, [game]: score }));
      let rank = -1;
      if (privateStore) {
        try {
          rank = (await persistScore(privateStore, game, score)).rank;
        } catch {
          rank = -1;
        }
      } else if (score > 0) {
        rank = newBest ? 0 : -1;
      }
      let sharedOk = false;
      if (shared) {
        try {
          sharedOk = await submitSharedScore(shared, game, login || 'someone', score);
        } catch {
          sharedOk = false;
        }
      }
      return { rank, newBest, shared: sharedOk };
    },
    [privateStore, shared, login],
  );

  const openShared = useCallback(
    async (mode: 'pick' | 'create') => {
      setSharedBusy(true);
      setSharedError(null);
      try {
        const s = mode === 'pick' ? await pickSharedStore() : await createSharedStore('Arcade');
        setShared(s);
        setSharedPending(null);
        if (s.spaceId) await saveConfig({ sharedSpaceId: s.spaceId, sharedName: s.name });
      } catch (e) {
        const err = e as { code?: string; message?: string };
        if (err?.code !== 'cancelled') {
          setSharedError(
            err?.code === 'auth-required'
              ? 'Sign in to open a shared space.'
              : err?.code === 'forbidden'
                ? 'This app is not allowed to open spaces here.'
                : (err?.message ?? 'Could not open a shared space.'),
          );
        }
      } finally {
        setSharedBusy(false);
      }
    },
    [saveConfig],
  );

  const forgetShared = useCallback(async () => {
    setShared(null);
    setSharedPending(null);
    setSharedError(null);
    await saveConfig({ sharedSpaceId: undefined, sharedName: undefined });
  }, [saveConfig]);

  const setDisplayName = useCallback(
    async (name: string) => {
      setDisplayNameState(name);
      await saveConfig({ displayName: name.trim() || undefined });
    },
    [saveConfig],
  );

  const state = useMemo<ArcadeState>(
    () => ({
      ready,
      privateStore,
      bests,
      login,
      loginFromHost: hostLogin !== '',
      setDisplayName,
      shared,
      sharedPending,
      sharedBusy,
      sharedError,
      recordScore,
      openShared,
      forgetShared,
    }),
    [
      ready,
      privateStore,
      bests,
      login,
      hostLogin,
      setDisplayName,
      shared,
      sharedPending,
      sharedBusy,
      sharedError,
      recordScore,
      openShared,
      forgetShared,
    ],
  );

  const goHome = useCallback(() => setScreen('home'), []);

  let view: React.ReactNode;
  if (screen === 'home') {
    view = <Cabinet onPlay={(id) => setScreen(id)} onLeaderboard={() => setScreen('leaderboard')} />;
  } else if (screen === 'leaderboard') {
    view = <Leaderboard onBack={goHome} />;
  } else {
    view = <GameShell key={screen} game={gameById(screen)} Game={GAME_COMPONENTS[screen]} onBack={goHome} />;
  }

  return <ArcadeContext.Provider value={state}>{view}</ArcadeContext.Provider>;
}

export default App;
