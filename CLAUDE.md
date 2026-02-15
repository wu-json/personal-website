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

## When Making Changes

1. Always run `bun run lint` and `bun run format` before committing
2. Ensure TypeScript types are properly defined
3. Follow existing code patterns and component structure
