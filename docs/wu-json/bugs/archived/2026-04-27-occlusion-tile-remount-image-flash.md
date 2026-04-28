---
status: implemented
---

# Occlusion remount re-flashes already-loaded images

## Bug

After #66 (`feat: occlusion culling for long image grids`), scrolling
through `/signals` and `/memories/<id>` on mobile makes images visibly
flash from blurred placeholder → crisp every time a tile is scrolled
back into view, even for images the user has already seen and decoded
once in the current session. The page reads as buggy / "stuttering"
rather than smoothly scrolled.

The flash is most pronounced on mobile (smaller viewport → tiles cross
the cull boundary more often per scroll gesture), but is reproducible
on desktop by scrolling far enough past a tile to leave its
`rootMargin` (1 viewport on memories grids, 3 viewports on signals
bodies) and then scrolling back.

## Repro

1. `bun run dev`, open `/memories/<a fragment with many photos>` on a
   narrow viewport (or actual phone).
2. Scroll to the bottom of the grid, wait for tiles to load.
3. Scroll back to the top.
4. Each tile that left the IO root rect on the way down flashes
   placeholder → crisp on the way back up, despite the image bytes
   already being in the HTTP cache.

Same script reproduces on `/signals` for any signal whose body
contains a `CollapsedListHeroImage`.

## Root cause

The cull renders a tile in two completely different DOM shapes:

- **Visible**: `<CullableTile>` returns `<div>{children}</div>` where
  `children` includes a `<ProgressiveImage>` (a wrapper `<div>` with a
  real `<img>` inside).
- **Culled**: `<CullableTile>` returns a sized placeholder `<div>` —
  the `<ProgressiveImage>` subtree is _unmounted_.

When the tile re-enters the rootMargin, `visible` flips back to `true`
and the `<ProgressiveImage>` is _remounted_ — a fresh `<img>` element
goes into the DOM, and the wrapper renders without `data-loaded`
attribute set. CSS for `.progressive-image:not([data-loaded='true'])`
shows the placeholder background-image and pins the `<img>` at
`opacity: 0`. The wrapper only flips to `data-loaded="true"` inside an
effect:

```ts
// src/components/ProgressiveImage.tsx:51
useEffect(() => {
  const img = imgRef.current;
  ...
  if (img.complete) {
    if (img.naturalWidth > 0) {
      wrapper.dataset.loaded = 'true';
    }
    ...
  }
  ...
}, []);
```

The `useEffect` runs _after the browser has painted the first frame_.
Two compounding issues fall out of that:

1. Even when the image bytes are already in the HTTP cache, the
   browser still has to _decode_ them into a fresh `<img>` element on
   remount. `img.complete` is therefore frequently `false` at the
   first effect tick, the listener path runs, and the attribute is
   only flipped on the asynchronous `load` event — by which point
   the user has already seen ≥1 frame of the blur state.
2. Even on the lucky path where `img.complete` is `true` synchronously,
   the attribute is flipped via a DOM mutation in the effect, _after_
   the first paint. The CSS `transition: opacity 500ms` rule fires on
   that mutation, so the user sees the fade animate from blur → crisp
   instead of just appearing crisp.

Either path produces the flash.

In short: **the cache hit happens at the network layer, but
`<ProgressiveImage>` has no memory across remounts of which images it
has previously decoded.** Every remount re-runs the blur→crisp
transition from scratch, which on a long grid amounts to a wave of
flashes synchronized with every direction change in scroll.

## Why didn't this show up pre-#66

Before occlusion culling, `<ProgressiveImage>` instances mounted once
per grid render and stayed mounted for the lifetime of the screen.
The `data-loaded="true"` flip happened exactly once per image —
exactly the behavior the CSS transition was designed for. The cull
introduces remount cycles that the component was never designed to
survive.

## Decision: remove the cull entirely

After exploring two alternative repairs (URL-set cache inside
`<ProgressiveImage>`, and `content-visibility: auto` on the wrapper —
both detailed under "Alternatives considered" below), I concluded
that the right move for this site is to **delete the cull machinery
altogether** and rely on:

- React's stable mount lifetime for `<ProgressiveImage>` (no
  unmount/remount of decoded `<img>`s),
- Native `<img loading="lazy">` for offscreen decode deferral,
- `useInfiniteList` (signals) for hydration paging,
- `aspect-ratio`-driven layout reservation for no-CLS first paint.

The cull was added in #66 to handle "long image grids" but the
actual content sizes don't justify it: memories pages cap around
~100 photos per fragment, and signals is paginated by
`useInfiniteList` (6 entries at a time). Native lazy loading already
defers decoding for tiles that aren't near the viewport on first
load, and once decoded the browser keeps the raster around — so the
only thing the IntersectionObserver-driven cull was buying us was
unmount/remount cycles, which is exactly what produced this bug.

The fix is therefore to **roll back the cull** — drop
`CullableTile`, `CullableBody`, and the `useNearViewport` hook —
returning per-tile rendering to the simple shape it had before #66.

## Goal

Eliminate the blur→crisp flash on remount for any image that has
already loaded once during the session, on every page using
`<ProgressiveImage>` (signals previews, memories grids).

## Non-goals

- Replacing `useInfiniteList`'s page-by-page data hydration on
  `/signals`. That's a separate concern and we keep it.
- Reintroducing any kind of viewport-driven cull. If a future page
  ever renders thousands of tiles unconditionally, virtualization is
  the right answer at that point — not the per-tile mount/unmount
  pattern that produced this bug.

## Implementation

### `src/screens/Memories/FragmentDetail.tsx`

- Delete the `CullableTile` component definition.
- Replace both call sites (solo grid item and group grid item) with
  the pre-#66 plain `<div>` wrappers. For solo items, `onClick` is
  passed directly to `<ProgressiveImage>` (which has built-in
  role/tabIndex/keyboard handling). For group items, the outer
  `<div>` carries `onClick` with the existing eslint-disable comment.
- Drop the `ReactNode` import that the now-removed component used.

### `src/screens/Signals/index.tsx`

- Delete the `CullableBody` component definition.
- Inline the children at the call site (the `<CullableBody>` wrapper
  was the only consumer).
- Drop the `ReactNode` import.

### `src/hooks/useNearViewport.ts`

- Delete the file entirely. No remaining importers.

### `src/components/ProgressiveImage.tsx`

- Untouched. The component already does the right thing once we
  stop ripping it out from under itself.

### `src/index.css`

- Untouched in the final state. The original
  `transition: background-image 0s 500ms` and
  `.progressive-image[data-loaded='true'] { background-image: none; }`
  rules were temporarily modified during the
  `content-visibility: auto` exploration (to keep the placeholder
  pinned across cv:auto wake-ups) and then reverted to the original
  rules once the cull was removed.

## Alternatives considered

### Module-level URL cache in `<ProgressiveImage>`

Earlier draft of this spec. Cache loaded URLs in a module-scoped
`Set<string>`; on remount, render `data-loaded="true"` immediately
if the URL is in the cache.

**Why rejected.** Works, but is essentially papering over the fact
that `<ProgressiveImage>` is being torn down and rebuilt every
scroll cycle for no good reason. Adds a parallel cache for state
the DOM already holds. Once we accepted that the cull itself was
the problem rather than the component's behavior on remount, this
fix became unnecessary.

### `content-visibility: auto` on the wrapper

Inspired by chenglou's gallery
(`chenglou.github.io/index.html:638-674`): the imperative version
keeps each `<img>` element in a JS array forever and only attaches/
detaches the parent `<div>` to/from `document.body`. The CSS
equivalent is `content-visibility: auto` — render `children`
unconditionally, let the browser skip layout/paint/decoding for
offscreen subtrees, resume rendering them as they approach the
viewport. Nothing unmounts, so the `<img>` element and its decoded
raster are always there.

**Why rejected (after implementing it).** It fixed the original
blur→crisp flash, but introduced a new, different artifact: a
single-frame _black_ flash on tiles re-entering relevance.

The mechanism: when `content-visibility: auto` skips a subtree, the
browser also stops painting the wrapper itself in some cases
(observed on mobile Safari and Chrome). When the subtree wakes up,
the `<img>` may paint for 1–2 frames before its raster has been
re-decoded (we use `decoding='async'`); during that gap the `<img>`
is effectively transparent. The placeholder bg-image on the
wrapper, which is what _should_ show through during decode, is
also subject to the cv:auto skip, so what the user sees in those
1–2 frames is the page's `bg-black` showing through the entire
tile.

Pinning the placeholder bg-image (removing the
`background-image: none` rule that fires on `data-loaded='true'`)
helped on tiles whose wrapper kept its background, but didn't
solve the case where the wrapper's background was also being
elided by cv:auto's paint skip. At that point I had traded one
flash for another, with extra CSS complexity and no net win.

The deeper lesson: any cull mechanism — DOM-level (unmount) or
paint-level (cv:auto) — creates a re-paint pathway with potential
artifacts on wake-up. The right call for this site's content sizes
is to skip the cull entirely.

### Sticky visibility (cull goes one-way)

Keep the IO observer, but never set `visible` back to `false` once
it's been `true`. Sidesteps remount but defeats the cull's perf
win — long galleries on mobile then pay full layout/paint cost for
every tile they've ever scrolled past. Strictly dominated by "no
cull at all + native lazy loading" once we acknowledged the cull
itself wasn't worth keeping.

### Widen `rootMargin` to ~∞

Strictly worse than sticky visibility — same outcome, plus the IO
machinery is still running for nothing.

### Pre-decode via `img.decode()` and cache `ImageBitmap`s

Introduces GPU memory lifecycle questions for no win over keeping
the existing `<img>` alive (which is what removing the cull
already accomplishes).

## Verification

1. **Manual mobile repro**: on a phone (or DevTools mobile emulation
   throttled to 4× CPU), open `/memories/<long-fragment>`, scroll
   to bottom, scroll back to top. Tiles re-enter without flashing —
   neither the original blur→crisp flash nor the cv:auto-era black
   flash.
2. **Manual signals repro**: same scroll pattern on `/signals`. The
   `CollapsedListHeroImage`s don't flash on rebound.
3. **First-load behaviour preserved**: hard-reload `/memories/<id>`,
   scroll slowly down through new tiles. Each tile still does the
   normal blur→crisp fade the first time its `<img>` actually
   loads.
4. **Error path preserved**: temporarily point a tile at a 404 URL
   (or break network); the broken-image glyph still appears in
   place of an opacity-0 invisible `<img>`.
5. `bun run lint`, `bun run format`, and `bun run build` clean.

## Risks

- **DOM size growth on long pages.** All tiles stay in the DOM for
  the lifetime of the page. Memories caps at ~100 photos per
  fragment; signals is paginated by `useInfiniteList`. Both well
  within budgets where DOM size is irrelevant. If a future page
  renders thousands of tiles unconditionally, virtualization is the
  right answer at that point — not a per-tile cull.
- **Decode pressure on slow devices for very long pages.** Native
  `loading="lazy"` defers decode until tiles are near the viewport,
  so the wave of decodes is amortized across scroll rather than
  paid up-front. Acceptable for the content sizes in question.
