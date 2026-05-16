---
status: implemented
---

# Spider lily — WebGL renderer

## Goal

The home banner spider lily (`src/screens/Home/SpiderLily/`) is rendered
by a WebGL2 pipeline so it looks identical on every browser and ships
one code path. Before this change, `SpiderLily.tsx` rendered as inline
SVG with a chain of filters (`feTurbulence` + two `feGaussianBlur` +
per-stamen blur) that WebKit couldn't composite at 60fps, so the
component degraded to a static, filter-light render on Safari /
coarse-pointer / Reduce Motion. The WebGL renderer runs the same
composition at full quality everywhere.

## Non-goals

- Redesigning the flower. Geometry, palette, entrance cascade, wind
  sway, hover-push, breathing halo, click-to-toggle, focus ring — all
  visually preserved.
- New effects, new interactions, or a reusable WebGL abstraction.
- SSR of the canvas — the lily appears one frame later than surrounding
  text, hidden by the existing 1.2s entrance delay.
- Migrating other SVGs on the site.

## Design

### High-level

A `<canvas>` sits in the same DOM slot the `<svg>` used to occupy. One
WebGL2 context owns the entire render: tessellated geometry uploaded
once, vertex shader applies per-element wind/hover/sway, fragment shader
fills + reveals, post-process chain does two glow blurs + ink-noise
displacement. CPU still runs the entrance timers and wind/hover math
each frame, but writes to uniforms instead of DOM `transform` attrs. One
pipeline, no fork.

### File layout

```
src/screens/Home/SpiderLily/
  index.tsx     — React shell (canvas, lifecycle, events, theme wiring)
  geometry.ts   — path data (ported verbatim) + Bezier sampling + triangulation
  renderer.ts   — WebGL2 setup, programs, FBOs, per-frame draw
  shaders.ts    — GLSL strings as template literals
  motion.ts     — entrance/wind/hover constants (ported verbatim)
```

The old single-file `SpiderLily.tsx` is gone; the existing
`'../../SpiderLily'` import in `MainBanner` resolves to the new folder
via `index.tsx`. No call-site changes.

### WebGL2 (not 1)

WebGL2 is universal in target browsers in 2026 (iOS Safari ≥ 15). It
buys us **multisample renderbuffers** (needed because `antialias: true`
on the default framebuffer only AAs the *backbuffer*, not our offscreen
scene FBO), GLSL ES 3.00, and standard derivatives without an extension.
If context creation fails, the component renders nothing — the lily is
decorative.

### Geometry (once at module load)

The `petals` and `stamens` arrays move into `geometry.ts` verbatim with
their `d` strings, delays, `cx/cy`, anther data. The `d`s use only `M`,
`L`, `C`, `Z`, so a ~30-line parser handles them — no SVG path lib.

- **Sampling.** Cubic segments → 24-point polylines via de Casteljau.
  Petals/stem become closed polygons; stamens become open polylines with
  precomputed cumulative arc-length per vertex (normalized 0..1) for the
  reveal animation.
- **Filled shapes (14 petals, stem).** Triangulated with `earcut` —
  petals are non-convex due to curl tips.
- **Strokes (12 stamens).** Each polyline is extruded ± normal × 0.4
  (matches SVG `stroke-width: 0.8`) into a triangle strip with averaged
  per-vertex normals. Square caps — imperceptible vs. SVG
  `stroke-linecap: round` at this width.
- **Anthers (12).** 16-segment triangle fans, rotated per `tipAngle`.
- **Center.** 16-segment fan, radius animated via the bloom-scale
  uniform.

Each element gets its own draw call (40 total — negligible) so
per-element uniforms (wind offset, bloom progress) work without
instancing.

### Coordinate space and resize

Logical coords match `viewBox='-180 10 800 470'`, projected via an
orthographic matrix uniform (with y flipped so source coords stay
SVG-style y-down). The canvas takes an inline `aspectRatio: 800 / 470`
style + `width: 100%` so it sizes inside `MainBanner`'s container.
Backing-store size = `cssSize * min(devicePixelRatio, 2)`. A
`ResizeObserver` on the canvas updates the viewport and rebuilds the
color/MSAA renderbuffers when the parent resizes.

### Anti-aliasing

WebGL2 multisample renderbuffer (4× samples) for the scene FBO →
`blitFramebuffer` resolve into a regular texture used as input to the
blur passes. The blur output and final composite ride the default
backbuffer with `antialias: true`.

### Premultiplied alpha

Context flag `premultipliedAlpha: true`. All FBOs store premultiplied
RGBA. Fragment shaders write `vec4(color.rgb * alpha, alpha)`. Blur and
composite kernels stay correct under premultiplication. Without this the
glow halos darken at low-opacity edges.

### Per-element state (uniforms, updated per frame)

- `u_offset: vec2` — wind + hover translate (per petal, per stamen).
- `u_flowerRotation: float`, `u_flowerPivot: vec2 = (CX, 465)` — whole-
  flower sway (preserves `transform='rotate(angle 220 465)'` math).
- `u_bloomScale: float`, `u_bloomRotation: float`,
  `u_bloomPivot: vec2 = (CX, CY)` — per-petal scale + rotation around
  the flower center, driving the `lily-petal-bloom` entrance ease
  (scale 0→1, rotation 8°→0°). Other elements pass scale=1 and
  rotation=0.
- `u_headRotation: float = -4°`, `u_headPivot: vec2 = (CX, CY)` —
  static tilt of the flower head (matches
  `<g transform='rotate(-4 CX CY)'>` on the SVG flower-head group).
  Stem passes `headRotation=0` since it lives outside that wrapper in
  the SVG.
- `u_reveal: float` — stamens, gates fragments by
  `step(a_arcLength, u_reveal)` (replaces `stroke-dashoffset`).
- `u_revealY: float` — stem, fragment discards where `v_worldY <
  u_revealY` (analog of `lily-stem-rise`'s `clip-path: inset(100% 0 0 0)
  → inset(0)`); CPU drives it with the same cubic-bezier ease.
- `u_opacity: float` — per-element entrance alpha.
- `u_color: vec4` — re-read on theme change.

Eases (`lily-stem-rise`, `lily-petal-bloom`, `lily-stamen-grow`,
`lily-anther-appear`, `lily-center-pulse`) evaluate on the CPU each
frame via a small Newton-iterating cubic-bezier helper, and per-frame
uploads are ~50 floats total. Cheap.

### Shaders

- **Geometry vertex shader.** In: `a_position`, `a_arcLength`.
  Transforms in order: bloom scale + rotation around `u_bloomPivot` →
  head tilt around `u_headPivot` → per-element offset → whole-flower
  sway around `u_flowerPivot` → orthographic projection. Passes
  `v_worldY` (untransformed source y, for stem reveal) and
  `v_arcLength` to fragment.
- **Geometry fragment shader.** `discard` where `v_worldY < u_revealY`;
  otherwise alpha = `u_color.a * u_opacity * step(v_arcLength,
  u_reveal)`. Output is premultiplied: `vec4(u_color.rgb * alpha,
  alpha)`.
- **Separable Gaussian blur.** Fullscreen triangle + 13-tap weights
  (precomputed for stdDev 2.5 and stdDev 3 in half-res). Two passes for
  tight (full-res, stdDev≈2.5), two for wide (half-res, stdDev≈3 ≈
  stdDev 6 in source pixels). A degenerate identity-kernel pass
  doubles as the half-res downsample.
- **Composite/displace pass.** Fullscreen quad. Computes a static
  3-octave value-noise displacement in (x, y) channels (matches
  `feTurbulence` `baseFrequency='0.04'` `numOctaves='3'` +
  `feDisplacementMap` `scale='1.2'`) and samples scene + tight + wide
  at the displaced UV. **Composite is back-to-front source-over**:

  ```glsl
  vec4 result = wide;
  result = tight + result * (1.0 - tight.a);
  result = scene + result * (1.0 - scene.a);
  ```

  This matches `feMerge` semantics. (An earlier additive form
  (`scene + tight + wide`) washed petals into a uniform white blob
  because the opaque scene was being summed *with* its own blurred
  copy instead of *covering* it.)

### Stamen glow

The SVG's per-stamen `feGaussianBlur` (stdDev 1.2) is folded into the
global tight-blur pass — same blur kernel applied to a scene that
already contains the stamens, visually equivalent because the stamens
are the only thin elements in that radius range. No dedicated stamen
FBO was needed.

### Breathing halo

The CSS `@keyframes lily-breathe` on `.spider-lily-container` stays.
The canvas inherits the container's `drop-shadow` exactly like the SVG
did. (WebKit's broken case is `drop-shadow` on inline SVG roots; on a
`<canvas>` it works.) The `@media (prefers-reduced-motion: reduce)`
override that disables the breathing pulse stays.

### Theme reactivity

Read `--color-ink`, `--color-ink-muted`, `--color-ink-soft` via
`getComputedStyle(canvas)` on mount and on every `useTheme()` change
(the rAF loop also polls `data-theme` on `<html>` and refreshes on
mismatch — guards against the `ThemeContext` mid-frame `data-theme`
flip beating React's re-render). Parse to `vec4`, upload as uniforms
on the next frame. No re-tessellation, no reallocation. Same
inheritance the SVG's `fill: var(--color-ink)` already relies on.

### Interaction

- Mouse/touch → client coords mapped to logical coords via
  `getBoundingClientRect` + inverse of the viewBox projection. Same
  `mouseRef = {x, y, active}`, same hover-push math (`HOVER_RADIUS=140`,
  `HOVER_STRENGTH=8`, `LERP_SPEED=0.045`, `RETURN_SPEED=0.025`).
- Click + Enter/Space → `toggle()` from `ThemeContext` (unchanged).
- `role='button'`, `tabIndex={0}`, `aria-label='Toggle color scheme'`,
  `focus-visible:[filter:drop-shadow(0_0_8px_var(--color-glow))]` move
  from `<svg>` to `<canvas>`.
- **Behavior change (intentional):** touch-drag on coarse-pointer
  devices now drives petal push. Old rAF was gated off entirely on
  touch.

### Entrance cascade

Existing `setTimeout` chain (`STEM_DELAY=100`, `PETAL_DELAY=900`,
stamens staggered by `stamenRank * STAMEN_STAGGER=50` after
`STAMEN_BASE_DELAY=1200`, ranks by distance from `(CX, CY)`) moves into
`motion.ts` and is invoked from the React shell. Each timer flips a
flag in a `progressRef`; the renderer reads it per frame and advances
the corresponding ease toward its target. Verbatim timing — only the
plumbing changes.

Under `prefers-reduced-motion`, wind strength goes to 0 and sway is
skipped; the entrance cascade still plays (matches the prevailing site
convention).

### rAF, visibility, context loss, StrictMode

- `requestAnimationFrame` loop is unconditional (no `heavyEffectsEnabled`
  gate). Same `visibilitychange` pause/resume as before.
- `webglcontextlost` (preventDefault) + `webglcontextrestored`
  (recreate programs + reupload buffers) are registered. The geometry
  build is reusable — typed arrays stay in module scope. Without this,
  a GPU reset (common on iOS under memory pressure) permanently blanks
  the lily.
- The rAF callback guards against React StrictMode's dev double-mount
  with `if (renderer.disposed || rendererRef.current !== renderer)
  return;`. A stale `tick` closure from a torn-down mount can otherwise
  fire after its programs were `gl.deleteProgram`'d, throwing
  `INVALID_OPERATION: no valid shader program in use` on every frame.

### Code removed

- `SpiderLily.tsx`: `heavyEffectsEnabled`, both JSX branches, both
  `<defs>` blocks, every `filter='url(...)'` attribute, the DOM-write
  rAF.
- `index.css`: all `.spider-lily-stem*`, `.spider-lily-petal*`,
  `.spider-lily-stamen*`, `.spider-lily-anther*`, `.spider-lily-center*`,
  `.spider-lily-bract*` rules and the matching
  `@keyframes lily-stem-rise / bract-open / petal-bloom / stamen-grow /
  anther-appear / center-pulse`. Kept: `.spider-lily-container`,
  `@keyframes lily-glow-in`, `@keyframes lily-breathe`, and the
  `prefers-reduced-motion` block that suppresses `lily-breathe`
  (the wrapping container still owns the outer halo).

## Files touched

- `src/screens/Home/SpiderLily.tsx` — deleted.
- `src/screens/Home/SpiderLily/{index.tsx, geometry.ts, renderer.ts,
  shaders.ts, motion.ts}` — new.
- `src/screens/Home/sections/MainBanner/index.tsx` — unchanged; folder
  import already resolves.
- `src/index.css` — pruned as above.
- `package.json` — `earcut` + `@types/earcut` added. No other deps.

## Verification

1. **Visual parity.** Headless Chromium screenshot comparison (via
   Playwright) between `main` and this branch at 1× DPR, cropped to
   the canvas bounding rect. Petals, stem, stamens, anthers, ink
   texture, petal glow, stamen glow, breathing halo all read as
   matching. Pixel-diff is not zero (different rasterizers) — subjective
   parity is the bar.
2. **Animation parity.** Bloom cascade order and timing unchanged
   (stem → petals → stamens-by-distance → anthers); wind frequency +
   amplitude unchanged; hover-push response unchanged.
3. **Theme toggle.** Click flower, colors flip on the next frame.
   Verified visually in both directions.
4. **Reduce Motion.** Code path: wind off, sway off, entrance plays,
   breathing halo disabled via the existing CSS rule.
5. **Resize.** `ResizeObserver` rebuilds FBOs on every parent resize;
   no leak.
6. **Console hygiene.** Zero console errors / page errors during full
   entrance + hover + theme toggle.
7. `bun run lint`, `bun run format`, `bun run build` clean.

Deferred to real-device QA:

- **Safari perf on real iOS device.** The driver is the reason for
  this change but the verification was Chromium-only; real iOS
  measurement is the user's next pass.
- **`webglcontextlost` / `webglcontextrestored` round-trip.** Handlers
  are wired and the renderer is rebuilt on restore, but the path
  hasn't been exercised in a real loss event.

## Risks / open questions

- **First-paint timing.** No SSR for canvas. The existing 1.2s entrance
  delay should hide the hand-off; if it doesn't, render a stem-only SVG
  placeholder in the initial markup and tear it down on canvas mount.
  Deferred until a flash is observed.
- **`earcut` polygon validity.** 24-point Bezier sampling on these
  petals produces simple polygons (visually inspected). If a higher
  sample count ever self-intersects on a curl tip, fall back to a
  triangle-fan approximation for that petal.
- **Bundle cost.** Main JS bundle went from 728KB → 752KB (+24KB
  minified, ~+8.4KB gzipped). Earcut ≈ 2.5KB; the rest is renderer +
  shaders. Accepted.
- **Noise parity.** The 3-octave value noise isn't bit-exact to
  `feTurbulence` — both produce sub-pixel ink jitter at the same
  visual frequency. If the difference reads as different, swap to
  webgl-noise's `cnoise.glsl` (closer analog).
- **Touch-drives-petal-push on mobile** is new behavior (the old
  coarse-pointer path had no rAF). Aligned with the "no fork" goal.
