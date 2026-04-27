---
status: draft
---

# Unsplit content routes; keep Gallery split

## Context

The previous spec
`docs/wu-json/specs/archived/2026-04-26-route-prefetch-waterfall.md`
solved a real "weird pause" on first nav-click after introducing
route-level `lazy()` splitting. The fix was a three-layer
preload-and-resume system:

1. `src/lib/prefetchRoute.ts` — a `lazyWithPreload` helper that
   reaches into `React.lazy`'s internal `_payload._status` /
   `_payload._result` and pre-flips the payload to `_status: 1` so
   subsequent renders are synchronous (no Suspense throw, no
   `<RouteFallback>` flash).
2. `src/layouts/RoutePrefetcher.tsx` — an idle-time pass that warms
   all four sidebar-linked index routes after first paint, gated on
   `navigator.connection.saveData` / `effectiveType`.
3. `src/components/PrefetchLink.tsx` — a `<Link>` wrapper that
   prefetches on `mouseenter` / `focus` / `touchstart`, adopted on
   sidebar nav and detail-card links across each section's index
   screen.

That worked. UX is good. But the design has accumulated complexity
disproportionate to the problem it now solves on this site.

### What the build actually looks like today

`bun run build` on the current tree:

| Chunk                                  | Raw      | Gzip     |
| -------------------------------------- | -------- | -------- |
| Entry `index-*.js`                     | 224 kB   | 71 kB    |
| Vendor split chunk(s)                  | ~290 kB  | ~89 kB   |
| `MarkdownBody` + `public-api` (remark) | ~141 kB  | ~45 kB   |
| `MemoriesScreen` + data                | ~22 kB   | ~5 kB    |
| `SignalsScreen` + data                 | ~18 kB   | ~7 kB    |
| `ConstructsScreen` + data              | ~16 kB   | ~6 kB    |
| `HeroesScreen` + data                  | ~5 kB    | ~3 kB    |
| `FragmentDetail`                       | 15 kB    | 4.8 kB   |
| `SignalDetail`                         | 2.3 kB   | 0.9 kB   |
| `ConstructDetail`                      | 2.8 kB   | 1.0 kB   |
| `HeroDetail`                           | 2.7 kB   | 1.0 kB   |
| **Gallery (Three.js)**                 | **914 kB** | **247 kB** |

The non-Gallery, non-vendor screen + data + markdown code totals
roughly **225 kB / 70 kB gzipped** — and `<RoutePrefetcher />`
already speculatively downloads almost all of it on idle for every
visitor who lands on `/`. The split is not actually saving bandwidth
for the median visitor; it's just spreading the same bytes across
many small HTTP requests behind elaborate infrastructure that exists
to hide the fact that the requests happen at all.

### Why the system feels overkill now

- **Three coordinating layers** (idle warmup, hover-intent,
  synchronous-resume) all exist to hide the seams of a code-splitting
  decision that, in retrospect, doesn't pull its weight at this
  scale.
- **`lazyWithPreload` reaches into private React internals**
  (`_payload._status`, `_payload._result`). It's correct against
  React 19 and the same shape every preload library uses, but it
  couples our codebase to a private API to dodge a one-frame flash.
- **The "weird pause" on direct deep-link navigation** that
  prompted the original investigation isn't even what this system
  solves — direct deep-link nav still has to download the chunk
  cold. The system only helps the warm-cache case (already-on-site,
  clicking around).
- **~300 lines of infrastructure** (`prefetchRoute.ts` +
  `RoutePrefetcher.tsx` + `PrefetchLink.tsx`) plus a `<Suspense>`
  boundary and a `RouteFallback` component, all in service of saving
  a couple hundred milliseconds for landing-page bounces who don't
  click anything.

### What we're actually doing

Bundle the four content screens (Memories / Signals / Constructs /
Heroes, with their detail counterparts and `MarkdownBody`) into the
main entry. **Keep Gallery split** — its 914 kB / 247 kB gzipped
Three.js chunk is real and most visitors don't enter `/gallery`.

This eliminates Suspense and the entire prefetch pipeline for
content routes. Direct deep-link navigation to `/memories/japan-2024`
becomes "download one bundle, render" with no flash, no fallback,
no hover-timing dance, no React-internal coupling. The bundle grows
by the bytes the prefetcher was already pulling on idle, give or
take.

## Goals

- Eliminate the `<RouteFallback>` flash on warm-cache nav clicks **by
  removing the boundary**, not by hiding it. Suspense is gone for
  content routes; there is nothing to flash.
- Make direct deep-link navigation to any content route paint as
  fast as `/` does. One bundle download, one render. No staged
  fetches.
- Delete `src/lib/prefetchRoute.ts`, `src/layouts/RoutePrefetcher.tsx`,
  and `src/components/PrefetchLink.tsx` outright. They no longer have
  a job.
- Keep Gallery (`/gallery/:fragmentId`) on `React.lazy` with its own
  `<Suspense fallback={null}>` — its chunk is large enough that
  speculative download would meaningfully cost mobile users and most
  sessions don't visit it.
- No regression on `/` LCP beyond the bandwidth difference of moving
  ~70 kB gz of speculative-idle traffic onto the initial bundle.

## Non-goals

- SSR / SSG. Still a client-rendered SPA.
- Touching Gallery's chunking or load behavior.
- Moving the markdown pipeline (`react-markdown`, `remark-gfm`,
  `rehype-raw`) out of the main bundle. It comes in alongside the
  signal entries; that's fine — it's already speculatively
  downloaded by `<RoutePrefetcher />` today.
- Changing routing library, build tool, or any external dependency.
- Adding tests; this is a deletion-heavy refactor and the smoke test
  is "production build still loads every route."

## Design

There is no design. The design is "import the screens directly."

### Before (`src/App.tsx`, current shape)

```tsx
import { lazy, Suspense } from 'react';
import { screens } from 'src/lib/prefetchRoute';
import { HomeScreen } from 'src/screens/Home';

const GalleryScreen = lazy(/* … */);
const MemoriesScreen = screens.memories.Component;
const FragmentDetail = screens.memoriesDetail.Component;
// … six more lazy aliases …

const RouteFallback = () => <div className='w-full min-h-screen bg-black' />;

const App = () => (
  <Switch>
    <Route path='/gallery/:fragmentId'>{/* gallery */}</Route>
    <Route>
      <RootLayout>
        <Suspense fallback={<RouteFallback />}>
          <Switch>
            <Route path='/' component={HomeScreen} />
            <Route path='/memories' component={MemoriesScreen} />
            {/* … etc … */}
          </Switch>
        </Suspense>
      </RootLayout>
    </Route>
  </Switch>
);
```

### After

```tsx
import { lazy, Suspense } from 'react';
import { HomeScreen } from 'src/screens/Home';
import { MemoriesScreen } from 'src/screens/Memories';
import { FragmentDetail } from 'src/screens/Memories/FragmentDetail';
import { SignalsScreen } from 'src/screens/Signals';
import { SignalDetail } from 'src/screens/Signals/SignalDetail';
import { ConstructsScreen } from 'src/screens/Constructs';
import { ConstructDetail } from 'src/screens/Constructs/ConstructDetail';
import { HeroesScreen } from 'src/screens/Heroes';
import { HeroDetail } from 'src/screens/Heroes/HeroDetail';

const GalleryScreen = lazy(() =>
  import('src/screens/Gallery').then(m => ({ default: m.GalleryScreen })),
);

const App = () => (
  <Switch>
    <Route path='/gallery/:fragmentId'>
      {params => (
        <Suspense fallback={null}>
          <GalleryScreen fragmentId={params.fragmentId} />
        </Suspense>
      )}
    </Route>
    {import.meta.env.DEV && (
      <Route path='/gallery'>
        <Suspense fallback={null}>
          <GalleryScreen />
        </Suspense>
      </Route>
    )}
    <Route>
      <RootLayout>
        <Switch>
          <Route path='/' component={HomeScreen} />
          <Route path='/memories' component={MemoriesScreen} />
          <Route path='/memories/:id'>
            {params => <FragmentDetail id={params.id} />}
          </Route>
          <Route path='/memories/:id/:photo'>
            {params => <FragmentDetail id={params.id} photo={params.photo} />}
          </Route>
          <Route path='/signals' component={SignalsScreen} />
          <Route path='/signals/:id'>
            {params => <SignalDetail id={params.id} />}
          </Route>
          <Route path='/constructs' component={ConstructsScreen} />
          <Route path='/constructs/:id'>
            {params => <ConstructDetail id={params.id} />}
          </Route>
          <Route path='/heroes' component={HeroesScreen} />
          <Route path='/heroes/:id'>
            {params => <HeroDetail id={params.id} />}
          </Route>
        </Switch>
      </RootLayout>
    </Route>
  </Switch>
);
```

`Suspense` and `RouteFallback` are gone from the inner switch.
Gallery keeps its `<Suspense fallback={null}>` because it's a
genuinely-large chunk that intentionally suspends; rendering nothing
during its load is fine since Gallery owns the whole viewport.

### Files deleted

| Path                                      | LOC  |
| ----------------------------------------- | ---- |
| `src/lib/prefetchRoute.ts`                | ~174 |
| `src/layouts/RoutePrefetcher.tsx`         | ~65  |
| `src/components/PrefetchLink.tsx`         | ~65  |
| **Total**                                 | ~304 |

### Files simplified

- **`src/App.tsx`** — drop the `screens.*.Component` indirection,
  drop the inner `<Suspense>` / `RouteFallback`, replace eight lazy
  aliases with eight static imports. Net: shorter, more obvious.
- **`src/layouts/RootLayout.tsx`** — drop the `<RoutePrefetcher />`
  import and its render at the end of the layout.
- **`src/components/Sidebar/index.tsx`** — `NavLink` no longer
  branches on `prefetch?: RouteKey`; always renders wouter `<Link>`.
  Remove the `prefetch` prop and its plumbing on the four sidebar
  entries.
- **`src/screens/Memories/index.tsx`** — swap `<PrefetchLink prefetch="memoriesDetail">` → `<Link>` on each fragment card.
- **`src/screens/Constructs/index.tsx`** — same for
  `constructsDetail`.
- **`src/screens/Heroes/index.tsx`** — same for `heroesDetail`.
- **`src/screens/Signals/index.tsx`** — remove the inline
  `onMouseEnter` / `onFocus` / `onTouchStart` prefetch handlers from
  `signal-list-item` (the list item is a `<div tabIndex={0}>` that
  calls `navigate()` on click; we just drop the warming hooks, the
  click handler stays).

### Why Gallery stays split

Two independent reasons:

1. **Bandwidth.** 247 kB gzipped Three.js code is a real chunk that
   most visitors will never load. Bundling it would push the entry
   from ~70 kB gz to ~320 kB gz — a measurable LCP regression for
   landing-page-only visitors.
2. **Module-evaluation cost.** Three.js's top-level evaluation isn't
   free, and Gallery imports `@react-three/fiber` /
   `@react-three/drei` which pull in further infrastructure. Lazy
   eval here is a real win even ignoring transfer.

The prior spec already correctly excluded Gallery from
`<RoutePrefetcher />` for the same reason; we're keeping that
exclusion as a hard split now.

## Why the prefetch tax is gone-not-just-paid-elsewhere

Worth being honest about the tradeoff: we are paying ~70 kB gzipped
of additional bytes on the entry HTML's critical path. But:

- `<RoutePrefetcher />` was already pulling those bytes — it just
  pulled them on idle (`requestIdleCallback` / `setTimeout(200)`)
  instead of on the initial request. For the median visitor who
  stays on `/` for more than ~1 second, the wall-clock delivery
  time is essentially the same.
- The bytes that change from "deferred to idle" → "in entry" are
  entirely **JS** that the browser would have parsed and executed
  on idle anyway. The only visitors who see a meaningful regression
  are those who land on `/` and bounce within the time it takes for
  the additional bundle to arrive — and on broadband, that's tens
  of milliseconds.
- For all other visitors (anyone who clicks a sidebar link, or who
  direct-links to any content route), the new shape is **strictly
  faster** because there is no second roundtrip and no Suspense
  boundary to cross.

The asymmetry favors the simpler design: we trade a small,
predictable cost for the bouncing-visitor segment in exchange for
a meaningful win for everyone else, plus deletion of the entire
prefetch pipeline.

## Why this beats alternatives

| Alternative                                       | Why not                                                                                                                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep current setup                                | Works, but ~300 lines of clever-but-load-bearing infra coupled to React private API for a one-frame flash that bundling solves outright.                             |
| Drop only the idle warmup, keep hover-intent      | Halfway. Still keeps `lazyWithPreload`, still keeps Suspense, still flashes on direct-link nav. The original "weird pause" returns for the very case it was named for. |
| Bundle Gallery in too                             | +247 kB gz on entry for a feature most visitors never touch. Net regression on LCP for the landing-page-bounce segment.                                              |
| Replace `lazyWithPreload` with a third-party library | Same coupling to React internals, just hidden behind a dep. Doesn't address the underlying "do we need any of this?" question.                                       |

## Implementation plan

### Files touched

- **Delete:** `src/lib/prefetchRoute.ts`,
  `src/layouts/RoutePrefetcher.tsx`,
  `src/components/PrefetchLink.tsx`.
- **Edit:** `src/App.tsx`, `src/layouts/RootLayout.tsx`,
  `src/components/Sidebar/index.tsx`,
  `src/screens/Memories/index.tsx`,
  `src/screens/Constructs/index.tsx`,
  `src/screens/Heroes/index.tsx`,
  `src/screens/Signals/index.tsx`.

### Tasks

- [ ] Replace lazy aliases in `src/App.tsx` with static imports of
      `MemoriesScreen`, `FragmentDetail`, `SignalsScreen`,
      `SignalDetail`, `ConstructsScreen`, `ConstructDetail`,
      `HeroesScreen`, `HeroDetail`. Keep `lazy()` only for
      `GalleryScreen`. Remove the inner `<Suspense>` and
      `RouteFallback`.
- [ ] In `src/layouts/RootLayout.tsx`, remove the `<RoutePrefetcher />`
      mount and the import.
- [ ] In `src/components/Sidebar/index.tsx`, drop the
      `prefetch?: RouteKey` prop on `NavLink`, simplify it to always
      use wouter `<Link>`, and remove the `prefetch=` props on the
      four sidebar entries.
- [ ] In `src/screens/{Memories,Constructs,Heroes}/index.tsx`, swap
      `<PrefetchLink prefetch='…Detail'>` → `<Link>` on entry cards.
      Update imports.
- [ ] In `src/screens/Signals/index.tsx`, remove `onMouseEnter` /
      `onFocus` / `onTouchStart` prefetch handlers from
      `signal-list-item`. Keep the existing click / keydown handlers.
- [ ] Delete `src/lib/prefetchRoute.ts`,
      `src/layouts/RoutePrefetcher.tsx`,
      `src/components/PrefetchLink.tsx`.
- [ ] `bun run lint` and `bun run format` clean.
- [ ] `bun run build` succeeds. Capture before/after entry-bundle and
      total-bundle sizes for the outcome section. Confirm Gallery is
      still its own chunk.
- [ ] `bun run preview` smoke test: `/`, `/memories`,
      `/memories/:id`, `/signals`, `/signals/:id`, `/constructs`,
      `/constructs/:id`, `/heroes`, `/heroes/:id`,
      `/gallery/:fragmentId` all load. Direct-link nav to a content
      route paints without a flash.

## Verification

- DevTools Network panel:
  - `/` initial load delivers one larger entry bundle. No staged
    chunk fetches for content routes.
  - `/gallery/:fragmentId` direct-link still triggers a separate
    Three.js chunk fetch on demand (intentional).
- Visit each route directly (`/memories`, `/memories/japan-2024`,
  `/signals`, `/signals/<slug>`, `/constructs`, `/heroes`, etc.):
  no `<RouteFallback>` flash, no Suspense fallback paint.
- Click between routes from the sidebar: instant, no network
  activity for the new route.
- Lighthouse mobile run on `/`: LCP within ±100 ms of current. The
  small regression here is expected and acceptable; if it's worse
  than that, investigate.

## Outcome

_To be written during implementation. Should include: measured
before/after bundle sizes (entry, total, Gallery chunk), final list
of files deleted vs. edited with LOC delta, and any deviations from
the plan above._

## Risks / open questions

- **LCP regression on `/` for slow connections.** Adding ~70 kB
  gzipped to the entry pushes initial load. On 4G this is likely
  ~50–100 ms; on 3G it could be 300–500 ms. The bouncing-visitor
  segment is the loser here. If real-user metrics show this is
  meaningful, we have a few escape hatches: pull `MarkdownBody` +
  `react-markdown` back behind a Signals-specific lazy boundary
  (the largest single contributor at ~45 kB raw / 14.5 kB gz), or
  reintroduce a single-screen `lazy()` for whichever route is
  largest. We'd lose the "no Suspense at all" property but keep most
  of the simplification win.
- **Bundle parser cost on low-end devices.** ~70 kB more JS to
  parse on first paint. For a Tailwind + React 19 app on mid-tier
  Android this is in the noise (browser parsers are fast at this
  size), but worth checking if anyone reports first-paint regression
  on real devices.
- **Future content additions.** Adding a new section that's
  comparable in size to the existing four (e.g. doubling the
  Signals markdown surface) would push the entry meaningfully.
  This refactor is sized for the current content footprint; if it
  doubles, revisit.
- **Loss of the prefetch-related learning.** The archived spec at
  `docs/wu-json/specs/archived/2026-04-26-route-prefetch-waterfall.md`
  documents real expertise about React's lazy payload internals.
  Keep it archived as the receipt for "we tried the harder thing
  first." Worth a brief learnings note in `docs/wu-json/learnings/`
  if the React-private-API material has reuse value beyond this
  project; not blocking.
