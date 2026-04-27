---
status: implemented
---

# Memories lightbox: smooth, satisfying mobile swipe

## Goal

Sliding between photos in the Memories lightbox on mobile (`Lightbox` and
`GroupLightbox` under `src/screens/Memories/components/`) currently feels
jittery and unsatisfying. Make it feel native — buttery 60fps drag tracking,
a real "the next photo is over there" carousel feel, no opacity/placeholder
flash on commit, and momentum that responds to flick velocity.

The whole interaction should feel as good as Apple Photos / iOS Safari's
native swipe. Performance is the lever, not visual redesign.

## Non-goals

- Redesigning the lightbox chrome (close button, counter, caption layout,
  `[close]` styling).
- Changing the URL-driven navigation model. The route
  `/memories/:id/:photo?` remains the source of truth. Wouter
  `navigate(..., { replace: true })` is still how a committed swipe records
  itself.
- Changing how the grid (`FragmentDetail`) builds `gridItems` /
  `lightboxView` / `gridPreloadFiles`.
- Pinch-to-zoom, double-tap, or any new gestures. Swipe and tap-to-close only.
- Desktop changes. Keyboard arrows + click `<` / `>` keep working unchanged.
- The Gallery (Three.js) screen.

## Why it feels bad today

`src/screens/Memories/components/useSwipe.ts` and the two lightbox shells
have several compounding issues. From most to least impactful:

1. **State-driven drag.** Every `touchmove` calls `setOffsetX(dx)`, which
   re-renders the entire lightbox tree (`Lightbox` or `GroupLightbox`,
   including `react-markdown` for the caption) ~60 times per second on a
   live finger drag. On an iPhone this is the dominant cost — the
   transform itself is cheap, the React reconciliation is not.
2. **Listener thrash.** `useSwipe`'s `useEffect` registering
   `touchstart/move/end` has **no dependency array**, so it re-runs on
   every render. During a drag, every `setOffsetX` re-render tears down
   and re-adds three event listeners. This is gross enough on its own to
   cause visible hitching on Safari.
3. **No carousel track.** Only the *current* photo translates. When the
   swipe commits, the photo snaps back to `translateX(0)` *while* the
   route changes and the new photo's `<img>` mounts. The user sees the
   old image animate back to center, then a different image abruptly
   replace it — no sense of "moving through" anything.
4. **Placeholder + opacity flash on every swipe.** `Lightbox` has
   `useEffect(() => setLoaded(false), [photo.file])`. Even when the
   neighbor was preloaded via `new Image()`, the new `<img>` element
   mounts with `opacity-0`, the blurred placeholder shows, `onLoad`
   fires, and a 500ms opacity fade runs. After every swipe. So the
   sequence of images feels like a slideshow of fades, not a slide.
5. **`new Image()` preloading isn't decoded.** `preloadFiles` kicks off
   network fetches with `fetchPriority='low'`, but the bitmap isn't
   decoded until the real `<img>` enters the DOM, which on mobile can
   add 20–80ms of decode latency at the moment of swipe commit — right
   when the eye is most sensitive.
6. **`touchmove` handler is non-passive and calls `preventDefault()`.**
   Necessary for axis locking, but combined with the per-frame React
   render it's expensive. Browser scroll/compositor work serializes
   behind our handler.
7. **Transform applied on a complex subtree.** The translated element
   wraps the image *and* the captioned counter row (with `signal-prose`
   markdown). The caption is not what should be moving; pinning it to
   the photo means more layer area to repaint each frame and a heavier
   compositing path.

## Design

Keep the wouter-driven route model. Replace the swipe internals so that:

- Drag tracking happens entirely on the DOM, not in React state.
- A 3-cell horizontal track renders prev / current / next at all times,
  so the next photo is already painted before the user even starts to
  swipe. Sliding feels physical because the next image is *literally
  there*.
- The "loaded" state survives across photo changes for any image whose
  bitmap has already been decoded, eliminating the placeholder flash on
  warm neighbors.
- Velocity-based easing replaces the fixed 300ms `cubic-bezier(0.2,0,0,1)`
  snap.

### 1. New `useSwipe` — DOM-driven carousel hook

Rewrite `src/screens/Memories/components/useSwipe.ts` (keep the file
name; export shape changes).

**Coordinate system.** All math is in **pixels** relative to the
gesture surface's `getBoundingClientRect().width`, captured on
`pointerdown` and stored on a ref (`cellWidthRef`). No `vw`, no
`window.innerWidth`. The track's resting position is
`translate3d(-cellWidth, 0, 0)` so the center cell is on screen.

**Transform ownership.** The hook is the *only* writer of
`trackRef.current.style.transform` and
`trackRef.current.style.transition`. Lightbox components must not pass
an inline `transform` style on the track element — otherwise React
re-renders during the drag (e.g. unrelated parent state changes) would
clobber the hook's writes. The default resting position is set by the
hook in a `useLayoutEffect` when `trackRef` is attached, and re-applied
after every commit reset.

**Events.**

- Switch from manual `touchstart/touchmove/touchend` to **Pointer
  Events** (`pointerdown` / `pointermove` / `pointerup` /
  `pointercancel`). Mouse and touch share one path; cancellation is
  cleaner.
- Set `touch-action: pan-y` on the gesture surface so the browser
  hands us horizontal gestures and continues to own vertical scroll.
  Removes the need for non-passive `preventDefault()` on every move.
- Keep the existing axis-lock threshold (10px, |dx| vs |dy|) before
  engaging horizontal drag.
- Call `setPointerCapture(e.pointerId)` **only after** the axis lock
  resolves to `'h'` — never on `pointerdown`. This is critical: the
  close button, `<`, `>` and (in `GroupLightbox`) per-photo
  drill-in buttons all live inside the gesture surface. Capturing on
  `pointerdown` would re-target their `click` events to the gesture
  surface and break tap-to-close / tap-to-zoom. Capturing after
  axis-lock means a tap (which never crosses the 10px threshold)
  flows to the real target's `click` handler unchanged.
- After a horizontal-locked gesture ends, set a `consumedClickRef`
  flag that suppresses the immediate trailing `click` (some browsers
  fire one even with capture). The flag is consumed by a single
  capture-phase `click` listener attached on the gesture surface that
  calls `e.stopPropagation()` + `e.preventDefault()` once. This
  protects `GroupLightbox`'s per-photo `onPhotoClick` from firing
  after a horizontal swipe.

**Render avoidance.**

- **No React state for the live offset.** Track current `dx` in a ref.
  In `pointermove`, schedule a single `requestAnimationFrame`
  (deduped via a ref flag) that writes
  `transform: translate3d(${-cellWidth + dx}px, 0, 0)` directly to
  the DOM. Coalesces multi-event frames.
- React state is reduced to `phase: 'idle' | 'committing'`.
  `'committing'` triggers a `useEffect` that applies the easing
  transition + reads `transitionend`; on completion, the hook fires
  the appropriate `onCommitPrev` / `onCommitNext` callback, then
  resets `style.transition = 'none'` and
  `style.transform = 'translate3d(${-cellWidth}px, 0, 0)'`, then sets
  `phase` back to `'idle'`. The next React render of the parent has
  already swapped the photo props, so the formerly-neighbor cell is
  now the center cell with the same bitmap.
- Fall back to a `setTimeout(duration + 50)` in case `transitionend`
  doesn't fire (rare on Safari but cheap insurance).

**Effect bindings.**

- Bind pointer listeners exactly once per mounted node via a
  `useLayoutEffect` keyed on the ref-attached node (not on offset
  state). The current bug — `useEffect` with no deps array tearing
  down listeners every render — must not return.

**Velocity-based commit duration.** See §6.

**Public API.**

```ts
const { surfaceRef, trackRef, phase } = useSwipe({
  hasPrev: boolean,
  hasNext: boolean,
  onCommitPrev: () => void,
  onCommitNext: () => void,
});
```

- `surfaceRef` → the full-screen overlay (the `touch-action: pan-y`
  gesture area).
- `trackRef` → the 3-cell horizontal strip the hook translates.
- `phase` is exposed mostly for diagnostics / disabling controls
  during the brief commit animation; lightbox components don't need
  to read it for layout.

### 2. Carousel track in `Lightbox`

Today `Lightbox` renders one `<img>` plus its placeholder, sized by
viewport. Move to a 3-cell track:

```
  [ prev cell ][ center cell ][ next cell ]
   -cellWidth        0          +cellWidth
```

- Layout: track is `position: absolute; inset: 0; display: flex;
  width: 300%`. Each cell is `flex: 0 0 33.3333%` (= one viewport /
  surface width). The track is translated by `-cellWidth` so the
  center cell occupies the visible area.
- **Cells are keyed by position**, not by photo file:
  ```tsx
  <Cell key="prev"   photo={neighbors.prev} />
  <Cell key="center" photo={photo} />
  <Cell key="next"   photo={neighbors.next} />
  ```
  This is what makes the post-commit reset flicker-free: after
  committing a swipe-left, the React update swaps `photo` to what was
  in `neighbors.next`, which means the *center cell's* `<img>` `src`
  changes to that file. The hook simultaneously resets the track from
  `-2*cellWidth` back to `-cellWidth`. The pixel content under the
  user's eye doesn't change. If we keyed by file, React would unmount
  and remount cells around the swap and the bitmap would briefly
  blank.
- On commit:
  - Hook animates the track to `0` (prev) or `-2*cellWidth` (next)
    with the velocity-based duration.
  - On `transitionend` (or the `setTimeout` fallback), hook calls
    `onCommitPrev` / `onCommitNext`, which invokes
    `navigate('/memories/:id/:newPhoto', { replace: true })`.
  - Hook then writes `transition: none; transform: translate3d(-cellWidth, 0, 0)`
    in the same task. The next React render flushes the new `photo`
    prop into the center cell. No flicker.
- The `prev` and `next` cells only render an image if the matching
  neighbor exists. Boundary edges (no neighbor) leave that cell
  empty; the rubber-band dampening in §7 still gives the user the
  edge feel.
- The caption / counter row stays **outside** the translated track,
  pinned at the bottom of the overlay. It updates instantly on
  navigation. Removing it from the moving subtree:
  - Eliminates `react-markdown` re-rendering during a drag (it only
    re-renders on commit, when the photo prop actually changes).
  - Shrinks the GPU layer that recomposites on every frame.

`FragmentDetail` keeps computing `lightboxView` and passing the right
photo. The neighbor photos for the track come from a new prop:

```ts
type LightboxNeighbors = {
  prev: PhotoMeta | null;
  next: PhotoMeta | null;
};
```

`neighbors` is computed in `FragmentDetail` from the existing
`gridItems` / `groupPhotos` logic so we don't duplicate ordering
rules. Three cases mirror the existing `lightboxView`:

- **Solo photo** (no `fromGroup`): prev/next come from the prev/next
  `gridItems` entry. If that entry is a group, its first photo is the
  preview cell content (matches what the current swipe lands on after
  navigation: a group cover, which then opens via `GroupLightbox`).
- **Photo inside a group** (`fromGroup` set): prev/next come from
  *within* `groupPhotos`. Boundaries return `null` — swiping past
  the first/last photo in a group does **not** drill out to the
  group cover. This preserves today's behavior
  (`Lightbox.onPrev = null` at group boundaries).
- **Group cover** (`GroupLightbox`): prev/next come from the
  prev/next `gridItems` entry, same as solo case.

The `preloadFiles` array (distance 2–3) keeps doing what it does
today but routes through the new `warmImage()` cache (§4) so warm
state persists across photo changes.

### 3. `GroupLightbox` track

Same pattern. The "cell" for a group is the existing
`isAlwaysColumn` / `shouldStack` / `isAlwaysRow` flex container. The
track holds three group-cells (prev / center / next) where each
existing/missing cell is determined by neighbors in `gridItems`.

Tap-to-zoom on a group photo (`onPhotoClick`) is preserved via the
`consumedClickRef` mechanism described in §1 — the capture-phase
`click` interceptor on the gesture surface eats the trailing click
after any horizontal-locked gesture, so taps that never crossed the
10px axis-lock threshold reach the per-photo button's `onClick` as
today.

### 4. Warm-image cache → no placeholder flash

Add a tiny module-level cache in
`src/screens/Memories/components/imageCache.ts`:

```ts
const decoded = new Set<string>();

export function warmImage(src: string): Promise<void> {
  if (decoded.has(src)) return Promise.resolve();
  const img = new Image();
  img.src = src;
  return img.decode().then(
    () => { decoded.add(src); },
    () => { /* swallow; will retry on real mount */ },
  );
}

export function isWarm(src: string): boolean {
  return decoded.has(src);
}
```

- Replace the current `for (const file of preloadFiles) { new Image()... }`
  effect with `warmImage(photoUrl(...))` calls. Decoded bitmaps stay
  hot in browser memory; the `Set` is our hint about which ones we know
  have finished `.decode()`.
- In `Lightbox`, replace the `[loaded, setLoaded] = useState(false)` +
  `setLoaded(false)` on photo change with:

  ```ts
  const fullSrc = photoUrl(fragmentId, photo.file, 'full');
  const [loaded, setLoaded] = useState(() => isWarm(fullSrc));
  useEffect(() => {
    setLoaded(isWarm(fullSrc));
  }, [fullSrc]);
  ```

  Plus an `onLoad` that flips `loaded` true and adds the src to
  `decoded` (covers the cold case).
- Net effect: when a user swipes through neighbors that we've already
  preloaded + decoded, the new center cell is `opacity: 1` from the
  first frame. No 500ms fade, no blurred placeholder peek. Cold
  far-away photos still get the existing fade, which is correct.

`GroupLightbox`'s `loadedSet` becomes the same pattern keyed per-photo
file.

### 5. CSS + GPU hints

- Add `will-change: transform` and `transform: translateZ(0)` on the
  track element to keep it on its own compositor layer.
- Add `touch-action: pan-y` to the swipe surface.
- Add `user-select: none; -webkit-user-select: none;` on the track to
  avoid iOS text-selection callouts during drag.
- Add `-webkit-tap-highlight-color: transparent;` on the overlay to
  kill the flash on tap.

### 6. Velocity easing details

In the new hook's commit path:

```ts
const velocity = Math.abs(dx) / Math.max(1, elapsed); // px/ms
const triggered = Math.abs(dx) > 60 || velocity > 0.3; // start with current thresholds
const remaining = triggered ? cellWidth - Math.abs(dx) : Math.abs(dx);
const duration = clamp(remaining / Math.max(velocity, 0.5), 180, 360);
```

So a hard flick lands in ~180ms, a slow controlled drag in ~360ms, and
a half-hearted partial drag snaps back proportionally. Easing curve
`cubic-bezier(0.2, 0.8, 0.2, 1)` for both commit and snap-back.

**Threshold caveat.** The 60px / 0.3 px·ms thresholds were tuned for
the old "snap back, then jump" model. With the carousel track, the
user sees the next image during the drag, which may shift their
intuition about when a swipe "counts." Keep the current values for
the initial implementation to minimize variance, then adjust if the
final feel suggests it. Any tuning lives in this hook only.

### 7. Boundary rubber-banding

Keep current behavior: at boundary, scale `dx` by `0.2`. With the new
track this means the prev (or next) cell isn't there, but the current
cell still resists past zero with the same dampening so users feel the
edge.

## Files touched

| File | Change |
|------|--------|
| `src/screens/Memories/components/useSwipe.ts` | Rewrite. Pointer Events, ref-driven transform, rAF throttle, velocity easing, fixed effect deps, click suppression. New return shape (`surfaceRef`, `trackRef`, `phase`). |
| `src/screens/Memories/components/Lightbox.tsx` | Render 3-cell track keyed by position. Move caption/counter outside track. Use warm-image cache for `loaded`. Wire `surfaceRef` + `trackRef`. Accept new `neighbors` prop. |
| `src/screens/Memories/components/GroupLightbox.tsx` | Same 3-cell track pattern with group-cell content. Same warm cache integration for `loadedSet`. Accept new `neighbors` prop (neighbor `gridItems` entries). |
| `src/screens/Memories/components/imageCache.ts` | New. `warmImage` + `isWarm` over `img.decode()`. |
| `src/screens/Memories/FragmentDetail.tsx` | Compute `neighbors` for each `lightboxView` case (solo, in-group, group cover) using existing `gridItems` / `groupPhotos`. Pass to lightbox. Keep `preloadFiles` for distance-2/3 warming via the new cache. |
| `src/index.css` (or scoped Tailwind classes) | `.memories-track { will-change: transform; transform: translateZ(0); user-select: none; }` and `.memories-swipe-surface { touch-action: pan-y; -webkit-tap-highlight-color: transparent; }`. |

No content/data changes. No route changes. No other screens touched.

## Implementation order

Do the rip in this order so each step lands in a working state:

1. **`imageCache.ts`** — drop-in. Replace existing `new Image()` loops
   in both lightboxes with `warmImage(photoUrl(...))` calls and update
   `loaded` initial state to `isWarm(...)`. Verify warm swipes lose the
   placeholder fade. (No swipe changes yet.)
2. **`useSwipe.ts` rewrite** — Pointer Events, ref-driven transform,
   rAF, velocity easing, fixed effect deps, click suppression. Keep the
   *single*-cell visual model for now (hook translates the existing
   image element). Validate drag is buttery and click handlers still
   fire. This isolates the perf win from the carousel rework.
3. **Carousel track in `Lightbox`** — introduce 3-cell layout, wire
   `neighbors` prop from `FragmentDetail`, move caption out of the
   translated subtree, hand `trackRef` to the hook, implement the
   `transitionend` → navigate → reset cycle.
4. **Carousel track in `GroupLightbox`** — mirror step 3 with
   group-cell content; verify tap-to-zoom still works after a
   horizontal-locked gesture.
5. **CSS hints** — add `.memories-track` and `.memories-swipe-surface`
   rules.
6. **Lint/format** — `bun run lint && bun run format`.

Each step is independently shippable; if step 3 reveals a layout
problem we can pause without losing the perf win from steps 1–2.

## Acceptance criteria

Manually on an iPhone (Safari) and on a desktop Chrome touch-emulation:

1. **Drag tracking is 1:1 and smooth.** Finger position and image
   position never desync visibly during a horizontal drag. No frame
   drops in a Safari Web Inspector timeline during a 1-second drag.
2. **Neighbor visible during drag.** As the current photo slides away,
   the previous or next photo slides in from the edge in lock-step.
   Boundary edges (no neighbor) rubber-band as today.
3. **No placeholder flash on warm swipes.** After a fragment has been
   open for >1s (preload settled), every prev/next swipe lands on a
   fully-rendered next image with no blur frame and no opacity fade.
4. **Velocity respects intent.** A quick flick commits in ~180ms; a
   slow controlled push in ~360ms; a partial drag below threshold
   snaps back proportionally. The 60px / 0.3 px-ms thresholds remain.
5. **No listener churn.** A `getEventListeners`-style spot check (or
   adding a temporary `console.log` in dev) confirms `pointerdown` /
   `pointermove` / `pointerup` are bound exactly once per mount.
6. **Group lightbox parity.** Same smoothness when paging through
   group cells; tap-to-zoom on a group photo still navigates to that
   photo and is not consumed by the swipe handler.
7. **Keyboard arrows + close button still work.** Esc closes; Arrow
   keys page; click outside the photo closes.
8. **No regressions in routing.** Sharable URLs
   (`/memories/:id/:photo`) still reflect the visible photo after every
   commit.
9. **Lint + format clean.** `bun run lint` and `bun run format` pass.

## Risks / open questions

- **Pointer Events on older iOS Safari.** Pointer Events are supported
  on iOS 13+, which is fine for this site's audience. If we hit a
  real device that needs touch fallback we can add one to the hook;
  punt for now.
- **`img.decode()` rejection on cancelled loads.** Swallowed; the real
  `<img>` mount will retry and call `setLoaded(true)` from `onLoad`.
  The cache only marks an entry warm on resolved decode, never on
  rejection.
- **First-open cold neighbors.** The very first time a lightbox opens
  on a fragment, neighbor cells haven't been preloaded. A swipe in
  the next 100–300ms may briefly show a blurred placeholder in the
  arriving cell while its `<img>` finishes fetching. After the
  initial `preloadFiles` batch lands (distance 2–3), every subsequent
  swipe is warm. Acceptable; matches what would happen on any real
  network.
- **Large captions causing reflow when pulled out of the track.** The
  caption row is `position: absolute; bottom: …` so its height changes
  don't push the photo around. Visually almost identical to today.
- **Cross-fragment navigation.** Out of scope; we don't swipe across
  fragments, only within one fragment's `gridItems` / group.
- **3-cell mount cost.** Mounting two extra `<img>` elements per
  lightbox open is the price for the carousel feel. They're already
  being preloaded for `preloadFiles`; making them DOM-resident lets
  the browser keep them painted. Acceptable.
- **iOS rubber-band of the page.** `Lightbox` already sets
  `document.body.style.overflow = 'hidden'` while open, so vertical
  pan within the lightbox does nothing visible. Combined with
  `touch-action: pan-y` on the gesture surface (which yields vertical
  pans to the browser), this is the right default. No change needed.

## Implementation notes

Deltas from the design that came up during the rip:

- **Extracted `PhotoCell` into its own file** (`src/screens/Memories/components/PhotoCell.tsx`) so both `Lightbox` (all three cells) and `GroupLightbox` (prev/next cells) share one warm-cache-aware photo renderer. The center cell of `GroupLightbox` is its own `GroupCell` since it lays out multiple photos.
- **`imageCache.ts` exports a third helper, `markWarm(src)`**, called from each `<img onLoad>` so cold loads also populate the warm set without a second decode pass.
- **`useSwipe` mirrors `phase` into a `phaseRef`** so the `ResizeObserver` callback's closure can read the live phase without re-running the effect on every commit. Resetting the resting transform mid-commit-animation would cancel the transition and snap the track to `-W` with the wrong bitmap visible; the ref-based check avoids it.
- **`consumedClickRef` is cleared on a `setTimeout(350ms)`** in addition to the click-capture handler. Some browsers don't fire a trailing `click` after a captured horizontal-locked gesture (especially if the displacement was small); without the timeout the flag would persist and eat the next unrelated click.
- **`lightboxNeighbors` `useMemo` sits after the early `if (!fragment) return ...`** in `FragmentDetail.tsx`, matching the pre-existing `gridPreloadFiles` pattern. The project's oxlint config does not enable the `react-hooks` plugin, so this passes lint as-is.
- **Caption row** is rendered as `position: absolute; bottom: 1rem` with `pointer-events-none` on the wrapper and `pointer-events-auto` on the inner content row so the swipe surface receives gestures over the caption strip but the caption text remains selectable / link-clickable. Visually nearly identical to the previous flex-column layout for typical photo aspect ratios.
- **The implementation rips all six steps in one branch** (`feat/memories-swipe-feel`). The step boundaries in the original plan still hold as logical reasoning seams, but each was small enough that splitting commits would have added more rebase cost than safety.

## Out-of-scope follow-ups (do not do in this spec)

- Adding pinch-to-zoom inside a single photo.
- Cross-fragment swipe (swipe past last photo → next fragment).
- Replacing wouter's `replace: true` URL updates with a non-routing
  in-memory model. Probably correct long term but invasive.
