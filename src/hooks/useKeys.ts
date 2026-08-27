import { useEffect, useRef } from 'react';

const GAME_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  ' ',
  'Spacebar',
]);

/**
 * Window keydown/keyup while `enabled`. Arrow and space keys are
 * preventDefault-ed so the host page never scrolls under the game.
 */
export function useKeys(
  enabled: boolean,
  onDown: (key: string, e: KeyboardEvent) => void,
  onUp?: (key: string) => void,
): void {
  const downRef = useRef(onDown);
  const upRef = useRef(onUp);
  useEffect(() => {
    downRef.current = onDown;
    upRef.current = onUp;
  });
  useEffect(() => {
    if (!enabled) return;
    const kd = (e: KeyboardEvent) => {
      if (GAME_KEYS.has(e.key)) e.preventDefault();
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      downRef.current(e.key, e);
    };
    const ku = (e: KeyboardEvent) => upRef.current?.(e.key);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [enabled]);
}
