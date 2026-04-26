import type { RefCallback } from 'react';

import { useCallback, useEffect, useRef, useState } from 'react';

type Options = {
  /**
   * IntersectionObserver `rootMargin`. One viewport of pre-roll on top and
   * bottom by default — tiles hydrate before they're on screen and unmount
   * once they've been scrolled past by more than a viewport.
   */
  rootMargin?: string;
  /**
   * Initial visibility before the observer has reported. Defaults to
   * `false` so the first render is the cheap placeholder; pass `true`
   * for above-the-fold tiles that should render live on first paint.
   */
  initial?: boolean;
};

type Result<E extends HTMLElement> = [RefCallback<E>, boolean];

/**
 * Tracks whether an element is within (or near) the viewport.
 *
 * Returns a `[ref, visible]` tuple. Attach `ref` to the element you
 * want to observe; `visible` flips to `true` once the element enters
 * the expanded root rect (defaults to a 1-viewport rootMargin on
 * top/bottom) and back to `false` once it leaves, so callers can swap
 * heavy children for a sized placeholder when scrolled well past.
 *
 * Falls back to `visible: true` when `IntersectionObserver` is
 * unavailable (SSR, ancient browsers) so the tree still renders.
 */
function useNearViewport<E extends HTMLElement = HTMLElement>(
  options: Options = {},
): Result<E> {
  const { rootMargin = '100% 0px', initial = false } = options;
  const [visible, setVisible] = useState(initial);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback<RefCallback<E>>(
    node => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node) return;

      if (
        typeof window === 'undefined' ||
        typeof IntersectionObserver === 'undefined'
      ) {
        setVisible(true);
        return;
      }

      const observer = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            setVisible(entry.isIntersecting);
          }
        },
        { rootMargin },
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [rootMargin],
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  return [ref, visible];
}

export { useNearViewport };
