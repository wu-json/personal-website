---
status: ready
---

# Migrate jasonwu.ink from Vite SPA to Next.js (App Router)

The site has quietly turned into a blog. Signals is the highest-frequency
surface; Memories and Constructs publish less often but they're long-form
and image-heavy. The current shape — a single Vite-built React SPA on
Vercel with a SPA-fallback rewrite — was right when this was a portfolio
toy and is wrong now:

- Every route ships the same JS shell, hydrates client-side, then reads
  markdown content out of `import.meta.glob(..., { eager: true })`
  bundles. Even after the route-level code splitting in
  `2026-04-25-performance-improvements.md`, the markdown for **every**
  signal/fragment/construct/hero is bundled into a chunk that loads as
  soon as the relevant route is visited. There's no per-post HTML for
  crawlers, no per-post `<title>` / `<meta>`, no per-post OG image.
- Google indexes us as one page (`Jason Cui Wu — Paint the world in
  ink.`). Social previews are the same `og-image.png` for every link.
  This is the SEO regression we accepted when we picked SPA; it's no
  longer acceptable now that posts are the point.
- Images are pipelined manually (`scripts/optimize-photos.ts` emits
  `placeholder` / `small` / `thumb` / `full` `.webp`) and rendered via a
  bespoke `ProgressiveImage`. Most of that work duplicates what
  `next/image` does for free (responsive variants, AVIF negotiation,
  lazy + priority hints, blur placeholders). We keep the bespoke pipe
  where the aesthetic matters and let Next handle the long tail.

The right destination is **Next.js 15 (App Router) with React Server
Components and per-route static rendering**. Content pages render to
HTML at build time, ship near-zero JS for the reading surface, and gain
real per-page metadata. Client islands (Gallery, Lightbox, theme,
sidebar) keep working as Client Components.

## Goals

- **SEO parity with a real blog**: per-post `<title>` / `<meta
  description>` / OG / Twitter card / canonical / JSON-LD. Crawlable
  HTML for every signal, fragment, construct, and hero with no JS
  required.
- **Per-route bundle sized to the route**. The home page should ship
  ~0 KB of markdown machinery; signal detail pages should ship the
  markdown renderer but no Gallery / Memories code.
- **Image story consistent with the rest of the framework**. Adopt
  `next/image` where the bespoke 20 px CSS-background placeholder isn't
  load-bearing; keep `ProgressiveImage` for the masonry / signals
  surfaces where the brand depends on it.
- **No visual regression on any existing surface**. Theme bootstrap (no
  flash), sidebar collapse, ink cursor, SpiderLily, Gallery R3F scene,
  Lightbox swipe — all behaviorally identical.
- **Preserve the content authoring loop**. Existing `.agents/skills/`
  (`add-fragment`, `add-signal`, `add-construct`) keep working; markdown
  files stay in their current locations so git history is preserved.

## Non-goals

- **Rewriting any content** (signals, fragments, constructs, heroes).
  Migration is structural only.
- **Changing the image source pipeline** (`scripts/optimize-photos.ts`,
  the four `.webp` variants). `next/image` adoption in PR 9 layers on
  top of the existing variants.
- **MDX**. Posts stay plain markdown + frontmatter. We do not gain JSX
  in posts and don't need it.
- **CMS / headless backend**. Files on disk remain the source of truth.
- **Replacing Tailwind v4, oxlint, oxfmt, tsgo, prek, or Bun**. All of
  those carry over.
- **Migrating off Vercel**. Vercel's Next.js integration is the target
  deploy substrate.

## Why now / why Next.js specifically

- **App Router + RSC** is the modern Next.js paradigm and the one that
  matches static-content blogs cleanly: per-route static rendering by
  default, server-side markdown rendering with zero hydration cost,
  Client Components opt-in only where interactivity actually lives.
- **Vercel** is already our deploy target. Their Next.js path is the
  best-trodden (image CDN, edge functions, ISR primitives). Bun keeps
  working too — Vercel's default flow installs with Bun (autodetected
  from `bun.lock`) and runs the build under Node, which is exactly
  what `next build` expects.
- **The `unified` markdown pipeline already in the repo** (`src/plugins/rss.ts`
  uses `remark-parse` + `remark-gfm` + `remark-rehype` + `rehype-raw` +
  `rehype-stringify`) is the path we'll generalize. We drop
  `react-markdown` entirely and render markdown → HTML string in a
  Server Component, then pass that string to a thin Client wrapper
  that uses `html-react-parser` to swap `<img>` for `<ProgressiveImage>`
  and external `<a>` for the new-tab wrapper. Zero markdown/remark/rehype
  bytes ship to the client. (Why not keep `react-markdown` v10?
  Passing a `components` map with a Client Component as `img` across
  the RSC boundary requires a function prop, which isn't serializable;
  you'd have to mark the whole renderer `"use client"` and ship the
  whole markdown stack — defeating the migration's primary win.)
- **Tailwind v4** has a first-class Next.js setup via `@tailwindcss/postcss`
  + `postcss.config.mjs`; the existing `src/index.css` becomes
  `app/globals.css` with no rule changes (the file already imports
  Google Fonts above `@import 'tailwindcss';`, which Tailwind v4
  requires — `@import url(...)` after the Tailwind import is silently
  dropped in v4). Tailwind ≥ 4.1 + Next ≥ 15.1 is the version floor
  that works under Turbopack.

## Migration strategy: long-lived branch + parallel route PRs

The honest constraint: this is a single-author personal site without a
staging deploy, and a Next.js cutover can't be incremental on `main` —
the project either renders via Vite or via Next.js, not both. Trying to
keep both alive simultaneously costs more than it saves.

So:

- **Phase 0** (this doc) lives on `docs/nextjs-migration-plan` and
  merges normally to `main` before any code moves.
- **Phase 1–6** happen on a long-lived `migration/nextjs` branch
  created off `main`. Each phase below is a separate PR **targeting
  that branch**, not `main`. Production keeps shipping from `main`
  while the migration cooks.
- **Phase 1** lands first on the branch (foundation: Next scaffold,
  root layout, home, plus the shared `src/lib/markdown.ts` helper
  that Phases 2/4/5 need). Routes other than `/` return 404.
- **Phases 2–5** (Signals, Memories, Constructs, Heroes) can be
  delegated to agents **in parallel** once Phase 1 lands. Their
  files don't overlap (different `app/(site)/*` subtrees, different
  `src/lib/content/*.ts` modules, different ports under
  `src/components/`). The one shared file each touches is
  `package.json` (each adds nothing more) — easy merge.
- **Phase 6** (Gallery) depends on `src/lib/content/fragments.ts`
  from Phase 3. If Phase 3 has landed, import from there. Otherwise
  the Phase 6 PR can ship with a tiny inlined loader and a TODO to
  switch to the shared one — small enough that either order works.
- When Phase 6 is in and every route works at parity, we merge
  `migration/nextjs` → `main` as a single squash commit and cut over.
- **Phase 7+** are post-migration enhancement PRs off `main` (per-route
  metadata, sitemap, dynamic OG, `next/image` rollout). Each ships on
  its own.

Each PR ends with a **Tasks** checklist of atomic, delegate-ready work
items. A phase is done when all its boxes are checked.

## Phase 1 — Next.js scaffold, root layout, home page _(foundation)_

**Target branch:** `migration/nextjs` (created off `main` as part of
this PR).

**Goal.** Get the new Next.js shell rendering the home page exactly as
today, with the theme bootstrap, fonts, sidebar, and all chrome intact.
Every other route is a placeholder (`notFound()`) that subsequent PRs
will fill in.

**What changes.**

- Add Next.js 15 (≥ 15.1) + `@tailwindcss/postcss` (≥ 4.1). Drop
  `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `react-markdown`,
  `wouter`. Add `html-react-parser` (the client-side HTML → React
  walker that swaps `<img>` / external `<a>` after server-side markdown
  rendering).
- New `app/` tree:
  ```
  app/
  ├── layout.tsx          # <html>, <body>, fonts, theme bootstrap, providers
  ├── globals.css         # moved from src/index.css
  ├── not-found.tsx       # 404 (matches the "SIGNAL LOST" aesthetic)
  ├── (site)/
  │   ├── layout.tsx      # RootLayout (sidebar + main scroll container)
  │   └── page.tsx        # HomeScreen
  └── gallery/
      └── layout.tsx      # bare standalone layout (no sidebar)
  ```
  Route groups (`(site)`) keep `/` on the sidebar-wrapped layout while
  reserving `/gallery/...` for the bare layout — same split that
  `src/App.tsx` enforces today via the outer wouter `<Switch>`.
- `next.config.ts` with `output: undefined` (Vercel docs recommend
  leaving `output` unset; `standalone` is for self-hosting/Docker and
  redundant on Vercel), `images.unoptimized: true` at first so the
  bespoke pipeline is untouched (Phase 9 flips this), alias for
  `src/*` matching the existing tsconfig path,
  `eslint.ignoreDuringBuilds: true` so Next's built-in ESLint scaffold
  doesn't fight oxlint.
- `postcss.config.mjs` with the single plugin:
  ```js
  export default { plugins: { '@tailwindcss/postcss': {} } }
  ```
  No `tailwind.config.js` — Tailwind v4 is CSS-first, the existing
  `@theme` block in `globals.css` covers all token config.
- Inline theme bootstrap is a `<script dangerouslySetInnerHTML>`
  rendered directly in `<head>` JSX inside `app/layout.tsx` — **not**
  `next/script` with `strategy="beforeInteractive"` (in App Router,
  `beforeInteractive` runs after body paint, defeating the whole
  point). The script body is identical to today's `index.html`
  bootstrap (URL param → localStorage → default `light`, sets
  `data-theme` on `<html>`). Add `suppressHydrationWarning` on the
  `<html>` element to silence the warning that the inline script
  mutates `data-theme` before React hydrates — this is the documented
  escape hatch for exactly this pattern.
- Fonts: `@fontsource-variable/geist` + `geist-mono` keep working
  (they're plain CSS imports in `globals.css`). The pixel font and
  geist subset preload links from `index.html` become `<link
  rel="preload" href="..." as="font" type="font/woff2" crossOrigin="">`
  tags rendered directly in `<head>` JSX from `app/layout.tsx` (Next
  15's metadata API exposes `icons`/`other` but no first-class
  `preload` field — JSX `<link>` is the supported path).
- `wouter` removed from deps. Swaps: `<Link from='wouter'>` →
  `<Link from='next/link'>`; `useLocation()` (returns `[pathname,
  navigate]` tuple) → `usePathname()` + `useRouter()` from
  `next/navigation` (object with `.push()` / `.replace()` / `.back()`).
  The lightbox in Memories navigates via `navigate(url, { replace: true })`
  today (`FragmentDetail.tsx:140`); under Next that's `router.replace(url)`.
  Files affected in Phase 1: `Sidebar`, `MenuToggle`, `RootLayout`,
  `ScrollToTop`, `ScrollReset`. (`ThemeContext` doesn't actually
  import from wouter — only reads URL params via `window.location`.)
- `RootLayout` ports as a Client Component (it owns sidebar collapse
  state, mobile menu state, `localStorage` reads). `ScrollReset`
  becomes a Client Component that subscribes to `usePathname()` and
  resets the parent `<main>` scroll position.
- Hosts an interim "coming soon" page for routes 2–6 so the agents
  working on them can run their PR locally against the merged scaffold.
  Implementation: each unmigrated route under `app/(site)/` either
  doesn't exist (404) or renders a one-liner placeholder. Both options
  are fine — pick whichever produces a smaller PR diff.

**Vercel.**
- Delete `vercel.json` outright. Its `rewrites: [{ source: '/(.*)',
  destination: '/index.html' }]` is the SPA-fallback we needed for
  Vite; under Next it would intercept Next's own routes and break
  every page and route handler. Vercel auto-detects the Next.js
  framework from `package.json`; no config file is required.
- Default Vercel build flow stays right: install via Bun (autodetected
  from `bun.lock`), build under Node. No `"bunVersion"` pin needed —
  the Bun runtime is still beta as of mid-2026 and offers no win for
  a static-content site.

**CI.**
- `.github/workflows/source-quality.yml` runs `bun lint`,
  `bun run typecheck`, `bun test`, `bun run build` — all of these
  continue working unchanged since the scripts in `package.json` are
  what's invoked. `bun run build` now runs `next build` instead of
  `vite build`.

**Files touched (Phase 1).**
- New: `app/layout.tsx`, `app/(site)/layout.tsx`,
  `app/(site)/page.tsx`, `app/gallery/layout.tsx`, `app/globals.css`,
  `app/not-found.tsx`, `next.config.ts`, `next-env.d.ts`,
  `postcss.config.mjs`, `src/app-providers.tsx`, `src/lib/markdown.ts`.
- Modified: `package.json` (deps + scripts), `tsconfig.json` (paths +
  Next.js types, drop `vite/client`), `src/hooks/useJitter.ts`
  (`useId`-based deterministic seed).
- Deleted: `vite.config.mts`, `vite-env.d.ts`,
  `src/react-app-env.d.ts`, `src/App.tsx`, `src/index.tsx`,
  `src/index.css` (moved to `app/globals.css`), `index.html`,
  `vercel.json`. **Note**: `src/plugins/rss.ts` + its test stay in
  Phase 1; Phase 2 deletes them (along with `src/plugins/` once
  empty) when porting RSS into `src/lib/rss.ts`.
- Ported: `src/layouts/RootLayout.tsx` (now Client Component imported
  by `app/(site)/layout.tsx`), `src/screens/Home/**` (now imported
  by `app/(site)/page.tsx`), `src/components/Sidebar`, `InkCursor`,
  `ScrollToTop`, `src/theme/ThemeContext.tsx`.

**Verification.**
- `bun run dev` (`next dev`) opens to `/` and renders identically to
  today — sidebar in/out, theme toggle, lily animation, glitch text,
  fonts loaded, no FOUC.
- `bun run build` succeeds; `.next/` output exists.
- View-source on `/` shows the home page HTML rendered server-side
  (not just `<div id="root">`).
- Lighthouse on `/` (mobile profile) doesn't regress vs current Vite
  build.

**Tasks.**

- [ ] Create `migration/nextjs` branch off `main`. All subsequent
      Phase 1–6 PRs target this branch.
- [ ] Add `next` (≥ 15.1), `@tailwindcss/postcss` (≥ 4.1),
      `html-react-parser` to `dependencies`. Drop `vite`,
      `@vitejs/plugin-react`, `@tailwindcss/vite`, `wouter`,
      `react-markdown`. Update `scripts.dev` → `next dev`,
      `scripts.build` → `next build`, `scripts.preview` → `next start`.
      (Keep `react@19` / `react-dom@19` — Next 15 supports them.)
- [ ] Add `postcss.config.mjs`:
      `export default { plugins: { '@tailwindcss/postcss': {} } }`.
- [ ] Add `next.config.ts` with: `images.unoptimized: true`,
      `eslint.ignoreDuringBuilds: true` (we use oxlint, not ESLint),
      `output: undefined` (Vercel-recommended), `webpack` alias for
      `src/*` matching the existing tsconfig path (`turbopack.resolveAlias`
      additionally if `next dev --turbopack` is the default — confirm
      at scaffold time).
- [ ] Update `tsconfig.json`: add `plugins: [{ name: "next" }]`, drop
      `vite/client` from types (replace with the Next-generated
      `next-env.d.ts`), add `**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts`
      to `include`. Keep the `src/*` path alias.
- [ ] Move `src/index.css` → `app/globals.css`. No rule changes needed
      — Tailwind v4 directives (`@import 'tailwindcss';`,
      `@custom-variant`, `@theme`, `@layer base { @apply ... }`)
      all work under `@tailwindcss/postcss`. Verify the
      `@import url('https://fonts.googleapis.com/...')` on line 1
      stays **above** `@import 'tailwindcss';` (Tailwind v4 silently
      drops url-imports placed after).
- [ ] Create `app/layout.tsx` (Server Component): renders `<html
      lang="en" suppressHydrationWarning>` / `<head>` / `<body>`. In
      `<head>` emit the inline theme bootstrap as `<script
      dangerouslySetInnerHTML={{__html: BOOTSTRAP}}>` (script body
      copied from `index.html`); emit the existing font-preload
      `<link>`s as JSX (`<link rel="preload" href="/fonts/..."
      as="font" type="font/woff2" crossOrigin="" />`); emit `<link
      rel="alternate" type="application/rss+xml" title="Jason Wu —
      Signals" href="/signals/feed.xml" />`. Mount the new
      `<Providers>` Client Component wrapping `{children}`.
- [ ] Export `metadata` from `app/layout.tsx` with `metadataBase: new
      URL('https://jasonwu.ink')`, default `title`, `description`,
      and the existing OG / Twitter card defaults from
      `index.html:45-60`. (Per-route `generateMetadata` in Phase 7
      will override.)
- [ ] Create `src/app-providers.tsx` Client Component exporting
      `<Providers>` that mounts `ThemeProvider` (the only root
      provider today).
- [ ] Create `app/(site)/layout.tsx` rendering the ported `RootLayout`
      (Client Component) around `{children}`. Sidebar, scroll
      container, menu toggles, ScrollReset, ScrollToTop all live here.
- [ ] Port `src/layouts/RootLayout.tsx` to Next: add `"use client"`,
      replace `useLocation` from wouter with `usePathname` from
      `next/navigation`. Keep all existing state / effects intact.
      Note `localStorage.getItem('sidebarCollapsed')` runs lazy via
      `useState(() => ...)` today; that lazy initializer runs on the
      server too, where `localStorage` is undefined. Wrap with a
      `typeof window === 'undefined' ? false : ...` guard so SSR
      defaults to expanded; the post-hydration `useEffect` (none
      today — add one) reads the real value. Without the guard, SSR
      crashes.
- [ ] Port `src/components/Sidebar/index.tsx`: `"use client"`, swap
      wouter `<Link>` for `next/link`, swap `useLocation` for
      `usePathname`. Verify active-route highlight still works (the
      `pathname.startsWith('/memories')` checks port directly).
- [ ] Port `src/components/ScrollToTop.tsx`, `src/components/InkCursor`,
      `src/theme/ThemeContext.tsx` as Client Components. `InkCursor`
      attaches `document.addEventListener('mousemove' / 'mouseleave')`;
      `ThemeContext.readInitialTheme()` reads
      `document.documentElement.getAttribute('data-theme')` — that's
      now meaningful (the bootstrap script in `<head>` has already
      run) instead of defensive.
- [ ] Create `app/(site)/page.tsx` rendering `HomeScreen`. Mark
      `HomeScreen`, `SpiderLily`, `MainBanner` as `"use client"`.
      Wrap `SpiderLily` in `dynamic(() => import('...'), { ssr: false
      })` because it initializes WebGL2 at mount (`getContext('webgl2',
      ...)`, `getComputedStyle(canvas)` to read theme colors —
      `SpiderLily/index.tsx:186-210`) and SSR'ing the `<canvas>`
      element with zero benefit is pure cost.
- [ ] Rewrite `useJitter` to use `useId()` + a deterministic string
      hash instead of `Math.random()`. The current `Math.random()`-on-
      first-call pattern mismatches between SSR and client. New shape:
      ```ts
      const useJitter = (maxMs = 120) => {
        const baseId = useId();
        const i = useRef(0); i.current = 0;
        return () => {
          const slot = i.current++;
          const h = hash(`${baseId}:${slot}`);  // any 32-bit hash
          return { animationDelay: `${(h % 1000) / 1000 * maxMs}ms` };
        };
      };
      ```
      `useId()` returns the same value on server and client, so the
      derived delays match — no hydration warning, no FOUC, no
      visual change vs today's pseudo-random spread.
- [ ] Add `src/lib/markdown.ts` exporting an async
      `renderMarkdown(body: string): Promise<string>` that runs the
      `unified()` pipeline (`remark-parse` + `remark-gfm` +
      `remark-rehype` with `allowDangerousHtml: true` + `rehype-raw`
      + `rehype-stringify`). This is the same pipeline currently
      duplicated in `src/plugins/rss.ts`; Phase 2 retargets the RSS
      route handler at it and Phases 4/5 reuse it for Constructs /
      Heroes detail pages.
- [ ] Create `app/gallery/layout.tsx` as the bare standalone layout
      (no sidebar, no max-width, no padding) so Phase 6 can drop in
      `app/gallery/[fragmentId]/page.tsx` without rework.
- [ ] Create `app/not-found.tsx` using the existing "SIGNAL LOST"
      aesthetic from `SignalDetail.tsx`'s not-found branch (extract
      to a shared `NotFoundScreen` component if it'll be reused by
      `notFound()` calls in Phases 2–5).
- [ ] Delete `vite.config.mts`, `vite-env.d.ts`, `index.html`,
      `src/App.tsx`, `src/index.tsx`, `src/react-app-env.d.ts`. Leave
      `src/plugins/rss.ts` + its test in place — Phase 2 deletes them
      after porting the helpers into `src/lib/rss.ts`.
- [ ] Delete `vercel.json`. Vercel autodetects Next.js; the existing
      SPA-rewrite would intercept Next routes and break everything.
- [ ] Smoke-test `bun run dev`: home page renders identically (theme
      toggle, sidebar, lily, glitch, mobile menu). View-source
      confirms server-rendered HTML.
- [ ] Smoke-test `bun run build` + `bun run preview`. No Vite-specific
      tooling left in the build path.
- [ ] `bun run lint` + `bun run format` + `bun run typecheck` clean.

## Phase 2 — Signals (markdown blog + RSS) _(parallelizable after Phase 1)_

**Target branch:** `migration/nextjs`.

**Goal.** Port `/signals` and `/signals/[id]` to App Router with static
rendering. Re-implement RSS as a route handler. The signals MarkdownBody
runs in RSC — server-rendered HTML for every post, zero markdown JS in
the client bundle for the reader.

**What changes.**

- New routes:
  ```
  app/(site)/signals/
  ├── page.tsx                  # SignalsScreen (list)
  ├── [id]/page.tsx             # SignalDetail
  └── feed.xml/route.ts         # RSS — replaces src/plugins/rss.ts
  ```
- Content loading moves from `import.meta.glob` to filesystem reads.
  New `src/lib/content/signals.ts` (Server-only — add `import
  'server-only'` at top) exports the same `signals: Signal[]` shape
  that `src/screens/Signals/data.ts` exports today, but reads from
  `src/screens/Signals/entries/*.md` via `node:fs.readdirSync` +
  `readFileSync`. The custom timestamp format
  (`'YYYY.MM.DD // HH:MM:SS'`) keeps the existing parser in
  `parseRssTimestamp()`.
- `SignalsScreen` is split:
  - The page (`app/(site)/signals/page.tsx`) is an RSC that calls
    `getSignals()` and passes the data to a Client Component
    `<SignalsList>` for the infinite-scroll behavior.
  - `<SignalsList>` keeps the existing `useInfiniteList` +
    `CullableBody` + `IntersectionObserver` machinery (Client only).
- **Markdown rendering**: server renders to HTML string, client walks
  HTML to swap `<img>` / external `<a>`. Concretely:
  - `app/(site)/signals/[id]/page.tsx` (RSC) calls
    `await renderMarkdown(s.body)` from `src/lib/markdown.ts` (added
    in Phase 1) → HTML string.
  - The page passes that string to `<MarkdownBody html={html} />`
    (Client Component). The string is fully serializable across the
    RSC boundary; no function props cross.
  - `MarkdownBody` uses `html-react-parser`'s `replace` option to
    intercept `<img>` (return `<ProgressiveImage>` with the existing
    `-placeholder/-small/-thumb/-full.webp` srcset logic) and
    external `<a>` (return `<a target="_blank"
    rel="noopener noreferrer">`). Everything else (paragraphs,
    headings, footnotes, tables) passes through as plain React
    elements.
  - Net result: **zero** `react-markdown` / `remark-*` / `rehype-*`
    bytes in the client bundle. `html-react-parser` weighs ~13 kB
    gz — replacing the ~80–120 kB gz `react-markdown` stack we
    currently ship.
- `generateStaticParams` for `[id]` returns every signal id; pages
  pre-render at build time. `revalidate` is unset (fully static).
- `generateMetadata` for `[id]` emits `<title>`, `<meta
  name="description">` (via `plainExcerpt()` from `lib/rss.ts`),
  `og:title`, `og:description`, `og:type='article'`, `og:url`, and
  canonical link.
- RSS route handler: `app/(site)/signals/feed.xml/route.ts` exports
  `GET` that returns `new Response(xmlString, { headers: { 'Content-Type':
  'application/rss+xml; charset=utf-8' } })`. The body is the same
  XML the Vite plugin emits today; refactor `generateFeed()` from
  `src/plugins/rss.ts` into `src/lib/rss.ts`, retargeting it at
  `renderMarkdown()` from `src/lib/markdown.ts` so RSS and the post
  page share one unified pipeline (today they're duplicated).
- `src/plugins/rss.test.ts` ports to `src/lib/rss.test.ts` testing
  the same helpers (`escapeXml`, `plainExcerpt`, `styleImages`,
  `stripFirstImage`, `parseRssTimestamp`).

**Files touched (Phase 2).**
- New: `app/(site)/signals/page.tsx`,
  `app/(site)/signals/[id]/page.tsx`,
  `app/(site)/signals/feed.xml/route.ts`,
  `src/lib/content/signals.ts`,
  `src/lib/rss.ts` (extracted from `src/plugins/rss.ts`,
  retargeted at `src/lib/markdown.ts`),
  `src/lib/rss.test.ts` (renamed from `src/plugins/rss.test.ts`),
  `src/components/MarkdownBody.tsx` (Client, takes `html: string`,
  uses `html-react-parser`).
- Ported: `src/screens/Signals/index.tsx` →
  `src/components/SignalsList.tsx` (Client),
  `src/screens/Signals/SignalDetail.tsx` →
  `src/components/SignalDetail.tsx` (Server Component skeleton + a
  thin `<JitterHeader>` Client wrapper for the bio-glitch header,
  body delegates to `<MarkdownBody>`).
- Deleted: `src/plugins/rss.ts`, `src/plugins/rss.test.ts`,
  `src/screens/Signals/data.ts`,
  `src/screens/Signals/MarkdownBody.tsx` (replaced),
  `src/screens/Signals/index.tsx`,
  `src/screens/Signals/SignalDetail.tsx`. Markdown content under
  `src/screens/Signals/entries/` stays put.

**Verification.**
- `bun run dev`: `/signals` matches today (infinite scroll, jitter,
  collapsed previews, footnote refs). `/signals/<id>` matches today
  (footnotes block at bottom, `bio-glitch` header, jitter).
- `curl http://localhost:3000/signals/feed.xml` returns RSS identical
  to the current production feed (modulo `lastBuildDate`). The same
  `bun run test` covers `escapeXml` / `plainExcerpt` / `styleImages` /
  `stripFirstImage`.
- `bun run build`: every signal under `[id]/` pre-renders to HTML.
  View-source on a built page shows the post body rendered.

**Tasks.**

- [ ] Create `src/lib/content/signals.ts` (server-only). Add
      `import 'server-only'`. Replace `import.meta.glob` with
      `readdirSync(join(process.cwd(), 'src/screens/Signals/entries'))`
      + per-file `readFileSync`. Keep the `parseFrontmatter` /
      `signals: Signal[]` shape identical to today's `data.ts`.
      Memoize with a module-level `let cached: Signal[] | undefined`
      so `next build` doesn't re-walk the directory once per
      `generateStaticParams` + `generateMetadata` + page call.
- [ ] Extract `escapeXml`, `plainExcerpt`, `styleImages`,
      `stripFirstImage`, `parseRssTimestamp`, `BASE_URL`,
      `ENTRIES_DIR`, and `generateFeed()` from `src/plugins/rss.ts`
      into `src/lib/rss.ts`. Retarget `generateFeed()` to call
      `renderMarkdown()` from `src/lib/markdown.ts` (added in
      Phase 1) instead of duplicating the `unified()` chain.
- [ ] Port `src/plugins/rss.test.ts` → `src/lib/rss.test.ts` (same
      tests, updated imports).
- [ ] Create `app/(site)/signals/feed.xml/route.ts` exporting `GET`
      that calls `generateFeed()` and returns a `Response` with
      `Content-Type: application/rss+xml; charset=utf-8`. Export
      `export const dynamic = 'force-static'` so the feed bakes at
      build time.
- [ ] Create `app/(site)/signals/page.tsx` as an RSC. Import
      `getSignals()` from `src/lib/content/signals.ts`, render the
      page chrome server-side, and hand the array to a new
      `<SignalsList>` Client Component for the
      `useInfiniteList` / `CullableBody` interactivity. Note that
      `<SignalsList>` consumes the markdown body per row — pre-render
      each body to HTML server-side and pass the HTML string array
      down so even the list page ships no markdown machinery client-
      side.
- [ ] Create `src/components/SignalsList.tsx` (`"use client"`) that
      owns the existing infinite-list state previously in
      `src/screens/Signals/index.tsx`. The server passes
      `signals: (Signal & { bodyHtml: string })[]`; the client
      paginates locally and renders each body via `<MarkdownBody
      html={...}>`.
- [ ] Create `app/(site)/signals/[id]/page.tsx` as an RSC. Call
      `getSignals()`, look up the entry by `params.id`,
      `notFound()` if missing. Export `generateStaticParams()`
      returning `{ id }[]` for every signal. Export
      `generateMetadata({ params })` emitting per-post `title`,
      `description: plainExcerpt(body)`, full `openGraph` /
      `twitter` blocks, `alternates.canonical: '/signals/' + id`.
- [ ] Create `src/components/MarkdownBody.tsx` (`"use client"`):
      ```tsx
      'use client';
      import parse, { domToReact } from 'html-react-parser';
      import { ProgressiveImage } from './ProgressiveImage';

      export const MarkdownBody = ({ html }: { html: string }) =>
        parse(html, {
          replace: (node) => {
            if (node.type === 'tag' && node.name === 'img') {
              const { src, alt, width, height } = node.attribs;
              if (!src || !width || !height) return;
              const ph = src.replace(/-full\.webp$/, '-placeholder.webp');
              const sm = src.replace(/-full\.webp$/, '-small.webp');
              const th = src.replace(/-full\.webp$/, '-thumb.webp');
              return (
                <ProgressiveImage
                  placeholderSrc={ph}
                  src={th}
                  srcSet={`${sm} 480w, ${th} 800w, ${src} 1600w`}
                  sizes='(min-width: 768px) 672px, 100vw'
                  alt={alt ?? ''}
                  width={Number(width)}
                  height={Number(height)}
                  className='construct-body-img'
                />
              );
            }
            if (node.type === 'tag' && node.name === 'a' &&
                node.attribs.href?.startsWith('http')) {
              return (
                <a href={node.attribs.href} target='_blank'
                   rel='noopener noreferrer'>
                  {domToReact(node.children)}
                </a>
              );
            }
          },
        });
      ```
- [ ] Port `SignalDetail` to `src/components/SignalDetail.tsx`. The
      whole component can be a Server Component if we wrap the
      bio-glitch header + body in a small `<SignalDetailClient>`
      Client wrapper that consumes the `useJitter()` calls. The
      server passes `signal: Signal` + `bodyHtml: string`; the
      client renders the header chrome + `<MarkdownBody>`.
- [ ] Delete `src/screens/Signals/data.ts`,
      `src/screens/Signals/index.tsx`,
      `src/screens/Signals/SignalDetail.tsx`,
      `src/screens/Signals/MarkdownBody.tsx`,
      `src/plugins/rss.ts`, `src/plugins/rss.test.ts`. Remove the
      now-empty `src/plugins/` directory. Markdown files under
      `src/screens/Signals/entries/` **stay where they are** — only
      the TSX changes. (Preserves git history; the
      `.agents/skills/add-signal` workflow keeps writing to the same
      path.)
- [ ] `bun run test` (RSS unit tests pass). `bun run lint` +
      `bun run format` + `bun run typecheck` clean.

## Phase 3 — Memories (fragments + lightbox) _(parallelizable)_

**Target branch:** `migration/nextjs`.

**Goal.** Port `/memories`, `/memories/[id]`, `/memories/[id]/[photo]`
to App Router with static rendering for the index and detail; the
lightbox photo route shares the detail page and opens the lightbox
client-side based on the URL param.

**What changes.**

- New routes:
  ```
  app/(site)/memories/
  ├── page.tsx                    # MemoriesScreen (grid of fragments)
  ├── [id]/
  │   ├── page.tsx                # FragmentDetail (masonry)
  │   └── [photo]/page.tsx        # FragmentDetail with photo route
  ```
- `src/lib/content/fragments.ts` mirrors the Signals loader pattern:
  server-only, reads `src/screens/Memories/fragments/*.md`, returns
  the existing `Fragment[]` shape. `photoUrl()` helper moves alongside.
- `FragmentDetail` is split:
  - Page is an RSC that loads the fragment and passes it to a Client
    `<FragmentDetailView>` (the masonry, CullableTile, IntersectionObserver,
    and Lightbox are all interactive).
  - `/memories/[id]/[photo]` reuses the same Client component, just
    passes `photo={params.photo}`.
- `MemoriesScreen` is also mostly client-driven (jitter, ProgressiveImage
  load events), so the page does the data fetch in RSC and hands
  everything to a Client component for rendering.
- `generateStaticParams` for `[id]` returns every fragment id, and for
  `[id]/[photo]` returns every `(id, photo)` pair.
- `generateMetadata` for `[id]` emits the fragment title / location /
  cover image as OG.

**Files touched (Phase 3).**
- New: `app/(site)/memories/page.tsx`,
  `app/(site)/memories/[id]/page.tsx`,
  `app/(site)/memories/[id]/[photo]/page.tsx`,
  `src/lib/content/fragments.ts`.
- Ported: `src/screens/Memories/index.tsx` →
  `src/components/MemoriesGrid.tsx` (Client),
  `src/screens/Memories/FragmentDetail.tsx` →
  `src/components/FragmentDetailView.tsx` (Client),
  the four `Memories/components/*` files stay in place but are
  imported by Client Components.
- Deleted: `src/screens/Memories/data.ts`.

**Tasks.**

- [ ] Create `src/lib/content/fragments.ts` (server-only). Port the
      `parseFrontmatter` + `import.meta.glob` logic to filesystem reads.
      Same memoization pattern as `signals.ts`.
- [ ] Move `photoUrl()` from `src/screens/Memories/data.ts` to
      `src/lib/photoUrl.ts` (no `server-only` import — it's a pure
      function called from both server and client).
- [ ] Create `app/(site)/memories/page.tsx` as RSC + a
      `<MemoriesGrid>` Client Component that consumes the
      `fragments: Fragment[]` prop.
- [ ] Create `app/(site)/memories/[id]/page.tsx` and
      `app/(site)/memories/[id]/[photo]/page.tsx`. Both load the
      fragment server-side and render `<FragmentDetailView
      fragment={...} photo={params.photo} />` (Client). Export
      `generateStaticParams` for both routes; export
      `generateMetadata` for `[id]` (use the cover image as
      `og:image`).
- [ ] Port `MemoriesScreen` and `FragmentDetail` into
      `src/components/MemoriesGrid.tsx` and
      `src/components/FragmentDetailView.tsx`. Keep all existing
      behavior (jitter, CullableTile, useNearViewport, Lightbox,
      GroupLightbox).
- [ ] **Router migration**: the lightbox today calls `navigate(url,
      { replace: true })` from wouter to swap the URL without adding
      a history entry (see `FragmentDetail.tsx:140`). Under
      `next/navigation`, that becomes
      `const router = useRouter(); router.replace(url, { scroll: false })`.
      The `scroll: false` is important — without it, Next will jump
      to the top on every photo swipe.
- [ ] **`loadedFullUrls` SSR safety**:
      `src/screens/Memories/components/loadedFullUrls.ts` exports a
      module-level `Set<string>` shared by Lightbox + GroupLightbox.
      In Next, a module imported by any Server Component evaluates
      on the server too, where the Set would leak across requests.
      Add `import 'client-only'` at the top of the file so any
      accidental RSC import becomes a build error. The current
      consumers (Lightbox, GroupLightbox) are already Client
      Components so runtime behavior is unchanged.
- [ ] Delete `src/screens/Memories/index.tsx`,
      `src/screens/Memories/FragmentDetail.tsx`,
      `src/screens/Memories/data.ts`. Markdown / image content under
      `src/screens/Memories/fragments/` and `public/images/fragments/`
      stays put (matches `.agents/skills/add-fragment`).
- [ ] Manual test on `/memories`, `/memories/japan-2024`,
      `/memories/japan-2024/DSCF0839`: navigation, lightbox open from
      direct URL, swipe (touch + keyboard), placeholder fades,
      masonry layout unchanged, **no scroll jumps** on swipe (the
      `scroll: false` fix above).
- [ ] `bun run lint` + `bun run format` + `bun run typecheck` clean.

## Phase 4 — Constructs _(parallelizable, small)_

**Target branch:** `migration/nextjs`.

**Goal.** Same as Phase 2 minus the RSS feed: list + detail with
static rendering and per-route metadata.

**Tasks.**

- [ ] Create `src/lib/content/constructs.ts` (server-only loader,
      same pattern as `signals.ts` / `fragments.ts`).
- [ ] Create `app/(site)/constructs/page.tsx` and
      `app/(site)/constructs/[id]/page.tsx`. RSC pages, Client
      components for interactive bits, `generateStaticParams` +
      `generateMetadata` per detail page.
- [ ] Port `src/screens/Constructs/index.tsx` and `ConstructDetail.tsx`
      to `src/components/`. Reuse the `MarkdownBody` Client Component
      and `renderMarkdown()` helper from Phase 2 (`src/lib/markdown.ts`).
- [ ] Delete `src/screens/Constructs/data.ts`,
      `src/screens/Constructs/index.tsx`,
      `src/screens/Constructs/ConstructDetail.tsx`. Markdown stays.
- [ ] `bun run lint` + `bun run format` + `bun run typecheck` clean.

## Phase 5 — Heroes _(parallelizable, small)_

**Target branch:** `migration/nextjs`.

**Goal.** Mirror of Phase 4 against the Heroes section.

**Tasks.**

- [ ] Create `src/lib/content/heroes.ts` (server-only loader, same
      pattern as the others).
- [ ] Create `app/(site)/heroes/page.tsx` and
      `app/(site)/heroes/[id]/page.tsx`. RSC pages, Client wrappers
      for jitter / interactive bits, `generateStaticParams` +
      `generateMetadata` per detail page.
- [ ] Port `src/screens/Heroes/index.tsx` and `HeroDetail.tsx` to
      `src/components/`. Reuse the `MarkdownBody` Client Component
      and `renderMarkdown()` helper from Phase 2.
- [ ] Delete `src/screens/Heroes/data.ts`,
      `src/screens/Heroes/index.tsx`,
      `src/screens/Heroes/HeroDetail.tsx`. Markdown stays.
- [ ] `bun run lint` + `bun run format` + `bun run typecheck` clean.

## Phase 6 — Gallery (R3F, client-only) _(parallelizable)_

**Target branch:** `migration/nextjs`.

**Goal.** Get the 3D gallery rendering at `/gallery/[fragmentId]` with
zero SSR (the entire scene is `@react-three/fiber` + WebGL). The dev-only
unrouted `/gallery` page becomes a `NODE_ENV === 'development'` check.

**What changes.**

- `app/gallery/[fragmentId]/page.tsx`: thin Server Component that
  loads the fragment data and renders a `dynamic(() => import(...),
  { ssr: false })`-wrapped `<GalleryScreen>` Client Component.
- `app/gallery/layout.tsx` already exists from Phase 1 (bare, no
  sidebar).
- Dev-only `/gallery`: `app/gallery/page.tsx` returns `notFound()` in
  production, renders `<GalleryScreen />` in development. Use
  `process.env.NODE_ENV` (not `import.meta.env.DEV`).
- The 247 KB gz R3F payload stays out of every other route's bundle
  because it's only imported by the Gallery page tree and wrapped in
  `dynamic(..., { ssr: false })`. Same outcome as today's `lazy()`,
  better mechanism.

**Files touched (Phase 6).**
- New: `app/gallery/[fragmentId]/page.tsx`, `app/gallery/page.tsx`.
- Ported: `src/screens/Gallery/index.tsx`,
  `src/screens/Gallery/generateLayout.ts`,
  `src/screens/Gallery/MobileControls.tsx` (these become
  `src/components/Gallery/...` — minor file moves, same code).
- Updated: any `import.meta.env.DEV` references inside Gallery →
  `process.env.NODE_ENV === 'development'`.

**Tasks.**

- [ ] Port `src/screens/Gallery/**` into `src/components/Gallery/**`
      (file move + a `"use client"` directive at the top of the
      entry). Replace `import.meta.env.DEV` if any references exist
      inside.
- [ ] Create `app/gallery/[fragmentId]/page.tsx` (Server Component):
      look up the fragment by id (reuse `src/lib/content/fragments.ts`
      from Phase 3 — this is the only cross-phase dependency in
      Phase 6), then render
      `<GalleryScreenDynamic fragmentId={params.fragmentId} fragment={...} />`
      where `GalleryScreenDynamic` is
      `dynamic(() => import('src/components/Gallery'), { ssr: false })`.
- [ ] Create `app/gallery/page.tsx` that returns `notFound()` unless
      `process.env.NODE_ENV === 'development'`; in dev, render the
      standalone Gallery for layout testing (matches today's dev-only
      route in `src/App.tsx:34`).
- [ ] Confirm `bun run build` doesn't pull `three` / `@react-three/*`
      into any non-Gallery chunk. Inspect `.next/static/chunks/` for
      a Gallery-named chunk that contains the R3F payload.
- [ ] Smoke-test `/gallery/japan-2024` in dev: WebGL boots, pointer
      lock + mobile controls work, theme palette swaps work, art
      pieces load.
- [ ] `bun run lint` + `bun run format` + `bun run typecheck` clean.

## Merge to main

**Once Phases 1–6 are merged on `migration/nextjs`:**

- [ ] Final smoke test on the branch: every existing route loads,
      every interactive behavior works, no console errors, dev + build
      + preview all clean.
- [ ] Lighthouse pass on `/`, `/memories`, `/memories/japan-2024`,
      `/signals`, `/signals/<latest>`. SSR HTML present in
      view-source on every reading surface. LCP should improve on
      content-heavy routes (less JS to parse).
- [ ] Update `AGENTS.md`: framework section reflects Next.js (App
      Router, RSC, Server Components, route handlers, file-based
      routing); commands section updates `bun run dev`/`build`/
      `preview` descriptions; content locations table keeps the same
      markdown paths (we deliberately didn't move them); add a
      "Routing" subsection describing the `(site)` route group and
      Gallery's standalone layout.
- [ ] Update `README.md` if it mentions Vite.
- [ ] Squash-merge `migration/nextjs` → `main`. Single commit so
      `git log` reads cleanly; the per-phase PR history lives on the
      branch for archaeology.
- [ ] Verify Vercel deploy from `main` succeeds and the production
      site renders identically. Spot-check `/signals/feed.xml` from
      prod (RSS readers will re-fetch automatically).

## Phase 7 — Per-route metadata, OG, JSON-LD _(off `main`, post-cutover)_

**Goal.** Make per-post pages discoverable and shareable.

What Phases 2–5 already shipped: per-detail `generateMetadata` with
`<title>` / description / basic OG. Phase 7 adds the structured-data
and richer-OG pieces that take more thought than a route port should
carry.

**Tasks.**

- [ ] Audit all `generateMetadata` implementations from Phases 2–5
      against the OG / Twitter card / canonical URL / `<meta
      name="robots">` checklist. Backfill any gaps.
- [ ] Add `BlogPosting` JSON-LD to `/signals/[id]` (`headline`,
      `datePublished`, `author`, `url`).
- [ ] Add `ImageObject` JSON-LD to `/memories/[id]` for the cover.
- [ ] Confirm `metadataBase: new URL('https://jasonwu.ink')` is set in
      `app/layout.tsx` (Phase 1 adds it). Without it, relative OG
      image paths resolve against the request host and break on
      preview deploys.
- [ ] Manual share-debugger spot-checks: Twitter card validator,
      Facebook OG debugger, LinkedIn post inspector for one signal,
      one fragment, one construct, one hero.

## Phase 8 — Sitemap & robots _(small, off `main`)_

**Goal.** Replace the static `public/robots.txt` with route handlers
that auto-include every signal / fragment / construct / hero.

**Tasks.**

- [ ] Add `app/sitemap.ts` exporting the default async function that
      returns the union of static routes plus every content detail
      route (`getSignals()`, `getFragments()`, `getConstructs()`,
      `getHeroes()` → URL list with `lastModified` from the markdown
      file mtime or frontmatter date).
- [ ] Add `app/robots.ts` exporting the default object that allows
      crawling and points to `https://jasonwu.ink/sitemap.xml`.
      Delete the static `public/robots.txt`.
- [ ] Submit the new sitemap to Google Search Console manually after
      deploy.

## Phase 9 — `next/image` rollout _(opt-in, off `main`)_

**Goal.** Adopt `next/image` where it pays off without losing the
bespoke 20 px CSS-background placeholder that's part of the brand on
masonry / signals.

**Where `next/image` wins**: surfaces where we want the framework's
automatic responsive variants + AVIF negotiation + lazy/priority
handling — typically index thumbnails, hero images on detail pages,
heroes' avatars, construct hero crops.

**Where `ProgressiveImage` stays**: Memories masonry tiles, Signals
markdown body images. These are the places the 20 px placeholder is
deliberately part of the load aesthetic.

**Approach.** Flip `next.config.ts` `images.unoptimized` to `false`.
Configure `images.remotePatterns: []` (we only serve from `/public/`).
Convert specific callsites one at a time, in separate sub-PRs:

**Tasks.**

- [ ] Sub-PR a: turn on Next image optimization (`unoptimized: false`),
      add the `images.formats: ['image/avif', 'image/webp']` config,
      verify the bespoke `ProgressiveImage` continues to work
      (it bypasses `next/image` by using `<img>` directly — should be
      unaffected).
- [ ] Sub-PR b: Heroes index avatars → `<Image>`.
- [ ] Sub-PR c: Constructs index cards → `<Image>`.
- [ ] Sub-PR d: Construct detail hero image → `<Image priority>`.
- [ ] Measure: `du -sh .next/cache/images` after a deploy, byte-saved
      per surface from the Network panel (DPR 2 mobile profile).

## Phase 10 — Dynamic per-post OG images _(optional, off `main`)_

**Goal.** Auto-generate per-signal OG cards with the post title +
timestamp + location, so social shares stop reusing the generic
`og-image.png`.

**Approach.** Use `next/og` (Vercel's `@vercel/og`) at
`app/(site)/signals/[id]/opengraph-image.tsx`. Returns a JSX-rendered
1200×630 image. `generateMetadata` from Phase 7 doesn't need to be
updated — Next picks up the colocated `opengraph-image` automatically.

**Tasks.**

- [ ] Design the OG card in JSX (white-on-black, geist-mono, post
      title in pixel font, timestamp + location in mono — mirror the
      SignalDetail header chrome).
- [ ] Create `app/(site)/signals/[id]/opengraph-image.tsx` returning
      `new ImageResponse(...)`. Use `runtime = 'edge'` if Vercel
      supports it on the deploy.
- [ ] Same for `/memories/[id]/opengraph-image.tsx` (cover image
      composited with title + location).
- [ ] Validate via Twitter card validator and Facebook OG debugger.

## Resolved unknowns (decisions locked in)

These were open at the start of drafting; each is now baked into the
plan above. Recording the decision + the source so a future reader (or
agent) doesn't reopen them.

- **Markdown rendering in RSC.** `react-markdown` v10 cannot be used
  as the renderer here: its `components` prop takes function
  references, which aren't serializable across the RSC boundary —
  you'd have to mark the whole renderer `"use client"` and ship the
  full remark/rehype stack (~80–120 kB gz). **Decision**: drop
  `react-markdown` entirely. Render to HTML string in a Server
  Component via `src/lib/markdown.ts` (the existing `unified()`
  chain from `src/plugins/rss.ts`, generalized); walk the HTML in
  a Client `<MarkdownBody>` via `html-react-parser` (~13 kB gz) to
  swap `<img>` for `<ProgressiveImage>` and external `<a>` for the
  new-tab wrapper. RSS reuses the same renderer.
- **`useJitter` SSR mismatch.** `Math.random()` during render
  produces different values on server vs client → hydration error.
  **Decision**: switch to `useId()` + deterministic hash. `useId()`
  returns the same value on both sides; hashing it produces a stable
  delay with no FOUC and no visual change vs today's pseudo-random
  spread.
- **Theme bootstrap script.** `next/script` with
  `strategy="beforeInteractive"` runs *after* body paint in App
  Router — would defeat the flash-prevention. **Decision**: render
  `<script dangerouslySetInnerHTML={{__html: ...}}>` directly inside
  `<head>` JSX in `app/layout.tsx`, with `suppressHydrationWarning`
  on the `<html>` element to silence the documented hydration
  warning that the inline script mutates `data-theme` before React
  hydrates. (Don't pass an empty string to
  `dangerouslySetInnerHTML` — React 19 made that a hydration error.)
- **Tailwind v4 + Next 15.** `@tailwindcss/postcss` via
  `postcss.config.mjs` is the supported integration. Works with
  Turbopack (the default in `next dev` for 15.x) provided Tailwind
  ≥ 4.1 and Next ≥ 15.1. `@custom-variant`, `@theme`, `@layer base
  { @apply ... }` all pass through without changes. `@import
  url('https://fonts.googleapis.com/...')` must be **above** `@import
  'tailwindcss';` — already the case in `src/index.css:1-2`.
- **Bun on Vercel.** Vercel autodetects `bun.lock` and runs `bun
  install`, then builds under Node. No `vercel.json` needed; no
  `"bunVersion"` pin needed (the Bun runtime is still beta and
  offers no win here). Stable since 2024.
- **`vercel.json` post-migration.** Delete it. The SPA-rewrite would
  intercept Next's routes and break everything; Vercel autodetects
  Next.js and applies the right build / route-handler config without
  a config file.
- **Font preload tags.** Next 15's metadata API doesn't expose a
  first-class `preload` field. Render `<link rel="preload"
  as="font" type="font/woff2" crossOrigin="">` as JSX inside
  `<head>` in `app/layout.tsx`. Only preload the 1–2 fonts above the
  fold (over-preloading triggers Lighthouse warnings).
- **`output: 'standalone'`.** Leave `output` unset in
  `next.config.ts`. Per Vercel docs, `standalone` is for
  self-hosting / Docker and is redundant on Vercel.
- **`next/og` for dynamic OG images (Phase 10).** Bundled with Next
  15 App Router. No install. Export a colocated
  `opengraph-image.tsx` that returns an `ImageResponse`. Vercel
  handles CDN caching automatically.
- **Markdown file colocation under `src/screens/...`.** Keeping the
  files where they are preserves git history and existing
  `.agents/skills/` paths. The cost is that markdown is no longer
  "near" its renderer post-migration (renderers move to
  `src/components/`, content stays in `src/screens/.../entries/`).
  Acceptable; the alternative (`content/{signals,fragments,...}/`)
  was rejected on history-churn grounds.

## Risks / open questions

- **`bunfig.toml` `minimumReleaseAge = 604800` (7 days)** will
  occasionally block Next.js patch installs on release day —
  including security patches, which is exactly when you don't want
  a cooldown. Mitigation: pin specific versions in `package.json`
  rather than relying on caret ranges, or add a `minimumReleaseAge`
  exception for `next` if a fresh patch is needed urgently. Not a
  migration blocker but worth flagging the day Next 15.x hits a
  must-take patch.
- **Long-lived migration branch hygiene.** `migration/nextjs` will
  drift from `main` while in flight. Each agent picking up a phase
  PR should `git merge main` (or rebase) into the branch first if
  `main` has moved since the last phase landed. If a hotfix needs
  to ship to production during the migration, it goes to `main`
  directly and the migration branch merges main forward.
- **Single squash on cutover.** The final `migration/nextjs` →
  `main` merge collapses all phase commits into one squash. This is
  intentional (clean `git log` on `main`) but loses per-phase
  attribution; the PR history on the branch is the system of
  record.
- **Hydration mismatch from `localStorage` reads** — `RootLayout`
  reads `sidebarCollapsed` via `useState(() => ...)` during render.
  That lazy initializer runs on the server too. Phase 1 task list
  covers the fix (guard with `typeof window === 'undefined' ?
  false : ...` and reconcile in a post-mount `useEffect`), but worth
  re-checking once the layout is ported — there may be additional
  client-only reads we missed. Same audit applies to
  `ThemeContext.readInitialTheme()`, which is already safely
  guarded.
- **Build-time content walks**. Each `src/lib/content/*.ts` loader
  reads its entire `entries/` directory at module-evaluation time.
  At ~5–8 entries per section that's nothing, but Next will call
  these modules in `generateStaticParams`, `generateMetadata`, and
  the page render — three times per route. The memoization task in
  Phase 2 (`let cached: Signal[] | undefined`) closes that gap.
  Apply the same pattern across all four loaders.
- **`html-react-parser` rendering footnotes**. `remark-gfm` emits a
  `<section data-footnotes>` block with `<sup>` refs and a `<ol>`.
  Today the styling lives in `index.css` under `.signal-prose
  section[data-footnotes]` and reads fine because react-markdown
  preserves the structure. We need to confirm `html-react-parser`
  preserves the `data-footnotes` attribute and `id`/`href` linking
  between refs and definitions. Verification: render a known
  footnote-heavy post (e.g. `2026-04-12-david.md` if it has any)
  and diff against the current production HTML in DevTools. If
  attributes drop, switch the parser config to preserve them
  (`htmlparser2` options).
- **Gallery `import.meta.env.DEV`**. The Gallery codepath uses
  Vite's `import.meta.env.DEV` for the dev-only `/gallery` route in
  `src/App.tsx:33`. Phase 6 swaps to `process.env.NODE_ENV ===
  'development'`. Phase 1 should also grep the rest of
  `src/screens/Gallery/**` for any other `import.meta.env`
  references and surface them in Phase 6's PR description so they
  aren't missed.
- **`bun:test` import in tests**. `src/plugins/rss.test.ts` uses
  `bun:test`; that's already a Bun-only test (not run under
  `next build`). After Phase 2 moves it to `src/lib/rss.test.ts`,
  same constraint applies — `bun test` only. Next's build process
  ignores `*.test.ts` files by default, so no `next.config.ts` exclude
  is needed.
