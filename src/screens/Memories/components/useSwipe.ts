import { useCallback, useEffect, useRef, useState } from 'react';

const COMMIT_MS = 300;
const COMMIT_FALLBACK_MS = 350;
const TRIGGER_PX = 60;
const TRIGGER_VELOCITY = 0.3;
const DEADZONE_PX = 10;
const RUBBER_BAND = 0.2;

const useSwipe = ({
  onSwipeLeft,
  onSwipeRight,
  hasPrev,
  hasNext,
  currentKey,
}: {
  onSwipeLeft: (() => void) | null;
  onSwipeRight: (() => void) | null;
  hasPrev: boolean;
  hasNext: boolean;
  currentKey: string;
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [animating, setAnimating] = useState(false);

  const callbacksRef = useRef({ onSwipeLeft, onSwipeRight, hasPrev, hasNext });
  callbacksRef.current = { onSwipeLeft, onSwipeRight, hasPrev, hasNext };

  const currentOffsetRef = useRef(0);
  const viewportNodeRef = useRef<HTMLElement | null>(null);
  const trackNodeRef = useRef<HTMLElement | null>(null);
  const committingRef = useRef(false);

  const touch = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    locked: null as 'h' | 'v' | null,
    active: false,
    viewportWidth: 0,
  });

  const viewportRef = useCallback((node: HTMLElement | null) => {
    viewportNodeRef.current = node;
  }, []);
  const trackRef = useCallback((node: HTMLElement | null) => {
    trackNodeRef.current = node;
  }, []);

  // Reset to center whenever the parent swaps the current view via paths
  // other than this hook (keyboard nav, on-screen chevrons). This is also a
  // no-op idempotent reset after the post-commit batched update lands.
  useEffect(() => {
    setOffsetX(0);
    setAnimating(false);
    currentOffsetRef.current = 0;
  }, [currentKey]);

  useEffect(() => {
    const node = viewportNodeRef.current;
    if (!node) return;

    const onStart = (e: TouchEvent) => {
      if (committingRef.current) return;
      const t = e.touches[0];
      touch.current = {
        startX: t.clientX,
        startY: t.clientY,
        startTime: Date.now(),
        locked: null,
        active: true,
        viewportWidth: node.clientWidth,
      };
      setAnimating(false);
      setOffsetX(0);
      currentOffsetRef.current = 0;
    };

    const onMove = (e: TouchEvent) => {
      const state = touch.current;
      if (!state.active) return;

      const t = e.touches[0];
      const dx = t.clientX - state.startX;
      const dy = t.clientY - state.startY;

      if (!state.locked) {
        if (Math.abs(dx) < DEADZONE_PX && Math.abs(dy) < DEADZONE_PX) return;
        state.locked = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      }

      if (state.locked === 'v') return;

      e.preventDefault();

      const { hasPrev, hasNext } = callbacksRef.current;
      const atBoundary = (dx > 0 && !hasPrev) || (dx < 0 && !hasNext);
      const offset = atBoundary ? dx * RUBBER_BAND : dx;
      currentOffsetRef.current = offset;
      setOffsetX(offset);
    };

    const onEnd = () => {
      const state = touch.current;
      if (!state.active) return;
      state.active = false;

      if (state.locked !== 'h') {
        setOffsetX(0);
        currentOffsetRef.current = 0;
        return;
      }

      const ox = currentOffsetRef.current;
      const elapsed = Date.now() - state.startTime;
      const velocity = Math.abs(ox) / Math.max(elapsed, 1);
      const triggered =
        Math.abs(ox) > TRIGGER_PX || velocity > TRIGGER_VELOCITY;

      const { onSwipeLeft, onSwipeRight, hasPrev, hasNext } =
        callbacksRef.current;

      const goingLeft = ox < 0;
      const canCommit =
        triggered &&
        ((goingLeft && hasNext && onSwipeLeft) ||
          (!goingLeft && hasPrev && onSwipeRight));

      if (!canCommit) {
        // Cancel: animate back to centered.
        setAnimating(true);
        setOffsetX(0);
        currentOffsetRef.current = 0;
        return;
      }

      // Commit: animate the track a full slide width in the swipe direction,
      // then on transitionend (filtered to track + transform) fire the
      // navigation callback and snap back to center in a single batched
      // update so the parent's re-render and our local snap apply together.
      const sign = goingLeft ? -1 : 1;
      const target = sign * state.viewportWidth;

      committingRef.current = true;
      setAnimating(true);
      setOffsetX(target);
      currentOffsetRef.current = target;

      const trackEl = trackNodeRef.current;
      let resolved = false;
      const resolve = () => {
        if (resolved) return;
        resolved = true;
        if (trackEl) trackEl.removeEventListener('transitionend', onTrans);
        clearTimeout(fallback);
        committingRef.current = false;
        // Snap to center without animation, batched with the navigation call
        // so React 18 applies both in the same render.
        setAnimating(false);
        setOffsetX(0);
        currentOffsetRef.current = 0;
        if (goingLeft) onSwipeLeft?.();
        else onSwipeRight?.();
      };
      const onTrans = (ev: TransitionEvent) => {
        if (ev.target !== trackEl) return;
        if (ev.propertyName !== 'transform') return;
        resolve();
      };
      if (trackEl) trackEl.addEventListener('transitionend', onTrans);
      const fallback = setTimeout(resolve, COMMIT_FALLBACK_MS);
    };

    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: false });
    node.addEventListener('touchend', onEnd, { passive: true });
    node.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
      node.removeEventListener('touchcancel', onEnd);
    };
  });

  // Track is 3 slots wide (300% of the viewport). Slot 1 (current) is
  // centered when the track is shifted left by 1/3 of its own width
  // (== 1 viewport width). Drag/commit offsets are in px relative to that
  // resting position.
  const trackStyle: React.CSSProperties = {
    transform: `translate3d(calc(-33.3333% + ${offsetX}px), 0, 0)`,
    transition: animating
      ? `transform ${COMMIT_MS}ms cubic-bezier(0.2, 0, 0, 1)`
      : 'none',
  };

  return { viewportRef, trackRef, trackStyle };
};

export { useSwipe };
