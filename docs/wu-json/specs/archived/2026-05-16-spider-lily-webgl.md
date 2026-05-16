---
status: ready
---

# Spider lily — WebGL renderer

## Goal

Replace the SVG-filter spider lily (`src/screens/Home/SpiderLily.tsx`) with
a WebGL2 renderer that looks identical on every browser and removes the
per-browser fork. Today Safari can't composite the stacked SVG filters
(`feTurbulence` + two `feGaussianBlur` + per-stamen blur) at 60fps, so
the component already degrades to a static, filter-light render on WebKit
/ coarse pointer / Reduce Motion. WebGL gives one pipeline that runs at
full quality everywhere.

(The user described the current implementation as "2D canvas" — it's
actually inline SVG with filters and an rAF loop writing `transform`
attrs. Goal is unchanged; replacement is SVG → WebGL.)

## Non-goals

- Redesigning the flower. Geometry, palette, entrance cascade, wind sway,
  hover-push, breathing halo, click-to-toggle, focus ring — all visually
  preserved.
- New effects, new interactions, or a reusable WebGL abstraction.
- SSR of the canvas — the lily appears one frame later than surrounding
  text, hidden by the existing 1.2s entrance delay.
- Migrating other SVGs on the site.

## Current state (reference)

`SpiderLily.tsx` renders: stem (filled Bezier), 14 petals (filled
Beziers, `--color-ink`), 12 stamens (stroked Beziers, `--color-ink-muted`,
`stroke-dasharray` reveal), 12 anther ellipses (`--color-ink-soft`), center
circle. Wrapped in three filters: `#ink-texture` (`feTurbulence`
baseFreq=0.04, 3 octaves + `feDisplacementMap` scale=1.2), `#petal-glow`
(two `feGaussianBlur` stdDev 6 + 2.5 with `feMerge`), `#stamen-glow`
(stdDev 1.2 per-stamen + per-anther). An rAF loop writes
`transform='translate(...)'` per petal + per stamen + whole-flower
rotation, gated by `heavyEffectsEnabled = !isSafari && !coarsePointer
&& !reduceMotion` — disabled, the rAF never runs and the heavy filters
swap for a single `#petal-glow-lite`. CSS owns the entrance cascade
(`@keyframes lily-stem-rise / petal-bloom / stamen-grow / anther-appear /
center-pulse`) and the outer halo (`lily-glow-in`, `lily-breathe` on the
`.spider-lily-container` wrapping div).

## Design

### High-level

Swap the `<svg>` for a `<canvas>` in the same DOM slot. One WebGL2
context owns the entire render: tessellated geometry uploaded once,
vertex shader applies per-element wind/hover/sway, fragment shader
fills + reveals, post-process chain does ink displacement + two glow
blurs. CPU keeps doing what it does today — entrance timers + wind/hover
math — but updates uniforms instead of DOM attributes. One pipeline, no
fork.

### File layout

```
src/screens/Home/SpiderLily/
  index.tsx     — React shell (canvas, lifecycle, events, theme wiring)
  geometry.ts   — path data (ported verbatim) + Bezier sampling + triangulation
  renderer.ts   — WebGL2 setup, programs, FBOs, per-frame draw
  shaders.ts    — GLSL strings as template literals
  motion.ts     — entrance/wind/hover constants (ported verbatim)
```

`SpiderLily.tsx` is deleted; the existing `'../../SpiderLily'` import in
`MainBanner` resolves to the new folder via `index.tsx`.

### WebGL2 (not 1)

WebGL2 is universal in target browsers in 2026 (iOS Safari ≥ 15). It buys
us **multisample renderbuffers** (needed because `antialias: true` on the
default framebuffer only AAs the _backbuffer_, not our offscreen scene
FBO), GLSL ES 3.00, and standard derivatives without an extension. If
context creation fails, render nothing — the lily is decorative.

### Geometry (once at module load)

The `petals` and `stamens` arrays move into `geometry.ts` verbatim with
their `d` strings, delays, `cx/cy`, anther data. The `d`s use only `M`,
`L`, `C`, `Z`, so a ~30-line parser handles them — no SVG path lib.

- **Sampling.** Cubic segments → 24-point polylines via de Casteljau.
  Petals/stem become closed polygons; stamens become open polylines with
  precomputed cumulative arc-length per vertex (normalized 0..1) for the
  reveal animation.
- **Filled shapes (14 petals, stem).** Triangulate with `earcut` —
  petals are non-convex due to curl tips. `bun add earcut @types/earcut`.
- **Strokes (12 stamens).** Extrude each polyline ± normal × 0.4 (matches
  SVG `stroke-width: 0.8`) into a triangle strip. Miter joins, with bevel
  fallback when the join angle exceeds the miter limit. Square caps —
  imperceptible vs. SVG `stroke-linecap: round` at this width.
- **Anthers (12).** 16-segment triangle fans, rotated per `tipAngle`.
- **Center.** 16-segment fan, radius animated via uniform scale.

Each element gets its own draw call (40 total — negligible) so per-element
uniforms (wind offset, bloom progress) work without instancing.

### Coordinate space and resize

Logical coords match `viewBox='-180 10 800 470'`, projected via an
orthographic matrix uniform. Backing-store size = `cssSize *
min(devicePixelRatio, 2)`. A `ResizeObserver` on the canvas updates the
viewport and rebuilds the color/MSAA renderbuffers when the parent
resizes.

### Anti-aliasing

WebGL2 multisample renderbuffer (4× samples) for the scene FBO →
`blitFramebuffer` resolve into a regular texture used as input to the
blur passes. The blur output and final composite ride the default
backbuffer with `antialias: true` (free MSAA on the final edge between
geometry and background, though the geometry edges themselves were
already resolved by the blit).

### Premultiplied alpha

Context flag `premultipliedAlpha: true`. All FBOs store premultiplied
RGBA. Fragment shaders write `vec4(color.rgb * alpha, alpha)`. Blur and
composite kernels stay correct under premultiplication. Without this the
glow halos darken at low-opacity edges.

### Per-element state (uniforms, updated per frame)

- `u_offset: vec2` — wind + hover translate (per petal, per stamen).
- `u_flowerRotation: float`, `u_flowerPivot: vec2 = (CX, 465)` — whole-
  flower sway (preserves `transform='rotate(angle 220 465)'` math).
- `u_bloomScale: float`, `u_bloomPivot: vec2` — per-petal scale-from-
  center driven by `lily-petal-bloom` ease (0.12, 0.8, 0.2, 1).
- `u_reveal: float` — stamens, gates fragments by `step(a_arcLength,
u_reveal)`.
- `u_revealY: float` — stem, fragment discards fragments below this
  world-y threshold (analog of `lily-stem-rise`'s `clip-path: inset(100%
0 0 0) → inset(0)`); CPU drives it with the same cubic-bezier ease.
- `u_opacity: float` — per-element entrance alpha.
- `u_color: vec4` — re-read on theme change.

Eases (`lily-petal-bloom` etc.) evaluate on CPU; each frame uploads ~50
floats total. Cheap.

### Shaders (signatures, not full bodies)

- **Geometry vertex shader.** In: `a_position`, `a_arcLength`. Apply
  bloom scale → element offset → whole-flower rotation around
  `u_flowerPivot` → orthographic projection. Pass `v_worldY` and
  `v_arcLength` to fragment.
- **Geometry fragment shader.** Alpha = `u_opacity * step(v_arcLength,
u_reveal)`; if `v_worldY < u_revealY` discard. Out: premultiplied
  `vec4(u_color.rgb * alpha, u_color.a * alpha)`.
- **Separable Gaussian blur.** Fullscreen tri-strip + 13-tap weights;
  parameterized by direction and stdDev. Used twice for wide (½-res,
  stdDev≈6) and twice for tight (full-res, stdDev≈2.5).
- **Composite/displace pass.** Fullscreen quad. Samples scene + tight
  - wide. Applies a static 3-octave value noise (~30 lines from Ashima
    webgl-noise) at frequency 0.04 to perturb the scene sample by ±1.2 px
    via R/G channels — matches `feTurbulence` + `feDisplacementMap`
    parameters. Outputs `displaced_scene + tight_blur + wide_blur` with
    additive premultiplied blending (`feMerge` analog).

### Stamen glow

The current per-stamen `feGaussianBlur` (stdDev 1.2) is folded into the
global tight-blur pass — same blur kernel applied to a scene that already
contains the stamens, visually equivalent because the stamens are the
only thin elements in that radius range. If the side-by-side reveals
less halo around stamens, promote them to their own FBO blurred
separately (one extra separable pass — cheap).

### Breathing halo

Keep the existing CSS keyframe `lily-breathe` on the
`.spider-lily-container` wrapping div. The canvas inherits the
container's `drop-shadow` exactly like the SVG did. (WebKit's broken
case is `drop-shadow` on inline SVG roots; on a `<canvas>` it works.)
The existing `@media (prefers-reduced-motion: reduce), (pointer: coarse)`
override that disables the breathing pulse stays.

### Theme reactivity

Read `--color-ink`, `--color-ink-muted`, `--color-ink-soft`, `--color-glow`,
`--color-glow-soft`, `--color-glow-mist` via `getComputedStyle(canvas)`
on mount and on every `useTheme()` change; parse to `vec4` and upload as
uniforms on the next frame. No re-tessellation, no reallocation. Same
inheritance the SVG's `fill: var(--color-ink)` already relies on.

### Interaction

- Mouse/touch → client coords mapped to logical coords via
  `getBoundingClientRect` + inverse projection. Same `mouseRef = {x, y,
active}`, same hover-push math (`HOVER_RADIUS=140`, `HOVER_STRENGTH=8`,
  `LERP_SPEED=0.045`, `RETURN_SPEED=0.025`).
- Click + Enter/Space → `toggle()` from `ThemeContext` (unchanged).
- `role='button'`, `tabIndex={0}`, `aria-label='Toggle color scheme'`,
  `focus-visible:[filter:drop-shadow(0_0_8px_var(--color-glow))]` move
  from `<svg>` to `<canvas>`.
- **Behavior change (intentional):** today the rAF doesn't run on
  coarse pointers, so touch-drag never animates petal push. With the
  unified pipeline, touch-drag _does_ push petals. Aligned with the
  "no fork" goal, and the spec calls this out so the user can flag if
  they want it suppressed.

### Entrance cascade

Existing `setTimeout` chain (`STEM_DELAY=100`, `PETAL_DELAY=900`,
stamens staggered by `stamenRank * STAMEN_STAGGER=50` after
`STAMEN_BASE_DELAY=1200`, ranks by distance from `(CX, CY)`) moves into
`motion.ts` and is invoked from the React shell. Each timer flips a
flag in a `progressRef`; the renderer reads it per frame and advances
the corresponding ease toward its target. Verbatim timing — only the
plumbing changes.

Under `prefers-reduced-motion`, set wind strength to 0 and skip the
sway rotation; let the entrance cascade still play (matches the
prevailing site convention).

### rAF + visibility + context loss

- `requestAnimationFrame` loop is unconditional (no `heavyEffectsEnabled`
  gate). Same `visibilitychange` pause/resume as today.
- Register `webglcontextlost` (preventDefault) and `webglcontextrestored`
  (recreate programs + reupload buffers). The geometry build is reusable
  — keep the typed arrays in module scope. Without this, a GPU reset
  (common on iOS under memory pressure) permanently blanks the lily.

### Code removed

- `SpiderLily.tsx`: `heavyEffectsEnabled`, both JSX branches, both
  `<defs>` blocks, every `filter='url(...)'` attribute, the DOM-write
  rAF.
- `index.css`: all `.spider-lily-stem*`, `.spider-lily-petal*`,
  `.spider-lily-stamen*`, `.spider-lily-anther*`, `.spider-lily-center*`,
  `.spider-lily-bract*` rules and the matching `@keyframes lily-stem-rise`,
  `lily-bract-open`, `lily-petal-bloom`, `lily-stamen-grow`,
  `lily-anther-appear`, `lily-center-pulse`. **Keep**
  `.spider-lily-container`, `@keyframes lily-glow-in`, `@keyframes
lily-breathe`, and the `prefers-reduced-motion / pointer: coarse`
  block that suppresses `lily-breathe` (still owns the outer halo).

## Files touched

- `src/screens/Home/SpiderLily.tsx` — deleted.
- `src/screens/Home/SpiderLily/{index.tsx, geometry.ts, renderer.ts,
shaders.ts, motion.ts}` — new.
- `src/screens/Home/sections/MainBanner/index.tsx` — no change needed;
  folder import already resolves.
- `src/index.css` — prune as above.
- `package.json` — `bun add earcut @types/earcut`. No other deps.

## Verification

1. **Visual parity** — side-by-side desktop Chrome at 1× and 2× DPR,
   subjective parity on petals, stem, stamens, anthers, ink texture,
   petal glow, stamen glow, breathing halo. Pixel-diff need not be zero.
2. **Animation parity** — bloom cascade order and timing unchanged
   (stem → petals → stamens-by-distance → anthers); wind frequency +
   amplitude unchanged; hover-push response unchanged.
3. **Safari perf** — iOS Safari on real device sustains 60fps through
   bloom and wind. (Today's WebKit path runs static.)
4. **Desktop Chromium** — no regression; ≤ 4ms/frame on M1.
5. **Theme toggle** — click flower, colors flip on the next frame.
6. **Keyboard + focus** — tab to canvas, focus ring shows, Enter/Space
   toggles.
7. **Reduce Motion** — wind off, sway off, entrance plays, breathing
   halo disabled.
8. **Resize** — `ResizeObserver` rebuilds FBOs, no leak.
9. **Context loss** — DevTools "Lose Context" → "Restore Context" →
   renders again.
10. `bun run lint`, `bun run format`, `bun run build` clean.

## Risks / open questions

- **First-paint timing.** No SSR for canvas. The existing 1.2s entrance
  delay should hide the hand-off; if it doesn't, render a stem-only SVG
  placeholder in the initial markup and tear it down on canvas mount.
  Defer unless we see a flash.
- **`earcut` polygon validity.** 24-point Bezier sampling on these
  petals produces simple polygons (visually inspected). If a higher
  sample count ever self-intersects on a curl tip, fall back to a
  triangle-fan approximation for that petal.
- **Bundle cost.** ~10KB minified (earcut 2.5KB + renderer/shaders
  7-8KB), ~4KB gzipped. Accepted.
- **Noise parity.** Our 3-octave value noise won't be bit-exact to
  `feTurbulence` — both produce sub-pixel ink jitter at the same
  visual frequency. If the difference reads as different, swap to
  webgl-noise's `cnoise.glsl` (closer analog).
- **Stamen glow.** Folding into the global tight blur is the cheap
  default. Side-by-side may force a dedicated stamen FBO + extra
  separable pass — still cheap, called out so the implementer doesn't
  treat it as scope creep.
- **Touch-drives-petal-push on mobile** is new behavior (today's
  coarse-pointer path has no rAF). Documented above; flag if the user
  wants it suppressed.
