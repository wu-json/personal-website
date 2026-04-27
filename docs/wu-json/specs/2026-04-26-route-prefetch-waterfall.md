---
status: ready
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
bytes don't appear on the critical path), but prefetch them into the
browser's module cache during idle time or on user intent, so the
`import()` call that `lazy()` makes at click time resolves
synchronously from cache.

### Why `import()` memoization is the whole trick

Vite/Rollup compiles every `import('src/screens/Memories')` callsite —
whether inside a `lazy()` or inside a plain fire-and-forget prefetch
call — to the same hashed URL (`/assets/index-DQtCerIn.js` or
whatever). The ECMAScript module system keys its registry on the
resolved URL and memoizes the promise for that URL.

So: a prefetch call `void import('src/screens/Memories')` downloads
the chunk, **evaluates its top-level code**, and caches its module
record in the registry. A later `lazy(() =>
import('src/screens/Memories'))` call looks up the same URL, finds
the cached record, and returns an already-resolved promise — zero
extra network, zero extra evaluation. Suspense's "throw a promise"
mechanism resolves on the first render attempt and the child renders
in the same tick.

Top-level evaluation at prefetch time is the point, not a bug. The
heavy module-load cost in our tree is the `import.meta.glob('./<x>/*.md',
{ eager: true })` in each screen's `data.ts` — parsing frontmatter
for 4–11 markdown entries. We want that amortized to idle / hover,
not charged to the click. The screen's React component itself doesn't
run until React calls it; only module-scope side effects execute on
prefetch.

This behavior is portable across Chromium, Firefox, and Safari
(specified by the ES `HostLoadImportedModule` hook, which all three
delegate to a URL-keyed internal slot).

## Goals

- Make first-click navigation from `/` → `/memories` / `/signals` /
  `/constructs` / `/heroes` feel instant on a warm connection (target:
  no visible `RouteFallback` flash).
- Make hover/focus → click on a detail `<Link>` feel instant too
  (`/memories` → `/memories/japan-2024`).
- Zero regression on `/` initial paint. The landing page must not
  download screen chunks **before** it paints; prefetch runs strictly
  after the first React commit.
- Works on Safari (which doesn't support `requestIdleCallback` natively
  — fallback to `setTimeout`).
- No new dependencies. Implementation is one `Set`-backed registry +
  one wrapper component + a small `<RoutePrefetcher />` mount.

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

### 1. Shared loader registry (`src/lib/prefetchRoute.ts`)

Single source of truth for every lazy screen's `import()` specifier.
Both `App.tsx`'s `lazy()` calls and the prefetch intents point here,
which prevents drift (change a specifier in one place without the
other, and either `lazy()` breaks or prefetch warms the wrong chunk).

```ts
// src/lib/prefetchRoute.ts
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
  // Fire and forget. The later lazy()-driven import() returns the
  // same promise from the module registry — zero additional network.
  void loaders[key]().catch(() => {
    // Transient failure (offline blip, CDN 503): un-mark so the real
    // click re-tries. Never block the click on prefetch status.
    prefetched.delete(key);
  });
};
```

Design notes:

- **`as const satisfies`** gives the compile-time `RouteKey`
  completeness check (exhaustive record) without widening the value
  types, so `loaders.memories` keeps its narrow function type.
- **Idempotent by key.** A sidebar link hovered 20 times fires one
  network request.
- **Fail-open.** Prefetch is best-effort; the Suspense fallback is the
  safety net if it misses.
- **Why not `<link rel="modulepreload">`?** Two reasons: (a) Vite
  hashes the chunk filenames at build time, so injecting tags into
  `index.html` would need a custom plugin to template them in;
  (b) Safari's `<link modulepreload>` implementation has occasionally
  double-fetched when the subsequent `<script type=module>` loads
  with different CORS semantics. A plain `import()` call sidesteps
  both: it goes through the exact same fetch path the real click
  would use, so the cache hit on click is guaranteed.

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

| Route | Shell + data | Transitive shared chunks |
| --- | --- | --- |
| `memories` | `MemoriesScreen` (1.5 kB) + `data` (20 kB) | — |
| `signals` | `SignalsScreen` (5.3 kB) | `MarkdownBody` (44 kB) + `public-api` (96 kB) + `index-D-GFURkx` (118 kB) — the remark/rehype/micromark pipeline |
| `constructs` | `ConstructsScreen` (1.5 kB) + `data` (12 kB) | — |
| `heroes` | `HeroesScreen` (1.5 kB) + `data` (3.7 kB) | — |
| **Total idle warmup** | **~300 kB min / ~95 kB gzipped** | Browser dribbles over idle network. |

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

| Alternative | Why not |
| --- | --- |
| Revert all `lazy()` → eager | Re-bloats `/` by ~6× (the win this spec preserves). |
| Only eager-import index screens | Still bloats `/` with four screen trees + their `data.ts` bundles; detail routes still cold. |
| `<link rel="modulepreload">` in `index.html` | Vite hashes filenames; would need a plugin. Safari has double-fetched in practice when the subsequent `<script type=module>` disagrees on CORS. |
| `@vite-pwa/plugin` / service worker | Much bigger surface (precaches images/fonts, adds a SW update story). Worth doing eventually, not for this problem. |
| Prefetch on `mousedown` | Too late — `mousedown` → `click` is ~10–50 ms, not enough for a cold RTT. |

Hover-intent + idle warm-up is what Next.js's `<Link prefetch>`,
TanStack Router, and Remix all compile to under the hood. Lowest-code,
highest-leverage fix for this class of waterfall.

## Implementation plan

**Files touched:**

- **New:** `src/lib/prefetchRoute.ts` — registry + `prefetchRoute`.
- **New:** `src/components/PrefetchLink.tsx` — thin `<Link>` wrapper.
- **New:** `src/layouts/RoutePrefetcher.tsx` — idle-time warm-up.
- `src/App.tsx` — import `loaders` from `prefetchRoute.ts` so `lazy()`
  calls share specifiers with the registry (no drift).
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

- [ ] Add `src/lib/prefetchRoute.ts` with the `RouteKey` union, a
      `loaders` map using `as const satisfies
      Record<RouteKey, () => Promise<unknown>>`, a `Set`-backed
      idempotency guard, and a `prefetchRoute(key)` function that
      fires-and-forgets and un-marks on failure. Export `loaders` and
      `RouteKey` for `App.tsx`.
- [ ] Refactor `src/App.tsx`: replace each of the eight inline
      `import('src/screens/...')` specifiers with
      `loaders.<key>().then(...)` so `lazy()` and the registry share
      one source of truth. Keep the `.then(m => ({ default:
      m.NamedExport }))` shape where the module isn't a default
      export.
- [ ] Add `src/layouts/RoutePrefetcher.tsx` per the design:
      `requestIdleCallback` path with `setTimeout(200)` fallback,
      `saveData` / `effectiveType` opt-out, cancel on unmount via
      the tagged-handle union. Component returns `null`.
- [ ] Mount `<RoutePrefetcher />` inside `RootLayout` (not at the
      top of `App` — we want Gallery's `/gallery/:fragmentId` route
      to skip the prefetch entirely).
- [ ] Add `src/components/PrefetchLink.tsx`: wrap wouter's `<Link>`,
      accept all its props via `ComponentProps<typeof Link>`, attach
      `onMouseEnter` / `onFocus` / `onTouchStart` that call
      `prefetchRoute(prefetch)` when `prefetch` is set. No change to
      `<Link>` behavior when `prefetch` is omitted.
- [ ] Extend `NavLink` in `src/components/Sidebar/index.tsx` with an
      optional `prefetch?: RouteKey`. Inside, if set, wire the three
      intent events on the underlying `<Link>`. Pass `'memories'` /
      `'constructs'` / `'signals'` / `'heroes'` on the four content
      links. Leave `'Jason Cui Wu'` (`/`) without prefetch (Home is
      eager).
- [ ] `src/screens/Memories/index.tsx`: swap `Link` → `PrefetchLink`
      with `prefetch='memoriesDetail'` on fragment cards.
- [ ] `src/screens/Constructs/index.tsx`: same with
      `prefetch='constructsDetail'`.
- [ ] `src/screens/Heroes/index.tsx`: same with
      `prefetch='heroesDetail'`.
- [ ] `src/screens/Signals/index.tsx`: **not** `PrefetchLink` — the
      list entries are `<div tabIndex={0}>` that `navigate()` on
      click, not `<Link>`s. Attach `onMouseEnter` / `onFocus` /
      `onTouchStart` directly to the `signal-list-item` `<div>`,
      calling `prefetchRoute('signalsDetail')`.
- [ ] `bun run lint` + `bun run format` clean.
- [ ] `bun run build` clean. Verify via `head -60 build/index.html`
      that the preloaded chunk set is unchanged (just `index-*.js` +
      `index-*.css` + the fonts/mirror image). Prefetch is
      runtime-only and must not alter the HTML.
- [ ] Smoke-test in `bun run preview` on "Fast 3G" throttle
      (DevTools → Network):
      - Load `/`, wait ~2 s; confirm 4 small chunks appear in the
        waterfall as Initiator=`(index)` or similar, **after**
        `DOMContentLoaded`.
      - Click `/memories`: no new network request for
        `MemoriesScreen-*.js` (served from memory cache); screen
        paints without `RouteFallback` flash.
      - Hover a fragment card for ~300 ms, click it: `FragmentDetail`
        + `MarkdownBody` land during hover; click is instant.
      - Repeat for `/signals`, `/constructs`, `/heroes` and one
        detail each.

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

## Risks / open questions

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
- **Suspense boundary interaction.** When prefetch has completed,
  `lazy()`'s internal `import()` hits the browser's module registry
  and resolves in a microtask; Suspense throws the promise once and
  React resolves it before commit, so `<RouteFallback>` never paints.
  When prefetch is in-flight at click time, the ECMAScript module
  registry returns the same pending promise to `lazy()`, so both
  paths await one network request. Strictly non-regressing vs.
  today's cold click.
- **`as const satisfies` on the loaders map.** Needs TS 4.9+; we're
  on TS 5.x, so this is safe. If the type-check fails on older
  tooling later, fall back to a manually-typed `Record<RouteKey,
  () => Promise<unknown>>`.
- **Future drift.** If a new screen is added lazy in `App.tsx`,
  whoever does it must also add an entry to `loaders` for
  prefetch to cover it. A linter rule or test could enforce this,
  but it's overkill for the current cadence (one new screen every
  few months).
