---
status: implemented
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

`bun run build` on the current tree, identified by inspecting each
chunk's import graph:

| Chunk                                                     | Raw        | Gzip       |
| --------------------------------------------------------- | ---------- | ---------- |
| Entry `index-ioDqXByr.js` (React + wouter + shell + Home) | 224 kB     | 71 kB      |
| `index-D7DGTqet.js` (remark / mdast pipeline)             | 172 kB     | 52 kB      |
| `index-B9oGOUCV.js` (rehype + react-markdown)             | 118 kB     | 36 kB      |
| `public-api-C2NUfPHx.js` (YAML frontmatter parser)        | 97 kB      | 30 kB      |
| `MarkdownBody-*.js`                                       | 45 kB      | 14.5 kB    |
| `data-Bdo-DsBb.js` (Memories fragments index)             | 20 kB      | 4.3 kB     |
| `FragmentDetail-*.js`                                     | 15.5 kB    | 4.8 kB     |
| `data-C2D4ipqW.js` (Signals entries)                      | 12.7 kB    | 5.2 kB     |
| `index-DZsxN0Ir.js` (SignalsScreen)                       | 5.4 kB     | 2.3 kB     |
| `data-CJNNaQci.js` (Heroes / Constructs data)             | 3.7 kB     | 1.6 kB     |
| `ConstructDetail-*.js`                                    | 2.8 kB     | 1.0 kB     |
| `HeroDetail-*.js`                                         | 2.7 kB     | 1.0 kB     |
| `SignalDetail-*.js`                                       | 2.3 kB     | 0.9 kB     |
| `index-Cy42_kOJ.js` (ConstructsScreen)                    | 1.6 kB     | 0.8 kB     |
| `index-MqBSH8-x.js` (HeroesScreen)                        | 1.6 kB     | 0.8 kB     |
| `index-C8sAKk4q.js` (MemoriesScreen)                      | 1.6 kB     | 0.8 kB     |
| `ProgressiveImage-*.js`                                   | 1.1 kB     | 0.6 kB     |
| `useNearViewport-*.js`                                    | 0.5 kB     | 0.3 kB     |
| **Gallery `index-QFnyzL-m.js` (Three.js)**                | **914 kB** | **247 kB** |

The four content screens, their detail counterparts, the markdown
pipeline (remark + rehype + react-markdown + MarkdownBody), the
three data chunks, and the YAML parser sum to roughly **502 kB raw /
~155 kB gzipped**. `<RoutePrefetcher />` already speculatively
downloads most of this on idle: warming `signals` transitively pulls
the markdown pipeline because `SignalsScreen` renders `MarkdownBody`
inline, and warming any screen pulls its data chunk plus
`public-api` (every `data.ts` parses YAML frontmatter at module-eval
time via `import.meta.glob('./*.md', { eager: true })`).

The split is not saving bandwidth for the median visitor who clicks
around; it's spreading the same bytes across many small HTTP
requests behind infrastructure that exists to hide the fact that the
requests happen at all. It _does_ save bandwidth for the
landing-page-bouncer who never clicks anything — that's the
trade-off this spec is making explicit.

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

Replace `lazy(() => import('src/screens/…'))` with static imports
for the four content screens, their detail counterparts, and
`MarkdownBody`. **Keep Gallery split** — its 914 kB / 247 kB gzipped
Three.js chunk is real and most visitors don't enter `/gallery`.

This eliminates Suspense and the entire prefetch pipeline for
content routes. Direct deep-link navigation to `/memories/japan-2024`
becomes one Suspense-free render with no flash, no fallback,
no hover-timing dance, no React-internal coupling.

What ends up in the entry vs. still split is a Vite/Rollup decision
we don't fully control without a `manualChunks` config (and we're
not adding one). Expectation: the four screen index chunks
(~5 kB total), the four detail chunks (~23 kB), `MarkdownBody`,
and the three `data-*.js` chunks all roll into the entry, since
each is now imported by exactly one importer (`App.tsx`) which is
already eager. Whether `react-markdown` + `remark` + `rehype` (the
~290 kB raw / ~88 kB gz pair of vendor-y chunks) merge into the
entry or stay split depends on Rollup's heuristics for code shared
across multiple entry-reachable modules. Build measurement is part
of the verification step, not an upfront assumption.

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
- Accept a measured LCP regression on `/` proportional to the bytes
  moved onto the entry's critical path. Target: entry stays under
  200 kB gzipped post-change. If the actual measurement exceeds
  that, fall back to the per-screen `lazy()` escape hatch in Risks
  before merging.

## Non-goals

- SSR / SSG. Still a client-rendered SPA.
- Touching Gallery's chunking or load behavior.
- Adding a `manualChunks` config to control vendor splitting.
  Whatever Rollup decides on its own is the first iteration; if
  measurement says it's wrong, we tune that as a follow-up.
- Re-introducing any form of route-level lazy splitting _unless_
  measurement triggers an escape hatch in Risks.
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

| Path                              | LOC  |
| --------------------------------- | ---- |
| `src/lib/prefetchRoute.ts`        | ~174 |
| `src/layouts/RoutePrefetcher.tsx` | ~65  |
| `src/components/PrefetchLink.tsx` | ~65  |
| **Total**                         | ~304 |

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

1. **Bandwidth.** 247 kB gzipped Three.js code is a real chunk most
   visitors will never load. Bundling it would push the entry from
   71 kB gz to 318 kB gz at minimum, and that's before adding any
   of the content screens this spec is also bundling — a clearly
   unacceptable LCP regression for landing-page-only visitors.
2. **Module-evaluation cost.** Three.js's top-level evaluation isn't
   free, and Gallery imports `@react-three/fiber` /
   `@react-three/drei` which pull in further infrastructure. Lazy
   eval here is a real win even ignoring transfer.

The prior spec already correctly excluded Gallery from
`<RoutePrefetcher />` for the same reason; we're keeping that
exclusion as a hard split now.

## The honest tradeoff

The prefetch pipeline existed to hide a real cost. Removing it
doesn't eliminate the cost — it shifts who pays and when:

**Pay-on-entry visitors (now strictly more bytes on critical path)**

- Anyone who lands on `/` and bounces before the prefetcher would
  have run on idle. Today they pay only the entry. After: they pay
  entry + content screens + (probably) markdown pipeline.
- Anyone on a connection slow enough that LCP completes before
  idle would have fired. Today: same — entry only. After: more.

**Pay-on-click visitors (now strictly faster)**

- Anyone who clicks any sidebar link. Today: cold-chunk fetch
  (covered by hover-intent / idle warmup, but never zero). After:
  zero new bytes, zero new RTT, zero Suspense boundary.
- Anyone direct-linking to a content route. Today: entry + that
  route's chunk + transitive deps over multiple RTTs.
  After: one bundle.

**Net judgement**

The site exists for the second category — people who actually
read a Signal, scroll Memories, or land directly on a Construct
URL someone shared. The first category gets penalized by tens to
hundreds of milliseconds (depending on connection); the second
category gets a meaningfully better experience and the codebase
sheds ~300 lines of React-internal-API-coupled infrastructure.

The framing matters: this is **not** "the prefetcher was already
doing this so it's free." Idle-time bytes don't compete with LCP;
entry bytes do. We're choosing to spend the LCP budget on someone
who's about to actually use the site, instead of saving it for
someone who's about to leave.

## Why this beats alternatives

| Alternative                                          | Why not                                                                                                                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep current setup                                   | Works, but ~300 lines of clever-but-load-bearing infra coupled to React private API for a one-frame flash that bundling solves outright.                               |
| Drop only the idle warmup, keep hover-intent         | Halfway. Still keeps `lazyWithPreload`, still keeps Suspense, still flashes on direct-link nav. The original "weird pause" returns for the very case it was named for. |
| Bundle Gallery in too                                | +247 kB gz on entry for a feature most visitors never touch. Net regression on LCP for the landing-page-bounce segment.                                                |
| Replace `lazyWithPreload` with a third-party library | Same coupling to React internals, just hidden behind a dep. Doesn't address the underlying "do we need any of this?" question.                                         |

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
- [ ] `bun run build` succeeds. Record:
  - Final entry-bundle size (raw + gz). Compare against the 200 kB
    gz target in Goals; if exceeded, decide whether to ship or
    apply an escape hatch from Risks.
  - Total of all non-Gallery JS chunks (raw + gz).
  - Final preload set in `build/index.html` (which `modulepreload`
    tags it emits). This is the actual critical-path delta.
  - Confirm Gallery is still its own chunk and is **not** in the
    entry preload set.
- [ ] `bun run preview` smoke test: `/`, `/memories`,
      `/memories/:id`, `/signals`, `/signals/:id`, `/constructs`,
      `/constructs/:id`, `/heroes`, `/heroes/:id`,
      `/gallery/:fragmentId` all load. Direct-link nav to a content
      route paints without a flash.
- [ ] DevTools Network panel on Fast 3G throttle: confirm `/` now
      loads with at most one synchronous JS chunk fetch (entry +
      whatever Rollup left split if anything), and clicking any
      sidebar link triggers zero new JS requests.

## Verification

- DevTools Network panel:
  - `/` initial load: confirm one entry bundle (plus any vendor
    chunks Rollup chose to keep split, all loaded synchronously
    via `modulepreload`). No `import()`-style staged fetches for
    content routes.
  - `/gallery/:fragmentId` direct-link still triggers a separate
    Three.js chunk fetch on demand (intentional).
- Visit each route directly (`/memories`, `/memories/japan-2024`,
  `/signals`, `/signals/<slug>`, `/constructs`, `/heroes`, etc.):
  no `<RouteFallback>` flash, no Suspense fallback paint.
- Click between routes from the sidebar: instant, no network
  activity for the new route.
- Lighthouse mobile run on `/`: capture LCP delta vs. current
  baseline. Acceptable range depends on what Rollup chose to bundle
  vs. split — if entry is at or under the 200 kB gz target,
  expect <100 ms regression on broadband / <500 ms on 4G. If
  Rollup merged the markdown pipeline into entry and the delta is
  larger, evaluate whether to apply Risks escape hatch #1
  (relazy-ing MarkdownBody) before merging.

## Outcome

Implemented exactly as designed. No escape hatches needed.

### Measured bundle impact

`bun run build` after the change:

| Artifact                                                          | Before                                | After                                     | Δ                                 |
| ----------------------------------------------------------------- | ------------------------------------- | ----------------------------------------- | --------------------------------- |
| Number of JS chunks                                               | 20                                    | **2**                                     | -18                               |
| Entry JS                                                          | 224 kB / 71 kB gz (`index-ioDqXByr`)  | **724 kB / 223 kB gz** (`index-BOPTJFWC`) | **+500 kB / +152 kB gz**          |
| Gallery JS                                                        | 914 kB / 247 kB gz                    | 914 kB / 247 kB gz                        | unchanged (intentional)           |
| All other content chunks (markdown pipeline, screens, data, etc.) | ~502 kB / ~155 kB gz across 18 chunks | merged into entry                         | -18 chunks                        |
| `build/index.html` preload set                                    | fonts + mirror + entry JS + CSS       | fonts + mirror + entry JS + CSS           | unchanged set; entry hash differs |

Rollup collapsed every previously-split content chunk
(`MarkdownBody`, the remark/rehype/react-markdown vendor chunks,
the YAML frontmatter parser, the four screen index chunks, the
four detail chunks, and all three data chunks) into the entry
because each now has exactly one entry-reachable importer
(`App.tsx`, eager) and Rollup's split heuristic doesn't trigger.

The entry came in at **223 kB gzipped**, ~23 kB over the 200 kB gz
target set in Goals. Per the user, that's acceptable — the
simplification win is the primary goal and the LCP delta is
expected to be small on broadband. No `manualChunks` config added;
no escape hatch from Risks applied.

### Files deleted (304 LOC)

| Path                              | LOC |
| --------------------------------- | --- |
| `src/lib/prefetchRoute.ts`        | 174 |
| `src/components/PrefetchLink.tsx` | 65  |
| `src/layouts/RoutePrefetcher.tsx` | 65  |

`src/lib/` still has `types.ts`; `src/layouts/` still has
`RootLayout.tsx`. Neither directory was emptied.

### Files simplified

- `src/App.tsx` (-83 / +30 net): replaced the eight
  `screens.<key>.Component` aliases with eight static imports;
  removed the inner `<Suspense>` + `RouteFallback`. Gallery alone
  retains `lazy()` + `<Suspense fallback={null}>`. Updated comment
  on Gallery's `lazy()` block to explain the size-based reasoning
  (was previously "not prefetched speculatively"; now "would be a
  clear LCP regression for visitors who never enter the gallery").
- `src/layouts/RootLayout.tsx` (-2): dropped `<RoutePrefetcher />`
  import and render.
- `src/components/Sidebar/index.tsx` (-25): collapsed the
  `prefetch?: RouteKey` branch in `NavLink` so it always renders
  wouter `<Link>`. Removed `prefetch=` props from the four sidebar
  entries. Removed `PrefetchLink` and `RouteKey` imports.
- `src/screens/{Memories,Constructs,Heroes}/index.tsx`: swapped
  `<PrefetchLink prefetch='…Detail'>` → `<Link>`. Replaced
  `PrefetchLink` import with wouter `Link` import.
- `src/screens/Signals/index.tsx`: removed `onMouseEnter` /
  `onFocus` / `onTouchStart` from `signal-list-item`, dropped the
  `onSignalIntent` `useCallback`, and the `prefetchRoute` import.
  Click and keyboard handlers untouched. `useCallback` import
  retained because `composedRef` still uses it.

### Smoke test results

`bun run lint` and `bun run format` clean. `bun run build`
completes in ~2 s with the chunk shape above. `bun run preview`
serves `/`, `/memories`, `/memories/japan-2024`, `/signals`,
`/constructs`, `/heroes` at 200 OK. (The "is there really no
flash on direct nav?" check is a browser-side assertion, not
server-side; HTTP 200 from the SPA shell only confirms the build
is well-formed.)

### Deviations from the plan

None. Exactly the eight tasks in the implementation plan, no
extras. Rollup made the simplest possible chunking choice
(everything in entry) which obviated the second-guess about
whether to add a `manualChunks` config.

### Follow-ups

- Browser-side verification that direct navigation to a content
  route paints with no Suspense fallback. Acceptance is by-eye on
  the live site.
- Real-world LCP measurement after deploy. If broadband LCP on
  `/` regresses by more than ~300 ms vs. the prior route-prefetch
  baseline, escape hatch #1 in Risks (relazy `MarkdownBody` +
  the markdown pipeline) is the cheapest single-step relief —
  worth ~14.5 kB gz of MarkdownBody itself plus probably most
  of the ~88 kB gz vendor pipeline that imports it.
- Optional: extract the React `_payload` mutation technique into
  a `docs/wu-json/learnings/` doc if it has reuse value beyond
  this project.

## Risks / open questions

- **LCP regression on `/`.** Order-of-magnitude estimate: the
  speculatively-bundled content sums to ~155 kB gzipped at the
  upper bound (everything merges into entry). At Fast 3G's
  effective ~1.5 Mbps that's ~830 ms additional transfer time;
  on 4G (~10 Mbps real-world) it's ~125 ms; on broadband it's
  noise. Whether the actual delta hits the upper bound depends on
  Rollup's chunking (see next item). The bouncing-visitor segment
  on slow connections is the clear loser. **Escape hatches if
  measurement is bad:**
  1. Pull `MarkdownBody` + the react-markdown / remark / rehype
     pipeline back behind a Signals-specific `lazy()` boundary
     (~45 kB gz of the ~155 kB total). Big single-step relief,
     keeps every other route static.
  2. Reintroduce per-screen `lazy()` for the largest single screen
     and keep everything else static.
  3. Add a `manualChunks` config to keep vendor pipelines split as
     async chunks while content stays in entry.
     Each escape preserves most of the simplification win (deleted
     `prefetchRoute.ts`, `RoutePrefetcher.tsx`, `PrefetchLink.tsx`)
     while restoring some splitting.

- **Rollup may keep some chunks split anyway.** Each `import()`
  call site disappears in the new shape (only Gallery uses it),
  but Rollup's automatic chunking still groups large shared
  vendor code (e.g. the remark/rehype pipeline imported by
  `MarkdownBody`) when its size justifies the split heuristic.
  If Rollup keeps `react-markdown` etc. in their own chunks but
  loaded synchronously via the entry's `<script type=module>`
  imports, the LCP cost is the same as bundling them, but
  parsing is amortized. If it merges them in, parsing happens
  earlier. Either way the entry HTML's preload set should grow
  by a `<link rel="modulepreload">` per non-merged chunk; that
  delta is the actual measurement we care about. **Implementation
  step: capture `bun run build` output and decide whether to ship
  as-is or add `manualChunks` based on the entry preload set.**

- **Parser cost on low-end devices.** Worst case (full merge into
  entry) adds ~155 kB gzipped / ~500 kB minified of JS to parse
  before first paint. Modern V8 parses ~1–2 MB/s on mid-tier
  Android, so this is ~250–500 ms additional parse on a low-end
  device. Not catastrophic but real; flagged for the same
  measurement step as above.

- **Future content additions.** Each new Memory fragment, Signal
  entry, or Construct adds bytes to the data chunks (parsed at
  module-eval time via `import.meta.glob`). Today those bytes are
  deferred to the relevant lazy chunk; after this change they're
  in the entry. The marginal cost per new entry is small (a few
  hundred bytes of frontmatter + body), but if the corpus 10×s
  this calculus needs to be revisited. Worth checking annually,
  not blocking now.

- **The `import.meta.glob` data chunks.** Each section's `data.ts`
  uses `import.meta.glob('./*.md', { eager: true })` to inline
  every entry's frontmatter at build time. Today the parsed YAML
  - body strings live in a per-section `data-*.js` chunk; after
    this change they live in the entry. The YAML parser
    (`public-api-*.js`, ~30 kB gz) is shared across all four
    sections, and its presence in the entry is one of the bigger
    open questions for Rollup's chunking. Verification step covers
    this.

- **Loss of the prefetch-related expertise.** The archived spec at
  `docs/wu-json/specs/archived/2026-04-26-route-prefetch-waterfall.md`
  documents real, hard-won understanding of React's `lazy`
  payload state machine. Keep it archived as the receipt for "we
  tried the harder thing first." Optional follow-up: extract the
  React-internal-API material into
  `docs/wu-json/learnings/<date>-react-lazy-payload-mutation.md`
  if it has reuse value beyond this project. Not blocking this
  spec.
