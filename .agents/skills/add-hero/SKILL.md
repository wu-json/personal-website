---
name: add-hero
description: >-
  Adds a Heroes entry (a person or influence): optimizes images into
  public/images/heroes/<slug>/ and creates
  src/screens/Heroes/entries/NNN-<slug>.md. Use when the user wants a new hero,
  or provides images and a slug for Heroes.
---

# Add hero

## 1. Optimize images

```sh
bun scripts/optimize-photos.ts <source-dir> <slug> heroes
```

Writes `<file>-{placeholder,small,thumb,full}.webp` to `public/images/heroes/<slug>/` and prints each file's original width/height.

## 2. Create the entry

File: `src/screens/Heroes/entries/NNN-<slug>.md`, where `NNN` is the highest existing prefix + 1 (zero-padded). The list sorts oldest first by filename, so new heroes appear last.

Ask the user for `title`, `subtitle`, `cover`, optional `location` and `link`/`linkLabel`, and the markdown body.

```yaml
---
id: <slug>
title: <name>
subtitle: <role, e.g. Photographer>
location: <optional>
cover: <file>
coverWidth: <width>
coverHeight: <height>
coverPosition: <optional CSS object-position>
linkLabel: <optional>
link: <optional URL>
---
<img src="/images/heroes/<slug>/<file>-full.webp" alt="<alt>" width="<width>" height="<height>">

<markdown body>
```

- `id` must equal the slug passed to the optimize script.
- `cover` is a processed file basename; `coverWidth`/`coverHeight` come from the script output.
- Body images: use `<img>` with `width` and `height` to get progressive loading. Markdown `![]()` renders a plain image.

Routes: `/heroes`, `/heroes/<slug>`.

## 3. Verify

Run `bun run fmt` and `bun run lint`.
