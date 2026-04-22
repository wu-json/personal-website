---
status: implemented
---

# Gallery light mode

## Goal

Make the interactive gallery (`src/screens/Gallery/`) respect the site-wide
`data-theme` so that entering the gallery while the rest of the site is in
light mode lands you in a **light** gallery — a bright room with ink-dark
frames and text — rather than always dumping you into the black void.

Flipping the site theme (via the spider lily) while already inside the
gallery should also re-render the gallery in the new theme without
forcing a page reload.

The gallery's art direction — first-person PointerLock exploration, wood
floor, painterly spotlights on each art piece, pixel-font wall text,
benches — is preserved. Only the **palette** changes.

## Non-goals

- Rewriting the scene structure, movement, collisions, or layout
  generation. `generateLayout.ts`, `MobileControls.tsx`, and the
  WASD/jump/crouch logic are untouched.
- Per-fragment palette overrides. The gallery follows the site theme,
  full stop.
- A third "gallery-only" theme toggle. There is already a global
  switcher (the spider lily). We reuse it.
- Respecting `prefers-color-scheme` independently inside the gallery.
- Re-skinning the welcome wall's **content** / copy. Same text, just
  inverted colors.
- Touching photograph content itself (`<ArtFrame>` image textures).
  Photographs are left exactly as loaded.
- Changing HDR / tone mapping / post-processing. No bloom, no
  post-FX pipeline is introduced.

## Current state

The gallery was excluded from the original light-mode pass on purpose
(see `docs/wu-json/specs/archived/2026-04-21-light-mode-flower-toggle.md`,
section 7). Today it is hard-coded dark at every layer:

- **Container:** `src/screens/Gallery/index.tsx` outermost div is
  `bg-black` with `text-white/25` / `text-white/40` pixel hints.
- **Mobile joystick chrome:** `MobileControls.tsx` uses
  `border-white/20` and `bg-white/30` for the ring and knob.
- **Canvas textures (procedurally drawn to `<canvas>` and uploaded as
  `THREE.CanvasTexture`):**
  - `createWoodTexture` — base `#2a2a2a`, plank colors
    `hsl(0, s%, 15–19%)`, grain lines in `rgba(20,20,20,…)` /
    `rgba(60,60,60,…)`, seams in `rgba(10,10,10,…)`.
  - `createWallTexture` — base `#0a0a0a` with noise.
  - `createCeilingTexture` — base `#080808` with noise.
  - `createWelcomeTexture` — wall-color base `#0a0a0a`, title
    `#ffffff`, subtitle/controls `rgba(255,255,255,0.5)` /
    `rgba(255,255,255,0.3)`, divider `rgba(255,255,255,0.12)`.
  - `createLabelTexture` — wall-color base `#0a0a0a`, title text
    `rgba(255,255,255,0.7)`.
- **Three.js materials created in module scope (hot constants):**
  - `frameMaterial` — `#1a1a1e`, metallic-ish.
  - `canvasMaterial` — `#1a1a1a` (placeholder color used before the
    image texture loads).
  - Inline `meshStandardMaterial color='#1a1a1a' / '#111'` for the
    bench seat and legs.
- **Lighting:** `ambientLight intensity={1.2}`,
  `hemisphereLight args={['#ffffff', '#333333', 0.8]}`, per-piece
  `spotLight color='#ffffff' intensity={12}`, and overhead
  `pointLight color='#ffffff'` fill lights. All tuned for a dark
  room.

The textures are memoized with `useMemo(createWoodTexture, [])` etc.,
so changing the theme after mount does **not** currently rebuild them.
The module-scope materials are worse: they're allocated once per page
load and shared across every `ArtFrame`, so even unmounting and
remounting the gallery wouldn't swap their colors.

## Design

Light mode is a proper re-render of the scene with a parallel palette
and slightly retuned lights — not a CSS filter hack, not a gamma
shift. The gallery is canvas-rendered, so every color has to be
plumbed through explicitly.

### 1. Read the theme at the gallery boundary

`GalleryScreen` calls `useTheme()` from `src/theme/ThemeContext.tsx`
and threads `theme` into everything that bakes a color. Keying the
things that need a rebuild on `theme` is how we force the swap.

```tsx
const { theme } = useTheme();
```

No new context is introduced — the gallery is a consumer of the
existing global theme, nothing more.

### 2. Gallery palette

Define a small palette object inside the gallery module (colocated
with the code that uses it — these colors bleed into `<canvas>` fills
and Three.js materials, so CSS tokens are the wrong home):

```ts
type GalleryPalette = {
  wall: string; // base wall + welcome/label canvas background
  ceiling: string; // ceiling base
  floorBase: string; // wood base before plank/grain
  plankL: [number, number]; // [min, max] HSL lightness for per-plank variation
  plankS: [number, number]; // [min, max] HSL saturation for per-plank variation
  grainDark: string; // grain stroke (darker than plank)
  grainLight: string; // grain stroke (lighter than plank)
  seam: string; // plank end-seam
  seamHighlight: string;
  ink: string; // title text on welcome wall / label
  inkMuted: string; // subtitle, controls, label text
  inkFaint: string; // divider
  frame: string; // art frame material color
  canvasPlaceholder: string; // placeholder canvas color (pre-texture-load)
  benchSeat: string;
  benchLeg: string;
  ambient: number; // ambient light intensity
  hemiSky: string; // hemisphereLight sky color
  hemiGround: string; // hemisphereLight ground color
  hemiIntensity: number;
  spotColor: string;
  spotIntensity: number;
  fillColor: string;
  fillIntensityNear: number;
  fillIntensityFar: number;
};
```

Two concrete palettes:

- **`dark`** — values identical to today's hard-coded ones (baseline,
  no visual change expected when site theme is dark).
- **`light`** — inverted ink / surface, retuned lights:
  - `wall: '#f2f2f2'` (not pure white; keeps some subtle noise from
    `createWallTexture` visible).
  - `ceiling: '#f6f6f6'` (slightly brighter than the wall, same as
    today's ceiling-slightly-brighter-than-wall relationship).
  - `floorBase: '#d8d8d8'` with plank lightness range tuned so planks
    read as pale oak rather than ashy gray. Grain strokes become
    dark (`rgba(40,32,24,…)`) over lighter planks; the "lighter"
    variant becomes a near-white highlight.
  - `ink: '#0a0a0a'`, `inkMuted: 'rgba(0,0,0,0.55)'`,
    `inkFaint: 'rgba(0,0,0,0.15)'`.
  - `frame: '#1a1a1e'` **kept dark** — gallery frames are
    intentionally dark regardless of theme; this is a design call, not
    a theming one. Dark frames on pale walls are the visual language
    of a well-lit gallery. (See "Risk / tradeoffs".)
  - `canvasPlaceholder: '#e6e6e6'` so the placeholder before a photo
    loads blends with the wall rather than punching a black hole.
  - `benchSeat: '#d6d0c8'`, `benchLeg: '#c6bfb4'` — pale wood to
    match the floor.
  - Lighting in light mode is pulled back: `ambient` drops to `0.75`,
    `spotIntensity` drops to `~6`, fill lights drop to `~1.2 / 0.8`.
    A bright room with bright fills blows out; the goal is a
    gentle, evenly-lit museum rather than an overexposed white cube.
  - `hemiSky`/`hemiGround` become `'#ffffff'` / `'#cccccc'` at
    `intensity: 0.4` — a small sky/ground tint without washing the
    scene flat.

The exact numbers are tuning knobs; the table above is the starting
point for step 6 (light-palette tuning pass).

A small helper returns the right palette:

```ts
const getPalette = (theme: Theme): GalleryPalette =>
  theme === 'light' ? LIGHT : DARK;
```

### 3. Make canvas-texture factories take a palette

The five `create*Texture` functions currently close over literal hex /
rgba strings. They become palette-parameterized:

```ts
const createWoodTexture = (palette: GalleryPalette) => { … };
const createWallTexture = (palette: GalleryPalette) => { … };
const createCeilingTexture = (palette: GalleryPalette) => { … };
const createWelcomeTexture = (
  palette: GalleryPalette,
  mobile = false,
  fragmentTitle?: string,
  fragmentDescription?: string,
) => { … };
const createLabelTexture = (palette: GalleryPalette, title: string) => { … };
```

All hard-coded `#2a2a2a` / `#0a0a0a` / `rgba(255,255,255,…)` / `'#ffffff'`
inside these functions are replaced with references to the palette
fields (`palette.floorBase`, `palette.wall`, `palette.ink`, etc.).
The random-seeded procedural logic (plank lengths, grain density, noise)
is preserved verbatim — we only swap the color inputs.

Call sites change their `useMemo` deps to include `palette` (or `theme`,
which is sufficient since palette is derived from theme):

```tsx
const wallTex = useMemo(() => createWallTexture(palette), [palette]);
```

Because `THREE.CanvasTexture` instances hold GPU resources, we must
dispose the old texture when `palette` changes. A small effect next
to each `useMemo`:

```tsx
useEffect(() => () => wallTex.dispose(), [wallTex]);
```

Same pattern for floor, ceiling, welcome, and per-label textures.
Without dispose, the GPU leaks a texture every theme swap.

### 4. Stop hoisting materials to module scope

`frameMaterial` and `canvasMaterial` are currently module-level
singletons. They're fine for "one color forever" but incompatible
with theme-driven color. Move them inside `ArtFrame` as memoized
values keyed on palette:

```tsx
const frameMaterial = useMemo(
  () =>
    new THREE.MeshStandardMaterial({
      color: palette.frame,
      roughness: 0.3,
      metalness: 0.1,
    }),
  [palette.frame],
);
useEffect(() => () => frameMaterial.dispose(), [frameMaterial]);
```

The `matRef` logic that swaps in an image texture on load is
unchanged — it still sets `mat.color.set('#ffffff')` after load
(neutral tint so the texture shows through accurately). The
placeholder color before load becomes `palette.canvasPlaceholder`.

Inline bench materials (`<meshStandardMaterial color='#1a1a1a'>`, etc.)
switch to `color={palette.benchSeat}` / `color={palette.benchLeg}`.

### 5. Thread palette / theme through the component tree

`Room`, `Artworks`, `ArtLighting`, `ArtPlaceholder`, `ArtFrame`,
`ArtLabel`, `GalleryBench`, `Floor`, `PartitionWall`, `WelcomeWallText`
all take an extra `palette: GalleryPalette` prop.

The `memo()` wrappers on `ArtFrame`, `ArtLabel`, `ArtPlaceholder` now
re-render when palette changes — which is exactly what we want. They
stay memoed so unrelated prop churn (e.g. layout recomputations for
the same theme) still short-circuits.

### 6. Retune lighting per palette

In light mode we need less ambient and fill, because:

- Light-colored walls / floor reflect hemisphere and ambient
  contributions strongly; default values blow out.
- Spotlights at `intensity: 12` against a white wall clip hard,
  erasing the "each piece has its own pool of light" effect.

Concretely, in `<Room>` and `<ArtLighting>`:

```tsx
<ambientLight intensity={palette.ambient} />
<hemisphereLight
  args={[palette.hemiSky, palette.hemiGround, palette.hemiIntensity]}
/>
…
<spotLight
  intensity={palette.spotIntensity}
  color={palette.spotColor}
  …
/>
<pointLight
  intensity={i === 0 ? palette.fillIntensityNear : palette.fillIntensityFar}
  color={palette.fillColor}
  …
/>
```

Exact numbers get dialed in during the tuning pass (step 6 of the
implementation plan). The goal is: walking into the light gallery
feels like walking into a sunlit museum, not like staring at a
whiteout.

### 7. Container + mobile chrome

`GalleryScreen`'s outer wrapper moves off `bg-black` and onto a
palette-aware class:

```tsx
<div
  className={`fixed inset-0 z-50 ${!isMobile && !locked ? 'cursor-pointer' : ''}`}
  style={{ backgroundColor: 'var(--color-surface)' }}
>
```

The `--color-surface` token already flips with `data-theme` (set up
by the main light-mode pass), so the background matches the rest of
the site during the initial fade-in before the canvas is `ready`.

Pixel-hint text (`text-white/25`, `text-white/40`, `text-white/20`)
swaps to token-backed classes already defined in `src/index.css`
(`text-[color:var(--color-ink-ghost)]` etc.), matching how the other
screens were migrated. The "← EXIT GALLERY" link and hint paragraphs
all pull from the same tokens, so keyboard focus, hover, and theme
behavior are automatic.

`MobileControls.tsx` gets the same treatment:

- `border-white/20` → `border-[color:var(--color-ink-ghost)]`
- `bg-white/30` → `bg-[color:var(--color-ink-faint)]`

(Or a slightly lower-opacity ink token if they read too loud on a
light background — determined in tuning.)

### 8. Theme flips while inside the gallery

Since the flower is only on the home page (see the existing
light-mode spec), the user generally can't toggle theme from inside
the gallery. But if they do (e.g. via keyboard shortcut added later,
or by exiting + re-entering via in-app nav without unmount), the
gallery must handle it cleanly.

The design above makes this free:

- `useTheme()` returns the new value.
- `palette` recomputes.
- `useMemo(..., [palette])` rebuilds each canvas texture.
- Dispose effects free the old GPU textures.
- Material `useMemo`s rebuild materials with new base colors.
- Three.js re-renders on the next frame.

No imperative "on theme change" effect is needed. No canvas flicker
is expected because React renders the new textures synchronously
before Three.js schedules a frame.

The ripple overlay from the main theme spec is a DOM-level element
at `z-[9999]` — it naturally overlays the `z-50` gallery container,
so the cross-fade / ripple still reads correctly even mid-session.

### 9. Welcome wall texture — font loading + palette

`createWelcomeTexture` is already deferred until `document.fonts.ready`
resolves (to ensure `Geist Pixel Circle` is available). Adding
palette dependency doesn't change that — the effect just adds
`palette` to its deps:

```tsx
useEffect(() => {
  document.fonts.ready.then(() => {
    setTexture(
      createWelcomeTexture(palette, mobile, fragmentTitle, fragmentDescription),
    );
  });
}, [palette, mobile, fragmentTitle, fragmentDescription]);
```

Old texture is disposed in the cleanup. Same for `ArtLabel`.

## Risk / tradeoffs

- **Frame color stays dark:** pure-white frames on white walls
  disappear. The art-historical reference (dark museum moulding, ink
  mat) argues for keeping the frame dark regardless. If the user
  strongly prefers palette-swept frames, this is one flip in
  `LIGHT.frame`.
- **Image textures are dark-biased:** many of the photographs
  currently displayed were color-graded against a black gallery
  wall. On a white wall, framed photos still read fine (the frame
  provides contrast), but there may be one or two images where the
  mat / edge feels less moody. This is a content concern, not a
  theming one, and is accepted.
- **Procedural texture regeneration cost:** each theme flip rebuilds
  the wood, wall, ceiling, welcome, and N label textures. On desktop
  this is <30ms total; on low-end mobile it could approach 100ms. The
  gallery is full-screen at that moment — a brief stall is acceptable
  and the user has already signaled intent by toggling. If it becomes
  a problem we can cache both palettes' textures up front, but that
  doubles GPU memory for textures we rarely swap.
- **Light-mode lighting calibration:** the starting numbers in the
  palette table are educated guesses. The tuning pass is explicitly
  budgeted as step 6 below; the spec should not be considered done
  until "walking into light gallery" feels right.
- **Shared module-scope materials are removed:** this is a minor
  memory regression (each `ArtFrame` now owns its own
  `frameMaterial`) but correctness trumps the micro-optimization.
  The art pieces cap at ~50 per room; the extra materials are
  noise relative to the texture footprint.
- **Dispose correctness:** forgetting to dispose a `CanvasTexture` or
  `MeshStandardMaterial` on theme flip leaks GPU memory. The plan
  pairs every palette-keyed `useMemo` with a cleanup effect — this
  pattern is the single biggest correctness risk and the easiest to
  verify (via `renderer.info.memory.textures` in a devtools probe if
  needed).

## Implementation plan

Ordered so each step is independently reviewable.

1. **Palette + getPalette**
   - Add `GalleryPalette` type, `DARK` and `LIGHT` palette objects,
     and `getPalette(theme)` at the top of `src/screens/Gallery/index.tsx`.
   - `DARK` exactly matches today's literals; no visual change.

2. **Parameterize texture factories**
   - Change `createWoodTexture`, `createWallTexture`,
     `createCeilingTexture`, `createWelcomeTexture`, `createLabelTexture`
     to take `palette` as their first argument.
   - Replace hard-coded hex / rgba literals with palette fields.
   - Leave all random-seeded procedural logic untouched.

3. **Wire `theme` into `GalleryScreen`**
   - Call `useTheme()`, derive `palette`, pass it down to `<Room>`.
   - `<Room>` takes `palette` and forwards to `<Floor>`,
     `<PartitionWall>`, `<WelcomeWallText>`, `<Artworks>`,
     `<ArtLighting>`, `<GalleryBench>`.

4. **Palette-keyed memos + dispose**
   - Every `useMemo(createXTexture(...), [...])` gets `palette` in
     its deps.
   - Pair each with a `useEffect(() => () => tex.dispose(), [tex])`.
   - Same for per-label textures inside `<ArtLabel>`.

5. **De-hoist `frameMaterial` / `canvasMaterial`**
   - Move into `ArtFrame` as palette-keyed `useMemo`s.
   - Dispose old materials when palette changes.
   - Placeholder mesh uses `palette.canvasPlaceholder` instead of
     hard-coded `#1a1a1a`.
   - Bench meshes pull `palette.benchSeat` / `palette.benchLeg`.

6. **Retune light palette values (the actual aesthetic work)**
   - Flip the site to light, enter the gallery with and without a
     fragment, walk each wall, check:
     - Floor reads as pale wood, not gray concrete.
     - Walls have subtle noise visible, no banding, no uniform
       whiteout.
     - Each art piece still has a recognizable spotlight pool,
       not overblown.
     - Welcome wall text is comfortably readable.
     - Labels under each art piece are readable but recede.
     - Benches sit on the floor rather than floating as dark bars.

7. **Container + mobile chrome migration**
   - Outer `<div>` swaps to `var(--color-surface)` background.
   - Hint paragraphs and exit link swap to ink tokens.
   - `MobileControls` joystick ring + knob swap to ink tokens.

8. **Manual QA checklist**
   - Enter gallery from dark site → looks identical to today.
   - Enter gallery from light site → bright, calm, readable.
   - Toggle theme via flower, reload into gallery → no FOUC.
   - Fragment-backed gallery (`/memories/<slug>/gallery`) — both
     themes, both orientations (mobile + desktop).
   - Mobile joystick ring is visible against both surfaces.
   - Three.js devtools (or `renderer.info.memory.textures`) shows
     stable texture count after multiple theme flips inside the
     gallery.
   - `bun run lint` + `bun run format` clean.
   - Reduced-motion user: the gallery itself has no new motion;
     the ripple fallback from the main light-mode spec still handles
     the page-level transition.

## Out of scope (parking lot)

- A gallery-only theme override ("always dark inside the gallery
  regardless of site theme").
- Animated transition between light and dark inside the gallery
  (cross-fading textures frame-by-frame). The reuse of the global
  ripple is sufficient.
- Tone-mapping, bloom, or post-processing to compensate for the new
  lighting range.
- Re-baking the procedural textures at a higher resolution in light
  mode to hide any banding that emerges on pale walls.
- Exposing palette knobs in the URL for live tuning.
