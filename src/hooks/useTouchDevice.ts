import { useMemo } from 'react';

/** True when the device has a touch screen — used to show on-screen controls.
 *  Evaluated lazily (never at module scope) and never throws. */
export function useTouchDevice(): boolean {
  return useMemo(() => {
    try {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    } catch {
      return false;
    }
  }, []);
}
