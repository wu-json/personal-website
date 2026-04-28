---
status: implemented
---

# Memories lightbox swipe: next photo only appears on touchend

## Bug

In the memory fragment full-screen lightbox (`/memories/<id>/<photo>`),
swiping horizontally on mobile to advance to the next/previous photo
does not show the destination photo until the finger comes off the
screen. During the drag the current photo translates with the finger
on a black background; on release the route changes and the new photo
materializes centered via its placeholder→full crossfade rather than
sliding in from the edge. The motion reads as "old photo half-slides,
then new photo appears out of nowhere".

The intent of horizontal swipe in a full-screen photo viewer is the
standard mobile-gallery feel: the next slide tracks the finger from
the right edge of the screen, the current slide tracks off the left,
and the gesture commits when the user releases past a threshold.
Today only half of that exists — the outgoing slide moves, the
incoming slide is missing entirely.

Affected both lightboxes (since deleted in favor of
`LightboxShell` + slide bodies; see Design):

- `src/screens/Memories/components/Lightbox.tsx` (solo + in-group
  photo full-screen)
- `src/screens/Memories/components/GroupLightbox.tsx` (group
  full-screen)

## Repro

1. `bun run dev`, open on a touch device (or DevTools mobile
   emulation with touch input).
2. Navigate to a memory fragment with several photos, e.g.
   `/memories/<id>`.
3. Tap a photo to open the lightbox.
4. Swipe left.

Observed: the current photo's `<img>` translates left with the
finger, exposing `bg-black/95` on the right. Releasing past the
threshold swaps the lightbox to the next photo (URL changes via
`navigate(..., { replace: true })`), which then runs its own
placeholder→full fade-in. The new photo appears centered, not
sliding in from the right.

Expected: while the finger is still on the screen, the next photo is
already visible to the right of the current photo and tracking the
finger 1:1; on release past threshold, the track animates the rest
of the way and the next photo lands centered without a separate
fade-in.

## Root cause

`useSwipe` (`src/screens/Memories/components/useSwipe.ts`) treats the
swipe as a gesture on a **single** translating container. It tracks
`offsetX` while the finger moves, applies it as
`transform: translateX(${offsetX}px)` to the lightbox content, and
fires `onSwipeLeft` / `onSwipeRight` only inside `onEnd` (touchend),
which calls the parent's `onNext` / `onPrev`. Those callbacks just
`navigate(...)` to a new photo URL, which causes
`FragmentDetail.tsx` to render a different `<Lightbox>` /
`<GroupLightbox>` with the new `photo` prop. The lightbox itself only
ever has one `<img>` mounted.

So during the drag:

- The container translates with the finger (`swipe.style.transform`).
- There is no neighbor element rendered to the left or right of the
  container, so the area uncovered by the translation is just
  `bg-black/95`.

And on release:

- `setOffsetX(0)` with `transition: transform 300ms` animates the
  container back to `translateX(0)` …
- … but in the same tick `onSwipeLeft`/`onSwipeRight` calls
  `navigate()`, which swaps the photo. The container animating back
  to 0 is now displaying the **new** photo, mid-transition, fading
  in from `opacity: 0` via the placeholder/full crossfade in
  `Lightbox.tsx`.

The net effect is "old photo slides partway off → black gap → new
photo materializes in the center with a fade", instead of "new photo
slides in from the edge".

`preloadFiles` already warms the next/prev `<img>`s in the HTTP
cache, so the missing piece isn't bytes — it's that those neighbors
are never mounted into the swipe container.

## Goal

Make the swipe in both lightboxes feel like a standard mobile photo
carousel: the destination photo is visible and tracking the finger
during the drag, and committing the swipe slides the destination
into place in a single continuous motion (no fade-in, no jump, no
black gap). Cancellation rubber-bands back. Boundaries (no neighbor
in a direction) damp like today.

## Non-goals

- Pinch-zoom, double-tap-zoom, or any new gestures beyond horizontal
  swipe.
- Vertical "swipe-down to dismiss". The current `useSwipe` already
  bails out on a vertical lock (`state.locked === 'v'`); we keep
  that behavior.
- Changing routing semantics. The lightbox is still URL-driven via
  `navigate(..., { replace: true })`; only the visual transition
  between URLs changes.
- Reworking `GroupLightbox`'s internal multi-photo layout. The track
  carries whole lightbox "slides" — a solo photo, an in-group photo,
  or a whole group view — the same unit the existing
  `onPrev`/`onNext` already navigates between.
- Changing the existing wrap/boundary semantics: top-level
  navigation wraps via modulo on `gridItems`; in-group navigation
  has hard boundaries within `gPhotos`.

## Design

### Architecture: extract a `LightboxShell`

`Lightbox.tsx` and `GroupLightbox.tsx` duplicated most of their
chrome (backdrop, close button, prev/next chevrons, ESC listener,
body-scroll-lock, swipe wrapper, preload effect). The 3-slide track
is the natural place to centralize that. The two old components
are replaced by:

```
src/screens/Memories/components/LightboxShell.tsx     # chrome + track
src/screens/Memories/components/PhotoSlide.tsx        # solo slide body
src/screens/Memories/components/GroupSlide.tsx        # group slide body
src/screens/Memories/components/loadedFullUrls.ts     # cross-mount cache
```

`LightboxShell` owns:

- The fixed backdrop (`fixed inset-0 z-[70] bg-black/95`).
- The close button and prev/next chevrons, positioned **outside**
  the swipe viewport so they stay fixed during a drag rather than
  translating with the track — a side-effect win over the previous
  layout where the chevrons sat inside the swiped element.
- The keyboard handler (`Escape` / `ArrowLeft` / `ArrowRight`).
- `document.body.style.overflow = 'hidden'`.
- The `preloadFiles` effect (deduped warming of distant neighbors).
- The swipe viewport + 3-slide track.

It takes:

```ts
type SlideView =
  | { kind: 'photo'; photo: PhotoMeta; counter: string }
  | {
      kind: 'group';
      groupId: string;
      photos: PhotoMeta[];
      layout: string;
      caption?: string;
      counter: string;
      onPhotoClick: (p: PhotoMeta) => void;
    };

interface LightboxShellProps {
  fragmentId: string;
  prev: SlideView | null;
  current: SlideView;
  next: SlideView | null;
  onClose: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  preloadFiles: string[];
}
```

Slide rendering is delegated to two body components:

- `<PhotoSlide photo counter fragmentId interactive>` — the
  "image + counter + caption" body that lived in `Lightbox.tsx`.
- `<GroupSlide photos layout caption counter fragmentId interactive onPhotoClick>` —
  the multi-photo flex layout + counter/caption row that lived in
  `GroupLightbox.tsx`.

Both take an `interactive: boolean` flag that the shell sets to
`true` only on the center slot (see "Interactivity gating" below).
`FragmentDetail.tsx` renders exactly one `<LightboxShell>` per
render with `prev`/`current`/`next` populated.

This is needed (not just nice) because **neighbors of a top-level
solo photo can be groups**, and vice versa: `gridItems` mixes
`{ kind: 'solo' }` and `{ kind: 'group' }`. The track must therefore
render heterogeneous slide types in adjacent slots. Centralizing the
track in a shell that dispatches per `SlideView.kind` is the cleanest
expression of that.

### The 3-slide track

Inside the shell:

```tsx
<div
  ref={swipe.viewportRef}
  className='relative w-full h-full overflow-hidden touch-pan-y'
>
  <div
    ref={swipe.trackRef}
    className='flex h-full will-change-transform'
    style={{ width: '300%', ...swipe.trackStyle }}
  >
    {[prev, current, next].map((view, slotIdx) => (
      <div
        key={slotIdx}
        className='shrink-0 h-full'
        style={{ width: '33.3333%' }}
        aria-hidden={slotIdx !== 1 || undefined}
      >
        {view && (
          <SlideBody
            view={view}
            fragmentId={fragmentId}
            interactive={slotIdx === 1}
          />
        )}
      </div>
    ))}
  </div>
</div>
```

Track geometry: the track is `width: 300%` of the viewport and
each slot is `width: 33.3333%` of the track (= one viewport wide).
The resting transform is `translateX(-33.3333%)` of the _track_,
which shifts it left by exactly one viewport width and centers
slot 1 (current) on the visible area.

`swipe.trackStyle.transform` (computed by `useSwipe`) is always
`translate3d(calc(-33.3333% + ${offsetX}px), 0, 0)`:

- During a drag: `offsetX` follows the finger in pixels (with a
  rubber-band damping at boundaries; see below).
- Commit animation: `offsetX` is set to `±viewportWidth`, which
  resolves to track positions `0%` (commit prev) or `-66.6666%`
  (commit next) — i.e. one slot to either side of resting.
- Cancel animation: `offsetX = 0`.

(The original spec described this as `translateX(-100%)` resting
with `±100%` commit; that math was off because percentages in
`transform` resolve against the element's own box, not the
viewport. The implemented form expresses the same geometry
correctly with an explicit `300%` track width.)

Empty slots (no `prev` or no `next`) render no children inside an
otherwise identical slot wrapper, so the geometry is uniform; the
commit math doesn't need a special case for boundaries because
the swipe is gated by `hasPrev` / `hasNext` and never commits in
a direction with no neighbor.

#### Cross-navigate visual continuity: `loadedFullUrls` cache

Slot wrappers are keyed by **slot position** (`key={slotIdx}`),
not by slide identity. The original spec proposed identity-keyed
slot wrappers so React reconciliation would _move_ the same slide
DOM (including its decoded `<img>`) from slot 2 into slot 1 on
commit, making the post-commit snap visually invisible without
any extra state.

That strategy collides with React's no-duplicate-keys rule when
`gridItems.length === 2`: top-level navigation wraps via modulo,
so `prev` and `next` reference the _same_ slide and produce the
same identity key. Resolving that cleanly would require either
breaking the wrap (one-direction navigation in length=2 fragments,
a user-visible regression) or slot-prefixing keys (which defeats
the reconciliation, the whole reason for identity keys).

Slot-positional keys mean every navigate remounts all three slide
bodies. Visual continuity is recovered via a tiny shared module:

```ts
// src/screens/Memories/components/loadedFullUrls.ts
const loadedFullUrls = new Set<string>();
export { loadedFullUrls };
```

`PhotoSlide` and `GroupSlide` consult this set in their
`useState` initializer to start with `loaded: true` if the
respective full-resolution URL has already loaded once during the
session, and they add to the set in their `onLoad` handlers. A
remount of an already-seen image renders crisp on first paint —
the same visual outcome as DOM preservation, with no key
collisions and no UX deviations.

A `useLayoutEffect` in each slide also synchronously checks
`imgRef.current.complete && naturalWidth > 0` pre-paint, which
covers the case where the `<img>` finds the resource in the
browser cache before the React `onLoad` fires (which on cache
hits can happen before the first effect tick) but the
`loadedFullUrls` set hasn't been populated yet — e.g. a brand-new
neighbor that decoded during `preloadFiles` warming.

#### Interactivity gating

`SlideBody` takes `interactive: boolean`. When `false`:

- The wrapper carries `pointer-events: none`.
- For `GroupSlide`, this disables the inner photo buttons that call
  `onPhotoClick`. Without this, mid-drag a partially on-screen
  neighbor group could intercept a tap that turns into a swipe.
- For `PhotoSlide`, there are no interactive children today, but
  the gating is symmetrical and cheap.

Off-screen slides are also clipped by the viewport's
`overflow: hidden`, but `pointer-events: none` is the correct
defense for the partially-visible mid-drag window.

#### Loading priority

In `<ProgressiveImage>`-style markup inside each slide, set
`fetchPriority='high'` on the center slide's image and
`fetchPriority='low'` on the neighbor slides. This biases the
browser toward decoding the visible photo first when the lightbox
opens cold; neighbors are still preloaded out of band by the
shell's `preloadFiles` effect.

### `useSwipe.ts` shape

The hook's API is:

```ts
const { viewportRef, trackRef, trackStyle } = useSwipe({
  onSwipeLeft, // null when no next neighbor
  onSwipeRight, // null when no prev neighbor
  hasPrev, // boolean (drives boundary rubber-band)
  hasNext, // boolean (drives boundary rubber-band)
  currentKey, // identity of the center slide; used for external resets
});
```

Key behaviors:

1. **Two refs.** `viewportRef` attaches the touch listeners and is
   measured for `clientWidth` on `touchstart` (the commit animation
   target is `±viewportWidth` in pixels). `trackRef` is used to
   attach a `transitionend` listener for the commit animation.

2. **`trackStyle`.** The hook always returns
   `transform: translate3d(calc(-33.3333% + ${offsetX}px), 0, 0)`
   plus a `transition` of either `transform 300ms cubic-bezier(…)`
   when animating or `none` otherwise. The shell composes this with
   `width: '300%'`.

3. **Commit animation.** On `triggered` inside `onEnd`:
   - Set `committingRef = true`, `animating = true`,
     `offsetX = sign * viewportWidth`. The track animates one
     slot in the swipe direction.
   - Listen for one `transitionend` on the track element, filtered
     to `ev.target === trackEl && ev.propertyName === 'transform'`
     (the event bubbles, and slide-body opacity transitions on the
     placeholder→full fade would otherwise fire it spuriously).
     A `setTimeout(…, 350)` fallback covers interrupted animations
     or browser quirks where a transform-target change cancels the
     event.
   - In the resolution callback, fire one batched update:
     `setAnimating(false)`, `setOffsetX(0)`, then call
     `onSwipeLeft()`/`onSwipeRight()`. React 18's automatic
     batching (which covers native event handlers and timeouts)
     applies the local snap and the parent's URL change in the
     same render. If a 1-frame gap ever shows up on slow devices,
     `flushSync` from `react-dom` is the documented escape hatch,
     but it isn't needed in practice.

4. **Reentrancy guard.** A `committingRef` boolean blocks new
   `touchstart` events while a commit animation is in flight, so a
   second touch can't race the navigate.

5. **`currentKey` reset effect.** A `useEffect` keyed on
   `currentKey` resets `offsetX = 0` and `animating = false`
   whenever the parent swaps the center via paths other than the
   swipe (keyboard nav, on-screen chevrons). It's also a no-op
   idempotent reset right after the post-commit batched update
   lands, which keeps the hook's state and the rendered transform
   in lockstep.

6. **Cancel path.** Animate `offsetX` to 0, `animating = true` for
   300ms, no callback fires. Same shape as before.

7. **Boundary rubber-band.** `offset = atBoundary ? dx * 0.2 : dx`
   where `atBoundary` is derived from the explicit `hasPrev` /
   `hasNext` inputs.

8. **`touchcancel` listener.** The same `onEnd` handler is bound
   to `touchcancel` so system-interrupted touches (incoming call,
   notification gesture) cancel the drag rather than getting
   stuck mid-offset.

### `FragmentDetail.tsx` changes

Resolve `prevView` / `nextView` alongside the existing
`lightboxView`. Three cases:

- **Group center (case 1, current code lines ~189–215).** Wrap top-
  level via modulo on `gridItems`:
  - `prevView`: `gridItemToSlideView(gridItems[(gridIndex - 1 + N) % N])`
  - `nextView`: `gridItemToSlideView(gridItems[(gridIndex + 1) % N])`
  - Both `null` if `gridItems.length === 1`.
- **In-group photo center (case 3, current ~225–251).** Hard
  boundaries within `gPhotos`:
  - `prevView`: photo `gPhotos[indexInGroup - 1]` if `> 0`, else
    `null`.
  - `nextView`: photo `gPhotos[indexInGroup + 1]` if
    `< gPhotos.length - 1`, else `null`.
- **Top-level solo center (case 2, current ~252–270).** Wrap via
  modulo on `gridItems` (same as case 1):
  - Same as case 1, but center is a `PhotoSlide`.
  - Both `null` if `gridItems.length === 1`.

A small helper closes over the current `gridItems.length`:

```ts
const gridItemToSlideView = (item: GridItem, gridIndex: number): SlideView => {
  const counter = `${gridIndex + 1} / ${gridItems.length}`;
  if (item.kind === 'solo') {
    return { kind: 'photo', photo: item.photo, counter };
  }
  return {
    kind: 'group',
    groupId: item.groupId,
    photos: item.photos,
    layout: item.layout,
    caption: item.caption,
    counter,
    onPhotoClick: p => navigate(`/memories/${id}/${p.file}`, { replace: true }),
  };
};
```

For the in-group case, the helper isn't used — prev/current/next
are constructed inline as `{ kind: 'photo', photo, counter }` with
counters `"n / total"`, `"n+1 / total"`, `"n+2 / total"` against
`gPhotos.length`, since each in-group slide carries its own
counter that travels with it during the drag.

Edge case: `gridItems.length === 2` with modulo wrap means
`prev` and `next` reference the same slide. Both neighbor slots
render the same photo/group; benign visually, and (combined with
slot-positional keys) doesn't trip the React no-duplicate-keys
rule.

The existing `gridPreloadFiles` traversal (±3 grid items) stays —
it warms the HTTP cache for distant neighbors that aren't mounted
inline.

### CSS / layout details

- The viewport (`swipe.viewportRef`) is `overflow: hidden` so
  off-screen slides don't bleed into the chrome or the page
  background.
- `touch-pan-y` on the viewport (Tailwind utility for
  `touch-action: pan-y`) keeps native vertical scroll handed to
  the browser and lets horizontal gestures route to our handler.
  The existing `e.preventDefault()` after horizontal lock still
  applies; `touch-action` makes the hand-off more reliable on iOS.
- Each slide body keeps the existing aspect-ratio + max-height
  math centered inside its viewport-sized slot via flex centering
  on the slide root. Captions and counters live inside each slide
  so they travel with their photo during a drag (the desired
  carousel feel — neighbor metadata previewing alongside the
  neighbor image).
- The chrome (close, chevrons) sits at the shell's root, **outside**
  the swipe viewport, so it doesn't translate with the track and
  remains clickable throughout.
- Backdrop click-to-close: the original `Lightbox.tsx` outer
  `onClick={onClose}` was largely shadowed by an inner
  `onClick={e => e.stopPropagation()}` on the full-screen wrapper.
  The shell preserves that exact shape (outer fixed div with
  `onClick`, inner full-area wrapper with `stopPropagation`);
  behavior is unchanged.

## Verification

1. **Mobile swipe (solo center, solo neighbors)**: open a fragment
   whose `gridItems` are all solos with ≥3 entries. Swipe slowly
   left: next photo is visible from the start of the drag and
   tracks the finger 1:1; current photo slides off to the left.
   Release past threshold: track continues to the next slot in one
   continuous motion; no fade-in, no black gap, no jump. URL
   updates to the next photo's path.
2. **Mobile swipe across kind boundary**: open a fragment whose
   solo photo's next `gridItem` is a group. Swipe left: the group
   view slides in from the right (multi-photo flex layout visible
   in the neighbor slot during the drag). Commit lands on the
   group lightbox with no flicker.
3. **Mobile swipe inside group**: tap into an in-group photo
   (`/memories/<id>/<photo>` where `photo.group` is set). Swipe
   between in-group photos: same continuous motion as case 1.
4. **Cancel**: start swiping then release short of threshold (or
   reverse). Track springs back to the current photo with the
   existing 300ms cubic-bezier ease.
5. **Boundaries**:
   - At in-group start, swipe right — current slide rubber-bands
     (`dx * 0.2`) and snaps back; no navigation.
   - Same at in-group end swiping left.
   - At top level with `gridItems.length === 1`, both directions
     rubber-band.
   - At top level with `gridItems.length > 1`, swipes wrap
     (existing modulo behavior); never rubber-bands.
6. **Vertical scroll lock**: starting a vertical drag inside the
   lightbox does not engage the horizontal track and does not
   `preventDefault` — matches today's behavior. Verify on iOS
   where `touch-action: pan-y` matters most.
7. **Keyboard / button parity**: arrow keys and the on-screen
   `<` / `>` buttons still navigate. They call `onPrev`/`onNext`
   directly, bypassing the swipe track. The hook's `currentKey`
   reset effect snaps the track back to its resting transform
   (`translateX(-33.3333%)` of the track) and the shifted neighbors
   are visible immediately.
8. **Re-touch during commit**: start a swipe, release past
   threshold, immediately put the finger back down on the screen
   while the 300ms commit animation is mid-flight. The new touch
   is ignored until the commit resolves; the resulting state is
   one navigation, not a double-fire.
9. **First-paint and preload behavior**: opening the lightbox
   cold still shows the placeholder→full fade for the _current_
   photo. Neighbor slides start `fetchPriority='low'`; on a slow
   network they may still be on the placeholder when the user
   begins a swipe — the swipe still works (the neighbor is just
   blurry until it loads), and `gridPreloadFiles` accelerates this
   in practice.
10. **Group lightbox interactivity**: while a swipe is mid-drag and
    a neighbor group is partially visible, tapping a thumbnail
    inside the partially-visible neighbor does not fire its
    `onPhotoClick` (gated by `pointer-events: none` on non-center
    slides). After the commit lands, the same tap on the now-
    centered group does fire.
11. `bun run lint`, `bun run format`, `bun run build` clean.

## Risks

- **Mounted DOM grows from 1 → up to 3 slide bodies in the shell.**
  When a neighbor is a group of N photos, that neighbor mounts N
  `<img>`s. Worst case: a fragment whose three consecutive
  `gridItems` are all groups of ~5 photos each → ~15 mounted
  `<img>`s in the lightbox. Within budget for fragment sizes
  (~100 photos total per fragment), and `fetchPriority='low'` on
  neighbors keeps decode pressure off the critical first paint.
- **Commit-snap race.** The post-`transitionend` callback batches
  `setAnimating(false)`, `setOffsetX(0)`, and `navigate()`. React
  18 batches setState across event handlers and timeouts, so the
  snap and parent re-render apply in the same render. If a single-
  frame gap is observable on lower-end devices, wrap the resolution
  in `flushSync` (from `react-dom`); start without it.
- **`loadedFullUrls` cache invariant.** Visual continuity across
  navigate depends on the destination slide finding its full-
  resolution URL in the module-level `loadedFullUrls` set (or
  catching `img.complete` in its `useLayoutEffect`) so it renders
  with `loaded: true` on first paint. A regression in either path
  would manifest as a placeholder→full fade flashing in after the
  slide-in motion. Both `PhotoSlide` and `GroupSlide` import the
  shared set from `loadedFullUrls.ts` and populate it in their
  `onLoad` handlers.
- **Caption / counter "preview" during drag.** Each slide carries
  its own counter+caption sub-element, so during the drag the
  user briefly sees the destination's metadata sliding in
  alongside its image. This is the desired carousel feel; called
  out so it's not surprising when the change lands.
- **`touch-action: pan-y` interaction with existing scrolls.** The
  shell sits inside the lightbox-only DOM (the page underneath is
  scroll-locked via `body.style.overflow = 'hidden'`), so adding
  `pan-y` on the viewport only governs touches inside the
  lightbox. Verify on iOS that two-finger / momentum scrolls don't
  accidentally engage horizontal swipe; expected to be unaffected
  because the existing 10px deadzone + axis lock still applies.

## Alternatives considered

### Keep `Lightbox` and `GroupLightbox` separate; bake polymorphism into each

Would mean each component has to know how to render the _other_
kind in its neighbor slots, duplicating slide-body logic and the
chrome/keyboard/preload handling that's already duplicated today.
Rejected in favor of `LightboxShell` + extracted slide bodies.

### Don't preview kind-mismatched neighbors

When the next `gridItem` is a different kind from the current view,
render an empty neighbor slot during the drag (so cross-kind swipes
still land on a black gap, today's behavior). Rejected: it's a
visible inconsistency every time a fragment mixes solos and groups,
and the architectural cost of doing it right (above) is small.

### Render only the next/prev _single image_, even when the neighbor is a group

Cheaper than mounting the full group slide for neighbors, but the
preview-to-landed transition would jarringly change shape when
committing onto a group (single photo → multi-photo flex). Rejected.

### Identity-keyed slot wrappers (key = `slideKey(view)`)

The original spec proposed keying each slot wrapper by
`slideKey(view)` so React reconciliation would _move_ the slide
DOM (decoded `<img>` and all) from slot 2 into slot 1 on commit
— making the post-commit snap visually invisible without any
extra state.

Rejected on collision: when `gridItems.length === 2`, top-level
modulo wrap makes `prev` and `next` reference the same slide and
therefore the same `slideKey`. React's no-duplicate-keys rule
would fire. The two ways out — dropping wrap at length=2 (a
user-visible UX regression) or slot-prefixing the keys (which
defeats the reconciliation, the whole point) — both lose.

The shipped design uses slot-positional keys plus the
`loadedFullUrls` module cache (see Design → "Cross-navigate
visual continuity"). It accepts the cost of remounting all three
slide bodies on every navigate in exchange for: no key
collisions, no UX regressions, and — because the cache lets
remounted slides render `loaded: true` on first paint — the
same visual outcome as DOM preservation.

### Sticky no-cull on the swipe (keep one slide; animate it twice)

Keep a single image in the DOM, but on commit, render the _new_
image into the same element, animate from `+100vw` to `0`, then
leave it. Effectively a "manual" carousel using one node. Rejected:
the React tree underneath is owned by route state, not local state;
making the lightbox internally drive two photo identities at once
fights wouter's re-render and ends up reinventing the 3-slide track
without its key-based reconciliation guarantees.
