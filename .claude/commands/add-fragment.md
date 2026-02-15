Add a new fragment (photo album) to the site. The user will provide a source directory of images and a slug. $ARGUMENTS

## Steps

### 1. Optimize photos

Run the optimize script with the source directory and slug the user provided:

```sh
bun scripts/optimize-photos.ts <source-dir> <slug>
```

This converts each image into three WebP variants (`placeholder`, `thumb`, `full`) inside `public/images/fragments/<slug>/` and prints YAML-ready photo metadata to stdout.

### 2. Create the fragment file

Determine the next fragment number by looking at existing files in `src/screens/Memories/fragments/` and incrementing.

Create a new markdown file (e.g. `0002.md`) in `src/screens/Memories/fragments/`. Use the YAML output from the optimize script as the `photos` field in the frontmatter.

Ask the user for:
- `title`
- `date` (format: `YYYY.MM.DD`)
- `location`
- `cover` (which photo file to use as the cover)
- `caption` for each photo (optional)
- A short description in markdown (optional, goes below the frontmatter)

The frontmatter format:

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
    caption: <optional caption>
---

<optional description>
```

- `id` must match the slug used in step 1
- `cover` must match one of the photo `file` values

The fragment will automatically appear on `/memories` and be viewable at `/memories/<slug>`.
