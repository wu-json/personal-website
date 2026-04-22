---
status: implemented
---

# Light mode via spider lily toggle

## Goal

Add a **light mode** to the site that inverts the current all-black / white-ink
aesthetic — backgrounds become white, text / ink marks become black, and the
spider lily on the home page inverts with them (black petals on white).

Triggering the theme is physical, not chrome: **clicking the spider lily**
itself swaps the theme, and the click emits a **massive ripple** that washes
across the viewport, visually carrying the color inversion from the flower
outward to the edges of the screen.

No settings menu, no toggle button in the header — the flower is the switch.

## Non-goals

- A third theme (sepia, high contrast, etc.). Just `dark` ↔ `light`.
- Per-screen overrides. Theme is global and applies everywhere.
- Persisting theme per-device with any complicated sync. A single
  `localStorage` key is enough.
- Respecting `prefers-color-scheme` on first load. The site is designed
  dark-first; **default is always `dark`**, and light is an intentional,
  user-initiated act. (We can revisit this later if desired.)
- Re-skinning the Gallery screen (the Three.js first-person space). Gallery
  stays its own self-contained black environment regardless of theme. See
  "Screens & components" below.
- A separate "invert everything automatically" CSS filter hack. We want
  intentional, tuned values per surface.
- Server / SSR theming. The app is a Vite SPA.

## Current state

The entire UI is hard-coded to a dark palette:

- Screens and `Sidebar` use `bg-black` directly (see grep in
  `src/screens/**/*.tsx`, `src/components/Sidebar/index.tsx`,
  `src/layouts/RootLayout.tsx`).
- `src/index.css` sets `html, body { background-color: #000000 }` in the
  `@layer base`.
- Ink / text is `text-white`, `rgba(255, 255, 255, …)`, or `white` used raw
  as a fill on SVGs (e.g. `SpiderLily`, `LunarTear`, menu flower).
- Drop-shadow glows (`lily-breathe`, `lily-glow-in`, `lunar-tear-glow`,
  `nav-glitch`, `[text-shadow:0_0_8px_rgba(255,255,255,…)]`) assume a dark
  substrate.
- The `SpiderLily` component has `fill='white'` and `rgba(255,255,255,…)`
  baked into CSS classes (`.spider-lily-petal`, `.spider-lily-stem`,
  `.spider-lily-stamen`, `.spider-lily-anther`, `.spider-lily-center`).
- `MainBanner` renders the lily inside a `bg-black` hero frame and does not
  currently treat the SVG as a button — it handles mouse hover / press for
  the wind / push animation but has no `onClick` theme action.

`MenuToggle` (mobile menu flower in `RootLayout`) and `LunarTear` (nav
bullet in `Sidebar`) both share the dark-palette assumption.

## Design

### 1. Theme model

A tiny theme context, no external dependency.

**New file:** `src/theme/ThemeContext.tsx`

```ts
type Theme = 'dark' | 'light';

type ThemeContextValue = {
  theme: Theme;
  toggle: (origin?: { x: number; y: number }) => void;
  // The origin + a monotonically increasing id of the last toggle, so a
  // single `RippleOverlay` can react to changes without ambiguity.
  lastRipple: { id: number; x: number; y: number; toTheme: Theme } | null;
};
```

- `ThemeProvider` lives at the top of the tree (wrapping `<App />` in
  `src/index.tsx`).
- Reads initial value from `localStorage.getItem('theme')`; falls back to
  `'dark'`. Ignores `prefers-color-scheme` by design (see non-goals).
- Writes back to `localStorage` and to `document.documentElement` on every
  change.
- Exposes a `useTheme()` hook.

### 2. How "dark vs light" is expressed in CSS

Use **Tailwind v4's `@custom-variant dark`** driven by a `data-theme`
attribute on `<html>`, rather than relying on `.dark` class + media query.
This matches the single source of truth in the context and plays nicely
with our existing Tailwind v4 setup (`@tailwindcss/vite`).

In `src/index.css`, add near the top (after `@import 'tailwindcss';`):

```css
@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));
```

Then set `document.documentElement.dataset.theme = theme` from the provider.

With this setup:

- The **default** (no variant) becomes the **light** palette.
- `dark:` prefixed utilities apply when `data-theme='dark'` is set on
  `<html>`.
- Because the provider initializes to `'dark'` on first render and writes
  the attribute synchronously before paint (see "Flash on first paint"
  below), the light palette never appears unintentionally.

### 3. Palette tokens

Define semantic tokens in `@theme` so components don't hard-code hex / rgba
values. These become the only thing the two themes actually swap.

In `src/index.css`, replace hard-coded `#000000` / `rgba(255,255,255,…)`
usages gradually; start with:

```css
@theme {
  /* existing font tokens… */

  --color-surface: #000000; /* dark default */
  --color-ink: #ffffff;
  --color-ink-soft: rgba(255, 255, 255, 0.6);
  --color-ink-faint: rgba(255, 255, 255, 0.2);
  --color-glow: rgba(255, 255, 255, 0.35);
}

:where([data-theme='light']) {
  --color-surface: #ffffff;
  --color-ink: #000000;
  --color-ink-soft: rgba(0, 0, 0, 0.6);
  --color-ink-faint: rgba(0, 0, 0, 0.2);
  --color-glow: rgba(0, 0, 0, 0.25);
}
```

Then migrate CSS/JSX references:

- `bg-black` → `bg-[var(--color-surface)]` (or a named utility
  `bg-surface` via a Tailwind theme alias).
- `text-white`, `white/80`, `white/50` → semantic classes backed by
  `--color-ink*`.
- `fill='white'` on inline SVGs (`SpiderLily`, `LunarTear`, `MenuToggle`)
  → `fill='currentColor'` with `color: var(--color-ink)` on the parent
  (or a `.ink` utility class).
- `rgba(255,255,255,…)` inside `.spider-lily-*`, `.transmission-prose *`
  → corresponding `--color-ink*` tokens (or explicit light-theme values
  under `[data-theme='light']`).

**Drop-shadow glows** (`lily-breathe`, `lily-glow-in`, `lunar-tear-glow`,
`nav-glitch`) need `--color-glow` variants; pure white glow on a white
background disappears, so the light theme uses a soft black glow.

### 4. The flower is the switch

`SpiderLily` becomes interactive in a new way:

- Add an `onClick` on the root `<svg>` that calls `toggle({ x, y })` where
  `{ x, y }` is the **viewport** coordinate of the click
  (`event.clientX`, `event.clientY`).
- Keep all existing hover / press / touch logic. The only new gesture is
  a **single click** (or tap) on the SVG.
- Treat the whole SVG's bounding box as the click target — consistent
  with the existing hover behavior. We don't need to limit to pixel-perfect
  petal geometry.
- Accessibility:
  - Add `role='button'`, `tabIndex={0}`, and
    `aria-label='Toggle color scheme'`.
  - `onKeyDown` handler for `Enter` / `Space` → toggle with origin at
    the SVG's center (computed from `getBoundingClientRect`).
  - Respect `prefers-reduced-motion` to skip the ripple (see section 5).

A small side detail: the existing `onMouseDown` triggers the petal "press"
animation. Clicks shouldn't interfere — `onClick` fires after
`mousedown` / `mouseup`, and the press spring is already keyed to
`mouseRef.pressed`, which resets on `mouseup`. No conflict.

### 5. The ripple

A dedicated fullscreen overlay component owned by `ThemeProvider`.

**New file:** `src/theme/RippleOverlay.tsx`

Shape:

- A `position: fixed inset-0 z-[9999] pointer-events-none` div.
- Inside, a single absolutely-positioned circle (`<div>` with
  `border-radius: 9999px`) scaled from 0 to a size that guarantees
  viewport coverage from the click origin:

  ```
  radius = hypot(max(x, vw - x), max(y, vh - y)) + padding
  diameter = radius * 2
  ```

- The circle is filled with the **incoming** theme's surface color. On
  `dark → light`, it's the light `--color-surface` expanding across the
  dark page; on `light → dark` it's the dark surface sweeping in.
- Animation is driven by a CSS custom property + keyframes (or Web
  Animations API) — a single scale from `0` to `1` over ~650ms with a
  `cubic-bezier(0.22, 1, 0.36, 1)` ease-out. Total duration chosen so
  it reads as "massive ripple" without being slow enough to annoy on
  repeat toggles.

Sequencing (the important bit — what actually makes this feel good):

1. User clicks the flower. `toggle({ x, y })` is called.
2. Provider **does not swap the theme attribute yet**. It publishes a
   new `lastRipple = { id, x, y, toTheme: next }` and the `RippleOverlay`
   mounts a circle at `(x, y)` filled with `toTheme`'s surface color,
   then animates it from scale 0 → 1.
3. Near the end of the animation (≈ 60% through; the moment the ripple
   has covered most of the viewport) the provider **flips
   `data-theme`**. At that instant every token-driven element switches
   theme. Because the ripple is already covering the viewport, the
   switch is masked — users see a clean expanding wash, not a
   mid-animation repaint.
4. On animation end, the overlay unmounts / fades out (opacity 0 over
   ~120ms), revealing the now-consistent underlying theme.

We use `requestAnimationFrame` + a `setTimeout(..., duration * 0.6)` (or
a custom event on the animation) to drive the attribute flip. Keeping
this logic in `ThemeProvider` (rather than spreading it to callers) is
the reason `toggle()` takes an origin.

Two subtle touches:

- The ripple tints slightly **into** the spider lily's direction — we
  use the exact click point, which is the flower's body, so the ripple
  naturally feels like it originates from the bloom itself.
- A very light radial gradient inside the circle (`from
transparent` at the edge to fully opaque at ~80%) softens the leading
  edge so it reads as a wash rather than a hard disc.

Reduced motion:

- If `window.matchMedia('(prefers-reduced-motion: reduce)').matches`,
  skip the ripple entirely, flip `data-theme` immediately, and do a
  short `opacity 0 → 1` cross-fade on a full-viewport overlay (~120ms).

### 6. Spider lily color inversion

In the dark theme the lily is ink-white on black. In the light theme it
should be ink-black on white, keeping the same petal / stamen structure
and the same bloom + breathe animations.

Concretely, update `.spider-lily-*` classes in `src/index.css` to pull
from `--color-ink*`, and replace white drop-shadows in `lily-breathe` /
`lily-glow-in` with `var(--color-glow)` (see section 3). The same applies
to `.menu-flower`, `.lunar-tear-active`, and `.petal*` classes used by
the sidebar / mobile menu flower — all of them become ink on surface.

No geometry changes. The bloom sequence on first page-load is unchanged.
When the theme flips mid-session, the lily is already bloomed; the new
ink color simply swaps under the ripple.

### 7. Screens & components to migrate

Scope is intentionally the whole visible surface so the inversion is
consistent.

- `src/layouts/RootLayout.tsx` — menu flower (`MenuToggle`) + overall
  structure.
- `src/components/Sidebar/index.tsx` — `bg-black` nav, white nav links,
  `LunarTear` white fill + glow text-shadow.
- `src/components/ScrollToTop.tsx` — verify colors (uses white in the
  arrow).
- `src/screens/Home/**` — `MainBanner` (includes `SpiderLily` click
  handler), any sub-sections.
- `src/screens/Transmissions/**` — list page, detail page,
  `MarkdownBody.tsx`, and the `.transmission-prose` rules in
  `src/index.css`.
- `src/screens/Memories/**` — list, detail, `Lightbox`, `GroupLightbox`.
  Lightboxes use `bg-black/95`; in light theme these should become
  `bg-[var(--color-surface)]/95` with ink close buttons. Photo images
  themselves are untouched (they're photographs).
- `src/screens/Constructs/**` — list + detail.
- `src/screens/Heroes/**` — list + detail.
- `src/screens/Gallery/**` — **do not re-theme.** The Gallery is a
  first-person Three.js scene with its own lighting model; forcing it
  white would break the art. The overlay `bg-black` for the gallery
  entrance (`src/screens/Gallery/index.tsx`) stays black. Exiting
  the gallery returns to whatever theme the rest of the app is using.

Photographs (`/images/fragments`, `/images/transmissions`, etc.) are left
alone — they're content, not chrome.

### 8. Flash on first paint

To avoid a one-frame flash of light on initial load (when the stylesheet
parses before the provider mounts and sets `data-theme`):

- Inline a tiny script in `index.html` (or in `src/index.tsx` before
  `createRoot`) that reads `localStorage.theme` and sets
  `document.documentElement.dataset.theme` synchronously. Provider then
  re-reads the same attribute as its initial state — no hydration
  mismatch, no flash.
- Default in the inline script is `'dark'`, matching the provider.

## Risk / tradeoffs

- **Coverage:** there are a lot of hard-coded `bg-black` / `text-white`
  usages. Missing one leaves a black rectangle on a white page (or the
  reverse). Plan (section 9) treats the migration as a clean pass and
  lands behind the toggle to make any leaks obvious.
- **Glow aesthetics in light mode:** pure-white drop-shadows evaporate on
  white; naive ports look flat. The `--color-glow` token + a lightly
  darker shadow in light mode is the key — the lily should feel like ink
  bleeding on rice paper rather than glowing neon.
- **Ripple performance:** a single CSS-transformed circle is cheap. We
  avoid animating width/height — only `transform: scale()` and
  `opacity`. Works on mobile.
- **Accidental toggles:** the flower is also a hover / press target for
  the existing wind interaction. `click` as a distinct gesture is fine,
  but drag-then-release on mobile could register as a tap. Acceptable —
  the action is cheap and reversible.
- **Gallery entry / exit:** because Gallery stays dark, leaving it back
  into a light-themed app will feel like stepping out of a dark room.
  That's arguably on-theme; no special handling planned.
- **Text-shadow glows in paragraphs / nav:** these use inline
  Tailwind `[text-shadow:...]` utilities. A focused sweep will replace
  these with token-driven CSS classes (e.g. `.ink-glow`) so both themes
  have tuned values.

## Implementation plan

Ordered so each step is independently reviewable and reversible.

1. **Token groundwork**
   - Add `@custom-variant dark` and `--color-surface` / `--color-ink*` /
     `--color-glow` tokens in `src/index.css`.
   - Leave the rest of the stylesheet unchanged — dark values match the
     current hard-coded ones, so this is a no-op visually.

2. **Theme provider + flash-prevention script**
   - Create `src/theme/ThemeContext.tsx` with `ThemeProvider`, `useTheme`,
     and an initial-state reader that matches the inline script.
   - Add the inline `data-theme` bootstrap to `index.html` (or pre-root
     in `src/index.tsx`).
   - Wrap `<App />` in `ThemeProvider`.

3. **Migrate chrome + screens to tokens**
   - Replace `bg-black` with a semantic utility backed by
     `--color-surface`.
   - Replace `text-white*` / `fill='white'` / `rgba(255,255,255,…)` with
     token-backed equivalents across screens, lightboxes, sidebar, menu
     toggle, lily SVG, markdown prose, scroll-to-top, etc.
   - Introduce `.ink-glow` / `.surface-glow` helper classes where needed
     to replace hard-coded text-shadow utilities.
   - Verify nothing changed in dark mode (theme still defaults to dark).

4. **Make the lily a button**
   - Add `onClick` / `onKeyDown` to `SpiderLily` that calls `toggle()`
     from `useTheme()`, passing the event origin.
   - Add role, aria-label, tabIndex, focus-visible styles.

5. **Ripple overlay**
   - Build `src/theme/RippleOverlay.tsx`.
   - Wire its mount into `ThemeProvider` so every `lastRipple` update
     spawns exactly one ripple.
   - Implement the "flip `data-theme` at ~60% of ripple" sequence.
   - Add `prefers-reduced-motion` fallback (cross-fade only).

6. **Light-palette tuning pass**
   - Flip to light in a dev toggle and walk each screen:
     - home, transmissions list + detail (incl. footnotes + code blocks),
       memories list + detail + lightboxes, constructs, heroes, sidebar,
       mobile menu, scroll-to-top, 404 states.
   - Adjust `--color-glow`, opacity of faint ink tokens, and anything
     else that reads poorly.
   - Confirm gallery entry still black and functional.

7. **Persistence + polish**
   - `localStorage` write on toggle, read on boot (via inline script +
     provider).
   - Confirm no FOUC / flash.
   - Run `bun run lint` and `bun run format`.

8. **Manual QA checklist**
   - Toggle from each screen (home, list, detail, lightbox open,
     gallery entry screen).
   - Keyboard activation on the flower.
   - Reduced-motion setting — ripple is replaced by fade.
   - Reload with each theme persisted — no flash.
   - Mobile viewport (mobile menu open, tap the big flower? _No_ —
     mobile menu flower is a separate toggle; only the home-page
     spider lily is the theme switch, to avoid accidental theme
     changes while navigating).

## Out of scope (parking lot)

- `prefers-color-scheme` as the default.
- A theme picker in the sidebar.
- Per-screen custom palettes.
- Animating individual screens' palette swap (beyond the global ripple).
- A "crushed / inverted" transition effect on photographs.
