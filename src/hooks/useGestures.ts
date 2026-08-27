import { useEffect, type RefObject } from 'react';
import type { Dir } from '../lib/gameTypes';

export interface GestureHandlers {
  /** A quick flick in one direction. */
  onSwipe?: (dir: Dir) => void;
  /** Continuous drag: called each time the pointer travels `dragStep` px
   *  horizontally (dx = ±1) or vertically (dy = ±1) since the last call. */
  onDrag?: (dx: number, dy: number) => void;
  onTap?: (x: number, y: number) => void;
  onDoubleTap?: () => void;
  /** Distance a drag must cover per `onDrag` call. */
  dragStep?: number;
  enabled?: boolean;
}

const SWIPE_MIN = 24;
const TAP_MAX = 10;
const DOUBLE_TAP_MS = 280;

/**
 * Pointer-event gesture recogniser for a game surface. Attach `touch-action:
 * none` to the element so the browser does not scroll/zoom while playing.
 */
export function useGestures(ref: RefObject<HTMLElement | null>, h: GestureHandlers): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || h.enabled === false) return;
    const step = h.dragStep ?? 28;
    let active = false;
    let id = -1;
    let sx = 0;
    let sy = 0;
    let lx = 0;
    let ly = 0;
    let moved = false;
    let dragged = false;
    let lastTap = 0;

    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      active = true;
      id = e.pointerId;
      sx = lx = e.clientX;
      sy = ly = e.clientY;
      moved = false;
      dragged = false;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* not capturable */
      }
    };
    const move = (e: PointerEvent) => {
      if (!active || e.pointerId !== id) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) > TAP_MAX || Math.abs(dy) > TAP_MAX) moved = true;
      if (!h.onDrag) return;
      const ddx = e.clientX - lx;
      const ddy = e.clientY - ly;
      if (Math.abs(ddx) >= step) {
        const n = Math.trunc(ddx / step);
        lx += n * step;
        dragged = true;
        h.onDrag(n, 0);
      }
      if (Math.abs(ddy) >= step) {
        const n = Math.trunc(ddy / step);
        ly += n * step;
        dragged = true;
        h.onDrag(0, n);
      }
    };
    const up = (e: PointerEvent) => {
      if (!active || e.pointerId !== id) return;
      active = false;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!moved) {
        const now = performance.now();
        if (h.onDoubleTap && now - lastTap < DOUBLE_TAP_MS) {
          lastTap = 0;
          h.onDoubleTap();
        } else {
          lastTap = now;
          h.onTap?.(e.clientX, e.clientY);
        }
        return;
      }
      if (dragged || !h.onSwipe) return;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
      if (Math.abs(dx) > Math.abs(dy)) h.onSwipe(dx > 0 ? 'right' : 'left');
      else h.onSwipe(dy > 0 ? 'down' : 'up');
    };
    const cancel = () => {
      active = false;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
    };
  }, [ref, h]);
}
