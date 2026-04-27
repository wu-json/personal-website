/**
 * Single source of truth for every lazy route's `import()` specifier.
 *
 * Both `src/App.tsx`'s `lazy()` calls and the prefetch intents
 * (`<RoutePrefetcher />`, `<PrefetchLink>`, sidebar nav) route through
 * this module. Vite/Rollup compiles every `import('src/screens/...')`
 * callsite to the same hashed URL, and the ECMAScript module registry
 * memoizes the resolved promise per URL — so a prefetch call warms the
 * exact chunk that `lazy()` will later request, and the click resolves
 * from cache with zero extra network.
 *
 * Top-level evaluation happens at prefetch time. That's the point: the
 * heavy module-load work in each screen's `data.ts`
 * (`import.meta.glob('./<x>/*.md', { eager: true })`) is amortized to
 * idle / hover, not charged to the click. The React component itself
 * doesn't run until React calls it.
 */

export type RouteKey =
  | 'memories'
  | 'memoriesDetail'
  | 'signals'
  | 'signalsDetail'
  | 'constructs'
  | 'constructsDetail'
  | 'heroes'
  | 'heroesDetail';

export const loaders = {
  memories: () => import('src/screens/Memories'),
  memoriesDetail: () => import('src/screens/Memories/FragmentDetail'),
  signals: () => import('src/screens/Signals'),
  signalsDetail: () => import('src/screens/Signals/SignalDetail'),
  constructs: () => import('src/screens/Constructs'),
  constructsDetail: () => import('src/screens/Constructs/ConstructDetail'),
  heroes: () => import('src/screens/Heroes'),
  heroesDetail: () => import('src/screens/Heroes/HeroDetail'),
} as const satisfies Record<RouteKey, () => Promise<unknown>>;

const prefetched = new Set<RouteKey>();

export const prefetchRoute = (key: RouteKey) => {
  if (prefetched.has(key)) return;
  prefetched.add(key);
  // Fire and forget. Un-mark on transient failure so a later user
  // intent re-tries; never block the click on prefetch status — the
  // Suspense fallback is the safety net.
  void loaders[key]().catch(() => {
    prefetched.delete(key);
  });
};
