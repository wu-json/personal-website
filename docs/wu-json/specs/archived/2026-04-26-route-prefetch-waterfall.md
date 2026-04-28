---
status: implemented
superseded_by: 2026-04-27-unsplit-content-routes.md
---

# Fix nav-click waterfall from route-level code splitting

> **Superseded** by `2026-04-27-unsplit-content-routes.md` (also
> archived). The three-layer prefetch system this spec built
> (idle warmup, hover-intent, synchronous lazy-payload resume)
> was removed in favor of bundling content routes into the main
> entry. Gallery is the only remaining `lazy()`-loaded screen.
> The "weird pause" investigation captured here remains a useful
> reference for React's `lazy` payload internals.

## Context

The prior spec `2026-04-25-performance-improvements.md` moved every screen
behind `lazy()` in `src/App.tsx` to keep the `markdown` and `three`
chunks off the `/` critical path. That was a real win for first-paint on
the landing page — the entry HTML now preloads only `index-*.js`
(~222 kB / ~71 kB gzipped), and the Gallery `three` chunk (887 kB) no
longer lands on `/`.

But lazy routes have a cost: clicking a nav link now feels slow,
especially the first click per session. Nothing pre-warms the screen
chunk, so every navigation has to pay for a cold network request before
React can render the new route.

### What actually happens on `/` → `/memories`

1. User clicks the sidebar "Memories" link.
2. `wouter` updates location → React renders
   `<Suspense fallback=<RouteFallback/>>` with `<MemoriesScreen />`.
3. Suspense boundary throws because `MemoriesScreen` chunk isn't loaded.
4. Browser requests the `MemoriesScreen-*.js` chunk. Vite's
   `__vitePreload` helper emits `<link rel="modulepreload">` for the
   chunk's declared dependencies (CSS is already in the single bundle,
   but the screen's `data-*.js` sibling — 20 kB of
   `import.meta.glob('./fragments/*.md', { eager: true })` — is
   fetched in parallel).
5. React resumes render once both chunks resolve, screen paints.

On a fast desktop connection this is ~150–300 ms of black fallback
(mostly `Suspense` bookkeeping + one RTT). On mobile 4G it's visibly
worse (500 ms–1 s). Memories/Signals → their detail routes pay
another round for `FragmentDetail` / `SignalDetail` plus the shared
`MarkdownBody-*.js` (44 kB) + `public-api-*.js` (96 kB, the
remark/rehype plugin bundle).

### Why not just un-split?

Reverting to eager imports solves the waterfall but brings back the
problem the last spec fixed: every route pays for `markdown` (~329 kB)
and screens they'll never visit. The home page load time regresses by
the same ~6× the last spec won.

We want **eager-warm, lazy-execute**: keep the chunks split (so the
bytes don't appear on the critical path), but prefetch them during
idle time or on user intent, so by the time `lazy()` is asked to
render the screen, both the network _and_ React's lazy bookkeeping
are already settled.

### Why module-cache prefetch isn't enough on its own

Vite/Rollup compiles every `import('src/screens/Memories')` callsite
— whether inside a `lazy()` or inside a plain fire-and-forget
prefetch call — to the same hashed URL. The ECMAScript module system
keys its registry on the resolved URL and memoizes the promise for
that URL, so a prefetched chunk is cheap to re-import.

But: `React.lazy(() => import('…'))` does _not_ read directly from
the module registry. It carries an internal `_payload` object that
starts in `_status: -1` and only flips to `_status: 1` (resolved) on
the **first render** that touches the lazy component. That first
render always throws the import promise to Suspense, even if the
underlying ES module is already cached and resolves in a microtask.
Suspense then commits the `<RouteFallback>`, awaits the promise, and
re-renders on the next tick.

In practice: even with idle warmup + hover-intent landing both
network requests well before the click, **the fallback still flashes
black for one paint** because React's lazy contract requires a
suspend-resume cycle on first encounter. That is the "weird pause"
users see, and it's the entire reason this spec exists rather than
being a one-line `import()` call on hover.

The fix is to mirror what React's `_init` does, but eagerly. At
preload time, kick off the `import()`, then on resolution mutate the
lazy payload directly: `_payload._status = 1`,
`_payload._result = { default: Component }`. The next render reads
`_status === 1` and returns the component synchronously without
suspending. Suspense never sees a thrown promise, the fallback never
commits, and the click paints the new route in the same frame.

This is why `prefetchRoute.ts` ships its own `lazyWithPreload`
helper rather than using `React.lazy` directly. The `_payload`
internal shape has been stable since React 16 and is what every
established preload library (`@loadable/component`,
`react-lazy-with-preload`, etc.) reaches into for the same reason.

Top-level module evaluation also happens at preload time. That's the
point, not a bug: the heavy work in our tree is each screen's
`import.meta.glob('./<x>/*.md', { eager: true })` in `data.ts`,
parsing frontmatter for 4–11 markdown entries. We want that
amortized to idle/hover, not charged to the click. The React
component function doesn't run until React calls it; only
module-scope side effects execute on preload.

The module-registry behavior is portable across Chromium, Firefox,
and Safari (specified by the ES `HostLoadImportedModule` hook). The
`_payload` mutation is React-internal but stable across all React 16+
versions; if React ever changes the shape, the type guard at the top
of `lazyWithPreload` still ensures we either flip to fulfilled
correctly or fall through to React's normal Suspense path — never
worse than a plain `React.lazy`.

## Goals

- Make first-click navigation from `/` → `/memories` / `/signals` /
  `/constructs` / `/heroes` feel instant on a warm connection (target:
  no visible `RouteFallback` flash, including the one-frame Suspense
  flash that survives module-cache prefetch).
- Make hover/focus → click on a detail `<Link>` feel instant too
  (`/memories` → `/memories/japan-2024`).
- Zero regression on `/` initial paint. The landing page must not
  download screen chunks **before** it paints; prefetch runs strictly
  after the first React commit.
- Works on Safari (which doesn't support `requestIdleCallback` natively
  — fallback to `setTimeout`).
- No new dependencies. Implementation is one preloadable-lazy registry
  - one wrapper component + a small `<RoutePrefetcher />` mount.

## Non-goals

- SSR / SSG. Still a client-rendered SPA.
- Rewriting Gallery (`/gallery/:fragmentId`). Its chunk is 887 kB; we
  don't want to warm it on idle, and users don't reach it from the
  sidebar. Out of scope.
- Prefetching **data** (fragment markdown, image bytes). JS chunks only.
- Prefetching chunks for in-content markdown anchors. `MarkdownBody`'s
  custom `a` renderer emits plain `<a href>` (not wouter `<Link>`),
  which is a full-page reload anyway — a separate, larger change.
- Chunks for routes not linked from the sidebar (e.g. links across
  detail screens like `/heroes/:id` → nothing). They're rare enough
  that cold-click cost is acceptable.

## Design

Three layers:

### 1. Preloadable-lazy registry (`src/lib/prefetchRoute.ts`)

Single source of truth for every lazy screen, owning **both** the
`React.lazy`-shaped `Component` mounted by `<Route>` and the
`preload()` function called from prefetch intents. Bundling them
together is what lets prefetch prime the lazy payload synchronously
— see the "Why module-cache prefetch isn't enough on its own"
section for the underlying reason. A separate `loaders` map plus
plain `React.lazy` wouldn't work: the prefetch path needs a hook
into the same `_payload` the lazy `<Component>` reads from.

```ts
// src/lib/prefetchRoute.ts
import { type ComponentType, lazy } from 'react';

type LazyPayload = { _status: -1 | 0 | 1 | 2; _result: unknown };
type LazyExoticLike = {
  _payload: LazyPayload;
  _init: (payload: LazyPayload) => unknown;
};
type ScreenEntry<C> = { Component: C; preload: () => Promise<void> };

const STATUS_PENDING = 0;
const STATUS_RESOLVED = 1;
const STATUS_REJECTED = 2;

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

    // If React already touched this lazy (direct nav to the route,
    // then idle warmup), attach to its existing state instead of
    // re-firing the factory.
    if (payload._status === STATUS_RESOLVED) {
      started = Promise.resolve();
      return started;
    }
    if (payload._status === STATUS_PENDING) {
      const inflight = payload._result as Promise<unknown>;
      started = inflight.then(
        () => undefined,
        () => undefined,
      );
      return started;
    }

    // Status -1 (untouched) or 2 (previously failed): mirror React's
    // `_init` eagerly. Store the in-flight promise on `_payload` so a
    // racing render sees the same fetch instead of starting a second
    // one, then on resolution flip `_status: 1` so the next render
    // returns synchronously.
    const promise = factory().then(
      mod => {
        payload._status = STATUS_RESOLVED;
        payload._result = mod;
      },
      err => {
        payload._status = STATUS_REJECTED;
        payload._result = err;
        started = null; // allow retry
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
  void screens[key].preload().catch(() => undefined);
};
```

Design notes:

- **One registry, two consumers.** `App.tsx` reads
  `screens.memories.Component` for the route element; everything
  else reads `screens.memories.preload` (via `prefetchRoute`).
  Specifiers are written exactly once.
- **Status guard before mutating.** If React's render fired first
  (status 0/1/2), `preload()` attaches to the existing payload
  instead of overwriting it, which would corrupt React's view of the
  lazy component mid-render.
- **`pickDefault` over module shape.** Screens are named exports
  (`MemoriesScreen`, `FragmentDetail`, …); each `lazyWithPreload`
  call passes a tiny adapter to project the named export onto the
  `{ default }` shape `React.lazy` expects. Vite still dedupes the
  inner `import()` to one chunk per screen.
- **Idempotent by entry.** The `started` closure caches the first
  `preload()` Promise; subsequent calls return the same value. A
  sidebar link hovered 20 times fires one network request and one
  payload mutation.
- **Fail-open.** Prefetch is best-effort; on rejection we un-mark so
  a later intent retries, and the Suspense fallback is the safety
  net for any case the prime didn't reach in time.
- **Why not `<link rel="modulepreload">`?** Two reasons: (a) Vite
  hashes chunk filenames at build time, so injecting tags into
  `index.html` would need a custom plugin to template them in;
  (b) `modulepreload` only solves the network — it doesn't prime
  React's lazy payload, so the Suspense flash would still happen.
  A plain `import()` plus payload mutation handles both layers in
  one pass.

### 2. Idle-time warm-up after first paint (`<RoutePrefetcher />`)

A small component mounted **inside `RootLayout`'s subtree** (so it
doesn't run on `/gallery/:fragmentId`, which bypasses `RootLayout`
entirely). After the first commit, schedule a low-priority prefetch
of the four sidebar-linked index routes.

```tsx
// src/layouts/RoutePrefetcher.tsx
import { useEffect } from 'react';
import { prefetchRoute } from 'src/lib/prefetchRoute';

type Handle =
  | { kind: 'idle'; id: number }
  | { kind: 'timeout'; id: ReturnType<typeof setTimeout> };

export const RoutePrefetcher = () => {
  useEffect(() => {
    // Opt out on metered / explicitly data-saving connections. Users
    // can still click and pay the cold-chunk cost; hover-intent
    // prefetch (user-initiated) remains active regardless.
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
      // Safari: no native rIC. 200 ms is enough for the main thread
      // to settle after first paint; we don't fight with LCP.
      handle = { kind: 'timeout', id: setTimeout(run, 200) };
    }

    return () => {
      if (handle.kind === 'idle') window.cancelIdleCallback(handle.id);
      else clearTimeout(handle.id);
    };
  }, []);

  return null;
};
```

Bytes warmed on idle, measured against the current `build/assets/`:

| Route                 | Shell + data                                 | Transitive shared chunks                                                                                         |
| --------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `memories`            | `MemoriesScreen` (1.5 kB) + `data` (20 kB)   | —                                                                                                                |
| `signals`             | `SignalsScreen` (5.3 kB)                     | `MarkdownBody` (44 kB) + `public-api` (96 kB) + `index-D-GFURkx` (118 kB) — the remark/rehype/micromark pipeline |
| `constructs`          | `ConstructsScreen` (1.5 kB) + `data` (12 kB) | —                                                                                                                |
| `heroes`              | `HeroesScreen` (1.5 kB) + `data` (3.7 kB)    | —                                                                                                                |
| **Total idle warmup** | **~300 kB min / ~95 kB gzipped**             | Browser dribbles over idle network.                                                                              |

**Signals dominates the idle bill** — its list view renders
`MarkdownBody` inline on every entry, so warming `SignalsScreen`
transitively warms the whole markdown pipeline (`MarkdownBody` +
`public-api` + the split-out remark/rehype/micromark chunk
`index-D-GFURkx.js`). ~95 kB gzipped is not trivial.

The benefit: the markdown pipeline is **shared** across every detail
route, so warming it once on idle makes hover-intent prefetch of
`FragmentDetail` (15 kB), `SignalDetail` (2.3 kB), `ConstructDetail`
(2.8 kB), and `HeroDetail` (2.7 kB) essentially free — a single
small RTT for the remaining per-route code. Across a typical session
(2–5 detail page visits), this is net bytes-saved vs. fetching
markdown lazily on each cold detail click.

Guards already in the design keep this defensible: `saveData` opts
out, `2g`/`slow-2g` opts out, and the idle pass only runs after the
first React commit (no competition with LCP). If measurement shows
this is still too heavy for a real user profile, the easy tweak is to
drop `'signals'` from the idle list and rely on hover-intent (which
covers it fine on desktop; mobile tap-to-open-menu is slow enough for
`touchstart` prefetch to cover too). That's a one-line change, not a
design revision — flag it as a future adjustment rather than an
open question.

Deliberately **not** warmed on idle: the four Detail screen chunks
themselves, which are cold-speculative (many sessions hit zero detail
pages). They come in on hover-intent, and by then the shared markdown
pipeline is already cached from the Signals warmup.

### 3. Hover / focus / touchstart intent prefetch

When a user hovers or focuses a link, they're very likely about to
click it. Prefetch the target chunk at that moment — by click time,
the chunk is cached or close to it.

**Attachment points:**

**A. Sidebar nav links** (`src/components/Sidebar/index.tsx`). Extend
`NavLink` with an optional `prefetch?: RouteKey`; internally wire
`onMouseEnter` / `onFocus` / `onTouchStart` on the underlying wouter
`<Link>` (verified: wouter `<Link>` spreads `restProps` onto its
rendered `<a>`, so DOM handlers pass through).

```tsx
<NavLink to='/memories' prefetch='memories' active={…}>Memories</NavLink>
<NavLink to='/constructs' prefetch='constructs' active={…}>Constructs</NavLink>
<NavLink to='/signals' prefetch='signals' active={…}>Signals</NavLink>
<NavLink to='/heroes' prefetch='heroes' active={…}>Heroes</NavLink>
```

Sidebar nav is belt-and-suspenders against the idle pass — on a very
fast connection the user can click before the idle callback fires.
Cost is zero extra network because `prefetchRoute` is idempotent.
`Jason Cui Wu` → `/` stays unprefetched (HomeScreen is eager, not
lazy, in `App.tsx`).

**B. Detail-card links on index screens.** `MemoriesScreen`,
`ConstructsScreen`, `HeroesScreen` each render `<Link to="/<section>/:id">`
per entry. Introduce a thin wrapper:

```tsx
// src/components/PrefetchLink.tsx
import type { ComponentProps } from 'react';
import { Link } from 'wouter';
import { prefetchRoute, type RouteKey } from 'src/lib/prefetchRoute';

type Props = ComponentProps<typeof Link> & { prefetch?: RouteKey };

export const PrefetchLink = ({ prefetch, ...rest }: Props) => {
  const onIntent = prefetch ? () => prefetchRoute(prefetch) : undefined;
  return (
    <Link
      {...rest}
      onMouseEnter={onIntent}
      onFocus={onIntent}
      onTouchStart={onIntent}
    />
  );
};
```

`onTouchStart` fires at touch-down — ~100–200 ms before `click`
resolves, enough to cover one 4G roundtrip for the detail chunk.
Swap `<Link>` → `<PrefetchLink prefetch='memoriesDetail'>` (etc.) on
card rendering in Memories / Constructs / Heroes index screens.

**C. Signals list — special case.** `SignalsScreen` does **not** use
`<Link>` for entries. Each article is a `<div tabIndex={0}>` that
calls `navigate('/signals/:id')` on click / Enter (so clicks can
fall through to inline `<a>` / `<button>` children without
navigating). `PrefetchLink` doesn't apply. Instead attach
`onMouseEnter` / `onFocus` / `onTouchStart` handlers directly to the
same `<div>` (`signal-list-item`). Wire via a tiny inline helper:

```tsx
const onIntent = () => prefetchRoute('signalsDetail');
// …
<div
  tabIndex={0}
  onClick={onPreviewClick}
  onKeyDown={onPreviewKeyDown}
  onMouseEnter={onIntent}
  onFocus={onIntent}
  onTouchStart={onIntent}
  className='signal-list-item …'
>
```

Both list and detail signals share one chunk (`SignalDetail-*.js`),
so prefetching once per hover is sufficient regardless of which
article triggers it.

**Coverage audit.** These are the hot paths from the sidebar outward:

- Sidebar → `/memories`, `/signals`, `/constructs`, `/heroes`: covered
  by (A) + idle pass.
- `/memories` → `/memories/:id`: covered by (B) via `PrefetchLink`.
- `/signals` → `/signals/:id`: covered by (C) via handlers on the
  list-item div.
- `/constructs` → `/constructs/:id`: covered by (B).
- `/heroes` → `/heroes/:id`: covered by (B).
- Cross-section links in detail screens (e.g. `SignalDetail` →
  `/memories/xyz`): **not covered**. These are rare and usually
  mid-read; we accept the cold-click cost.

## Why this beats alternatives

| Alternative                                  | Why not                                                                                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Revert all `lazy()` → eager                  | Re-bloats `/` by ~6× (the win this spec preserves).                                                                                             |
| Only eager-import index screens              | Still bloats `/` with four screen trees + their `data.ts` bundles; detail routes still cold.                                                    |
| `<link rel="modulepreload">` in `index.html` | Vite hashes filenames; would need a plugin. Safari has double-fetched in practice when the subsequent `<script type=module>` disagrees on CORS. |
| `@vite-pwa/plugin` / service worker          | Much bigger surface (precaches images/fonts, adds a SW update story). Worth doing eventually, not for this problem.                             |
| Prefetch on `mousedown`                      | Too late — `mousedown` → `click` is ~10–50 ms, not enough for a cold RTT.                                                                       |

Hover-intent + idle warm-up is what Next.js's `<Link prefetch>`,
TanStack Router, and Remix all compile to under the hood. Lowest-code,
highest-leverage fix for this class of waterfall.

## Implementation plan

**Files touched:**

- **New:** `src/lib/prefetchRoute.ts` — `lazyWithPreload` helper +
  `screens` registry + `prefetchRoute`.
- **New:** `src/components/PrefetchLink.tsx` — thin `<Link>` wrapper.
- **New:** `src/layouts/RoutePrefetcher.tsx` — idle-time warm-up.
- `src/App.tsx` — replace direct `lazy(() => import(…))` calls with
  `screens.<key>.Component` references. Gallery stays on plain
  `React.lazy` (not preloaded; one-off).
- `src/layouts/RootLayout.tsx` — mount `<RoutePrefetcher />` at the
  end of the tree (placement doesn't matter functionally; beside
  `ScrollToTop` is tidy).
- `src/components/Sidebar/index.tsx` — add `prefetch?: RouteKey` to
  `NavLink`, wire `onMouseEnter` / `onFocus` / `onTouchStart` on the
  underlying `<Link>`. Pass the four content-section keys.
- `src/screens/Memories/index.tsx` — swap `Link` → `PrefetchLink
prefetch='memoriesDetail'`.
- `src/screens/Constructs/index.tsx` — same for `constructsDetail`.
- `src/screens/Heroes/index.tsx` — same for `heroesDetail`.
- `src/screens/Signals/index.tsx` — inline handlers on the
  `signal-list-item` `<div>` for `signalsDetail` (not `PrefetchLink`
  — list items aren't `<Link>`s).

## Tasks

- [x] Add `src/lib/prefetchRoute.ts` with the `lazyWithPreload`
      helper, a `screens` registry keyed by `RouteKey`, and a
      `prefetchRoute(key)` wrapper that fires `screens[key].preload()`
      fire-and-forget. Each `preload()` is closure-idempotent and
      retries on transient failure.
- [x] Refactor `src/App.tsx` to mount `screens.<key>.Component`
      directly under each `<Route>` (no per-route `lazy()` calls
      anymore — the registry owns them). Gallery keeps a plain
      `React.lazy` since it's intentionally not prefetched.
- [x] Add `src/layouts/RoutePrefetcher.tsx` with
      `requestIdleCallback` + `setTimeout(200)` fallback,
      `saveData`/`effectiveType` opt-out, tagged-handle unmount
      cleanup.
- [x] Mount `<RoutePrefetcher />` inside `RootLayout` (beside
      `<ScrollToTop>` at the end of the tree) — Gallery's
      `/gallery/:fragmentId` bypasses `RootLayout` and is correctly
      skipped.
- [x] Add `src/components/PrefetchLink.tsx`. Wouter's exported
      `LinkProps` type doesn't surface DOM event handlers, so we
      locally re-type `Link` as an `FC<LinkProps & {
onMouseEnter/onFocus/onTouchStart }>` cast — runtime behavior
      is already correct because wouter spreads `restProps` onto the
      rendered `<a>` (verified in its source at
      `node_modules/wouter/src/index.js:310`). The wrapper composes
      caller-supplied handlers with the prefetch trigger so existing
      `onMouseEnter` / `onFocus` / `onTouchStart` props on cards
      keep firing.
- [x] Extend `NavLink` in `src/components/Sidebar/index.tsx` with
      `prefetch?: RouteKey`; branches to `<PrefetchLink>` when set,
      stays on plain `<Link>` otherwise. Wired for Memories,
      Constructs, Signals, Heroes; `/` (HomeScreen, eager) left
      unprefetched.
- [x] `MemoriesScreen`, `ConstructsScreen`, `HeroesScreen`: swap
      `<Link>` → `<PrefetchLink prefetch='…Detail'>` on each entry
      card.
- [x] `SignalsScreen`: special case — list entries are `<div
tabIndex={0}>` that call `navigate()` on click (so inner
      `<a>`/`<button>` fall-through works). Attached `onMouseEnter`
      / `onFocus` / `onTouchStart` handlers directly to the
      `signal-list-item` `<div>`, sharing one `useCallback` that
      prefetches `signalsDetail`.
- [x] Lint and format clean (via `bun node_modules/.bin/oxlint .`
      and `bun node_modules/.bin/oxfmt .` — the node-shebang
      entrypoints in the local environment hit Node 18's
      extensionless-ESM issue, but running the same scripts under
      `bun` resolves cleanly and matches what CI sees).
- [x] `bun run build` succeeds. `build/index.html` preload set is
      byte-for-byte identical to before (just fonts + mirror image +
      entry JS + CSS). The entry grew `222.75 kB → 224.22 kB` min
      (`71.36 → 72.08 kB` gzipped) — that's +1.5 kB / +0.7 kB gz for
      `prefetchRoute.ts` (with `lazyWithPreload`) +
      `PrefetchLink.tsx` + `RoutePrefetcher.tsx` being pulled into
      the main bundle via `Sidebar` and `RootLayout`. All four screen
      chunks still emit as independent files — Vite dedupes each
      screen's `import()` to one chunk, and code-splitting survives
      the registry refactor.
- [x] Verified the shipped bundle contains the `_payload._status`
      transitions (`_status=0` / `_status=1` / `_status=2` literals
      present in the minified entry).
- [x] Preview smoke-test: `vite preview` serves `/`, `/memories`,
      `/signals` at 200 OK and visiting these routes after idle warmup
      paints without the prior fallback flash. Network-throttled
      human verification still recommended as a final check.

## Verification

- Before/after waterfalls in Chrome DevTools → Network panel, "Fast
  3G" throttle:
  - `/` initial load: no new screen chunks downloaded before
    `domcontentloaded`.
  - Idle (~200 ms–1 s after paint): 4 small chunks (+ their data
    siblings) land in background.
  - Nav-click: zero new network activity for the screen chunk itself
    (it's already in memory cache).
- Lighthouse mobile run on `/`: LCP unchanged (tolerance ±50 ms).
- iOS Safari real-device test on metered connection: `touchstart`
  substitutes for hover; tap-through to `/memories/:id` should feel
  noticeably snappier than current.

## Outcome

Implemented the full three-layer design end-to-end:

1. **Preloadable-lazy registry** (`src/lib/prefetchRoute.ts`). A
   `lazyWithPreload` helper wraps each `import('src/screens/…')` and
   exposes both a `React.lazy`-shaped `Component` (mounted by
   `<Route>` in `App.tsx`) and a closure-idempotent `preload()` that
   fires the import and primes `_payload._status = 1` on resolution.
   `prefetchRoute(key)` is a thin fire-and-forget wrapper around
   `screens[key].preload()`. Status guards (`_status === 0/1/2`)
   keep the helper safe when React's render races a prefetch.
2. **`<RoutePrefetcher />`** (`src/layouts/RoutePrefetcher.tsx`)
   mounted once inside `RootLayout`. On mount it schedules a single
   idle-time pass that warms `memories`, `signals`, `constructs`,
   `heroes`. Gated on `navigator.connection.saveData` and
   `effectiveType` so Chromium mobile on 2G/saveData opts out. On
   Safari/Firefox the guard is a no-op (they don't expose the API);
   the idle pass still runs, which is fine — it's strictly after
   first paint via `requestIdleCallback` (or `setTimeout(200)`
   fallback), not competing with LCP.
3. **Hover/focus/touchstart intent prefetch** through
   `<PrefetchLink>` (`src/components/PrefetchLink.tsx`). Drop-in
   replacement for wouter's `<Link>` that attaches three intent
   handlers when `prefetch` is set. Adopted on the sidebar nav
   (`NavLink` branches to `<PrefetchLink>` when a `prefetch` key is
   passed), on fragment / construct / hero cards, and inline on the
   `signal-list-item` `<div>` in `SignalsScreen` (list items use
   `navigate()` on click, not `<Link>`, so `<PrefetchLink>` doesn't
   apply there).

### Measured bundle impact

`bun run build` on the final tree:

| Artifact                                                                  | Before                          | After                   | Δ                          |
| ------------------------------------------------------------------------- | ------------------------------- | ----------------------- | -------------------------- |
| `build/index.html` preloads                                               | fonts + mirror + entry JS + CSS | **unchanged**           | —                          |
| Entry `index-*.js`                                                        | 222.75 kB / 71.36 kB gz         | 224.22 kB / 72.08 kB gz | **+1.47 kB / +0.72 kB gz** |
| Per-screen chunks (Memories, Signals, Constructs, Heroes + their details) | same set                        | same set                | no re-merging              |

The +1.5 kB min on the entry is `prefetchRoute.ts` (with
`lazyWithPreload`) + `PrefetchLink.tsx` + `RoutePrefetcher.tsx`,
which are imported from `Sidebar` and `RootLayout` (both eagerly
bundled). Worth it for the UX win.

Critically, `Vite/Rollup` still dedupes every `import()` specifier —
the `lazy()` call inside `lazyWithPreload` and the matching
`preload()` factory call resolve to **one** hashed chunk per screen,
because both call sites use the same string literal. Confirmed by
matching `MemoriesScreen` / `SignalsScreen` / `ConstructsScreen` /
`HeroesScreen` symbols to distinct build output `index-*.js` files.

### Runtime behavior

- **Home load (`/`)**: only the entry JS + CSS + fonts/mirror image
  preload, same as before. `<RoutePrefetcher />` mounts after the
  first React commit and schedules its idle pass on
  `requestIdleCallback` (Chrome/Firefox) or `setTimeout(200)` (Safari).
- **Idle pass**: warms four index-route chunks plus their transitive
  deps **and** flips each `_payload._status` to `1`. The Signals
  warmup is the biggest line item — it pulls the shared markdown
  pipeline (`MarkdownBody` + `public-api` + `index-*` for
  remark/rehype), which then makes hover-intent prefetch of _any_
  detail route essentially free. Net bytes-saved across a typical
  2–5 detail-page session.
- **Nav-click after idle**: React reads the lazy component's
  payload, sees `_status === 1`, and returns the resolved component
  synchronously. Suspense never sees a thrown promise.
  `<RouteFallback>` never paints — no black flash.
- **Hover → click before idle**: on a very fast connection the user
  can beat the idle callback. The hover-intent handler fires
  `screens[key].preload()`, which kicks off the import and stores
  the in-flight promise on `_payload`. If the user clicks before the
  fetch resolves, React's render attaches to the same pending
  promise and Suspense fallback paints for the brief network
  duration only — never longer than a plain `React.lazy` would have
  taken. Once the import resolves, the next render is synchronous.
- **Cold click through Suspense (e.g. quick keyboard nav before any
  prefetch fires)**: unchanged from today — `lazy()` fetches, the
  `bg-black` fallback paints until resolve. Strictly non-regressing.

### Deviations from the spec

- **First draft assumed module-cache prefetch alone was enough.**
  After implementation and visual testing, the "weird pause" was
  still present because `React.lazy`'s payload starts in `_status:
-1` regardless of whether the module is already loaded — the
  first render _always_ throws to Suspense and re-renders on the
  next microtask. The spec was reworked to introduce
  `lazyWithPreload`, which mutates `_payload` directly so the next
  render reads `_status === 1` and skips Suspense entirely. This is
  the same pattern `@loadable/component` and `react-lazy-with-preload`
  use; we inline ~60 LOC instead of pulling in a dep.

- **`ComponentProps<typeof Link>` doesn't include DOM handlers.**
  Wouter's exported `LinkProps` is strict and omits `onMouseEnter` /
  `onFocus` / `onTouchStart`, even though the component spreads
  `restProps` onto its rendered `<a>` at runtime. Had to locally
  cast `Link` as `FC<LinkProps & { onMouseEnter?, onFocus?,
onTouchStart? }>` inside `PrefetchLink.tsx` to get the handlers
  accepted. No runtime change — it's purely a type-level cast with
  a docstring pointing at the exact wouter source line
  (`node_modules/wouter/src/index.js:310`) that validates the
  forwarding behavior.

- **`NavLink` wraps either `<Link>` or `<PrefetchLink>` based on
  `prefetch` presence**, rather than always using `<PrefetchLink>`
  with an optional key. This keeps the `Jason Cui Wu` → `/` link as
  a plain `<Link>` (no prefetch module imported along the tree for
  that path, though in practice it's already in the entry bundle).
  Minor; functionally equivalent to always-`PrefetchLink`.

- **Lint/format tooling.** `bun run lint` and `bun run format` go
  through `oxlint` / `oxfmt`'s node shebangs, which hit a Node 18
  extensionless-ESM quirk in the local dev environment. Ran the
  same binaries via `bun node_modules/.bin/oxlint .` and `bun
node_modules/.bin/oxfmt .` — both clean. Doesn't affect CI
  (project `engines` pins `bun >= 1.3.4`, CI uses Bun, not Node 18).

### Future follow-ups (not done here)

- If real-user measurement shows the Signals transitive markdown
  warmup is too heavy on a slow profile that Chromium doesn't flag
  as `saveData`/`2g`, drop `'signals'` from
  `<RoutePrefetcher />`'s idle list. Hover-intent still covers it —
  one-line change.
- In-content markdown anchors (`<MarkdownBody>`'s custom `a`) still
  do full-page reloads for internal links, so hover-prefetch there
  would require a separate migration to wouter `<Link>`. Out of
  scope here; the hot paths from the sidebar outward are all
  covered.

## Risks / open questions

- **React internals coupling.** `lazyWithPreload` reaches into
  `_payload._status` / `_payload._result`, which are internal-but-
  stable React fields documented by `react/src/ReactLazy.js`'s
  `_init` function and used identically by every preload library
  (`@loadable/component`, `react-lazy-with-preload`,
  `loadable-components`). Stable across React 16 → 19. If a future
  React release ever changes the shape, the typed guard at the top
  of `lazyWithPreload` (`payload._status === STATUS_RESOLVED`, etc.)
  ensures we either flip correctly or fall through to React's
  normal Suspense path — never _worse_ than a plain `React.lazy`.
- **`navigator.connection` is Chromium-only.** Safari (desktop and
  iOS, all versions through current) and Firefox don't expose it at
  all; the guard is effectively a no-op on those browsers. That's
  acceptable because (a) the idle pass is already after LCP and on
  rIC/200 ms timer — it's not fighting any critical work, (b) Safari
  is the platform where `touchstart` hover-intent actually matters
  most, and the intent prefetch is the real savings on mobile
  anyway. The idle pass is a "fast-path for repeat visitors on good
  connections"; the hover-intent pass is the broad-coverage fix.
- **Safari `touchstart` during scroll.** `onTouchStart` fires on
  scroll-initiating touches over a link. This is fine here — the
  prefetch is idempotent and cheap, and a touched-then-scrolled
  user is only one "decided to click" away from needing it anyway.
- **Suspense boundary interaction (post-`lazyWithPreload`).** When
  preload has completed, `_payload._status === 1` and React reads
  the resolved component synchronously — Suspense never throws.
  When preload is in-flight at click time, `_status === 0` and the
  in-flight promise on `_payload._result` is what React's `_init`
  throws — Suspense fallback paints for the network duration only,
  identical behavior to today. Strictly non-regressing.
- **`as const` on the screens map.** Needs TS 4.9+; we're on TS 5.x,
  so this is safe.
- **Future drift.** If a new screen is added lazy, whoever does it
  must add an entry to `screens` for prefetch to cover it. The
  registry is now the _only_ place lazy screens are defined (no
  `lazy()` calls outside it apart from Gallery), so drift is harder
  to introduce — `App.tsx` references `screens.<key>.Component` and
  TS will flag any missing key.
