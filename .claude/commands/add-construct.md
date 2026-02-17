Add a new construct (project entry) to the site. The user will provide a source directory of images and a slug. $ARGUMENTS

## Steps

### 1. Optimize photos

Run the optimize script with the source directory, slug, and `constructs` category:

```sh
bun scripts/optimize-photos.ts <source-dir> <slug> constructs
```

This converts each image into three WebP variants (`placeholder`, `thumb`, `full`) inside `public/images/constructs/<slug>/` and prints YAML-ready photo metadata to stdout.

### 2. Create the construct entry file

Determine the next entry filename by looking at existing files in `src/screens/Constructs/entries/`.

Ask the user for:

- `title`
- `subtitle` (short description)
- `date` (format: `YYYY.MM`)
- `cover` (which photo file to use as the cover — use the filename without extension)
- `repo` URL (optional — GitHub link)
- Markdown body content (project description)

Use the width/height from the optimize script output for `coverWidth` and `coverHeight`.

Create a new markdown file (e.g. `curse.md`) in `src/screens/Constructs/entries/`. The frontmatter format:

```yaml
---
id: <slug>
title: <title>
subtitle: <subtitle>
date: '<date>'
cover: <cover-file>
coverWidth: <width>
coverHeight: <height>
repo: <optional repo URL>
---
<markdown body content>
```

- `id` must match the slug used in step 1
- `cover` must match one of the processed photo filenames (without extension)

The construct will automatically appear on `/constructs` and be viewable at `/constructs/<slug>`.
