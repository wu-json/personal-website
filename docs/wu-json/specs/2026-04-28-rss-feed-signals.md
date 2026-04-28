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
- User-facing link on the Signals page itself (can be done separately; feed URL is discoverable via a `<link>` tag in the document `<head>` or standard autodiscovery).
- Filtering or categories — every Signal goes in the feed.

## Design

### Output file

`build/signals/feed.xml` — co-located with the Signals list route so the URL is `https://jasonwu.ink/signals/feed.xml`.

### Generation

A build-time script (or a Vite plugin) that:

1. Reads all Signal entries from the same `import.meta.glob` / filesystem glob.
2. Parses frontmatter (reusing or mirroring `data.ts` logic).
3. Renders markdown body to HTML suitable for `<description>` (using `react-markdown` / `remark` at build time, or a lightweight markdown→HTML transform).
4. Emits a valid RSS 2.0 XML file into `build/`.

### Alternative: Vite plugin approach

A simpler alternative: use `vite-plugin-rss` or write a custom Vite plugin that hooks into `generateBundle` or `writeBundle` to emit the XML. This keeps the logic colocated with the build pipeline and avoids a separate script.

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

### Link tag

Add to `index.html`:

```html
<link rel="alternate" type="application/rss+xml" title="Jason Wu — Signals" href="/signals/feed.xml">
```

This enables feed autodiscovery in browsers and feed readers.

## Steps

1. **Audit existing timestamps** — verify the `timestamp` frontmatter format across all Signal entries.
2. **Add markdown→HTML rendering** — a lightweight build-time function (no React needed; can use `remark` / `unified` directly or use `react-dom/server` to render MarkdownBody if simpler).
3. **Generate `feed.xml`** — either a Vite plugin or a script run before/after `vite build`.
4. **Add `<link>` autodiscovery tag** to `index.html`.
5. **Test** — `bun run build`, verify output, validate against W3C Feed Validator.
6. **Deploy** — the static file gets served at the expected URL.

## Open questions

- Should `<description>` be plain text or HTML? (plan: plain-text excerpt for `<description>`, full HTML in `<content:encoded>`)
- Feed item limit? (plan: include all signals for now; they are low volume)
- Build script language? (plan: TypeScript, same as `optimize-photos`)
