---
name: add-signal
description: >-
  Adds a new Signals entry: stages and optimizes images with category
  signals, creates frontmatter markdown in
  src/screens/Signals/entries/. Use when the user wants a new
  signal or /add-signal workflow; when they provide image(s) and
  a slug for Signals.
---

# Add signal

## 1. Determine date slug

Entries use date-prefixed slugs: `YYYY-MM-DD-<slug>.md`. The `id` is the full date-slug string (e.g. `'2026-04-28-farewells'`).

Ask the user for `timestamp` first if you don't have it yet. Extract the date portion (`YYYY.MM.DD` → `YYYY-MM-DD`) and combine with the kebab-case `slug` to form the `id`. No sequence scanning needed — date prefixes are natively collision-resistant.

## 2. Optimize photos

Stage sources, run optimize with category `signals` and the date-slug as the slug segment, then clean up:

```sh
mkdir -p /tmp/signal-stage
cp <source-image-or-dir>/* /tmp/signal-stage/
bun scripts/optimize-photos.ts /tmp/signal-stage <date-slug> signals
rm -rf /tmp/signal-stage
```

Output: `public/images/signals/<date-slug>/` (WebP variants defined in `scripts/optimize-photos.ts`: `placeholder`, `small`, `thumb`, `full`). Capture printed `photos:` YAML if useful for dimensions.

## 3. Create the entry file

Ask the user for:

- `title` (optional; short, uppercase — e.g. `SIDEWALK FREQ`. Omit the frontmatter key entirely when there's no title.)
- `timestamp` (`YYYY.MM.DD // HH:MM:SS`; default to current local time if omitted)
- `location` (e.g. `San Francisco, US`)
- `slug` (kebab-case; combined with date prefix for filename and id)
- Markdown body; images as `![alt](/images/signals/<date-slug>/<filename>-full.webp)` (or `<img src="…">` as in existing entries)

### Markdown features (all entries)

Bodies are rendered by **`MarkdownBody`** (`src/screens/Signals/MarkdownBody.tsx`) with **GFM** (`remark-gfm`) and **raw HTML** (`rehype-raw`). For future entries you can reuse without code changes:

- **Footnotes** — `Text[^a]` then at end of file:

  ```markdown
  [^a]: [Label](https://example.org/)
  ```

  Same `[^a]` can appear multiple times. Styling: `// refs` block + mono superscripts (see `AGENTS.md` → Signals markdown reference).

- **External links** — `https://…` opens in a new tab; internal `/…` links stay in-app.

Frontmatter:

```yaml
---
id: '<date-slug>'
timestamp: '<timestamp>'
title: '<title>' # optional — omit the whole line for untitled entries
expanded: false
location: '<location>'
---
```

- `id` is the full date-slug string (e.g. `'2026-04-28-farewells'`)
- `expanded: false` is the default
- `title` is optional; when omitted, the entry renders with only the `[id] timestamp — location` meta row above the body

Save as `src/screens/Signals/entries/<date-slug>.md`.

Routes: `/signals` and `/signals/<date-slug>`.

## 4. Before commit

Run `bun run lint` and `bun run format`.
