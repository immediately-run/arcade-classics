import { useEffect, useRef } from 'react';

/**
 * requestAnimationFrame loop with delta time (seconds, clamped to 100 ms so a
 * background tab never produces one giant step). Runs only while `running`;
 * cleans up on unmount and when `running` flips, so StrictMode's double effect
 * never leaves a stray frame callback behind.
 */
export function useGameLoop(running: boolean, tick: (dt: number) => void): void {
  const tickRef = useRef(tick);
  useEffect(() => {
    tickRef.current = tick;
  });

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let alive = true;
    const frame = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      tickRef.current(dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [running]);
}
