---
name: add-transmission
description: >-
  Adds a new Transmissions entry: stages and optimizes images with category
  transmissions, creates frontmatter markdown in
  src/screens/Transmissions/entries/. Use when the user wants a new
  transmission or /add-transmission workflow; when they provide image(s) and
  a slug for Transmissions.
---

# Add transmission

## 1. Next transmission ID

Scan `src/screens/Transmissions/entries/*.md`. Filenames are `NNN-<slug>.md`. The next `id` is the next zero-padded three-digit number (e.g. `004` after `003-…`). You need this before optimizing so image output paths match.

## 2. Optimize photos

Stage sources, run optimize with category `transmissions` and the numeric id as the slug segment, then clean up:

```sh
mkdir -p /tmp/transmission-stage
cp <source-image-or-dir>/* /tmp/transmission-stage/
bun scripts/optimize-photos.ts /tmp/transmission-stage <id> transmissions
rm -rf /tmp/transmission-stage
```

Output: `public/images/transmissions/<id>/`. Capture printed `photos:` YAML if useful for dimensions.

## 3. Create the entry file

Ask the user for:

- `title` (short, uppercase — e.g. `SIDEWALK FREQ`)
- `timestamp` (`YYYY.MM.DD // HH:MM:SS`; default to current local time if omitted)
- `location` (e.g. `San Francisco, US`)
- `slug` (kebab-case; used in filename)
- Markdown body; images as `![alt](/images/transmissions/<id>/<filename>-full.webp)` (or `<img src="…">` as in existing entries)

### Markdown features (all entries)

Bodies are rendered by **`MarkdownBody`** (`src/screens/Transmissions/MarkdownBody.tsx`) with **GFM** (`remark-gfm`) and **raw HTML** (`rehype-raw`). For future entries you can reuse without code changes:

- **Footnotes** — `Text[^a]` then at end of file:

  ```markdown
  [^a]: [Label](https://example.org/)
  ```

  Same `[^a]` can appear multiple times. Styling: `// ref nodes` block + mono superscripts (see `CLAUDE.md` → Transmissions markdown reference).

- **External links** — `https://…` opens in a new tab; internal `/…` links stay in-app.

Frontmatter:

```yaml
---
id: '<id>'
timestamp: '<timestamp>'
title: '<title>'
expanded: false
location: '<location>'
---
```

- `id` is the zero-padded number string (e.g. `'004'`)
- `expanded: false` is the default

Save as `src/screens/Transmissions/entries/<id>-<slug>.md`.

Routes: `/transmissions` and `/transmissions/<id>`.

## 4. Before commit

Run `bun run lint` and `bun run format`.
