---
status: implemented
---

# Mobile performance for spider lily + bio-glitch

## Goal

The spider lily on the home banner (`src/screens/Home/SpiderLily.tsx`) and the
`.bio-glitch` text effect (`src/index.css`) are visibly laggy on iOS Safari —
the bloom stutters, the wind/sway animation hitches, and theme-flip glitch
replays on text compete with the lily for frame budget.

Make the home page feel smooth on an iPhone without losing the ink-texture,
glow, and wind aesthetic on desktop.

## Non-goals

- Redesigning the lily or glitch visuals. Desktop should look identical.
- Dropping `feTurbulence` / `feGaussianBlur` entirely on desktop.
- A full `prefers-reduced-motion` pass across the whole site — only the two
  surfaces in this spec (lily + bio-glitch), because the rest (gallery,
  fragment lightbox, etc.) is already acceptable.
- Per-frame performance tuning of the Gallery screen. Out of scope.

## Current state

### Lily (`src/screens/Home/SpiderLily.tsx` + `src/index.css`)

The flower renders inside a chain of SVG filters applied to a subtree that
changes every rAF:

1. `#ink-texture` — `feTurbulence` (fractalNoise, 3 octaves) + `feDisplacementMap`,
   wrapping the entire flower group (`<g filter='url(#ink-texture)'>`).
2. `#petal-glow` — two `feGaussianBlur` passes (stdDeviation 6 and 2.5) + `feMerge`,
   wrapping all 14 petals + 12 stamens (`<g filter='url(#petal-glow)'>`).
3. `#stamen-glow` — `feGaussianBlur` applied **per stamen `<path>` and per
   anther `<ellipse>`**, so ~24 individually filtered nodes.

On top of that, the component runs a `requestAnimationFrame` loop that writes
`transform='translate(x y)'` on 14 petal paths, 12 stamen groups, and the
outer flower group for wind + sway — every frame, forever, while the page is
mounted. Safari does not GPU-accelerate SVG filters the way desktop Chromium
does; `feTurbulence` in particular recomputes on the CPU, and any transform
change inside the filtered subtree re-rasterizes the turbulence + both blur
passes.

The entrance bloom (`lily-petal-bloom`, `lily-stamen-grow`, etc.) stacks on
top of all this, and `lily-breathe` drives a 7s infinite `drop-shadow`
animation on the wrapping container. The lily has no reduced-motion or mobile
fallback.

### `.bio-glitch`

Light on its own (`opacity` + `translateX` with `steps(1, end)` over 350ms),
but it's applied to **every heading, bio paragraph, and link group** on the
home banner and on Memories / Signals / Constructs / Heroes index + detail
screens. It also replays on every theme toggle via `data-theme-flash-reset`.
On iOS, while the lily is saturating the compositor, the concurrent glitch
replays on a dozen nodes stutter visibly. There is no reduced-motion guard.

## Design

Two orthogonal levers: **capability detection** and **animation density**.
Neither changes the desktop experience.

### 1. Capability detection helper

Add a tiny module `src/lib/motion.ts` (or inline constant inside `SpiderLily`
if we don't need reuse) that exposes two booleans, computed once at module
load:

- `prefersReducedMotion` — `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
- `isCoarsePointer` — `window.matchMedia('(pointer: coarse)').matches`

Convention used elsewhere (`src/screens/Gallery/index.tsx`) already treats
`pointer: coarse` as "mobile-ish". We'll reuse that rather than parsing UA.

A derived `heavyEffectsEnabled` boolean = `!prefersReducedMotion && !isCoarsePointer`
is what the lily and glitch will consult. SSR-safe: fall back to `true`
(desktop) when `window` is undefined.

Live updates (e.g. user enables reduced motion mid-session) are not a goal —
re-reading on component mount is sufficient.

### 2. Lily: conditional filter chain + rAF gating

In `SpiderLily.tsx`:

- When `heavyEffectsEnabled` is `false`:
  - **Omit `#ink-texture`.** Render the flower subtree without the outer
    `<g filter='url(#ink-texture)'>` wrapper. Turbulence + displacement map
    is the single biggest mobile cost and is cosmetic.
  - **Omit `#petal-glow`.** Replace with a single CSS `filter: drop-shadow(...)`
    applied on the rotated flower `<g>` (composited by Safari) — keeps a
    soft bloom without two `feGaussianBlur` passes on 26 children.
  - **Drop per-stamen `#stamen-glow`.** The per-node Gaussian blur on 24
    elements is what makes pan/sway hitch. Remove the `filter=` attribute
    on each `<path className='spider-lily-stamen'>` and each anther
    `<ellipse>` in the reduced branch.
  - **Skip the wind/sway rAF loop entirely.** The sub-pixel wind offsets
    and ±1° sway are imperceptible at phone viewport sizes and carry the
    full cost of re-rasterizing the filtered subtree. Leave the entrance
    bloom keyframes on (they're cheap without the filters), skip the rAF.
  - **Disable `lily-breathe`.** The infinite `drop-shadow` pulse on the
    container is layered on top of the now-removed filters and adds
    nothing without them. Gate the class or override with a reduced-motion
    rule.
  - **Touch-push reaction on `<path>` transforms is dropped** as a
    consequence of not running the rAF loop. Tap still fires `toggle()` —
    that's the important interaction.

- When `heavyEffectsEnabled` is `true`: behavior is unchanged. Desktop gets
  the full filter chain, wind, sway, and breathe.

Implementation shape: branch on the constant at render time and return two
slightly different JSX trees, sharing the same petal/stamen data arrays.
Gate the `useEffect` that starts the rAF loop behind the same flag
(early-return if disabled). The entrance `setTimeout` chain that toggles
`stemActive` / `petalsActive` / `activeStamens` stays the same in both
branches.

### 3. `.bio-glitch`: reduced-motion + mobile opt-out

In `src/index.css`:

- Add a media-query override:
  ```css
  @media (prefers-reduced-motion: reduce), (pointer: coarse) {
    .bio-glitch,
    .nav-glitch-active {
      animation: none;
      opacity: 1;
    }
    html[data-theme-flash-reset] .bio-glitch,
    html[data-theme-flash-reset] .nav-glitch-active {
      animation: none;
    }
  }
  ```
- This leaves the element fully visible on mobile (no entrance jitter, no
  theme-flip replay) and preserves desktop behavior verbatim.

We intentionally keep the `nav-glitch` keyframes defined — they just don't
run on mobile.

## Files touched

- `src/screens/Home/SpiderLily.tsx` — branch on `heavyEffectsEnabled`,
  conditionally render filter wrappers, conditionally register the rAF
  wind/sway effect, drop per-node `filter='url(#stamen-glow)'` in the
  reduced branch.
- `src/index.css` — add the `@media (prefers-reduced-motion: reduce),
(pointer: coarse)` block for `.bio-glitch` / `.nav-glitch-active`, and
  a companion rule to suppress `lily-breathe` on the `.spider-lily-container`
  under the same media query.
- _(optional)_ `src/lib/motion.ts` — small helper if we end up wanting the
  flag in other places; otherwise inline in `SpiderLily.tsx`.

## Verification

1. Desktop Chromium + desktop Safari: home banner looks identical — ink
   texture, petal glow, per-stamen glow, wind, sway, breathe all intact.
2. iOS Safari (or DevTools device emulation with `pointer: coarse` forced):
   lily blooms smoothly, no ink-texture, subtle CSS drop-shadow in place of
   petal glow, no wind loop, no breathing pulse. Tap still toggles theme
   and the ripple still plays (ripple is owned by `ThemeContext` / outer
   overlay, not this component).
3. macOS with **System Settings → Accessibility → Reduce Motion** on:
   same reduced render as mobile.
4. `.bio-glitch` text on mobile is static (no shift, no flicker); on
   desktop the entrance glitch and theme-flip replay behave as before.
5. `bun run lint` and `bun run format` clean.

## Risks / open questions

- **Aesthetic regression on mobile.** We lose the inky displacement and the
  wide petal halo. Acceptable trade: the flower still reads as a spider
  lily, the bloom still plays, and the page is usable. If we miss the glow
  we can reintroduce a single `drop-shadow` at a modest radius on mobile
  (included in the design above).
- **`pointer: coarse` is an imperfect proxy for "slow device".** A large
  Android tablet with coarse pointer will also get the reduced render even
  if it could handle the full one. Acceptable: the reduced render still
  looks intentional, and this is strictly a perf safety net.
- **No live media-query listener.** If a user toggles Reduce Motion without
  reloading, they keep whatever mode was captured at mount. Revisit only
  if this becomes a real complaint.
