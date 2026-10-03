---
name: add-fragment
description: >-
  Adds a Memories photo album (fragment): optimizes photos into
  public/images/fragments/<slug>/ and creates
  src/screens/Memories/fragments/NNN-<slug>.md. Use when the user wants a new
  fragment or photo album, or provides a photo directory and slug for Memories.
---

# Add fragment

## 1. Optimize photos

```sh
bun scripts/optimize-photos.ts <source-dir> <slug>
```

Category defaults to `fragments`. Writes `<file>-{placeholder,small,thumb,full}.webp` to `public/images/fragments/<slug>/` and prints a `photos:` YAML block (file basename + original width/height) to paste into frontmatter.

## 2. Create the entry

File: `src/screens/Memories/fragments/NNN-<slug>.md`, where `NNN` is the highest existing prefix + 1 (zero-padded). The list sorts newest first by filename.

Ask the user for `title`, `date`, `location`, `cover`, and optionally per-photo captions, groupings, and a markdown body.

```yaml
---
id: <slug>
title: <title>
date: 'YYYY.MM.DD'
location: <location>
cover: <file>
groupings: # optional
  <group-id>:
    layout: row # or column
    caption: <optional>
photos:
  - file: <file>
    width: <width>
    height: <height>
    caption: <optional>
    alt: <optional>
    group: <optional group-id>
---
<optional markdown body>
```

- `id` must equal the slug passed to the optimize script.
- `cover` must be one of the `photos[].file` values.
- Photos sharing a `group` render together using that grouping's `layout`.
- Optional `coverClassName` adds classes to the list cover image.

Routes: `/memories`, `/memories/<slug>`.

## 3. Verify

Run `bun run fmt` and `bun run lint`.
