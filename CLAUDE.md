# CLAUDE.md

This file provides context and guidelines for AI assistants working on this project.

## Project Overview

This is a personal website for Jason Wu (jasonwu.io), built as a modern React application.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS v4
- **Package Manager**: Bun (>=1.3.4)
- **Node Version**: 22.x
- **Linting**: Oxlint
- **Formatting**: Oxfmt
- **Git Hooks**: Prek

## Development Commands

- `bun install` - Install dependencies
- `bun dev` - Start development server
- `bun build` - Build for production
- `bun preview` - Preview production build
- `bun run lint` - Run linter
- `bun run format` - Format code

## Code Style Guidelines

- The project uses Oxc toolchain for linting and formatting
- Follow TypeScript best practices
- Use functional React components with hooks
- Tailwind CSS v4 for all styling (no inline styles or CSS modules)

## Key Dependencies

- **react-router-dom**: For routing
- **@fontsource/poppins**: Typography

## Project Structure

- Source code is organized following standard Vite conventions
- Components use TypeScript for type safety

## Important Notes

- This project has migrated from Sass to Tailwind CSS v4
- Recently migrated from pnpm to Bun package manager
- Recently migrated from Biome to Oxc toolchain
- Uses prek instead of husky/lint-staged for git hooks
- Main branch is `main`

## Fragment Format Reference

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

## When Making Changes

1. Always run `bun run lint` and `bun run format` before committing
2. Ensure TypeScript types are properly defined
3. Follow existing code patterns and component structure
