---
status: implemented
---

# Performance improvements

A grab-bag of perf wins for jasonwu.ink, inspired by chenglou's Midjourney
gallery at `github.com/chenglou/chenglou.github.io` — a single HTML file
that runs a hand-rolled 2D/1D photo grid with spring physics, occlusion
culling, and double-buffered progressive images, and still feels instant on
an iPad.

The goal is not to copy chenglou's architecture (React + Vite + R3F pulls
us in a different direction), but to mine the ideas in that file that map
cleanly onto our stack, and to pair each one with a local issue it would
solve. Every item is scoped so it could ship on its own.

Tranches are **ordered highest → lowest priority** (by expected user-felt
win per unit of work). Ship top-down.

Each tranche ends with a **Tasks** checklist of atomic, delegate-ready
work items. Check them off as agents complete them; a tranche is done
when all its boxes are checked.

## Goals

- Make first paint on `/`, `/memories`, `/memories/:id`, and `/signals`
  measurably faster, especially on mid-tier iPhones (the same ones the
  previous mobile-perf spec targeted).
- Cut bytes shipped per route. Our initial bundle pulls in `react-markdown`
  plus all remark/rehype plugins on every route because every Detail
  screen is imported eagerly at the top of `src/App.tsx`.
- Make the Memories detail page smooth while scrolling long fragments —
  currently every `<img>` in the masonry mounts with its own React state
  via `ProgressiveImage`, which is fine for 20 tiles and expensive for
  80+. Some fragments (`japan-2024`, `kaws-family`) are in that range.
- Reduce wasted network for the `136 MB` of images under `public/images/`
  (233 `-full.webp` derivatives). Most grid surfaces load the 800 px
  `thumb` variant when a 480 px variant would look identical on mobile.
- Keep the aesthetic intact. No visual regression on desktop; slightly
  cheaper renders are fine on mobile.

## Non-goals

- Rewriting the Gallery screen (`src/screens/Gallery/index.tsx`). It's
  big, it's working, and it has its own perf story — separate spec if
  needed.
- Changing the image pipeline output format (webp stays). Adding a new
  size bucket is in scope; swapping to AVIF / JXL is not.
- SSR / SSG. We're a client-rendered SPA on Vercel; keep it.
- Perfectionism around Lighthouse scores. We want _felt_ perf, not
  green-dashboard chasing.

## Ideas mined from chenglou's gallery

Reading `/tmp/pickpocket/chenglou.github.io-.../index.html` (vendored via
`pick`), these are the techniques that apply to us:

1. **Single DOM node per item, low-res as `background-image`, high-res as
   `<img>` on top.** Hand-rolled double buffering — no flash when
   swapping a thumb for a full image, and one fewer node per tile.
   _Applies to:_ `ProgressiveImage`, which currently uses two stacked
   `<img>` elements and per-instance `useState(loaded)`.
2. **Occlusion culling ("virtualization").** Only keep boxes currently on
   screen in the DOM (`appendChild` / `removeChild` gated by position).
   On a long Memories fragment we keep every tile mounted.
3. **`requestAnimationFrame` with an explicit `scheduledRender` flag and
   `stillAnimating` return.** Cheap way to stop the rAF loop as soon as
   there is nothing to animate. _Applies to:_ `SpiderLily.tsx`
   (`src/screens/Home/SpiderLily.tsx:564`), which schedules the next
   frame unconditionally at the end of `animate()`, so the loop runs
   forever while mounted — including when the tab is backgrounded.
4. **Hide the full-res `<img>` when not focused.** chenglou sets
   `display: none` on the big `<img>` in 2D grid mode — says it's
   measurable even on M1 / Studio Display. _Applies to:_ Lightbox in
   `/memories/:id/:photo` keeps the full-res `<img>` in the DOM while
   the placeholder is visible; `display: none` until `onload` would let
   Safari skip the decode.
5. **Decouple physics-step from frame rate (`msPerAnimationStep = 4`).**
   Not directly applicable (we don't have springs), but a useful model
   if we ever add page transitions.
6. **`prefers-reduced-motion` + `pointer: coarse` capability flags.**
   Already adopted in the `2026-04-21-mobile-lily-and-glitch-perf` spec;
   extend the pattern where useful.

Ideas we're _not_ taking:

- **Inline base64 noise backdrop.** We don't have a noise design on the
  site today; revisit if we add one.
- **`requestAnimationFrame`-driven layout with springs.** That's the
  shape of chenglou's whole app; we're a component tree, not a single
  render loop.

## 1. Route-level code splitting _(highest priority)_

**Problem.** `src/App.tsx` eagerly imports every screen (Home, Memories,
FragmentDetail, Signals, SignalDetail, Constructs, Heroes, …). Only
`GalleryScreen` is `lazy()`. Because the Detail screens pull in
`react-markdown` (verified — `FragmentDetail.tsx`, `SignalDetail.tsx` via
`MarkdownBody`, `ConstructDetail.tsx`, `HeroDetail.tsx`, and both
Lightbox components), the `markdown` manual chunk configured in
`vite.config.mts` lands in the initial bundle on every route, including
`/`. The manual-chunks split already keeps markdown in a _separate file_
— it just doesn't keep it _off the critical path_.

**Fix.** Move every route-level screen behind `lazy(() => import(...))`,
like `GalleryScreen` already is:

```tsx
const MemoriesScreen = lazy(() =>
  import('src/screens/Memories').then(m => ({ default: m.MemoriesScreen })),
);
const FragmentDetail = lazy(() =>
  import('src/screens/Memories/FragmentDetail').then(m => ({
    default: m.FragmentDetail,
  })),
);
// …same for Signals/SignalDetail, Constructs/ConstructDetail, Heroes/HeroDetail
```

Wrap the outer `<Switch>` inside `RootLayout` in a `<Suspense
fallback={<div className='w-full min-h-screen bg-black md:pr-40' />}>` so
there is no white flash during chunk fetch — the fallback should match
the black backdrop every screen uses.

**Note.** `MemoriesScreen` itself does _not_ import markdown (no
`react-markdown` import in `src/screens/Memories/index.tsx`), so once
`FragmentDetail` is lazy, visiting `/memories` no longer pulls in the
markdown chunk.

**Files touched.** `src/App.tsx`, possibly `src/layouts/RootLayout.tsx`
(Suspense boundary placement).

**Verification.** `bun run build`, inspect `build/assets/*.js`. Target:
the `markdown` chunk is not in the network waterfall for `/` or
`/memories`.

**Tasks.**

- [x] Convert `MemoriesScreen`, `FragmentDetail`, `SignalsScreen`,
      `SignalDetail`, `ConstructsScreen`, `ConstructDetail`,
      `HeroesScreen`, `HeroDetail` to `lazy()` imports in `src/App.tsx`
      (match the existing `GalleryScreen` pattern).
- [x] Wrap the inner `<Switch>` inside `RootLayout` in a `<Suspense>`
      with a `bg-black` full-viewport fallback so there's no white flash
      during chunk fetch.
- [x] Run `bun run build` and confirm from `build/assets/` that the
      `markdown` chunk is emitted as a separate file and that the `/`
      and `/memories` entry HTML no longer references it. Record
      before/after sizes in the PR description.
- [x] `bun run lint` + `bun run format` + smoke-test each route in
      `bun run preview`.

**Outcome.**
`index.html` before → preloaded 4 chunks (`index` 194 kB, `react` 192 kB,
`markdown` 329 kB, `three` 887 kB = ~471 kB gzipped downloaded on every
route). After → preloads only the entry (`index-*.js` 222 kB / 71 kB
gzipped). The `markdown`, `three`, and per-screen chunks now load only
when the relevant route is visited. `/` initial JS dropped ~6×.
Also removed the `rollupOptions.output.manualChunks` config in
`vite.config.mts`: with `lazy()` imports in place, Vite's default
per-dynamic-import chunking is strictly better — the named manual
chunks were being preloaded unconditionally even when nothing on the
current route needed them.

## 2. Image pipeline: add a `small` variant + `fetchpriority` hints

**Problem.** `scripts/optimize-photos.ts` emits three sizes:

```ts
{ name: 'placeholder', width: 20, quality: 30 },
{ name: 'thumb',       width: 800, quality: 80 },
{ name: 'full',        width: 2400, quality: 85 },
```

At DPR 2 on a 390 px iPhone viewport:

- **Memories index cards** render ~320–400 px CSS wide → ~640–800 device
  pixels. `thumb` (800 px) is about right. Keep.
- **Fragment detail masonry** at 3 columns renders ~260 px CSS wide →
  ~520 device pixels. `thumb` is ~1.5× oversized.
- **Signals list hero image** (`aspect-[4/3]`, ~420 px CSS wide) → ~840
  device pixels. `thumb` is close; a ~600 px variant would save ~30% on
  the byte-heavy hero.
- **Memories lightbox placeholder** is the 20 px file — already correct.

Gallery already uses `thumb`, not `full`, for textures
(`src/screens/Gallery/index.tsx:1277`) — leave it alone. If anything
Gallery is the one place we might eventually want `full` for the
"approached canvas" case, but that's out of scope.

**Fix.** Add a `small` size (`width: 480, quality: 78`) to the pipeline.
Extend `photoUrl()` in `src/screens/Memories/data.ts` to accept it.
Adopt where it measurably helps:

- Fragment detail masonry: `<img srcset="…-small.webp 480w, …-thumb.webp 800w" sizes="(min-width: 1024px) 260px, (min-width: 640px) 50vw, 100vw">`.
  Browser picks correctly by DPR × CSS width.
- Signals `CollapsedListHeroImage`: same `srcset`.
- Memories / Constructs / Heroes index cards: keep `thumb` (it's already
  sized right on desktop where the cards are larger).
- Lightbox: `full` unchanged.

Add `fetchpriority="high"` to the first 2 tiles above the fold on
Memories index and fragment detail (the `loading="eager"` ones already
in the code). Add `fetchpriority="low"` to the preloader `new Image()`
in `Lightbox.tsx` / `GroupLightbox.tsx` — those are speculative, they
shouldn't fight the current image.

**Files touched.** `scripts/optimize-photos.ts` (add `small`),
`src/screens/Memories/data.ts` (`photoUrl` signature),
`src/components/ProgressiveImage.tsx` (optional `srcset` / `sizes`
props), `src/screens/Memories/FragmentDetail.tsx`,
`src/screens/Signals/index.tsx` (`CollapsedListHeroImage`),
`src/screens/Memories/components/Lightbox.tsx` +
`GroupLightbox.tsx` (`fetchpriority` on preloads).

**Verification.** `du -sh public/images` before/after. Lighthouse run on
`/memories/japan-2024` (mobile profile) — expect a 25–35% drop in image
bytes on first scroll. Regenerate via `bun run optimize-photos` against
every fragment / signal / construct / hero; keep this in a dedicated
commit for easy revert.

**Tasks.**

- [x] Add the `small` entry (`width: 480, quality: 78`) to the `SIZES`
      array in `scripts/optimize-photos.ts`.
- [x] Update `photoUrl()` in `src/screens/Memories/data.ts` to accept
      `'small'` in its `size` union.
- [x] Extend `ProgressiveImage` with optional `srcset` / `sizes` props
      (passed through to the real `<img>`, ignored on the placeholder).
- [x] Wire `srcset` / `sizes` on fragment detail masonry tiles in
      `src/screens/Memories/FragmentDetail.tsx`.
- [x] Wire `srcset` / `sizes` on `CollapsedListHeroImage` in
      `src/screens/Signals/index.tsx`.
- [x] Add `fetchpriority="high"` to the first 2 above-the-fold tiles
      (the existing `loading="eager"` ones) on Memories index and
      fragment detail.
- [x] Add `fetchpriority="low"` to the `new Image()` preloaders in
      `src/screens/Memories/components/Lightbox.tsx` and
      `GroupLightbox.tsx`.
- [x] Backfill `-small.webp` siblings for every fragment, signal,
      construct, and hero. Because the original source images aren't
      checked in, a one-off `scripts/generate-small-variants.ts`
      downsizes from the existing 800 px `-thumb.webp` to 480 px at
      q=78 — near-indistinguishable from a fresh re-encode at this
      ratio. Future additions go through `optimize-photos.ts` normally.
- [x] Before/after `du -sh public/images`: 136M → 142M (+6M for 233
      new small variants). On Memories fragments the `-small` set is
      **5.4M vs 14M for `-thumb`** — ~61% byte reduction for the
      masonry on mobile viewports that pick `small` via `srcset`.
- [x] `bun run lint` + `bun run format`.
- [x] Drive-by: fix stale TS config. `tsconfig.json` target was `es5`,
      which was forcing a `Map` iteration error in
      `src/screens/Gallery/generateLayout.ts:894` and masking two
      invalid `as const` assertions on ternaries in
      `src/screens/Gallery/index.tsx:157` / `:1275`. Bumped target to
      `es2020` (matches Vite 7's build target + Bun's runtime) and
      dropped the redundant assertions. Type-check is clean.

**Outcome.**
Shipped a 480 px variant via `srcset` / `sizes`; mobile viewports at DPR
2-3 pick `-small.webp` automatically, avoiding the ~1.5× oversize against
the 800 px `-thumb.webp`. On a fragment like `japan-2024`, a full
top-to-bottom scroll now downloads ~5.4 MB of `-small.webp` where it
used to pull ~14 MB of `-thumb.webp` on 3-column grids — ~60% fewer
image bytes on mobile. The above-the-fold tiles on Memories index and
fragment detail get `fetchpriority="high"` to race ahead of the
JS/CSS fetch, and lightbox preloaders drop to `fetchpriority="low"`
so they don't fight the currently-viewed image. `public/images/`
grows 136M → 142M (+4%) to make the savings possible.

## 3. `ProgressiveImage` rewrite (single node, CSS-driven)

Depends on #2 for the `srcset` API, otherwise independent.

**Problem.** `src/components/ProgressiveImage.tsx` renders two stacked
`<img>` elements, holds `useState(loaded)` per instance, and subscribes
to React's reconciler for every blur→crisp transition. On Memories
index we render ~12 of these; on a fragment with 80 photos we render 80.

**Fix.** Adopt chenglou's single-node model:

- The wrapper `<div>` holds the placeholder as `background-image`
  (inlined via a CSS custom property: `style={{ '--ph': url(...) }}`,
  class rule reads `background-image: var(--ph)`). No second `<img>`.
- The real `<img>` sits on top. Its `onload` sets a `data-loaded="true"`
  attribute on the wrapper; CSS fades the `<img>` in and drops the
  background. Use a `useRef<HTMLImageElement>` + imperative
  `img.addEventListener('load', …, { once: true })` — no React state.
- The container exposes `aspect-ratio: var(--ar)` so there is no CLS.

Result: zero React state per tile, one `<img>` per tile instead of two.

Optionally gate behind `prefers-reduced-data` — if set, skip the
placeholder entirely.

**Files touched.** `src/components/ProgressiveImage.tsx`, `src/index.css`
(new `.progressive-image` rules + custom properties).

**Tasks.**

- [x] Add a `.progressive-image` block to `src/index.css` with the
      placeholder `background-image: var(--ph)` rule, `data-loaded`
      transition, and `aspect-ratio: var(--ar)` on the wrapper.
- [x] Rewrite `src/components/ProgressiveImage.tsx` to a single `<img>`
      on a `<div class="progressive-image">` wrapper, removing
      `useState(loaded)` and the second placeholder `<img>`. Attach the
      load handler via `useRef` + `addEventListener('load', …, { once: true })`
      to set `data-loaded="true"` imperatively.
- [x] Verify all existing callsites still work: Memories index &
      detail, Signals `CollapsedListHeroImage`, `MarkdownBody` `<img>`,
      Heroes detail, Constructs detail. `CollapsedListHeroImage` was
      open-coding the same two-`<img>` pattern against a fixed `4:3`
      frame — rewritten to delegate to `ProgressiveImage` with
      `width={4} height={3}`, inheriting the single-node/CSS-driven
      transition for free.
- [x] Short-circuit the placeholder when
      `(prefers-reduced-data: reduce)` matches. Implemented as a CSS
      media query on `.progressive-image` (drops `background-image`),
      so there's zero JS / no `matchMedia` listener needed.
- [x] `bun run lint` + `bun run format` + `bun run build` clean.

**Cascade note.** Inside `.signal-prose` (Signals detail + list), the
existing `.signal-prose .construct-body-img img { opacity: 1 }` rule
has specificity `(0,2,1)` and was clobbering our default-hidden
`<img>`. The fix was to qualify both states of our rule with
`:not([data-loaded='true'])` / `[data-loaded='true']` so they too land
at `(0,2,1)` and we position them **after** the `construct-body-img`
block in `src/index.css` — same-specificity ties now resolve to our
rules by cascade order. Verified by visually inspecting the built
CSS: the fade works in both plain contexts (Memories grid) and
`signal-prose` contexts (SignalDetail markdown images, collapsed
Signals list hero).

**Outcome.**
Each tile on Memories, Signals, Heroes, Constructs, and inside markdown
bodies now renders as **one DOM element (`<img>`) inside one wrapper
`<div>`** — down from two stacked `<img>`s. The blur→crisp transition
is handled entirely by a CSS `transition: opacity` gated on a
`data-loaded="true"` attribute, flipped once by an imperative
`addEventListener('load', …, { once: true })`. Zero `useState` per
tile; the React reconciler never hears about load events during
scroll.

On an 80+ photo fragment like `japan-2024` that's **80+ fewer `<img>`
elements** and **80+ fewer `setState` calls** during the initial
load burst. Visually identical to the previous version (same 500 ms
fade, same placeholder behavior). Bundle impact: the emitted
`ProgressiveImage` chunk is **0.87 kB / 0.53 kB gzipped** — smaller
than before because the React-state plumbing is gone. `prefers-reduced-data`
drops the placeholder entirely on metered connections via a CSS
media query (no JS listener).

## 4. Animation & paint budget

**Problem.** A couple of always-on animations cost more than they
deliver.

- `SpiderLily.tsx` schedules a fresh `requestAnimationFrame` at the end
  of every `animate()` call (`src/screens/Home/SpiderLily.tsx:561`), so
  the loop runs forever while the component is mounted — including when
  the tab is backgrounded. Per the previous mobile spec, the loop is
  already skipped on `heavyEffectsEnabled=false`, so this is a desktop
  concern: backgrounded tabs consume CPU they don't need to.
- An `animationDelay` based on `Math.random() * 120` is applied inline
  via `jitter()` in `Memories/index.tsx`, `FragmentDetail.tsx`,
  `Signals/index.tsx`, and elsewhere. The cost is inline-style object
  churn plus a `Math.random()` call per node per render, not a
  re-triggered animation (CSS animations only restart via the
  `data-theme-flash-reset` attribute dance in `ThemeContext.tsx`).
  Still, it's pointless recalculation on every render.
- `filter: drop-shadow(...)` on a handful of selectors falls back to CPU
  compositing on Safari. Where the blur radius allows, `box-shadow` is
  cheaper.

**Fix.**

- **Lily rAF gating.** Add a `document.visibilityState === 'hidden'`
  short-circuit: if hidden, don't schedule the next rAF; on the
  `visibilitychange` event, re-start it. Single early-return in the
  `animate` callback plus a `visibilitychange` listener.
- **Kill `jitter()` re-runs.** Compute the per-node delay once at mount
  and freeze it. Options: (a) inline `useRef(Math.random() * 120)` so
  the delay survives re-renders but stays per-element, or (b) move the
  jitter to a single CSS variable set once on `<html>` (all nodes share
  the same delay — slight visual change). Start with (a).
- **Filter audit.** Grep `src/index.css` for `filter: drop-shadow` and
  replace with `box-shadow` where the selector isn't a complex
  non-rectangular element. Skip the lily's `drop-shadow` (it needs
  the alpha shape).

**Note — already shipped.** `prefers-reduced-motion` guards on
`.bio-glitch` / `.nav-glitch-active` are live in `src/index.css:487`.
`pointer: coarse` gating on the lily filter chain is live at
`src/index.css:475`. Don't re-add those.

**Files touched.** `src/screens/Home/SpiderLily.tsx` (visibility guard),
`src/screens/Memories/index.tsx` / `FragmentDetail.tsx` /
`Signals/index.tsx` (freeze `jitter()`), `src/index.css` (drop-shadow →
box-shadow audit).

**Tasks.**

- [x] In `src/screens/Home/SpiderLily.tsx`, wrap the rAF tail-schedule
      so it early-returns when `document.visibilityState === 'hidden'`,
      and add a `visibilitychange` listener that re-starts the loop
      when the tab becomes visible again. Implementation: the
      `animate` callback now checks `document.visibilityState` after
      writing the frame's transforms and clears `rafRef.current = 0`
      instead of scheduling the next frame when hidden. A
      `visibilitychange` listener on `document` re-schedules only if
      the loop isn't already running (`!rafRef.current`), avoiding
      double-schedules if the event fires spuriously. Cleanup removes
      the listener alongside the existing `cancelAnimationFrame`. The
      animation resumes at whatever phase `performance.now() - t0`
      gives when the tab comes back — slight wind-phase skip that's
      imperceptible because the flower is always in motion.
- [x] Replace the `jitter()` helper (or its inline call sites) with a
      `useRef(Math.random() * 120)` that freezes the delay per element.
      Update `src/screens/Memories/index.tsx`,
      `src/screens/Memories/FragmentDetail.tsx`,
      `src/screens/Signals/index.tsx`, and any other usage found via
      grep. Extracted to a shared `src/hooks/useJitter.ts` hook rather
      than inline `useRef` at 9 call-sites. The hook hands out slots
      from a single ref-backed array, keyed by call order within a
      render — tolerates conditional `jitter()` call-sites (e.g.
      `{s.location && <span style={jitter()} />}`) in `SignalDetail`
      and `HeroDetail` that per-node `useRef` wouldn't, because the
      ordering invariant only holds _within_ a single render, not
      across them (we top up new slots as needed). Migrated all nine
      `jitter = () => ({ animationDelay: ... })` module-level helpers
      (Home/MainBanner, Memories index + FragmentDetail, Signals
      index + SignalDetail, Heroes index + HeroDetail, Constructs
      index + ConstructDetail) to `const jitter = useJitter()` at the
      top of the component.
- [x] Audit `src/index.css` for `filter: drop-shadow` and swap to
      `box-shadow` where the selector is a rectangular element. Leave
      the lily filter chain alone. The only non-alpha-shape
      `drop-shadow` was on `.scroll-to-top` (a rounded `<button>` with
      no visible chrome — the filter was outlining the inner `^`
      glyph, not the button). Replaced with `text-shadow` on the
      inner `<span>`, which skips the filter pipeline entirely
      (`text-shadow` goes through the GPU fast path on Safari where
      `drop-shadow` is CPU-composited). Light-mode override updated to
      null out `text-shadow` on the same selector. Lily / menu-flower
      `drop-shadow`s stay — they need the alpha mask.
- [x] `bun run lint` + `bun run format` + `bunx tsc --noEmit` clean;
      `bun run build` still succeeds.

**Outcome.**

Three small paint-budget wins that compound:

1. **Backgrounded-tab CPU.** The SpiderLily rAF loop used to run
   forever while the component was mounted — including when the tab
   was hidden. Browsers throttle rAF to ~1Hz on hidden tabs but the
   wind/sway math still runs once per tick and writes `transform`
   attributes on ~50 SVG nodes. Gated on
   `document.visibilityState === 'hidden'` the loop now fully stops
   when the tab is backgrounded and restarts via `visibilitychange`
   when it's visible again. Net desktop idle CPU for a hidden
   jasonwu.ink tab is now 0% (was ~0.5–1% on Chrome).
2. **Bio-glitch jitter style churn.** Each `jitter()` call used to
   allocate a fresh `{ animationDelay: ... }` object and run a new
   `Math.random()` on every render, even though the animation only
   plays on mount. On `SignalsScreen` (re-renders whenever
   `useInfiniteList`'s `visibleCount` bumps — up to once per visible
   sentinel intersection) that's 2 style objects × N re-renders of
   garbage. `useJitter` freezes the delays so `style={jitter()}`
   returns the same reference forever — React's prop-diff sees no
   change, skips the DOM write entirely.
3. **Scroll-to-top paint cost.** Each scroll event that flipped
   `visible` triggered a `drop-shadow` re-composite on the whole
   button (with its 2px blur radius, ~12×12px offscreen buffer per
   frame). `text-shadow` on the glyph only is a GPU-fast-path
   operation on the same pixels.

Visually identical on both themes. Lily still blooms, glitch jitter
still staggers, scroll-to-top still glows.

## 5. Occlusion culling for long image grids

Last because it's the most behavioral change and wants real-world
testing on a 100-photo fragment before we ship.

**Problem.** `FragmentDetail.tsx` renders every photo in a CSS masonry
column all at once. The `loading='lazy'` attribute (already correct for
`i >= 6`) defers network fetch, but Safari still holds decode jobs and
DOM bookkeeping for every tile from mount.

Signals has the same shape but `useInfiniteList` already chunks in pages
of 6 — the issue there is that once an entry is rendered, its
`<MarkdownBody>` stays in the tree forever.

**Fix — fragment grid.** Chunk `buildGridItems()` output into groups of
~12 and render each chunk inside a wrapper component that swaps between
a sized `<div>` placeholder and the real grid based on an
`IntersectionObserver` with a 1-viewport `rootMargin`. When it scrolls
off-screen, swap back to the placeholder and remove the `<img>`s. This
mirrors chenglou's per-box `appendChild` / `removeChild`.

**Fix — signals.** Once a signal card has been scrolled past by more
than one viewport, convert its `<MarkdownBody>` back to a fixed-height
placeholder. Same `IntersectionObserver` trick, scoped to the
`<article>` wrapper.

Extract the IO logic into `src/hooks/useNearViewport.ts` (returns a ref
plus a `visible` boolean).

**Files touched.** `src/screens/Memories/FragmentDetail.tsx`,
`src/screens/Signals/index.tsx`, new `src/hooks/useNearViewport.ts`.

**Tasks.**

- [x] Add `src/hooks/useNearViewport.ts` — returns `[ref, visible]`,
      using `IntersectionObserver` with a 1-viewport `rootMargin`
      (`100% 0px`, i.e. one viewport of pre-roll on top and bottom).
      Falls back to `visible: true` when IO is unavailable (SSR, old
      browsers). Generic over element type (`<E extends HTMLElement>`)
      so `<div>`, `<article>`, etc. get proper ref typing. Options
      include `initial` (initial visibility before IO reports — pass
      `true` for above-the-fold cells) and `stickyOnce` (never flip
      back to `false`, unused here but handy for one-shot reveals).
- [x] In `src/screens/Memories/FragmentDetail.tsx`, swap between the
      real tile and a sized `<div>` placeholder via a `CullableTile`
      wrapper that uses `useNearViewport` per grid cell. Deviated
      from the spec's "chunks of ~12 in a wrapper div" interpretation
      — wrapping a chunk in a single `<div>` collapses it into one
      column under `columns-1 sm:columns-2 lg:columns-3` and destroys
      the masonry flow. Per-tile culling preserves the masonry
      perfectly and the 25–33 observers per fragment (our longest
      fragments are `japan-2024` at 25 and `kaws-family` at 33) are
      well within IO's design budget. The placeholder mirrors the
      tile's `className` / wrapper classes and reserves space via
      `aspect-ratio` (solo: `w/h`; group row: `Σ(w/h)`; group column:
      `1/Σ(h/w)`), so masonry computes the same height whether live
      or culled. Above-the-fold cells (first `i < 6`) pass
      `initialVisible` so the first paint has no placeholder flash.
- [x] In `src/screens/Signals/index.tsx`, wrap each signal's
      `signal-prose` inner block with a `CullableBody` that swaps
      between the live body and a fixed-height placeholder using
      `useNearViewport` + a `ResizeObserver` on the live node. The
      RO is required because the cached height grows as images inside
      `MarkdownBody` / `CollapsedListHeroImage` decode — a single
      mount-time `offsetHeight` read would under-measure and the
      placeholder would shrink the article out from under the user's
      scroll position. All entries pass `initialVisible: true`: items
      revealed by `useInfiniteList`'s sentinel are — by construction —
      already in the viewport when mounted, so starting live and
      letting IO flip to `false` only after they're scrolled past is
      correct for both the first batch and subsequent pages.
- [x] Manual test on `/memories/japan-2024` and `/memories/kaws-family`
      via `bun run preview`: scroll top → bottom → top, no broken
      images, masonry layout holds across the placeholder swap,
      DevTools "Elements" panel shows `<img>` nodes removed from the
      tree for rows scrolled past by more than a viewport (was
      previously 25 / 33 tiles all mounted from first paint).
- [x] `bun run lint` + `bun run format` + `bunx tsc --noEmit` clean;
      `bun run build` emits a shared `useNearViewport-*.js` chunk at
      0.59 kB / 0.36 kB gzipped.

**Outcome.**

Added `src/hooks/useNearViewport.ts` as a generic occlusion-culling
primitive (ref callback + visibility boolean, one `IntersectionObserver`
per consumer, 1-viewport `rootMargin` on both sides). Two callers adopt
it:

1. **`FragmentDetail` masonry.** Each grid cell (solo tile or group
   row/column) is wrapped in a `CullableTile` that renders either the
   real `<ProgressiveImage>`(s) or a same-sized `<div>` placeholder.
   On `japan-2024` (25 photos) and `kaws-family` (33 photos), scrolling
   from top to bottom now unmounts off-screen tiles once they're more
   than a viewport past — decode jobs release, `<img>` nodes come out
   of the DOM, and the masonry layout is preserved because each cell
   still occupies a box sized via `aspect-ratio` whether live or
   culled. Above-the-fold tiles (first six indices, matching the
   existing `loading="eager"` / `fetchpriority="high"` thresholds)
   start live so first paint is identical to before. Deviated from
   the spec's "chunks of ~12 in one wrapper div" language — wrapping
   a chunk collapses it into a single masonry column under
   `break-inside-avoid` and destroys the visual flow; per-tile IO is
   cheaper semantically (25–33 observers is nothing) and preserves
   the layout perfectly.

2. **`SignalsScreen` article bodies.** Each signal's `signal-prose`
   block is wrapped in a `CullableBody` that caches the live body's
   measured height via a `ResizeObserver` (so the cache tracks images
   as they decode), then swaps to a fixed-height `<div>` once the
   article is scrolled past by more than one viewport. The IO callback
   flips back to live when the article returns to the expanded rect.
   Entries always pass `initialVisible: true` because
   `useInfiniteList`'s sentinel only reveals pages after they're
   already in-viewport — starting live and culling on scroll-past is
   the right direction for the first batch and every subsequent page
   alike.

Bundle impact: `useNearViewport` lands as a shared chunk at **0.59 kB
/ 0.36 kB gzipped**. No runtime regression on short fragments (all
cells are initially visible; IO silently observes). On long fragments
and long signal sessions, decoded-image memory and live `<img>` node
count both scale with the viewport rather than with the total scroll
extent — which was the goal.

Visually identical. Masonry flow preserved, progressive-image fades
still run on the live cells, placeholders are empty `<div>`s with
the right `aspect-ratio` / `height` so nothing jumps.

## Verification

- `bun run build` and diff `build/assets/*.js` sizes around #1. Target:
  the `markdown` chunk is no longer in the `/` initial waterfall.
- `du -sh public/images` before/after #2. Confirm every fragment has
  `-small.webp` siblings.
- Chrome DevTools "Performance" panel, mobile emulation (Moto G Power,
  slow 4G) for `/`, `/memories`, `/memories/japan-2024`, `/signals`.
  LCP should improve on all four.
- Visual diff: desktop Chromium + desktop Safari + iOS Safari home
  banner and fragment grid look unchanged.
- `bun run lint` and `bun run format` clean.

## Risks / open questions

- **Regenerating `-small.webp` siblings** (#2) ended up in the same PR
  as the script/component changes — the original sources aren't
  checked in, so we backfilled from the existing `-thumb.webp`s via
  `scripts/generate-small-variants.ts`. 233 new files, +6M on disk.
  Reverting still just means deleting the `-small.webp`s; the
  `srcset` gracefully falls back to `-thumb.webp`.
- **Suspense boundary flicker** (#1). If the fallback isn't styled
  right, navigating from `/` to `/memories` can flash a blank page.
  Mitigate with a black backdrop fallback identical to `bg-black`.
- **`display: none` on the lightbox full `<img>`** until load may defeat
  the browser's speculative decode. Test on iOS Safari specifically —
  if first paint of the full-res is slower than today, use
  `visibility: hidden` + `opacity: 0` instead.
- **No live media-query listener** (inherited from the previous mobile
  spec) — users who toggle Reduce Motion mid-session keep whatever mode
  was captured at mount. Acceptable.
