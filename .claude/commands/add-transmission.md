Add a new transmission entry to the site. The user will provide a source image path (or directory) and a slug. $ARGUMENTS

## Steps

### 1. Optimize photos

Stage the image(s) into a temporary directory, then run the optimize script with the `transmissions` category:

```sh
mkdir -p /tmp/transmission-stage
cp <source-image-or-dir/*> /tmp/transmission-stage/
bun scripts/optimize-photos.ts /tmp/transmission-stage <id> transmissions
rm -rf /tmp/transmission-stage
```

This converts each image into three WebP variants (`placeholder`, `thumb`, `full`) inside `public/images/transmissions/<id>/` and prints YAML-ready photo metadata to stdout.

### 2. Determine the next transmission ID

Look at existing files in `src/screens/Transmissions/entries/` and determine the next numeric ID (zero-padded to 3 digits, e.g. `003`).

### 3. Create the transmission entry file

Ask the user for:

- `title` (uppercase, short — e.g. "SIDEWALK FREQ")
- `timestamp` (format: `YYYY.MM.DD // HH:MM:SS`, default to current date/time)
- `location` (e.g. "San Francisco, US")
- `slug` (kebab-case, used in the filename — e.g. "sidewalk-freq")
- Markdown body content (the transmission text, with `![alt](/images/transmissions/<id>/<filename>-full.webp)` for images)

Create a new markdown file (e.g. `003-my-slug.md`) in `src/screens/Transmissions/entries/`. The frontmatter format:

```yaml
---
id: '<id>'
timestamp: '<timestamp>'
title: '<title>'
expanded: false
location: '<location>'
---
<markdown body content with inline images>
```

- `id` is the zero-padded number (e.g. `003`)
- `expanded: false` is always the default
- Images in the body use the format `![alt text](/images/transmissions/<id>/<filename>-full.webp)`

The transmission will automatically appear on `/transmissions` and be viewable at `/transmissions/<id>`.
