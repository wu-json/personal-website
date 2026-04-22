---
status: implemented
---

# Mobile Safari: no glow at flower center

## Bug

On iOS Safari (and anywhere the coarse-pointer / reduced-motion fallback
branch in `SpiderLily.tsx` is active), the spider lily renders flat —
there is no visible halo around the dense petal / stamen / center
region, where desktop has a strong luminous bloom.

The `lily-breathe` / `lily-glow-in` **outer** drop-shadow on the
`.spider-lily-container` HTML wrapper still fires (that was fixed in
#56), but the _inner_ petal-glow replacement never produces visible
output on mobile.

## Current state

Desktop uses `#petal-glow` — a two-pass `feGaussianBlur`
(stdDeviation 6 + 2.5) + `feMerge`, applied to the flower `<g>`. The
glow is self-colored (the petals are white ink, blurred into a white
halo).

Mobile / reduced-motion uses `#petal-glow-lite`:

```
<filter id='petal-glow-lite' ...>
  <feDropShadow
    className='spider-lily-petal-glow'
    dx='0' dy='0' stdDeviation='3'
  />
</filter>
```

and a CSS rule tries to theme the shadow color:

```
.spider-lily-petal-glow {
  flood-color: var(--color-glow-soft);
  flood-opacity: 1;
}
```

Two independent problems stack:

1. **`flood-color` set via a CSS class on `<feDropShadow>` is not
   honored by iOS Safari.** WebKit supports the `flood-color` and
   `flood-opacity` _presentation attributes_ on filter primitives, but
   does not reliably resolve them when they arrive as CSS declarations
   targeting the `<feDropShadow>` element. The shadow falls back to
   opaque black, which is invisible on the black dark-mode surface
   (and produces an unexpected black smudge under the light-mode
   flower).

2. **Even if `flood-color` resolved, `stdDeviation=3` with dx/dy=0 is
   much tighter than the desktop halo.** The desktop petal-glow is a
   _merge_ of a wide blur (stdDev 6) and a tight blur (stdDev 2.5)
   composited behind the source graphic — not a colored drop shadow.
   The single-pass lite filter can't reproduce the "light is radiating
   out of the center" look even when it's colored correctly.

## Goal

Restore a visible, luminous halo around the flower on mobile Safari
(and anywhere the reduced-motion branch runs), concentrated at the
dense center where the petals and stamens converge — without
reintroducing `feTurbulence` or per-stamen filters, and without
breaking desktop.

## Non-goals

- Matching the desktop halo pixel-for-pixel. Mobile can be slightly
  softer so long as the center clearly glows.
- Bringing back the wind/sway rAF loop, per-stamen `#stamen-glow`, or
  `#ink-texture` on mobile. Those remain opted out (see the prior
  spec, `2026-04-21-mobile-lily-and-glitch-perf.md`).
- Fixing any other iOS Safari glow regressions outside the lily.

## Design

Rebuild `#petal-glow-lite` so it uses the same pattern as the desktop
filter — a **self-colored** multi-pass Gaussian blur of the source
graphic — but with fewer passes and a tighter region so it stays cheap
on mobile Safari. This eliminates the dependence on `flood-color`
entirely: the halo inherits whatever color the petals/stamens are
already painted in, which is driven by the existing `--color-ink`
token and already tracks the light/dark theme correctly.

Concrete shape:

```xml
<filter id='petal-glow-lite' x='-30%' y='-30%' width='160%' height='160%'>
  <feGaussianBlur in='SourceGraphic' stdDeviation='5' result='wide' />
  <feGaussianBlur in='SourceGraphic' stdDeviation='2' result='tight' />
  <feMerge>
    <feMergeNode in='wide' />
    <feMergeNode in='tight' />
    <feMergeNode in='SourceGraphic' />
  </feMerge>
</filter>
```

- Two `feGaussianBlur` passes instead of desktop's two stacked on top
  of a wrapping `feTurbulence`. On a **static** subtree (no rAF loop
  on mobile) Safari rasterizes this **once at paint time** and caches
  it, which is the whole reason we removed the per-frame writes. A
  single static two-pass blur is well within iOS's budget.
- No `flood-color`, no CSS rule on the primitive — the halo picks up
  the petals' existing ink color, so dark mode glows white and light
  mode glows black (matching desktop behavior).
- Dimensions (`x`, `y`, `width`, `height`) already give the halo room
  to bleed past the flower bounds.

Since there is no `flood-color` dependency anymore, the
`.spider-lily-petal-glow` CSS rule and the `className` on
`<feDropShadow>` are both removed.

### Why not keep `feDropShadow` with a presentation attribute?

A `flood-color="white"` attribute would work, but it would bake in the
wrong dark-mode color for light mode (the shadow would always be white
regardless of theme). Self-colored blur of `SourceGraphic` is theme-
agnostic by construction.

### Why two passes instead of one

With one pass at stdDev ~4 the halo looks tight and waxy; the flower
still reads flat. Desktop's distinctive "soft wide ring + tight inner
bloom" comes specifically from the _merge_ of two different blur
radii. Matching that shape (at slightly smaller stdDeviations, 5 and 2) preserves the aesthetic without the cost.

## Files touched

- `src/screens/Home/SpiderLily.tsx`
  - Rewrite the `else` branch of the `<defs>` block: replace the
    single `<feDropShadow>` with the two-pass `feGaussianBlur` +
    `feMerge` structure above.
  - Remove the `className='spider-lily-petal-glow'` attribute (it has
    no remaining consumer).
  - Update the accompanying comment to describe the new approach and
    drop the WebKit bug 261806 reference (that bug was about CSS
    `filter: drop-shadow` on inline SVG roots; it's still relevant to
    the `.spider-lily-container` wrapper discussion but not to this
    inline SVG filter).
- `src/index.css`
  - Delete the `.spider-lily-petal-glow` rule (`flood-color` /
    `flood-opacity`). Nothing else references it.

## Verification

1. iOS Safari (or DevTools with `pointer: coarse` forced + hard
   reload): the flower has a visible white halo concentrated at the
   center, clearly readable against the black surface.
2. iOS Safari in light mode (after tapping the flower): halo is a
   subtle dark bloom that matches the desktop light-mode glow color.
3. Desktop Chromium + desktop Safari: unchanged (`heavyEffectsEnabled`
   still true → still uses `#petal-glow`, not `#petal-glow-lite`).
4. macOS with Reduce Motion on: sees the new mobile-style glow
   consistently.
5. `bun run lint` and `bun run format` clean.

## Risks

- **Two-pass blur on mobile is still heavier than a drop-shadow.**
  Mitigated by: (a) the subtree is static on mobile (no rAF writes
  inside the filtered group, so it rasterizes once), and (b) the
  entrance bloom keyframes are on individual petal/stamen ink paths
  inside the filtered group — they animate `opacity` and
  `stroke-dashoffset` but _not_ geometry. If they turn out to trigger
  re-rasterization, we can further downgrade to a single-pass blur
  (stdDev ~4) and accept a slightly softer halo.
- **Dropping `flood-color` theming removes a seam for future
  multi-color glow experimentation** — acceptable; we can reintroduce
  a themed filter later behind its own id if we ever need it.
