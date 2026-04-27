import { useEffect } from 'react';
import { prefetchRoute } from 'src/lib/prefetchRoute';

type Handle =
  | { kind: 'idle'; id: number }
  | { kind: 'timeout'; id: ReturnType<typeof setTimeout> };

/**
 * Warms the four sidebar-linked index-route chunks after first paint so
 * the next nav click resolves from the module cache with no
 * `<RouteFallback>` flash.
 *
 * Mounted **inside `RootLayout`** so `/gallery/:fragmentId` — which
 * bypasses RootLayout and owns the whole viewport with a 887 kB
 * Three.js chunk — isn't paying for speculative screen fetches.
 *
 * Guarded on `navigator.connection.saveData` / slow `effectiveType` so
 * metered Chromium connections opt out. Safari and Firefox don't
 * expose `navigator.connection`, so the guard is a no-op there; the
 * idle pass still runs, which is fine (it's strictly after first
 * paint, not competing with LCP). Hover-intent prefetch
 * (`<PrefetchLink>`, sidebar) is the broad-coverage fallback regardless
 * of browser.
 */
const RoutePrefetcher = () => {
  useEffect(() => {
    const conn = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (
      conn?.saveData ||
      conn?.effectiveType === '2g' ||
      conn?.effectiveType === 'slow-2g'
    ) {
      return;
    }

    const run = () => {
      prefetchRoute('memories');
      prefetchRoute('signals');
      prefetchRoute('constructs');
      prefetchRoute('heroes');
    };

    let handle: Handle;
    if ('requestIdleCallback' in window) {
      handle = { kind: 'idle', id: window.requestIdleCallback(run) };
    } else {
      // Safari: no native rIC. 200 ms lets the main thread settle
      // after first paint without fighting LCP.
      handle = { kind: 'timeout', id: setTimeout(run, 200) };
    }

    return () => {
      if (handle.kind === 'idle') window.cancelIdleCallback(handle.id);
      else clearTimeout(handle.id);
    };
  }, []);

  return null;
};

export { RoutePrefetcher };
