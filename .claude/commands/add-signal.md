Add a new signal entry to the site. The user will provide a source image path (or directory) and a slug. $ARGUMENTS

## Steps

### 1. Optimize photos

Stage the image(s) into a temporary directory, then run the optimize script with the `signals` category:

```sh
mkdir -p /tmp/signal-stage
cp <source-image-or-dir/*> /tmp/signal-stage/
bun scripts/optimize-photos.ts /tmp/signal-stage <id> signals
rm -rf /tmp/signal-stage
```

This converts each image into three WebP variants (`placeholder`, `thumb`, `full`) inside `public/images/signals/<id>/` and prints YAML-ready photo metadata to stdout.

### 2. Determine the next signal ID

Look at existing files in `src/screens/Signals/entries/` and determine the next numeric ID (zero-padded to 3 digits, e.g. `003`).

### 3. Create the signal entry file

Ask the user for:

- `title` (optional; uppercase, short — e.g. "SIDEWALK FREQ". Omit the frontmatter line entirely for untitled entries.)
- `timestamp` (format: `YYYY.MM.DD // HH:MM:SS`, default to current date/time)
- `location` (e.g. "San Francisco, US")
- `slug` (kebab-case, used in the filename — e.g. "sidewalk-freq")
- Markdown body content (the signal text, with `![alt](/images/signals/<id>/<filename>-full.webp)` for images)

Create a new markdown file (e.g. `003-my-slug.md`) in `src/screens/Signals/entries/`. The frontmatter format:

```yaml
---
id: '<id>'
timestamp: '<timestamp>'
title: '<title>' # optional — omit entirely for untitled entries
expanded: false
location: '<location>'
---
<markdown body content with inline images>
```

- `id` is the zero-padded number (e.g. `003`)
- `expanded: false` is always the default
- `title` is optional; when omitted, the entry shows only the meta row (`[id] timestamp — location`) above the body
- Images in the body use the format `![alt text](/images/signals/<id>/<filename>-full.webp)`

The signal will automatically appear on `/signals` and be viewable at `/signals/<id>`.
