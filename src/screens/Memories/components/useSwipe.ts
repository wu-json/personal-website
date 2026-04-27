import { useCallback, useEffect, useRef, useState } from 'react';

const useSwipe = ({
  onSwipeLeft,
  onSwipeRight,
}: {
  onSwipeLeft: (() => void) | null;
  onSwipeRight: (() => void) | null;
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [animating, setAnimating] = useState(false);

  const callbacksRef = useRef({ onSwipeLeft, onSwipeRight });
  callbacksRef.current = { onSwipeLeft, onSwipeRight };

  const currentOffsetRef = useRef(0);
  const nodeRef = useRef<HTMLElement | null>(null);

  const touch = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    locked: null as 'h' | 'v' | null,
    active: false,
  });

  const ref = useCallback((node: HTMLElement | null) => {
    nodeRef.current = node;
  }, []);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touch.current = {
        startX: t.clientX,
        startY: t.clientY,
        startTime: Date.now(),
        locked: null,
        active: true,
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
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        state.locked = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      }

      if (state.locked === 'v') return;

      e.preventDefault();

      const { onSwipeLeft, onSwipeRight } = callbacksRef.current;
      const atBoundary = (dx > 0 && !onSwipeRight) || (dx < 0 && !onSwipeLeft);
      const offset = atBoundary ? dx * 0.2 : dx;
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
      const velocity = Math.abs(ox) / elapsed;
      const triggered = Math.abs(ox) > 60 || velocity > 0.3;

      const { onSwipeLeft, onSwipeRight } = callbacksRef.current;
      if (triggered && ox < 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (triggered && ox > 0 && onSwipeRight) {
        onSwipeRight();
      }

      setAnimating(true);
      setOffsetX(0);
      currentOffsetRef.current = 0;
    };

    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: false });
    node.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
    };
  });

  const style: React.CSSProperties = {
    transform: offsetX ? `translateX(${offsetX}px)` : undefined,
    transition: animating
      ? 'transform 300ms cubic-bezier(0.2, 0, 0, 1)'
      : 'none',
  };

  return { ref, style };
};

export { useSwipe };
