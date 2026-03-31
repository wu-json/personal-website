---
name: add-construct
description: >-
  Adds a new Constructs project entry: optimizes images with category
  constructs, creates frontmatter markdown in
  src/screens/Constructs/entries/. Use when the user wants a new construct or
  /add-construct workflow; when they provide a source image directory and slug
  for Constructs.
---

# Add construct

## 1. Optimize photos

```sh
bun scripts/optimize-photos.ts <source-dir> <slug> constructs
```

Output: `public/images/constructs/<slug>/` with WebP variants. Capture printed dimensions for `coverWidth` / `coverHeight`.

## 2. Create the construct entry file

Scan `src/screens/Constructs/entries/*.md` for the next `NNN` prefix (same pattern as other sections: `NNN-<slug>.md`).

Ask the user for:

- `title`
- `subtitle`
- `date` (`YYYY.MM`, quoted in YAML)
- `cover` (filename without extension; must match a processed photo basename)
- Optional: `linkLabel`, `link`
- Markdown body (project description)

Use width/height from the optimize script output for the cover image as `coverWidth` and `coverHeight`.

Frontmatter:

```yaml
---
id: <slug>
title: <title>
subtitle: <subtitle>
date: '<date>'
cover: <cover-file>
coverWidth: <width>
coverHeight: <height>
linkLabel: <optional>
link: <optional URL>
---
```

`id` must match the slug passed to the optimize script.

Save under `src/screens/Constructs/entries/` with the established `NNN-<slug>.md` naming.

Routes: `/constructs` and `/constructs/<slug>`.

## 3. Before commit

Run `bun run lint` and `bun run format`.
