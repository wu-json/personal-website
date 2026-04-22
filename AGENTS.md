# AGENTS.md

Context and guidelines for AI assistants and coding agents working on this project.

## Project overview

Personal site for Jason Wu ([jasonwu.io](https://jasonwu.io)): React + TypeScript app with **Memories** (photo fragments), **Signals** (markdown posts), **Constructs** (project entries), and **Heroes** (people). The **Gallery** screen is a first-person Three.js space built with React Three Fiber.

## Tech stack

- **Framework**: React 19 with TypeScript
- **Build**: Vite 7
- **Routing**: [wouter](https://github.com/molefrog/wouter)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **3D**: `three`, `@react-three/fiber`, `@react-three/drei`
- **Markdown**: `react-markdown`, `remark-gfm`, `rehype-raw`
- **Package manager**: Bun (>=1.3.4); **Node**: 22.x (`engines` in `package.json`)
- **Lint / format**: Oxlint, Oxfmt
- **Git hooks**: [prek](https://github.com/j178/prek) (runs on `bun install`, skipped in CI)

## Typography

[Geist](https://vercel.com/font): `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`, and the `geist` package where needed (including pixel variants for gallery UI).

## Development commands

- `bun install` — dependencies + prek hooks locally
- `bun dev` — Vite dev server (repo also has `curse.toml` wrapping the same command)
- `bun run build` — production build
- `bun run preview` — serve production build
- `bun run lint` — oxlint
- `bun run format` — oxfmt
- `bun run optimize-photos` — image pipeline for fragments (see `scripts/optimize-photos.ts`)

## Code style

- Oxc toolchain for lint and format; match existing patterns and import style
- Functional components and hooks; keep TypeScript types honest
- Prefer Tailwind v4 for layout and UI chrome; Three.js / canvas code may use programmatic styles where appropriate

## Content locations

| Section    | Entry data                                                                            |
| ---------- | ------------------------------------------------------------------------------------- |
| Memories   | `src/screens/Memories/fragments/*.md`, images under `public/images/fragments/<slug>/` |
| Signals    | `src/screens/Signals/entries/*.md`, images under `public/images/signals/<id>/`        |
| Constructs | `src/screens/Constructs/entries/*.md` (+ optimized assets per add-construct workflow) |
| Heroes     | `src/screens/Heroes/entries/*.md`                                                     |

Agent workflows: `.cursor/skills/` (`add-fragment`, `add-signal`, `add-construct`).

## Notes

- Migrated from Sass → Tailwind v4; pnpm → Bun; Biome → Oxc; husky → prek
- Default branch: `main`

## Fragment format reference

Each fragment markdown file in `src/screens/Memories/fragments/` has YAML frontmatter with a `photos` array and an optional `groupings` map.

### Photo fields

| Field     | Type     | Required | Description                                    |
| --------- | -------- | -------- | ---------------------------------------------- |
| `file`    | `string` | yes      | Filename without extension                     |
| `width`   | `number` | yes      | Original image width in px                     |
| `height`  | `number` | yes      | Original image height in px                    |
| `caption` | `string` | no       | Caption displayed in lightbox                  |
| `alt`     | `string` | no       | Alt text for accessibility                     |
| `group`   | `string` | no       | ID referencing an entry in the `groupings` map |

### Groupings

The top-level `groupings` map defines how grouped photos are laid out. Each key is an arbitrary group ID; the value has a `layout` field.

| Layout   | Effect              |
| -------- | ------------------- |
| `row`    | Side-by-side (flex) |
| `column` | Vertically stacked  |

### Example usage

```yaml
---
groupings:
  a:
    layout: row

photos:
  - file: DSCF0839
    width: 3328
    height: 4992
    group: a
  - file: DSCF0859
    width: 3328
    height: 4992
    group: a
  - file: DSCF0860
    width: 2956
    height: 1971
---
```

`DSCF0839` + `DSCF0859` = horizontal row. `DSCF0860` = solo. Groups can contain any number of photos.

## Signals markdown reference

Entry bodies live in `src/screens/Signals/entries/*.md` (after YAML frontmatter). They are rendered by **`MarkdownBody`** (`src/screens/Signals/MarkdownBody.tsx`) on the signal detail page and on the full (non-collapsed) list preview. The wrapper uses **`signal-prose signal-entry`** for long-form spacing (paragraph gaps, line height); other screens use `signal-prose` without `signal-entry`. Do not duplicate markdown pipeline config elsewhere—extend behavior in `MarkdownBody` if needed.

### Supported syntax

| Feature                      | Notes                                                                                                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GitHub Flavored Markdown** | Tables, strikethrough, task lists, autolinks, **footnotes** (`remark-gfm`).                                                                                                                                                                    |
| **Raw HTML**                 | Allowed via `rehype-raw` (e.g. `<img width height>` for progressive images).                                                                                                                                                                   |
| **Images**                   | `<img src="…-full.webp" width="…" height="…">` under `/images/signals/<id>/` or `/images/fragments/<slug>/` gets progressive placeholder loading.                                                                                              |
| **Footnotes**                | Inline `[^shortId]`; definitions at end of body (blank line before first `[^shortId]:`). Reuse the same `[^shortId]` for multiple callouts. Renders a `// refs` section (styled in `index.css` under `.signal-prose section[data-footnotes]`). |
| **Links**                    | `https://…` opens in a new tab with `rel="noopener noreferrer"`. Site paths like `/memories/…` stay normal in-page anchors.                                                                                                                    |

### List index vs detail

Long posts use a collapsed teaser on `/signals` unless frontmatter has `expanded: true`. Footnote definitions and full body appear on `/signals/<id>`.

## When making changes

1. Run `bun run lint` and `bun run format` before committing
2. Keep TypeScript types accurate
3. Follow existing component and file patterns
