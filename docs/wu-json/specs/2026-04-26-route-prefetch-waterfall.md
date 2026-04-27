---
status: draft
---

# Fix nav-click waterfall from route-level code splitting

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
4. Browser requests the `MemoriesScreen-*.js` chunk (tiny — ~1.5 kB).
5. That module's imports cascade: `ProgressiveImage-*.js`,
   `Memories/data-*.js`, etc. — a second network roundtrip because
   nothing was preloaded.
6. React resumes render, screen paints.

On a fast desktop connection this is ~150–300 ms of black fallback.
On mobile 4G it's visibly worse (500 ms–1 s). Multiply by two for
`/memories` → `/memories/:id`, which re-pays for `FragmentDetail-*.js`
+ `MarkdownBody-*.js` (44 kB) + `public-api-*.js` (96 kB, the
remark/rehype plugin bundle).

### Why not just un-split?

Reverting to eager imports solves the waterfall but brings back the
problem the last spec fixed: every route pays for `markdown` (~329 kB)
and screens they'll never visit. The home page load time regresses by
the same ~6× the last spec won.

We want **eager-warm, lazy-execute**: keep the chunks split (so the
bytes don't appear on the critical path), but prefetch them into the
HTTP cache during idle time or on user intent, so the `import()` call
later resolves instantly from cache.

## Goals

- Make first-click navigation from `/` → `/memories` / `/signals` /
  `/constructs` / `/heroes` feel instant on a warm connection (target:
  no visible `RouteFallback` flash).
- Make hover/focus → click on a detail `<Link>` feel instant too
  (`/memories` → `/memories/japan-2024`).
- Zero regression on `/` initial paint. The landing page must not
  download screen chunks **before** it paints; prefetch happens strictly
  after `requestIdleCallback` / first paint.
- Works on Safari (which doesn't support `requestIdleCallback` natively
  — fallback to `setTimeout`).
- No new dependencies. We're doing this with `import()` + a ref-counted
  registry, nothing more.

## Non-goals

- SSR / SSG. Still a client-rendered SPA.
- Rewriting Gallery (`/gallery/:fragmentId`). It's a big chunk and it
  has its own entry pattern. Out of scope.
- Prefetching **data** (fragment markdown, image bytes). This spec is
  about JS chunks only.
- Prefetching chunks for routes not linked from the sidebar (e.g.
  deeply-nested pages reached only via in-content links — they're not
  on the hot path for nav-click perf).

## Design

Three layers, smallest first:

### 1. A shared `prefetchRoute` registry

New module `src/routes/prefetch.ts` that exports:

```ts
type RouteKey =
  | 'memories'
  | 'memoriesDetail'
  | 'signals'
  | 'signalsDetail'
  | 'constructs'
  | 'constructsDetail'
  | 'heroes'
  | 'heroesDetail';

const loaders: Record<RouteKey, () => Promise<unknown>> = {
  memories: () => import('src/screens/Memories'),
  memoriesDetail: () => import('src/screens/Memories/FragmentDetail'),
  signals: () => import('src/screens/Signals'),
  signalsDetail: () => import('src/screens/Signals/SignalDetail'),
  constructs: () => import('src/screens/Constructs'),
  constructsDetail: () => import('src/screens/Constructs/ConstructDetail'),
  heroes: () => import('src/screens/Heroes'),
  heroesDetail: () => import('src/screens/Heroes/HeroDetail'),
};

const prefetched = new Set<RouteKey>();

export const prefetchRoute = (key: RouteKey) => {
  if (prefetched.has(key)) return;
  prefetched.add(key);
  // Fire and forget. Native ES dynamic imports are memoized by the
  // module system, so the later `lazy()`-driven import() returns the
  // same already-resolved promise with zero additional network cost.
  void loaders[key]().catch(() => {
    // On transient network error, un-mark so a later intent retries.
    prefetched.delete(key);
  });
};
```

Design choices:

- **One registry, one source of truth.** Both `App.tsx`'s `lazy(() =>
  import('...'))` calls and this module point at the same specifiers —
  Vite/Rollup de-dupe them into one chunk, and the module system
  guarantees the `lazy()` promise resolves from cache.
- **Idempotent by key.** The `Set` guard means a sidebar link hovered
  20 times fires one network request.
- **Fail-open.** If the prefetch fetch errors (offline blip, CDN 503),
  un-mark so the real click triggers a fresh load. We never block the
  click on prefetch status.
- **No explicit `<link rel="modulepreload">`.** Injecting `<link>`
  tags can trigger CORS quirks in Safari and requires knowing the
  hashed filename up front (we don't — it's Vite's output). A plain
  `import()` call is the portable form: the browser resolves the
  module specifier, downloads the script with the right CORS mode, and
  populates the JS module cache. This is what TanStack Router,
  Next.js's `router.prefetch`, and `react-router`'s `preload()`
  hooks all ultimately compile to.

### 2. Idle-time warm-up after first paint

In `src/App.tsx` (or a dedicated `useEffect` in `RootLayout`), after
the first commit schedule a low-priority prefetch of the four
sidebar-linked index routes (`memories`, `signals`, `constructs`,
`heroes`):

```ts
useEffect(() => {
  const schedule =
    'requestIdleCallback' in window
      ? window.requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 200);
  const handle = schedule(() => {
    prefetchRoute('memories');
    prefetchRoute('signals');
    prefetchRoute('constructs');
    prefetchRoute('heroes');
  });
  return () => {
    if ('cancelIdleCallback' in window && typeof handle === 'number') {
      // Type-narrow: rIC returns a handle; setTimeout returns
      // Timeout — both are clearable by their own cancel.
      window.cancelIdleCallback(handle);
    } else {
      clearTimeout(handle as ReturnType<typeof setTimeout>);
    }
  };
}, []);
```

This runs exactly once per session, after React has rendered the
first route. The browser is allowed to dribble these chunks in over
idle network; they're tiny (1.5–5 kB each — it's just the screen
shell, not markdown / data).

**Why not prefetch detail routes here too?**
Detail chunks (`FragmentDetail`, `SignalDetail`) pull in `MarkdownBody`
+ the remark/rehype plugin bundle (~140 kB combined). That's too much
to blindly warm on every session — most sessions only click into one
detail page (or none). Gate those behind user intent, next section.

### 3. Hover / focus intent prefetch on `<Link>`

When the user hovers or focuses a nav or card link, that's a strong
signal they're about to click it. Prefetch the target's chunk
immediately — by the time the click lands, the chunk is either
already cached or in flight.

Two call sites:

**A. Sidebar nav links** (`src/components/Sidebar/index.tsx`). Each
`<NavLink>` gets `onMouseEnter` + `onFocus` handlers that call
`prefetchRoute` with the corresponding key:

```tsx
<NavLink
  to='/memories'
  active={pathname.startsWith('/memories')}
  onHoverIntent={() => prefetchRoute('memories')}
  onClick={onClick}
>
  Memories
</NavLink>
```

The index routes are already covered by the idle-time pass, so this is
belt-and-suspenders for users who click faster than idle fires (very
first paint, fast connection). Cost: zero extra network because
`prefetchRoute` is idempotent.

**B. Detail-page cards.** `MemoriesScreen`, `SignalsScreen`,
`ConstructsScreen`, `HeroesScreen` each render a list of `<Link
to="/<section>/:id">`s. Attach `onMouseEnter` / `onFocus` to each,
calling `prefetchRoute('memoriesDetail')` (etc.).

The common pattern: wrap `<Link>` in a local component `<PrefetchLink
route='memoriesDetail'>` so the index screens don't each open-code
the handler. Put this in
`src/components/PrefetchLink.tsx`:

```tsx
type Props = ComponentProps<typeof Link> & { prefetch?: RouteKey };

export const PrefetchLink = ({ prefetch, ...rest }: Props) => {
  const onHover = prefetch ? () => prefetchRoute(prefetch) : undefined;
  return (
    <Link
      {...rest}
      onMouseEnter={onHover}
      onFocus={onHover}
      onTouchStart={onHover}
    />
  );
};
```

`onTouchStart` is the mobile equivalent of hover — fires at touch-down,
~100–200 ms before the click resolves, which on a 4G connection is
exactly enough to cover the network roundtrip.

**Coverage.** Only swap `<Link>` → `<PrefetchLink prefetch='…'>` for
links that go to a detail route or a route with a heavy
`MarkdownBody`. Sidebar and in-content anchors (e.g. inline
`/memories/...` in markdown) stay as plain `<Link>` — they're either
already covered by the idle pass or don't benefit from prefetch.

## Why this beats alternatives

| Alternative | Why not |
| --- | --- |
| Revert all `lazy()` → eager | Re-bloats `/` by ~6× (the win this spec preserves). |
| Only eager-import `MemoriesScreen` + `SignalsScreen` (indexes) | Still bloats `/` with both screen trees + their `data.ts` import.meta.glob bundles; detail routes still cold. |
| `<link rel="modulepreload">` injected in `index.html` | Vite hashes filenames; would need a plugin to template them in, and Safari CORS-handles `<link modulepreload>` differently than `<script type=module>` — occasional double-fetches in the wild. |
| `@vite-pwa/plugin` / service worker caching | Much bigger surface, precaches images/fonts too, adds a SW update story. Worth doing eventually but not for this problem. |
| Prefetch on `mousedown` instead of `mouseenter` | Too late — `mousedown` → `click` gap is ~10–50 ms, not enough to swallow a network request. |

The hover-intent + idle warm-up combo is what Next.js's
`<Link prefetch>`, TanStack Router, and Remix all do in one form or
another. It's the lowest-code, highest-leverage fix.

## Implementation plan

**Files touched:**

- New: `src/routes/prefetch.ts` (registry + `prefetchRoute`).
- New: `src/components/PrefetchLink.tsx` (thin `<Link>` wrapper).
- `src/App.tsx` — import `prefetchRoute` from the registry so both
  `lazy()` and the registry reference the same module specifiers
  (avoid drift). Add the `useEffect` idle-time warm-up in a small
  `<RoutePrefetcher />` component mounted inside `RootLayout`'s
  subtree (not at the top level — we don't want it running when the
  user lands directly on `/gallery/...`, which bypasses
  `RootLayout`).
- `src/components/Sidebar/index.tsx` — extend `NavLink` with an
  `onHoverIntent` prop; wire the four content sections.
- `src/screens/Memories/index.tsx` — swap `Link` →
  `<PrefetchLink prefetch='memoriesDetail'>`.
- `src/screens/Signals/index.tsx` — same for `signalsDetail`.
- `src/screens/Constructs/index.tsx` — same for `constructsDetail`.
- `src/screens/Heroes/index.tsx` — same for `heroesDetail`.

## Tasks

- [ ] Add `src/routes/prefetch.ts` with the `RouteKey` union, `loaders`
      map pointing at the same `import('src/screens/...')` specifiers
      used in `App.tsx`, a `Set`-backed idempotency guard, and the
      `prefetchRoute(key)` function that fires-and-forgets and
      un-marks on failure.
- [ ] Refactor `src/App.tsx` so the eight `lazy()` calls call into the
      shared `loaders` map rather than duplicating the `import()`
      specifiers. Keeps a single source of truth so the registry
      can't drift from the router. (Pass `loaders.memories` directly
      to `lazy()`, wrapping with the `.then(m => ({ default:
      m.MemoriesScreen }))` shape where needed.)
- [ ] Add `<RoutePrefetcher />` component that mounts inside
      `RootLayout` and calls `prefetchRoute` for `memories`,
      `signals`, `constructs`, `heroes` on a `requestIdleCallback`
      (fallback `setTimeout(200)`) after first commit. Cleanup
      cancels the idle handle if unmounted before it fires.
- [ ] Add `src/components/PrefetchLink.tsx` that wraps wouter's
      `<Link>` and attaches `onMouseEnter` / `onFocus` /
      `onTouchStart` handlers that call `prefetchRoute(prefetch)`.
      Preserve all existing `Link` props via `ComponentProps<typeof
      Link>`.
- [ ] Extend `NavLink` in `src/components/Sidebar/index.tsx` with an
      optional `onHoverIntent` callback bound to the same three
      events. Wire the four content links to their respective
      `prefetchRoute` keys. Leave `/` (HomeScreen, already eager) and
      Gallery (separate concern) unwired.
- [ ] Swap `Link` → `<PrefetchLink prefetch='memoriesDetail'>` on
      fragment cards in `src/screens/Memories/index.tsx`.
- [ ] Same swap for `signalsDetail` in
      `src/screens/Signals/index.tsx` (the "expand into detail" links
      on collapsed entries — check `SignalsScreen` for all
      `<Link to={'/signals/${id}'}>` occurrences and hit each one).
- [ ] Same swap for `constructsDetail` in
      `src/screens/Constructs/index.tsx`.
- [ ] Same swap for `heroesDetail` in `src/screens/Heroes/index.tsx`.
- [ ] `bun run lint` + `bun run format` clean.
- [ ] `bun run build` clean. Verify in `build/index.html` that the
      preloaded chunk set is unchanged (still just the main entry +
      CSS) — the prefetch is runtime-only, it must not affect the
      HTML.
- [ ] Smoke-test in `bun run preview` on throttled 3G (Chrome
      DevTools): Click `/` → `/memories` after ~1 s of idle; the
      `RouteFallback` flash should be gone. Then hover
      `/memories/japan-2024` briefly, click: should also feel
      instant (chunk pre-warmed).

## Verification

- Before/after waterfalls in Chrome DevTools → Network panel,
  "Fast 3G" throttle:
  - Home load: no new chunks downloaded before `domcontentloaded`.
  - After idle: 4 small chunks land in background (memories, signals,
    constructs, heroes).
  - Click nav: no new network request for the screen chunk (served
    from memory cache), only the data chunk if not already shared.
- Lighthouse run on `/`: LCP unchanged (goal: ±50 ms of current).
- iPhone Safari on a real metered connection: hover substitute is
  `touchstart`; detail page click should feel noticeably snappier.

## Risks / open questions

- **Idle-time prefetch on metered connections.** Chrome/Firefox expose
  `navigator.connection.saveData`; could skip the idle pass when it's
  true. Probably worth adding — **decision:** do it, one-line guard
  in `<RoutePrefetcher />`. If `saveData` is true or `effectiveType`
  is `'2g'`/`'slow-2g'`, skip the idle pass; hover-intent prefetch
  still runs because that's user-initiated.
- **`cancelIdleCallback` typing.** `requestIdleCallback` returns
  `number`, `setTimeout` returns `ReturnType<typeof setTimeout>`
  which narrows differently in DOM vs. Node lib. Just type the handle
  as `number | ReturnType<typeof setTimeout>` and branch on cancel.
- **Module specifier drift.** If someone edits `App.tsx` to change a
  `lazy()` specifier without updating `prefetch.ts`, we'd prefetch
  the wrong chunk. The "single source of truth" refactor (have
  `App.tsx` import from `prefetch.ts`) prevents this; keep the
  loaders map as the canonical definition.
- **Safari touchstart → scrolling intent.** `onTouchStart` also fires
  on scroll-initiating touches over a link. This is fine for our use
  case (the chunk prefetch is cheap and idempotent), but note that
  it's slightly more aggressive than strict hover intent.
- **Does this conflict with the existing Suspense boundary's
  fallback?** No — when the prefetch succeeds, the `lazy()` promise
  resolves synchronously from cache on first render, so Suspense
  never throws. The `<RouteFallback>` code path only runs when
  prefetch hasn't completed. Safe fall-back behavior.
