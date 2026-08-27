// The contract every game component implements. The GameShell owns the HUD and
// the ready/playing/paused/over state machine; a game only simulates and draws.

export interface GameProps {
  /** True while the shell says "playing". Loops and input must stop otherwise. */
  running: boolean;
  /** Report the current score whenever it changes. */
  onScore: (score: number) => void;
  /** The run ended; the shell records the score and shows the overlay. */
  onGameOver: (finalScore: number) => void;
}

export type Dir = 'up' | 'down' | 'left' | 'right';
