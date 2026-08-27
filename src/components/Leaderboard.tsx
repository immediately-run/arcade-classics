import { useEffect, useState } from 'react';
import { GAMES, type GameId } from '../data/games';
import { useArcade } from '../hooks/useArcade';
import { formatDate, formatScore } from '../lib/canvas';
import { readScores, readSharedScores, sharedGameDir, type ScoreEntry, type SharedScore } from '../lib/scores';
import { pollDir } from '../lib/store';
import Icon from './Icon';

interface LeaderboardProps {
  onBack: () => void;
}

const POLL_MS = 4000;

function Leaderboard({ onBack }: LeaderboardProps) {
  const { privateStore, shared, sharedPending, sharedBusy, sharedError, openShared, forgetShared, login, bests } =
    useArcade();
  const [game, setGame] = useState<GameId>('snake');
  // Results are keyed by what they were loaded for, so switching tabs shows a
  // loading state without a synchronous setState in the effect.
  const mineKey = `${privateStore?.root ?? ''}|${game}|${bests[game]}`;
  const [mineLoaded, setMineLoaded] = useState<{ key: string; list: ScoreEntry[] } | null>(null);
  const mine = privateStore ? (mineLoaded?.key === mineKey ? mineLoaded.list : null) : [];
  const sharedKey = `${shared?.root ?? ''}|${game}`;
  const [rowsLoaded, setRowsLoaded] = useState<{ key: string; list: SharedScore[] } | null>(null);
  const rows = rowsLoaded?.key === sharedKey ? rowsLoaded.list : null;

  // Personal top 10 for the selected game.
  useEffect(() => {
    if (!privateStore) return;
    let cancelled = false;
    void readScores(privateStore, game).then((list) => {
      if (!cancelled) setMineLoaded({ key: mineKey, list });
    });
    return () => {
      cancelled = true;
    };
  }, [privateStore, game, mineKey]);

  // Shared rows: read now, then poll the game's directory (other players' writes
  // never raise watch events, so polling is the live-update mechanism).
  useEffect(() => {
    if (!shared) return;
    let cancelled = false;
    const load = () =>
      readSharedScores(shared, game).then((list) => {
        if (!cancelled) setRowsLoaded({ key: sharedKey, list });
      });
    void load();
    const stop = pollDir(sharedGameDir(shared, game), () => void load(), POLL_MS);
    return () => {
      cancelled = true;
      stop();
    };
  }, [shared, game, sharedKey]);

  const me = login || 'someone';

  return (
    <div className="lb">
      <header className="hud">
        <button className="hud-btn" type="button" onClick={onBack} aria-label="Back to the cabinet">
          <Icon name="back" />
        </button>
        <h1 className="hud-title">Leaderboard</h1>
      </header>

      <main className="lb-main">
        <div className="tabs" role="tablist" aria-label="Game">
          {GAMES.map((g) => (
            <button
              key={g.id}
              role="tab"
              type="button"
              aria-selected={g.id === game}
              className={g.id === game ? 'tab on' : 'tab'}
              onClick={() => setGame(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>

        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="users" size={18} /> Shared
            </h2>
            {shared && (
              <span className="chip">
                {shared.name ?? 'Arcade'}
                {shared.mode === 'ro' ? ' · read-only' : ''}
              </span>
            )}
          </div>

          {!shared ? (
            <div className="share-cta">
              {sharedPending && (
                <p className="note">
                  Your space "{sharedPending}" could not be re-opened silently — pick it again to reconnect.
                </p>
              )}
              <p>
                Connect a space and every player's best lands in it as their own file. Share the space itself with
                friends from immediately.run's Spaces UI — the app cannot invite people.
              </p>
              <div className="row">
                <button className="btn btn-primary" type="button" disabled={sharedBusy} onClick={() => openShared('pick')}>
                  Open a shared space
                </button>
                <button className="btn btn-ghost" type="button" disabled={sharedBusy} onClick={() => openShared('create')}>
                  Create an "Arcade" space
                </button>
              </div>
              {sharedError && <p className="err">{sharedError}</p>}
            </div>
          ) : (
            <>
              {rows === null ? (
                <p className="muted">Loading…</p>
              ) : rows.length === 0 ? (
                <p className="muted">Nobody has posted a {GAMES.find((g) => g.id === game)?.name} score here yet.</p>
              ) : (
                <ol className="rows">
                  {rows.map((r, i) => (
                    <li key={r.login} className={r.login === me ? 'me' : undefined}>
                      <span className="rank">{i + 1}</span>
                      <span className="who">{r.login}</span>
                      <span className="when">{formatDate(r.date)}</span>
                      <span className="pts">{formatScore(r.score)}</span>
                    </li>
                  ))}
                </ol>
              )}
              <div className="panel-foot">
                <span className="muted">Refreshes every {POLL_MS / 1000} s.</span>
                <button className="btn btn-ghost small" type="button" onClick={() => void forgetShared()}>
                  Disconnect
                </button>
              </div>
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="trophy" size={18} /> Your top 10
            </h2>
          </div>
          {mine === null ? (
            <p className="muted">Loading…</p>
          ) : mine.length === 0 ? (
            <p className="muted">No runs yet — go play.</p>
          ) : (
            <ol className="rows">
              {mine.map((e, i) => (
                <li key={`${e.date}-${i}`}>
                  <span className="rank">{i + 1}</span>
                  <span className="who">{formatDate(e.date)}</span>
                  <span className="pts">{formatScore(e.score)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}

export default Leaderboard;
