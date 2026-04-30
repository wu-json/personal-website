## jasonwu.ink

A working directory of myself.

```
├── Memories       — photo albums (fragments)
├── Signals        — writing and thoughts
├── Constructs     — projects and tools
└── Heroes         — people and influences
```

## Stack

React and TypeScript, Vite, Tailwind CSS v4, [wouter](https://github.com/molefrog/wouter) for routing. Package management and scripts use [Bun](https://bun.sh) (see `engines` in `package.json` for supported Bun / Node versions).

## Local development

```sh
bun install
bun dev
```

If you use [curse](https://github.com/wu-json/curse), `curse` runs the same dev command (`bun dev`) via `curse.toml`.

Other useful scripts:

```sh
bun run build    # production build
bun run preview  # serve production build locally
bun run lint     # oxlint
bun run format   # oxfmt
```

Git hooks are installed with [prek](https://github.com/j178/prek) on `bun install` (skipped in CI).

## Adding content

Agent-oriented workflows live under `.agents/skills/` (e.g. **add-fragment**, **add-signal**, **add-construct**): image optimization and frontmatter paths for each section. They follow the [Agent Skills](https://agentskills.io/specification) standard, so any compatible harness (pi, Claude Code, etc.) auto-discovers them.
