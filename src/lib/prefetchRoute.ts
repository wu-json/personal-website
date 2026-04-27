import { type ComponentType, lazy } from 'react';

/**
 * Lazy route registry with **synchronous resume** after preload.
 *
 * The naive `React.lazy(() => import('…'))` + `import()`-as-prefetch
 * pattern fixes the *network* round-trip but not the *Suspense*
 * round-trip: even when the chunk is already in the module cache,
 * `lazy()`'s internal payload starts in `_status: -1`, so the first
 * render that touches the lazy component still throws a Promise,
 * commits the `<Suspense fallback>`, and only then resolves on the
 * next microtask. That's the "weird pause" people see — a frame of
 * black `<RouteFallback>` even when the network was zero-cost.
 *
 * The fix is to reach into `lazy`'s shape and pre-flip `_payload`
 * to `_status: 1` (fulfilled) at preload time. React's source
 * (`react/src/ReactLazy.js` `_init`) does exactly this on first
 * render; we just do it eagerly instead. Once flipped, the next
 * render of `<LazyComponent />` reads the resolved component
 * synchronously and never suspends.
 *
 * Each `screens[key]` exposes:
 *  - `Component`: the React.lazy()-shaped element to mount in routes
 *  - `preload()`: idempotent, kicks off the import and primes the
 *    lazy payload so subsequent renders skip Suspense entirely
 *
 * Prefetch intents (`<PrefetchLink>`, idle pass, sidebar) all go
 * through `prefetchRoute(key)`, which is just a thin wrapper around
 * `screens[key].preload()`.
 */

type LazyPayload = {
  _status: -1 | 0 | 1 | 2;
  _result: unknown;
};

type LazyExoticLike = {
  _payload: LazyPayload;
};

type ScreenEntry<C> = {
  Component: C;
  preload: () => Promise<void>;
};

const STATUS_PENDING = 0;
const STATUS_RESOLVED = 1;
const STATUS_REJECTED = 2;

/**
 * Wraps a dynamic-import factory into a `React.lazy`-compatible
 * element with an explicit `.preload()` that primes the underlying
 * payload so subsequent renders are synchronous.
 *
 * `pickDefault` extracts the desired component from the loaded
 * module. Screens use named exports (e.g. `MemoriesScreen`), so
 * each callsite passes a small adapter. The component type is
 * preserved end-to-end via `C` so callers get the real prop types
 * (e.g. `FragmentDetail`'s `{ id; photo? }`) at the `<Route>`
 * callsite.
 */
const lazyWithPreload = <M, P>(
  load: () => Promise<M>,
  pickDefault: (m: M) => ComponentType<P>,
): ScreenEntry<ComponentType<P>> => {
  const factory = (): Promise<{ default: ComponentType<P> }> =>
    load().then(m => ({ default: pickDefault(m) }));

  const LazyComponent = lazy(factory) as unknown as ComponentType<P> &
    LazyExoticLike;

  let started: Promise<void> | null = null;

  const preload = (): Promise<void> => {
    if (started) return started;

    const payload = LazyComponent._payload;

    // If React already rendered this component and resolved its
    // payload (status 1) or is mid-render with a pending Promise
    // (status 0) or threw (status 2), we have nothing to do — just
    // attach to the existing state. This handles the case where
    // someone navigates directly to a lazy route, then idle warmup
    // tries to preload it.
    if (payload._status === STATUS_RESOLVED) {
      started = Promise.resolve();
      return started;
    }
    if (payload._status === STATUS_PENDING) {
      // `_result` is the in-flight Promise React stored in `_init`.
      const inflight = payload._result as Promise<unknown>;
      started = inflight.then(
        () => undefined,
        () => undefined,
      );
      return started;
    }

    // Status -1 (untouched) or 2 (previously failed): mirror what
    // React's `_init` does, but eagerly. Kick off the factory,
    // store the pending Promise on `_payload` so any render that
    // races us still sees the same in-flight promise (no double
    // fetch), then on resolution set `_status: 1` + `_result:
    // { default: … }` so the next read is synchronous.
    const promise = factory().then(
      mod => {
        payload._status = STATUS_RESOLVED;
        payload._result = mod;
      },
      err => {
        payload._status = STATUS_REJECTED;
        payload._result = err;
        // Allow a later preload() to retry on transient failure.
        started = null;
        throw err;
      },
    );

    payload._status = STATUS_PENDING;
    payload._result = promise;
    started = promise.then(
      () => undefined,
      () => undefined,
    );
    return started;
  };

  return { Component: LazyComponent, preload };
};

const screens = {
  memories: lazyWithPreload(
    () => import('src/screens/Memories'),
    m => m.MemoriesScreen,
  ),
  memoriesDetail: lazyWithPreload(
    () => import('src/screens/Memories/FragmentDetail'),
    m => m.FragmentDetail,
  ),
  signals: lazyWithPreload(
    () => import('src/screens/Signals'),
    m => m.SignalsScreen,
  ),
  signalsDetail: lazyWithPreload(
    () => import('src/screens/Signals/SignalDetail'),
    m => m.SignalDetail,
  ),
  constructs: lazyWithPreload(
    () => import('src/screens/Constructs'),
    m => m.ConstructsScreen,
  ),
  constructsDetail: lazyWithPreload(
    () => import('src/screens/Constructs/ConstructDetail'),
    m => m.ConstructDetail,
  ),
  heroes: lazyWithPreload(
    () => import('src/screens/Heroes'),
    m => m.HeroesScreen,
  ),
  heroesDetail: lazyWithPreload(
    () => import('src/screens/Heroes/HeroDetail'),
    m => m.HeroDetail,
  ),
} as const;

export type RouteKey = keyof typeof screens;
export { screens };

export const prefetchRoute = (key: RouteKey) => {
  // Fire-and-forget; preload is idempotent and never throws to the
  // call site (transient failures un-mark internally so a later
  // intent retries).
  void screens[key].preload().catch(() => undefined);
};
