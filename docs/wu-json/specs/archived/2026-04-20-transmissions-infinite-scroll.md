---
status: implemented
---

# Transmissions infinite scroll

## Goal

Introduce batched, scroll-triggered rendering ("infinite scroll") for the
Transmissions index page so the list stays snappy as the entry count grows.
Design the primitive to be reusable — Memories (and later Constructs / Heroes)
should be able to opt in with minimal glue.

## Non-goals

- True data-layer lazy loading (dynamic `import.meta.glob`). All transmissions
  frontmatter+body strings are already bundled eagerly and are small. The cost
  we care about is **DOM + markdown render**, not module fetch. If we ever
  want to split the bundle, that becomes a separate change.
- Virtualization (react-window / react-virtuoso). Rows are variable-height
  (collapsed hero image vs full markdown) and list size is still small; a
  simple "render first N, reveal more on scroll" approach is enough and avoids
  the overhead / edge cases of windowing.
- Server pagination. Everything is static at build time.
- Pagination UI / page numbers.

## Current state

`src/screens/Transmissions/index.tsx` maps over the full `transmissions`
array every render. Each row may:

- render a `MarkdownBody` (full markdown pipeline: `react-markdown` +
  `remark-gfm` + `rehype-raw`) when not collapsed, or
- render a lightweight excerpt + optional hero `<img loading="lazy">` when
  collapsed.

With 7 entries this is fine. As entries grow (especially non-collapsed
`expanded: true` ones that go through the full markdown pipeline) the initial
render and scroll jank will degrade.

`src/screens/Transmissions/data.ts` sorts descending by id, so the newest
transmissions are always at the top — a good fit for "load first batch, reveal
older ones on scroll".

## Design

### A reusable hook: `useInfiniteList`

Location: `src/hooks/useInfiniteList.ts` (new directory if it doesn't exist).

```ts
type UseInfiniteListOptions = {
  pageSize?: number; // default 6
  initialSize?: number; // default = pageSize
  rootMargin?: string; // default '400px' — start loading before sentinel is visible
};

type UseInfiniteListResult = {
  visibleCount: number;
  sentinelRef: (node: HTMLElement | null) => void;
  done: boolean;
};

function useInfiniteList(
  total: number,
  options?: UseInfiniteListOptions,
): UseInfiniteListResult;
```

Behavior:

- Internally keeps `visibleCount` state, clamped to `[0, total]`.
- Uses a callback ref that wires up an `IntersectionObserver` on the sentinel
  element. Whenever the sentinel intersects with `rootMargin`, bump
  `visibleCount` by `pageSize` (clamped to `total`).
- Tears down / re-creates the observer when the ref node changes or when
  `total` / options change.
- Returns `done: true` once `visibleCount >= total`; caller can then stop
  rendering the sentinel.
- Graceful fallback: if `IntersectionObserver` is unavailable (very old
  browsers / SSR), set `visibleCount = total` immediately so everything
  renders.
- No dependency on a specific list shape — it just tracks a count.

This isolates all the wiring so screens just render
`items.slice(0, visibleCount)` and drop in `<div ref={sentinelRef} />`.

### Transmissions integration

In `src/screens/Transmissions/index.tsx`:

1. Call `useInfiniteList(transmissions.length, { pageSize: 6, initialSize: 6 })`.
2. Change the map to `transmissions.slice(0, visibleCount).map(...)`.
3. After the list, render a sentinel + loading affordance:

   ```tsx
   {
     !done && <div ref={sentinelRef} aria-hidden className='h-px w-full' />;
   }
   ```

   Optionally render a small `// loading…` line styled to match the existing
   `font-mono` aesthetic so there's a subtle visual cue during the
   prefetch window.

4. Keep the existing stagger animation (`animationDelay: i * 40ms`) tied to
   the rendered index. Since we only grow `visibleCount` (never shrink), each
   new batch animates in naturally.

Tuning:

- `pageSize: 6` — six rows covers roughly one viewport of collapsed entries
  on desktop. Small enough for a cheap first paint, large enough that the
  loader isn't constantly firing.
- `rootMargin: '400px'` — fetch the next batch before the user actually hits
  the bottom, keeping the scroll smooth and the "infinite" illusion intact.

### Memories integration (follow-up, not part of this PR)

Same shape:

- `useInfiniteList(fragments.length, { pageSize: 6 })`
- `fragments.slice(0, visibleCount)` in the grid
- sentinel at the end of the grid

Fragment cover images already progressive-load; the scroll-triggered reveal
just defers the `ProgressiveImage` mount (and therefore its placeholder +
network request) until the row is near the viewport, which is a real win
there.

### Why a sentinel + IntersectionObserver (not a scroll handler)

- No throttled scroll listener on the window.
- Works naturally with nested scroll containers if we ever introduce one.
- Browser-native lifecycle — observer is cheap and we already use similar
  patterns (`ProgressiveImage`-adjacent lazy loading).

### Edge cases

- **Short page, no scroll yet:** if the sentinel is already in view after the
  first render (e.g. `initialSize >= total` or viewport is tall), the observer
  fires immediately and `visibleCount` settles at `total` — which is the
  desired behavior.
- **Route change:** the hook is mounted per screen, so leaving and coming back
  resets `visibleCount` to `initialSize`. That's acceptable for a static
  list; restoring scroll state is out of scope.
- **`expanded: true` entries at the top:** their full markdown still renders
  on first paint (they're in the initial window). This is intentional —
  expanded entries are explicitly opt-in heavy.

## Risk / tradeoffs

- **SEO / crawlers:** bots that don't execute JS only see the initial N
  entries. For a personal site this is acceptable; individual transmissions
  are crawlable at `/transmissions/<id>` anyway.
- **Deep-linking w/ anchors:** no current usage of `#` anchors on the list,
  so deferred rendering doesn't break existing links.
- **Print view:** will only print the currently-rendered rows. Not a real
  use case here.

## Implementation plan

1. Add `src/hooks/useInfiniteList.ts` with the hook above.
2. Wire it into `src/screens/Transmissions/index.tsx`:
   - slice the list by `visibleCount`
   - render sentinel + subtle `// loading…` indicator while `!done`
3. Verify visually in `bun dev` with the current 7 entries (small enough to
   hit `done` after one reveal, so confirm the initial-in-viewport path
   fires).
4. Run `bun run lint` and `bun run format`.
5. Follow-up PR (tracked separately): adopt in Memories.

## Out of scope (parking lot)

- `react-window` virtualization if we ever cross ~100 entries.
- Bundle-splitting the markdown entries via non-eager `import.meta.glob` +
  `React.lazy` per row.
- Scroll restoration on back-nav.
