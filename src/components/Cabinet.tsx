import { GAMES, type GameId } from '../data/games';
import { useArcade } from '../hooks/useArcade';
import GameCard from './GameCard';
import Icon from './Icon';
import ThemeSwitch from './ThemeSwitch';

interface CabinetProps {
  onPlay: (id: GameId) => void;
  onLeaderboard: () => void;
}

function Cabinet({ onPlay, onLeaderboard }: CabinetProps) {
  const { bests, ready, shared, sharedPending, privateStore } = useArcade();
  return (
    <div className="cabinet">
      <header className="topbar">
        <div className="logo">
          <span className="mark" />
          <span>Arcade classics</span>
        </div>
        <ThemeSwitch />
      </header>
      <main className="cabinet-main">
        <p className="lede">
          Four classics, <b>one cabinet</b>. Your high scores live in your own files; open a shared space to race friends.
        </p>
        <div className="gcards">
          {GAMES.map((g) => (
            <GameCard key={g.id} game={g} best={bests[g.id]} loading={!ready} onPlay={() => onPlay(g.id)} />
          ))}
        </div>
        <button className="lb-card" type="button" onClick={onLeaderboard}>
          <span className="lb-ic">
            <Icon name="trophy" size={22} />
          </span>
          <span className="lb-text">
            <b>Leaderboard</b>
            <span>
              {shared
                ? `Shared space "${shared.name ?? 'Arcade'}" connected${shared.mode === 'ro' ? ' (read-only)' : ''}.`
                : sharedPending
                  ? `Space "${sharedPending}" needs reconnecting.`
                  : 'Your top 10 per game. Connect a shared space to compare with friends.'}
            </span>
          </span>
          <span className="lb-go">→</span>
        </button>
        <footer className="foot">
          {privateStore
            ? 'Scores are saved to your private app folder on immediately.run.'
            : ready
              ? 'No private folder available here — scores last for this session only.'
              : 'Opening your private folder…'}
        </footer>
      </main>
    </div>
  );
}

export default Cabinet;
