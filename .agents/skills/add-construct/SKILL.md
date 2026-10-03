---
name: add-construct
description: >-
  Adds a Constructs project entry: optimizes images into
  public/images/constructs/<slug>/ and creates
  src/screens/Constructs/entries/NNN-<slug>.md. Use when the user wants a new
  construct or project, or provides images and a slug for Constructs.
---

# Add construct

## 1. Optimize images

```sh
bun scripts/optimize-photos.ts <source-dir> <slug> constructs
```

Writes `<file>-{placeholder,small,thumb,full}.webp` to `public/images/constructs/<slug>/` and prints each file's original width/height.

## 2. Create the entry

File: `src/screens/Constructs/entries/NNN-<slug>.md`, where `NNN` is the highest existing prefix + 1 (zero-padded). The list sorts newest first by filename.

Ask the user for `title`, `subtitle`, `date`, `cover`, optional `link`/`linkLabel`, and the markdown body.

```yaml
---
id: <slug>
title: <title>
subtitle: <subtitle>
date: 'YYYY.MM'
cover: <file>
coverWidth: <width>
coverHeight: <height>
coverPosition: <optional CSS object-position>
linkLabel: <optional>
link: <optional URL>
---
<img src="/images/constructs/<slug>/<file>-full.webp" alt="<alt>" width="<width>" height="<height>">

<markdown body>
```

- `id` must equal the slug passed to the optimize script.
- `cover` is a processed file basename; `coverWidth`/`coverHeight` come from the script output.
- Body images: use `<img>` with `width` and `height` to get progressive loading. Markdown `![]()` renders a plain image.

Routes: `/constructs`, `/constructs/<slug>`.

## 3. Verify

Run `bun run fmt` and `bun run lint`.
