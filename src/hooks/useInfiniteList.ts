import { useCallback, useEffect, useRef, useState } from 'react';

type UseInfiniteListOptions = {
  /** Number of items to reveal when the sentinel intersects. */
  pageSize?: number;
  /** Number of items rendered on first mount. Defaults to `pageSize`. */
  initialSize?: number;
  /** IntersectionObserver `rootMargin`. Fetch ahead so the reveal feels seamless. */
  rootMargin?: string;
};

type UseInfiniteListResult = {
  visibleCount: number;
  sentinelRef: (node: HTMLElement | null) => void;
  done: boolean;
};

/**
 * Scroll-triggered windowed rendering for static lists.
 *
 * Tracks a `visibleCount` that grows by `pageSize` every time the sentinel
 * element enters (or nears) the viewport. Callers slice their data by
 * `visibleCount` and attach `sentinelRef` to a trailing element.
 *
 * Falls back to rendering everything when `IntersectionObserver` is not
 * available (very old browsers, SSR).
 */
export function useInfiniteList(
  total: number,
  options: UseInfiniteListOptions = {},
): UseInfiniteListResult {
  const { pageSize = 6, initialSize, rootMargin = '400px' } = options;
  const start = Math.min(total, Math.max(0, initialSize ?? pageSize));

  const [visibleCount, setVisibleCount] = useState(start);

  useEffect(() => {
    setVisibleCount(prev => {
      const clamped = Math.min(Math.max(prev, start), total);
      return clamped;
    });
  }, [total, start]);

  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node) return;

      if (
        typeof window === 'undefined' ||
        typeof IntersectionObserver === 'undefined'
      ) {
        setVisibleCount(total);
        return;
      }

      const observer = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            setVisibleCount(prev => Math.min(prev + pageSize, total));
          }
        },
        { rootMargin },
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [pageSize, rootMargin, total],
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  return {
    visibleCount,
    sentinelRef,
    done: visibleCount >= total,
  };
}
