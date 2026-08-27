# Arcade classics

Snake, Tetris, Breakout and 2048 in one cabinet — with high scores that live in
your files and a shared leaderboard for friends. An example app for
[immediately.run](https://immediately.run): React + TypeScript, no server, no
build step at runtime, no external dependencies beyond React and the SDK.

## Try it

Open it on immediately.run:

<https://immediately.run/present/github/immediately-run/arcade-classics/main/files/src/App.tsx>

Works at phone sizes (375×667 and up, with swipe gestures and on-screen
controls) and on the desktop (keyboard).

## The games

| Game | Controls | Notes |
| --- | --- | --- |
| **Snake** | Arrows / WASD, swipe, on-screen D-pad | 20×20 grid on a canvas, speed ramps with every meal, walls kill (no wrap-around). |
| **Tetris** | ← → move, ↑ / X rotate, Z rotate back, ↓ soft drop, space hard drop, C / shift hold. Touch: tap rotates, drag left/right moves, drag down soft-drops, double-tap hard-drops, plus visible buttons. | 7-bag, SRS-style rotation with simple wall kicks, ghost piece, hold, next-3 preview, lock delay, 100/300/500/800 line scoring × level, gravity speeds up every 10 lines. |
| **Breakout** | Paddle follows the pointer or your finger; ← → also work; tap / click / space launches | Bounce angle depends on where the ball hits the paddle, 3 lives, brick rows worth 70…20 points, four level layouts that loop with rising speed. |
| **2048** | Arrows / WASD or swipe; U or backspace undoes | DOM tiles with CSS slide + merge animations, one undo per move, "keep going" after 2048. |

Every game runs in a `requestAnimationFrame` loop with delta time, pauses when
the tab is hidden, and shares one HUD: score, personal best, pause, restart,
back. Esc or P toggles pause.

## How data is stored

Everything goes through the immediately.run filesystem (`fs`), via
`src/lib/store.ts`:

- **Private high scores** — `<private>/scores/<game>.json`, your top 10 runs
  with dates, in this app's per-user settings folder. No prompts; this works
  the moment the app loads.
- **Shared leaderboard (optional)** — from the Leaderboard screen, pick an
  existing space or create an "Arcade" space. Each player writes only
  **their own** file, `<shared>/scores/<game>/<login>.json`, holding their best
  for that game. Because nobody ever rewrites anyone else's file, last-write-wins
  can't clobber a score. The leaderboard merges every file in the directory and
  polls it every 4 s (shared spaces raise no remote watch events).
- **`<private>/config.json`** remembers the chosen space so it re-opens at boot.

### Multi-user notes

- The app cannot invite people: share the space itself from immediately.run's
  Spaces UI. Anyone with read access sees the board; write access is needed to
  post a score.
- Player identity is the GitHub login reported by the host (`useAuth`). When
  the host reports none, scores post as "someone".
- A space created from inside the app may need to be picked once more on the
  next load (the host records no durable grant for created spaces yet); the app
  says so and offers the picker.

## Local development

```bash
npm install
npm run dev      # vite; persistence goes to ./devfs-playground (git-ignored)
npm run build    # tsc + vite build
npm run lint     # includes the React Fast Refresh rule immediately.run relies on
```

Under `vite dev` there is no host, so the private store and the "shared" store
are both local folders and `useAuth` reports no user.

## Layout

```
src/App.tsx              entry — boots the stores, routes cabinet / game / leaderboard
src/components/          Cabinet, GameCard, GameShell (HUD + state machine), Leaderboard, DPad, Icon, ThemeSwitch
src/games/               one <Game>.tsx + pure <game>Logic.ts + .css per game
src/lib/store.ts         private / shared store over the immediately.run fs
src/lib/scores.ts        top-10 files and the one-file-per-player shared layout
src/hooks/               rAF loop, gestures, keys, element size, touch detection
```

MIT — see `LICENSE`.
