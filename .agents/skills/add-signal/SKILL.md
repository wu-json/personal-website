---
name: add-signal
description: >-
  Adds a Signals entry (writing): optimizes any images into
  public/images/signals/<id>/ and creates
  src/screens/Signals/entries/<id>.md, where id is YYYY-MM-DD-<slug>. Use when
  the user wants a new signal, post, or note, or provides text/images and a
  slug for Signals.
---

# Add signal

## 1. Gather inputs

Ask the user for:

- `slug` (kebab-case)
- `timestamp` as `YYYY.MM.DD // HH:MM:SS` (default: current local time)
- `location` (e.g. `San Francisco, US`)
- `title` (optional; omit the key entirely for untitled entries)
- Markdown body and any images

The id is `YYYY-MM-DD-<slug>`, with the date taken from `timestamp`.

## 2. Optimize images (if any)

The script takes a directory, so stage single files first:

```sh
stage=$(mktemp -d)
cp <images> "$stage"/
bun scripts/optimize-photos.ts "$stage" <id> signals
rm -rf "$stage"
```

Writes `<file>-{placeholder,small,thumb,full}.webp` to `public/images/signals/<id>/` and prints each file's original width/height.

## 3. Create the entry

File: `src/screens/Signals/entries/<id>.md`

```yaml
---
id: '<id>'
timestamp: 'YYYY.MM.DD // HH:MM:SS'
title: '<title>'
expanded: false
location: '<location>'
---
<figure>
<img src="/images/signals/<id>/<file>-full.webp" alt="<alt>" width="<width>" height="<height>">
<figcaption>Optional caption.</figcaption>
</figure>

<markdown body>
```

Frontmatter is parsed line by line, not as full YAML: one `key: value` per line, no inline comments, no nesting.

- `expanded: true` stops long entries (over ~520 chars of text) from collapsing in the `/signals` list.
- The list sorts by `timestamp`, newest first.
- OG cards and the RSS feed are generated at build time; nothing to add.

### Body

Rendered by `src/screens/Signals/MarkdownBody.tsx` with GFM and raw HTML:

- **Images**: use `<img>` with `src`, `alt`, `width`, `height` (`-full.webp` URL). The first such `<img>` is the list/OG hero image. Markdown `![]()` renders a plain image and is not used as the hero.
- **Video / iframe**: `<video src="…">` autoplays muted on loop; `<iframe src="…" title="…">` renders 16:9.
- **Footnotes**: `text[^a]`, with `[^a]: [Label](https://…)` at the end of the file.
- **Links**: `http…` links open in a new tab; `/…` links stay in-app.
- **Tables**: GFM tables; right-align numeric columns with `---:`.
- **Charts**: a ` ```chart ` fence containing a JSON spec renders as SVG. `type` is `dumbbell` or `line`; the fields are the `DumbbellSpec` and `LineSpec` types in `src/screens/Signals/SignalChart.tsx`.

Routes: `/signals`, `/signals/<id>`.

## 4. Verify

Run `bun run fmt` and `bun run lint`.
