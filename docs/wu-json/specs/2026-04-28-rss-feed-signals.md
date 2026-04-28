---
status: draft
---

# RSS Feed for Signals

Add an RSS 2.0 XML feed at `/signals/feed.xml` (or `/rss.xml`) that exposes Signals posts so readers can subscribe via feed readers.

## Goals

- **Build-time generation**: emit a static `feed.xml` (or `/signals/feed.xml`) as part of `bun run build` so no runtime server is needed.
- **RSS 2.0**: standard `<rss version="2.0">` with `<channel>`, `<item>` entries.
- **Signal entries**: one `<item>` per published Signal, ordered by id descending (newest first, matching the list page).
- **Content**: each item carries the rendered body as `<description>` (or `<content:encoded>`), title from frontmatter, pubDate from timestamp, and a link to the Signal detail page.
- **Feed metadata**: site title, description, link (jasonwu.ink), and language if relevant.

## Non-goals

- JSON Feed or Atom (RSS 2.0 only for now).
- Podcast-specific tags / enclosures / media tags.
- User-facing link on the Signals page — **in scope**, see below.
- Filtering or categories — every Signal goes in the feed.

## Design

### Output file

`build/signals/feed.xml` — co-located with the Signals list route so the URL is `https://jasonwu.ink/signals/feed.xml`.

### Generation: custom Vite plugin

A custom Vite plugin added to `vite.config.mts` that hooks into `closeBundle` (runs after the bundle is written to disk). This keeps the logic colocated with the build pipeline — no separate script to remember to call.

The plugin:

1. Uses `import.meta.glob` (or raw `fs` + `fast-glob`) to find all `src/screens/Signals/entries/*.md`.
2. Parses YAML frontmatter from each file (simple regex parser, mirroring `data.ts`).
3. Renders the markdown body to HTML using `unified` + `remark-parse` + `remark-gfm` + `remark-rehype` + `rehype-raw` + `rehype-stringify` (the same pipeline as `react-markdown` under the hood, but at build time with no React dependency).
4. Builds an RSS 2.0 XML string and writes it to `build/signals/feed.xml`.

Named `rssPlugin()` and added to the `plugins` array in `vite.config.mts`.

### Feed structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Jason Wu — Signals</title>
    <link>https://jasonwu.ink/signals</link>
    <description>Short-form posts by Jason Wu</description>
    <language>en</language>
    <lastBuildDate>…</lastBuildDate>
    <item>
      <title>Signal title or [id]</title>
      <link>https://jasonwu.ink/signals/{id}</link>
      <guid isPermaLink="true">https://jasonwu.ink/signals/{id}</guid>
      <pubDate>RFC-2822 timestamp</pubDate>
      <description>Plain-text excerpt (150-300 chars), no HTML to avoid escaping issues</description>
      <content:encoded><![CDATA[ rendered HTML body ]]></content:encoded>
    </item>
    …
  </channel>
</rss>
```

### Timestamps

Signal frontmatter `timestamp` fields use the format `YYYY.MM.DD // HH:MM:SS` (e.g. `2026.02.14 // 21:00:00`). This parses cleanly into a `Date` for RFC-2822 output:

```ts
const d = new Date(timestamp.replace(/\./g, '-').replace(' // ', 'T'));
```

If parsing fails for any entry, fall back to using the signal `id` (ids are zero-padded numeric strings like `'001'`; not dates) — in that case use the file's git history or `lastBuildDate` as a rough approximation.

### Signals page icon

Place an RSS icon/link next to the "Signals" heading, inspired by [mariozechner.at](https://mariozechner.at/) (which places a Lucide RSS SVG beside "Musings"). Ours should fit the site's **pixel / glitch / terminal** aesthetic rather than being a plain Lucide icon.

**Direction**: a small pixel-art RSS icon (custom SVG drawn to feel native to the `font-pixel` / `bio-glitch` visual language), or a styled monospace text link like `[rss]` or `// subscribe` rendered in the existing `text-white/20 text-[10px] font-mono` chrome. The icon should sit inline with the "Signals" heading, subtly colored (white/20 → white/50 on hover), linking to `/signals/feed.xml`.

It should feel like a natural part of the terminal/console header, not an afterthought. No jarring orange RSS icon — keep it monochrome and understated.

### Link tag

Add to `index.html`:

```html
<link rel="alternate" type="application/rss+xml" title="Jason Wu — Signals" href="/signals/feed.xml">
```

This enables feed autodiscovery in browsers and feed readers.

## Steps

1. **Design the RSS icon** — create a small pixel-art SVG or styled monospace text link that fits the Signals page header aesthetic.
2. **Add icon to Signals header** — place it inline beside "Signals" in `index.tsx`, linking to `/signals/feed.xml`.
3. **Build `feed.xml` generation** — a build-time script or Vite plugin that globs entries, parses frontmatter, renders markdown→HTML, emits valid RSS 2.0 XML.
4. **Add `<link>` autodiscovery tag** to `index.html`.
5. **Test** — `bun run build`, verify output, validate against W3C Feed Validator.
6. **Deploy** — the static file gets served at the expected URL.

### Dependencies

The plugin needs a few lightweight deps for build-time markdown→HTML:

- `unified` — unified pipeline
- `remark-parse` — markdown parser
- `remark-gfm` — GFM support (already used at runtime via `react-markdown`)
- `remark-rehype` — mdast → hast
- `rehype-raw` — raw HTML support (already used at runtime)
- `rehype-stringify` — hast → HTML string

All are dev dependencies; no runtime impact.

## Open questions

- Should `<description>` be plain text or HTML? (plan: plain-text excerpt for `<description>`, full HTML in `<content:encoded>`)
- Feed item limit? (plan: include all signals for now; they are low volume)
