import { useCallback, useEffect, useRef, useState } from 'react';

type UseInfiniteListOptions = {
  pageSize?: number;
  initialSize?: number;
  rootMargin?: string;
};

type UseInfiniteListResult = {
  visibleCount: number;
  sentinelRef: (node: HTMLElement | null) => void;
  done: boolean;
};

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
