---
status: ready
---

# Migrate jasonwu.ink from Vite SPA to Next.js (App Router)

The site has quietly turned into a blog and the current SPA shape no
longer fits:

- No per-post HTML for crawlers, no per-post `<title>` / `<meta>`, no
  per-post OG image. Google indexes us as one page; every social share
  previews the same `og-image.png`.
- Every route bundles markdown for every entry. Even after the
  route-level splitting in `2026-04-25-performance-improvements.md`,
  the markdown chunk for a section loads as soon as that section is
  visited.
- The bespoke image pipeline duplicates what `next/image` does for free
  (responsive variants, AVIF, lazy / priority hints).

Destination: **Next.js 15 (App Router) with React Server Components
and per-route static rendering**. Content pages render to HTML at
build time, ship near-zero JS for the reading surface, gain real
per-page metadata. Client islands (Gallery, Lightbox, theme, sidebar)
keep working as Client Components.

## Goals

- **SEO parity with a real blog**: per-post `<title>`, `<meta>`, OG,
  Twitter card, canonical, JSON-LD. Crawlable HTML for every reading
  surface, no JS required.
- **Per-route bundle sized to the route**. Home ships ~0 KB of
  markdown machinery; signal detail pages ship the renderer but no
  Gallery or Memories code.
- **`next/image` where it pays**. Adopt where the bespoke 20 px
  CSS-background placeholder isn't load-bearing; keep
  `ProgressiveImage` for masonry / signals.
- **No visual regression**. Theme bootstrap (no flash), sidebar,
  ink cursor, SpiderLily, Gallery, Lightbox — all behaviorally
  identical.
- **Preserve the content authoring loop**. `.agents/skills/` keep
  working; markdown files stay in
  `src/screens/.../entries|fragments/` so git history holds.

## Non-goals

- Rewriting content.
- Changing the image source pipeline (`scripts/optimize-photos.ts`,
  four `.webp` variants). `next/image` adoption layers on top.
- MDX. Posts stay plain markdown.
- Replacing Tailwind v4, oxlint, oxfmt, tsgo, prek, or Bun.
- Migrating off Vercel.

## Strategy: incremental PRs to `main`

Each PR ships to `main` and keeps production functional. No
long-lived migration branch.

- **PR 1** is the substrate swap (Vite → Next.js). Screens stay as
  Client Components that render exactly today's logic; each page
  wrapper is a thin RSC that loads data via filesystem reads and
  passes it as props. Production gets Next.js with no SEO regressions
  and no visible changes; SSR HTML for free, but bundle is unchanged
  because `react-markdown` etc. still ship to the client.
- **PRs 2–5** convert one content section at a time to real RSC
  markdown rendering + per-post metadata. Independently delegate-
  able; Signals (PR 2) lands first because it introduces the shared
  `src/lib/markdown.ts` helper that PRs 4/5 reuse.
- **PRs 6+** are post-migration enhancements (sitemap, JSON-LD,
  `next/image`, dynamic OG).

Each PR ends with a **Tasks** checklist of atomic, delegate-ready
work items.

## Locked-in technical decisions

Each item is baked into the plan below; the PR introducing it is
tagged.

- **Markdown rendering** (PR 2). Drop `react-markdown` once all detail
  pages migrate. Server renders via `unified` (`remark-parse` +
  `remark-gfm` + `remark-rehype` + `rehype-raw` + `rehype-stringify`)
  → HTML string; Client `<MarkdownBody html={...}>` uses
  `html-react-parser` (~13 kB gz) to swap `<img>` → `<ProgressiveImage>`
  and external `<a>` → new-tab wrapper. `react-markdown` v10 can't
  be the renderer here — its `components` prop takes function refs
  which aren't serializable across the RSC boundary, so the whole
  renderer would have to be `"use client"` and ship the full ~80–120
  kB gz remark/rehype stack.
- **`useJitter` SSR mismatch** (PR 1). `Math.random()` during render
  mismatches between server and client → hydration error. Switch to
  `useId()` + deterministic 32-bit hash; `useId()` returns the same
  value on both sides. No visual change.
- **Theme bootstrap script** (PR 1). Inline `<script
  dangerouslySetInnerHTML>` in `<head>` JSX, with
  `suppressHydrationWarning` on `<html>`. **Not** `next/script` with
  `strategy="beforeInteractive"` — in App Router that runs after body
  paint, defeating flash prevention. Don't pass an empty string to
  `dangerouslySetInnerHTML` (React 19 makes that a hydration error).
- **Tailwind v4 + Next 15** (PR 1). `@tailwindcss/postcss` via
  `postcss.config.mjs`. Works with Turbopack on Tailwind ≥ 4.1 +
  Next ≥ 15.1. `@custom-variant`, `@theme`, `@layer base { @apply
  ... }` all pass through. `@import url(...)` must be **above**
  `@import 'tailwindcss';` (already the case in `src/index.css:1-2`).
- **Bun on Vercel** (PR 1). Vercel autodetects `bun.lock`, runs
  `bun install`, builds under Node. No `vercel.json`, no
  `bunVersion` pin.
- **`vercel.json`** (PR 1). Delete. The SPA-rewrite would intercept
  Next routes and break everything.
- **Font preloads** (PR 1). `<link rel="preload" as="font"
  type="font/woff2" crossOrigin="">` as JSX in `<head>` (metadata
  API has no `preload` field).
- **`output` config** (PR 1). Leave unset. `standalone` is for
  self-hosting / Docker; redundant on Vercel.
- **`next/og`** (PR 9). Bundled with App Router. No install.
- **Markdown file colocation**. Files stay in
  `src/screens/.../entries|fragments/` for git history and existing
  `.agents/skills/` paths.

---

## PR 1 — Substrate swap (Vite → Next.js)

**Goal.** Replace Vite with Next.js. Every route works exactly as
today: same routing, theme bootstrap, fonts, sidebar, screens. SSR
HTML lands for free (every Client screen renders in Next's SSR pass).
SEO metadata and bundle wins come in later PRs.

The trick: each page is a thin Server Component wrapper that loads
data via filesystem reads and passes it to the existing Client screen
as props. Screens themselves change minimally — they accept data
instead of importing it.

### What changes

- Add `next` (≥ 15.1), `@tailwindcss/postcss` (≥ 4.1),
  `html-react-parser`. Drop `vite`, `@vitejs/plugin-react`,
  `@tailwindcss/vite`, `wouter`. Keep `react-markdown` for now;
  PRs 2/4/5 drop it once nothing uses it.
- New `app/` tree:
  ```
  app/
  ├── layout.tsx              # <html>, fonts, theme bootstrap, providers
  ├── globals.css             # moved from src/index.css
  ├── not-found.tsx
  ├── (site)/
  │   ├── layout.tsx          # RootLayout (sidebar + scroll container)
  │   ├── page.tsx            # HomeScreen
  │   ├── memories/{page,[id]/page,[id]/[photo]/page}.tsx
  │   ├── signals/{page,[id]/page}.tsx + feed.xml/route.ts
  │   ├── constructs/{page,[id]/page}.tsx
  │   └── heroes/{page,[id]/page}.tsx
  └── gallery/
      ├── layout.tsx          # bare standalone (no sidebar)
      ├── page.tsx            # dev-only standalone
      └── [fragmentId]/page.tsx
  ```
  Route group `(site)` keeps the sidebar layout for everything except
  `/gallery/*` — same split `src/App.tsx` enforces today via the
  outer wouter `<Switch>`.
- `postcss.config.mjs`:
  `export default { plugins: { '@tailwindcss/postcss': {} } }`. No
  `tailwind.config.js`.
- `next.config.ts`: `images.unoptimized: true`,
  `eslint.ignoreDuringBuilds: true` (oxlint, not ESLint), `output`
  unset, alias for `src/*`.
- Theme bootstrap as `<script dangerouslySetInnerHTML>` in `<head>`
  JSX of `app/layout.tsx`; `<html lang="en" suppressHydrationWarning>`.
  Font preload `<link>` tags also in `<head>` JSX.
  `<link rel="alternate" type="application/rss+xml" ...>` too.
- `metadata` exported from `app/layout.tsx` with
  `metadataBase: new URL('https://jasonwu.ink')` + the current
  `index.html` defaults.
- All four `src/screens/*/data.ts` convert from `import.meta.glob` to
  filesystem reads, become server-only (`import 'server-only'`),
  memoized via module-level cache. Move to
  `src/lib/content/{signals,fragments,constructs,heroes}.ts`.
  `photoUrl()` moves to `src/lib/photoUrl.ts` (pure, no
  `server-only`).
- Each page wrapper is a tiny RSC: load via the new loader, pass
  array / item to the existing Client screen. Screens accept data as
  props instead of importing it.
- RSS becomes `app/(site)/signals/feed.xml/route.ts` exporting `GET`;
  helpers from `src/plugins/rss.ts` move to `src/lib/rss.ts`. Test
  file ports to `src/lib/rss.test.ts`.
- `wouter` → `next/link` + `usePathname` / `useRouter`. Lightbox's
  `navigate(url, { replace: true })` (`FragmentDetail.tsx:140`) →
  `router.replace(url, { scroll: false })`. Without `scroll: false`
  Next jumps to top on every photo swipe.
- `useJitter` rewrites to `useId()` + deterministic hash. No SSR
  mismatch.
- `RootLayout`'s `useState(() => localStorage.getItem(...))` lazy
  initializer runs on the server too — wrap with
  `typeof window === 'undefined' ? false : ...` and reconcile via
  post-mount `useEffect`. Otherwise SSR crashes.
- `SpiderLily` wrapped in `dynamic(() => import('...'), { ssr: false
  })` — it inits WebGL2 + reads `getComputedStyle(canvas)` at mount
  (`src/screens/Home/SpiderLily/index.tsx:186-210`).
- `src/screens/Memories/components/loadedFullUrls.ts` gets `import
  'client-only'` at the top — its module-level `Set<string>` would
  leak across requests if accidentally pulled into an RSC.
- Gallery `import.meta.env.DEV` (`src/App.tsx:33`) → `process.env.NODE_ENV
  === 'development'`. Grep `src/screens/Gallery/**` for other
  `import.meta` refs (none today — confirmed).
- Delete `vite.config.mts`, `vite-env.d.ts`, `index.html`,
  `src/App.tsx`, `src/index.tsx`, `src/react-app-env.d.ts`,
  `src/index.css` (moved), `vercel.json`, `src/plugins/` (after
  porting helpers).

### Verification

- `bun run dev` renders every route identically (theme toggle,
  sidebar, lily, glitch, mobile menu, lightbox swipe — no scroll
  jump).
- `bun run build` succeeds; `.next/` exists.
- View-source on `/`, `/memories`, `/signals/<id>` shows
  server-rendered HTML (not just `<div id="root">`).
- `curl /signals/feed.xml` returns the same RSS the Vite plugin
  emits today (modulo `lastBuildDate`).
- CI (`.github/workflows/source-quality.yml`) green —
  `bun lint`, `bun run typecheck`, `bun test`, `bun run build`.

### Tasks

- [ ] Add `next` (≥ 15.1), `@tailwindcss/postcss` (≥ 4.1),
      `html-react-parser` to deps. Drop `vite`, `@vitejs/plugin-react`,
      `@tailwindcss/vite`, `wouter`. Keep `react`/`react-dom` 19.
      Update `scripts.dev` → `next dev`, `build` → `next build`,
      `preview` → `next start`.
- [ ] Add `postcss.config.mjs` with `@tailwindcss/postcss` plugin.
- [ ] Add `next.config.ts` (`images.unoptimized: true`,
      `eslint.ignoreDuringBuilds: true`, `src/*` alias). Add
      `next-env.d.ts`.
- [ ] Update `tsconfig.json`: `plugins: [{ name: 'next' }]`, drop
      `vite/client`, add `.next/types/**/*.ts` to `include`.
- [ ] Move `src/index.css` → `app/globals.css`. No rule changes —
      verify `@import url(...)` stays above `@import 'tailwindcss';`.
- [ ] Create `app/layout.tsx` (Server): `<html
      suppressHydrationWarning>` / `<head>` / `<body>`. `<head>`
      contains the inline theme bootstrap `<script>`, font preload
      `<link>` tags, RSS `<link rel="alternate">`. `metadata` exports
      include `metadataBase` and the `index.html:45-60` defaults.
- [ ] Create `src/app-providers.tsx` (`"use client"`) wrapping
      `ThemeProvider`.
- [ ] Create `app/(site)/layout.tsx` rendering ported `RootLayout`
      around `{children}`. Sidebar / scroll container / toggles /
      ScrollReset / ScrollToTop all live here.
- [ ] Port `src/layouts/RootLayout.tsx`: `"use client"`, wouter →
      `next/navigation`. Guard `localStorage` reads (see "What
      changes").
- [ ] Port `src/components/Sidebar`, `ScrollToTop`, `InkCursor`,
      `src/theme/ThemeContext.tsx` to Client Components. wouter →
      `next/link` + `usePathname` where used. Active-route highlight
      (`pathname.startsWith('/memories')`) ports directly.
- [ ] Create `app/(site)/page.tsx` rendering `<HomeScreen />`. Mark
      `HomeScreen`/`MainBanner` as `"use client"`. Wrap `SpiderLily`
      in `dynamic({ ssr: false })`.
- [ ] Rewrite `src/hooks/useJitter.ts` to use `useId()` +
      deterministic hash. Shape:
      ```ts
      const useJitter = (maxMs = 120) => {
        const baseId = useId();
        const i = useRef(0); i.current = 0;
        return () => {
          const h = hash(`${baseId}:${i.current++}`);
          return { animationDelay: `${(h % 1000) / 1000 * maxMs}ms` };
        };
      };
      ```
- [ ] Create `src/lib/content/{signals,fragments,constructs,heroes}.ts`
      (server-only, memoized). Replace `import.meta.glob` with
      `readdirSync` + `readFileSync`. Same exported shape as today's
      `data.ts`.
- [ ] Move `photoUrl()` to `src/lib/photoUrl.ts` (no `server-only`).
- [ ] Add `import 'client-only'` to
      `src/screens/Memories/components/loadedFullUrls.ts`.
- [ ] Port `src/plugins/rss.ts` helpers to `src/lib/rss.ts` (no
      Vite-specific code). Move test to `src/lib/rss.test.ts`.
- [ ] Create `app/(site)/signals/feed.xml/route.ts` exporting `GET`
      that calls `generateFeed()`. `export const dynamic =
      'force-static'` so it bakes at build time.
- [ ] Create page wrappers for every route under `app/(site)/` and
      `app/gallery/`. Each is an RSC that loads via the new content
      lib and renders the existing screen as `"use client"`, passing
      data as props. List of screens to wire up:
      `MemoriesScreen`, `FragmentDetail`, `SignalsScreen`,
      `SignalDetail`, `ConstructsScreen`, `ConstructDetail`,
      `HeroesScreen`, `HeroDetail`, `GalleryScreen`.
- [ ] Replace wouter `useLocation` / `<Link>` in every ported screen
      with `next/navigation` + `next/link`. Replace lightbox
      `navigate(url, { replace: true })` with `router.replace(url, {
      scroll: false })`.
- [ ] Wrap `GalleryScreen` in `dynamic({ ssr: false })` at the
      `app/gallery/[fragmentId]/page.tsx` page wrapper. Replace any
      `import.meta.env.DEV` inside Gallery with `process.env.NODE_ENV
      === 'development'`. `app/gallery/page.tsx` returns `notFound()`
      unless `NODE_ENV === 'development'`.
- [ ] Create `app/not-found.tsx` reusing the "SIGNAL LOST" aesthetic
      from `SignalDetail.tsx`'s not-found branch. Extract to a shared
      `NotFoundScreen` if PRs 2–5 will reuse it.
- [ ] Delete `vite.config.mts`, `vite-env.d.ts`, `index.html`,
      `src/App.tsx`, `src/index.tsx`, `src/react-app-env.d.ts`,
      `vercel.json`. Delete `src/plugins/` after porting RSS.
- [ ] Smoke-test `bun run dev` + `bun run build` + `bun run preview`.
      `bun run lint` / `bun run format` / `bun run typecheck` clean.

---

## PR 2 — Signals: real RSC markdown + per-post metadata

**Goal.** Convert Signals to true server-side markdown rendering and
emit per-post metadata. Drop `react-markdown` from the Signals path.
Introduces `src/lib/markdown.ts` (the shared unified pipeline) that
PRs 4/5 will reuse.

### What changes

- New `src/lib/markdown.ts` exporting `renderMarkdown(body: string):
  Promise<string>` — the `unified()` chain currently duplicated in
  `src/plugins/rss.ts` / `src/lib/rss.ts`.
- New `src/components/MarkdownBody.tsx` (`"use client"`) takes `html:
  string`, walks it via `html-react-parser` to swap `<img>` for
  `<ProgressiveImage>` (preserving the existing
  `-placeholder/-small/-thumb/-full.webp` srcset derivation) and
  external `<a>` for the new-tab wrapper.
- `app/(site)/signals/[id]/page.tsx` becomes a real RSC: looks up
  signal, calls `renderMarkdown(s.body)` server-side, passes HTML
  string + signal metadata to `<SignalDetailView>` (Client).
  `notFound()` if id missing.
- `app/(site)/signals/page.tsx` pre-renders bodies for every signal
  server-side, passes `(Signal & { bodyHtml: string })[]` to
  `<SignalsList>` (Client) — even the list page ships zero markdown
  machinery to the client.
- `generateStaticParams()` returns `{ id }[]` for every signal;
  pages pre-render at build time.
- `generateMetadata({ params })` per detail page: `title`,
  `description: plainExcerpt(body)`, `openGraph` (`type: 'article'`,
  url), `twitter`, `alternates.canonical`.
- `src/lib/rss.ts`'s `generateFeed()` retargets at
  `renderMarkdown()` so RSS and the post page share one pipeline.

### Files touched

- New: `src/lib/markdown.ts`, `src/components/MarkdownBody.tsx`.
- Modified: `app/(site)/signals/page.tsx`,
  `app/(site)/signals/[id]/page.tsx`, the ported Signals screens
  (now consume `bodyHtml`), `src/lib/rss.ts`.
- Deleted: `src/components/SignalsList.tsx`'s react-markdown calls
  (replaced with `<MarkdownBody html={...} />`).

### Tasks

- [ ] Add `src/lib/markdown.ts` with `renderMarkdown()`.
- [ ] Add `src/components/MarkdownBody.tsx` (`"use client"`) using
      `html-react-parser`. Implements `<img>` → `<ProgressiveImage>`
      swap (with the existing srcset / sizes logic) and external
      `<a>` → new-tab wrapper.
- [ ] Convert `app/(site)/signals/[id]/page.tsx` to RSC: pre-render
      body HTML, pass to client view. Export `generateStaticParams`
      + `generateMetadata`.
- [ ] Convert `app/(site)/signals/page.tsx` similarly: pre-render
      every signal body, pass HTML strings down.
- [ ] Refactor `src/lib/rss.ts` to call `renderMarkdown()` instead
      of duplicating the unified chain.
- [ ] Verify footnote rendering. `remark-gfm` emits `<section
      data-footnotes>` with `<sup>` refs + `<ol>`; today the styling
      lives in `index.css` under `.signal-prose section[data-footnotes]`.
      Confirm `html-react-parser` preserves the `data-footnotes`
      attribute and `id`/`href` linking on a known footnote-heavy
      post; diff against the current production HTML in DevTools.
      If attributes drop, tweak the parser config to preserve them.
- [ ] `bun run test` (RSS unit tests pass).
      `bun run lint`/`format`/`typecheck` clean.

---

## PR 3 — Memories: real RSC + per-post metadata

**Goal.** Convert Memories to true RSC + per-fragment metadata.
(Lightbox URL fix and `loadedFullUrls` client-only guard already
land in PR 1.)

### Tasks

- [ ] Convert `app/(site)/memories/page.tsx`,
      `app/(site)/memories/[id]/page.tsx`,
      `app/(site)/memories/[id]/[photo]/page.tsx` to true RSCs that
      delegate to `<FragmentDetailView>` (Client). Pages already
      load data in PR 1; this PR adds `generateStaticParams` for
      `[id]` and `[id]/[photo]` plus `generateMetadata` for `[id]`
      (cover image as `og:image`, title, location).
- [ ] Confirm `notFound()` is called when an `id` (or `(id, photo)`
      pair) doesn't resolve.
- [ ] Manual test on `/memories`, `/memories/japan-2024`,
      `/memories/japan-2024/DSCF0839`: navigation, lightbox open from
      direct URL, swipe (touch + keyboard), placeholder fades,
      masonry layout unchanged, no scroll jumps on swipe.
- [ ] `bun run lint`/`format`/`typecheck` clean.

---

## PR 4 — Constructs: real RSC markdown + per-post metadata

**Goal.** Same shape as PR 2 against Constructs. Reuses
`src/lib/markdown.ts` + `src/components/MarkdownBody.tsx` from PR 2.

### Tasks

- [ ] Convert `app/(site)/constructs/page.tsx` and `[id]/page.tsx`
      to true RSCs that pre-render bodies and pass HTML to Client
      views. Reuse `MarkdownBody` from PR 2.
- [ ] Add `generateStaticParams` + `generateMetadata` for `[id]`.
- [ ] `bun run lint`/`format`/`typecheck` clean.

---

## PR 5 — Heroes: real RSC markdown + per-post metadata

**Goal.** Mirror of PR 4 against Heroes. After this PR, `react-markdown`
has no remaining consumers — drop it from `package.json`.

### Tasks

- [ ] Convert `app/(site)/heroes/page.tsx` and `[id]/page.tsx` to
      true RSCs. Reuse `MarkdownBody` from PR 2.
- [ ] Add `generateStaticParams` + `generateMetadata` for `[id]`.
- [ ] Grep for any remaining `react-markdown` imports; drop the dep
      from `package.json` if none. `bun install` to update
      `bun.lock`.
- [ ] `bun run lint`/`format`/`typecheck` clean.

---

## PR 6 — Sitemap + robots

**Goal.** Auto-generate `/sitemap.xml` and `/robots.txt` from the
content loaders.

### Tasks

- [ ] Add `app/sitemap.ts` exporting the default async function that
      returns static routes plus every detail route, with
      `lastModified` from the markdown file mtime or frontmatter
      date.
- [ ] Add `app/robots.ts` exporting `{ rules: [{ userAgent: '*',
      allow: '/' }], sitemap: 'https://jasonwu.ink/sitemap.xml' }`.
      Delete `public/robots.txt`.
- [ ] Submit the sitemap to Google Search Console manually after
      deploy.

---

## PR 7 — JSON-LD structured data

**Goal.** Add `BlogPosting` JSON-LD to signals and `ImageObject` to
memories. Audit existing `generateMetadata` implementations.

### Tasks

- [ ] Audit `generateMetadata` from PRs 2–5 against OG / Twitter
      card / canonical / `robots` checklist. Backfill gaps.
- [ ] Add `BlogPosting` JSON-LD `<script type="application/ld+json">`
      to `/signals/[id]` (`headline`, `datePublished`, `author`,
      `url`).
- [ ] Add `ImageObject` JSON-LD to `/memories/[id]` cover.
- [ ] Confirm `metadataBase` set in `app/layout.tsx` (lands in
      PR 1); without it relative OG image URLs break on preview
      deploys.
- [ ] Share-debugger spot-checks: Twitter card validator, Facebook
      OG debugger, LinkedIn post inspector for one signal, fragment,
      construct, hero.

---

## PR 8 — `next/image` rollout

**Goal.** Adopt `next/image` where automatic responsive variants +
AVIF + lazy/priority handling outweigh the bespoke 20 px placeholder
aesthetic.

Where `next/image` wins: index thumbnails, hero crops, Heroes
avatars, Construct hero images. Where `ProgressiveImage` stays:
Memories masonry tiles, Signals markdown body images (the 20 px
placeholder is the brand on those surfaces).

Sequence as sub-PRs:

### Tasks

- [ ] Sub-PR a: flip `next.config.ts` `images.unoptimized` to
      `false`. Add `images.formats: ['image/avif', 'image/webp']`.
      Verify `ProgressiveImage` still works (it uses raw `<img>` and
      bypasses Next's pipeline — should be unaffected).
- [ ] Sub-PR b: Heroes index avatars → `<Image>`.
- [ ] Sub-PR c: Constructs index cards → `<Image>`.
- [ ] Sub-PR d: Construct detail hero image → `<Image priority>`.
- [ ] Measure: `du -sh .next/cache/images` after deploy; byte-saved
      per surface from the Network panel (DPR 2 mobile profile).

---

## PR 9 — Dynamic per-post OG images

**Goal.** Auto-generate per-signal OG cards. Stop reusing the
generic `og-image.png` for every share.

### Tasks

- [ ] Design the OG card in JSX (white-on-black, geist-mono, pixel
      title, mono timestamp / location — mirror the `SignalDetail`
      header).
- [ ] `app/(site)/signals/[id]/opengraph-image.tsx` returns `new
      ImageResponse(...)`. Same for
      `app/(site)/memories/[id]/opengraph-image.tsx` (cover image +
      title + location).
- [ ] Validate via Twitter card validator + Facebook OG debugger.

---

## Risks / open questions

- **`bunfig.toml` `minimumReleaseAge = 604800` (7 days)** will
  occasionally block Next.js patch installs — including security
  patches, exactly when you don't want a cooldown. Pin specific
  versions or add a `minimumReleaseAge` exception for `next` when a
  fresh patch is urgent.
- **`html-react-parser` footnote attribute preservation**. PR 2
  needs to verify `remark-gfm`'s `<section data-footnotes>` /
  `<sup>` ref / `<ol>` structure survives the parse → React walk
  without losing `data-footnotes` or `id`/`href` linkage. Diff
  against current production HTML on a footnote-heavy post; if
  attributes drop, tweak the parser config.
- **`useId()` value stability across React 19 + Next 15**. The
  `useJitter` fix assumes `useId()` is deterministic between server
  render and client hydration. This is the documented behavior; any
  regression would surface as a visible glitch on first paint, not
  silently. Easy to verify in PR 1's smoke test.
- **Hydration mismatch surface area in PR 1**. We catch the known
  cases (`useJitter`, `RootLayout` `localStorage`, `SpiderLily` →
  `dynamic({ssr: false})`), but every Client screen now SSR-renders
  for the first time. Likely fallout: an unguarded `window.` /
  `document.` reference at module scope, or another lazy `useState`
  initializer reading browser-only state. Mitigation: run PR 1
  locally with the browser console open, fix each hydration warning
  as it surfaces. Treat the first deploy as a probe; the substrate
  swap is reversible by reverting the PR.
- **Build-time content walks.** Each loader is called multiple
  times per route at build (`generateStaticParams` +
  `generateMetadata` + page render). Module-level memoization in PR
  1's loaders closes the gap; verify under `bun run build` that the
  filesystem walks happen once per loader.
- **`bun:test` import in `src/lib/rss.test.ts`**. Bun-only test;
  Next's build ignores `*.test.ts` by default so no exclude needed.
