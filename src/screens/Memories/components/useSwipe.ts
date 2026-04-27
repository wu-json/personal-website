import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

/**
 * DOM-driven horizontal-swipe hook for the Memories lightbox carousel.
 *
 * The hook drives a 3-cell horizontal track:
 *
 *     [ prev ][ center ][ next ]
 *      -W       0         +W      (where W = surface width)
 *
 * The track sits at `translate3d(-W, 0, 0)` at rest so the center cell
 * occupies the visible area. During a horizontal drag the hook writes
 * `translate3d(-W + dx, 0, 0)` directly to `trackRef.current.style`
 * inside a single rAF per pointermove, with no React state churn. On
 * commit the hook animates the track to `0` (prev) or `-2W` (next),
 * fires `onCommitPrev` / `onCommitNext` after `transitionend`, then
 * synchronously resets the transform to `-W` with `transition: none`
 * so the next React render (which has swapped photo props into the
 * center cell) lands flicker-free.
 *
 * The hook is the *only* writer of `trackRef.current.style.transform`
 * and `style.transition`. Components must not pass an inline transform
 * style on the track element or React re-renders will clobber the
 * hook's writes mid-drag.
 *
 * `setPointerCapture` is intentionally deferred until axis lock
 * resolves to `'h'`. Calling it on `pointerdown` would steal `click`
 * events from buttons inside the gesture surface (close, prev, next,
 * group-cell drill-in). After a horizontal-locked gesture ends we set
 * `consumedClickRef`, which a capture-phase `click` listener on the
 * surface uses to swallow the trailing synthesized click exactly once.
 *
 * Velocity-based commit duration: a hard flick lands in ~180ms, a
 * slow controlled drag in ~360ms, with `cubic-bezier(0.2, 0.8, 0.2, 1)`
 * deceleration. Boundary rubber-banding (factor 0.2) is preserved.
 */

const AXIS_LOCK_THRESHOLD_PX = 10;
const COMMIT_DISTANCE_PX = 60;
const COMMIT_VELOCITY_PX_MS = 0.3;
const RUBBERBAND_FACTOR = 0.2;
const MIN_DURATION_MS = 180;
const MAX_DURATION_MS = 360;
const EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

type Phase = 'idle' | 'committing';

const useSwipe = ({
  hasPrev,
  hasNext,
  onCommitPrev,
  onCommitNext,
}: {
  hasPrev: boolean;
  hasNext: boolean;
  onCommitPrev: (() => void) | null;
  onCommitNext: (() => void) | null;
}) => {
  const [phase, setPhase] = useState<Phase>('idle');

  // Latest callbacks so the imperative event listeners don't need to
  // re-bind when the parent re-renders.
  const callbacksRef = useRef({ hasPrev, hasNext, onCommitPrev, onCommitNext });
  callbacksRef.current = { hasPrev, hasNext, onCommitPrev, onCommitNext };

  // Mirror `phase` into a ref so closures inside the effect bodies
  // (resize handler, animation callbacks) read the current value
  // without forcing the effects to re-run on every phase change.
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  const surfaceNodeRef = useRef<HTMLDivElement | null>(null);
  const trackNodeRef = useRef<HTMLDivElement | null>(null);

  // Per-gesture state lives in refs to avoid React re-renders during drag.
  const cellWidthRef = useRef(0);
  // When a resize fires mid-commit/mid-drag, applying the new width
  // immediately would invalidate the in-flight `animateTrackTo` target
  // (which captured the old width) and land off-center. Park the new
  // width here and pick it up at the next idle moment.
  const pendingCellWidthRef = useRef<number | null>(null);
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    startTime: 0,
    locked: null as 'h' | 'v' | null,
    dx: 0,
    captured: false,
    rafScheduled: false,
  });
  const consumedClickRef = useRef(false);

  const setRestingTransform = useCallback(() => {
    const track = trackNodeRef.current;
    if (!track) return;
    const w = cellWidthRef.current;
    track.style.transition = 'none';
    track.style.transform = `translate3d(${-w}px, 0, 0)`;
  }, []);

  const writeTrackOffset = useCallback((dx: number) => {
    const track = trackNodeRef.current;
    if (!track) return;
    const w = cellWidthRef.current;
    track.style.transition = 'none';
    track.style.transform = `translate3d(${-w + dx}px, 0, 0)`;
  }, []);

  const animateTrackTo = useCallback(
    (targetDx: number, durationMs: number, onDone: () => void) => {
      const track = trackNodeRef.current;
      if (!track) {
        onDone();
        return;
      }
      const w = cellWidthRef.current;
      const targetTransform = `translate3d(${-w + targetDx}px, 0, 0)`;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        track.removeEventListener('transitionend', finish);
        clearTimeout(timeoutId);
        onDone();
      };
      track.addEventListener('transitionend', finish);
      // Belt-and-braces: Safari occasionally drops `transitionend` after a
      // rapid sequence of style writes. The +50ms slack is well below
      // human flicker perception.
      const timeoutId = window.setTimeout(finish, durationMs + 50);
      track.style.transition = `transform ${durationMs}ms ${EASING}`;
      track.style.transform = targetTransform;
    },
    [],
  );

  // Set the resting transform whenever the track node is attached or the
  // surface size changes. Layout effect so we run before paint.
  useLayoutEffect(() => {
    const surface = surfaceNodeRef.current;
    if (!surface) return;
    const measure = () => {
      const rect = surface.getBoundingClientRect();
      if (rect.width <= 0) return;
      // Defer both the width write and the resting transform reset
      // until idle. Mutating `cellWidthRef.current` mid-commit would
      // make the in-flight `animateTrackTo` (which already captured
      // the old width for its target transform) land off-center
      // against the new width. Resetting the transform mid-commit
      // would cancel the transition with the wrong bitmap visible.
      if (dragRef.current.pointerId === -1 && phaseRef.current === 'idle') {
        cellWidthRef.current = rect.width;
        pendingCellWidthRef.current = null;
        setRestingTransform();
      } else {
        pendingCellWidthRef.current = rect.width;
      }
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(surface);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [setRestingTransform]);

  // Bind pointer + click listeners exactly once per surface node mount.
  useLayoutEffect(() => {
    const surface = surfaceNodeRef.current;
    if (!surface) return;

    const onPointerDown = (e: PointerEvent) => {
      // Ignore secondary buttons / multi-touch follow-ups.
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (dragRef.current.pointerId !== -1) return;

      const rect = surface.getBoundingClientRect();
      if (rect.width > 0) cellWidthRef.current = rect.width;

      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startTime: performance.now(),
        locked: null,
        dx: 0,
        captured: false,
        rafScheduled: false,
      };
    };

    const flushDx = () => {
      dragRef.current.rafScheduled = false;
      const { locked, dx } = dragRef.current;
      if (locked !== 'h') return;
      writeTrackOffset(dx);
    };

    const onPointerMove = (e: PointerEvent) => {
      const state = dragRef.current;
      if (state.pointerId !== e.pointerId) return;

      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;

      if (!state.locked) {
        if (
          Math.abs(dx) < AXIS_LOCK_THRESHOLD_PX &&
          Math.abs(dy) < AXIS_LOCK_THRESHOLD_PX
        ) {
          return;
        }
        state.locked = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
        if (state.locked === 'h') {
          // Capture only after axis lock so taps on inner buttons
          // (close, prev, next, drill-in) keep firing their click
          // handlers normally.
          try {
            surface.setPointerCapture(e.pointerId);
            state.captured = true;
          } catch {
            /* setPointerCapture can throw if pointer already released */
          }
        }
      }

      if (state.locked !== 'h') return;

      const { hasPrev, hasNext } = callbacksRef.current;
      const atBoundary = (dx > 0 && !hasPrev) || (dx < 0 && !hasNext);
      state.dx = atBoundary ? dx * RUBBERBAND_FACTOR : dx;

      if (!state.rafScheduled) {
        state.rafScheduled = true;
        requestAnimationFrame(flushDx);
      }
    };

    const endGesture = (e: PointerEvent) => {
      const state = dragRef.current;
      if (state.pointerId !== e.pointerId) return;

      const wasHorizontal = state.locked === 'h';
      const dx = state.dx;
      const elapsed = Math.max(1, performance.now() - state.startTime);
      const cellWidth = cellWidthRef.current;

      // Clear gesture state up front so re-entrancy from the commit
      // callback (e.g. wouter's navigate) sees an idle hook.
      if (state.captured) {
        try {
          surface.releasePointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
      }
      dragRef.current = {
        pointerId: -1,
        startX: 0,
        startY: 0,
        startTime: 0,
        locked: null,
        dx: 0,
        captured: false,
        rafScheduled: false,
      };

      if (!wasHorizontal) {
        // Vertical or untriggered tap — leave transform alone.
        return;
      }

      // Suppress the trailing click some browsers fire after a
      // captured horizontal-locked gesture. Only arm when the
      // gesture actually travelled past the axis-lock threshold —
      // a tiny axis-locked wiggle that settles back near origin
      // shouldn't eat a subsequent deliberate tap. Keep the window
      // tight: the synthesized click arrives within a few ms of
      // pointerup, well under 50ms, but a 350ms blanket would
      // swallow legitimate taps on `[close]`, prev/next, or a
      // group photo within the same interaction beat.
      if (Math.abs(dx) > AXIS_LOCK_THRESHOLD_PX) {
        consumedClickRef.current = true;
        window.setTimeout(() => {
          consumedClickRef.current = false;
        }, 50);
      }

      const { hasPrev, hasNext, onCommitPrev, onCommitNext } =
        callbacksRef.current;
      const velocity = Math.abs(dx) / elapsed; // px/ms
      const triggered =
        Math.abs(dx) > COMMIT_DISTANCE_PX || velocity > COMMIT_VELOCITY_PX_MS;
      const goingPrev = dx > 0 && hasPrev;
      const goingNext = dx < 0 && hasNext;
      const willCommit = triggered && (goingPrev || goingNext);

      const targetDx = willCommit ? (goingPrev ? cellWidth : -cellWidth) : 0;
      const remaining = Math.abs(targetDx - dx);
      const duration = Math.max(
        MIN_DURATION_MS,
        Math.min(MAX_DURATION_MS, remaining / Math.max(velocity, 0.5)),
      );

      setPhase('committing');
      animateTrackTo(targetDx, duration, () => {
        if (willCommit) {
          if (goingPrev) onCommitPrev?.();
          else if (goingNext) onCommitNext?.();
        }
        // Apply any width that arrived from a mid-commit resize
        // before snapping back to rest, so the resting transform
        // is computed against the current surface width.
        if (pendingCellWidthRef.current !== null) {
          cellWidthRef.current = pendingCellWidthRef.current;
          pendingCellWidthRef.current = null;
        }
        // Snap track back to resting position with no transition.
        // The parent's wouter navigate (called above) will swap
        // `photo` into the center cell on the next React render.
        setRestingTransform();
        setPhase('idle');
      });
    };

    const onClickCapture = (e: MouseEvent) => {
      if (consumedClickRef.current) {
        consumedClickRef.current = false;
        e.stopPropagation();
        e.preventDefault();
      }
    };

    surface.addEventListener('pointerdown', onPointerDown);
    surface.addEventListener('pointermove', onPointerMove);
    surface.addEventListener('pointerup', endGesture);
    surface.addEventListener('pointercancel', endGesture);
    surface.addEventListener('click', onClickCapture, true);

    return () => {
      surface.removeEventListener('pointerdown', onPointerDown);
      surface.removeEventListener('pointermove', onPointerMove);
      surface.removeEventListener('pointerup', endGesture);
      surface.removeEventListener('pointercancel', endGesture);
      surface.removeEventListener('click', onClickCapture, true);
    };
  }, [animateTrackTo, setRestingTransform, writeTrackOffset]);

  // Apply resting transform synchronously when the track first attaches.
  useEffect(() => {
    setRestingTransform();
  }, [setRestingTransform]);

  const surfaceRef = useCallback((node: HTMLDivElement | null) => {
    surfaceNodeRef.current = node;
  }, []);

  const trackRef = useCallback(
    (node: HTMLDivElement | null) => {
      trackNodeRef.current = node;
      if (node) setRestingTransform();
    },
    [setRestingTransform],
  );

  return { surfaceRef, trackRef, phase };
};

export { useSwipe };
