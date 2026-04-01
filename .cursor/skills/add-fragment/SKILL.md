---
name: add-fragment
description: >-
  Adds a new Memories photo album (fragment): optimizes images with
  scripts/optimize-photos.ts, creates YAML frontmatter in
  src/screens/Memories/fragments/. Use when the user wants a new fragment,
  photo album, or /add-fragment workflow; when they provide a source image
  directory and slug for Memories.
---

# Add fragment (photo album)

## 1. Optimize photos

```sh
bun scripts/optimize-photos.ts <source-dir> <slug>
```

Default category is `fragments`. Output goes to `public/images/fragments/<slug>/` (WebP variants: `placeholder`, `thumb`, `full`). Capture the printed `photos:` YAML for frontmatter.

## 2. Create the fragment markdown file

Pick the next sort prefix by scanning `src/screens/Memories/fragments/*.md`: filenames use `NNN-kebab-slug.md` (three-digit zero-padded number, then slug). Use the next number (e.g. after `009-…` use `010-<slug>.md`). Listing is **newest first** by filename sort.

Ask the user for:

- `title`
- `date` (`YYYY.MM.DD`, quoted in YAML)
- `location`
- `cover` (must match a photo `file` value, no extension)
- Optional: per-photo `caption`; optional markdown body below frontmatter
- Optional: `groupings` for row/column layouts (see project `AGENTS.md` fragment reference)

Frontmatter:

```yaml
---
id: <slug>
title: <title>
date: '<date>'
location: <location>
cover: <cover-file>
photos:
  - file: <filename>
    width: <width>
    height: <height>
    caption: <optional>
    group: <optional group id>
---
```

`id` must match the slug passed to the optimize script. `cover` must be one of the `file` values.

Routes: listed on `/memories`, detail at `/memories/<slug>` (slug is `id`).

## 3. Before commit

Run `bun run lint` and `bun run format` per project convention.
