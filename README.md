## jasonwu.ink

A working directory of myself.

```
├── Memories       — photo albums (fragments)
├── Signals        — writing and thoughts
├── Constructs     — projects and tools
└── Heroes         — people and influences
```

## Development

Requires [Bun](https://bun.sh).

```sh
bun install
bun dev          # dev server
bun run build    # production build
bun run lint     # oxlint
bun run fmt      # oxfmt
bun test
```

## Adding content

Agent skills in [`.agents/skills/`](.agents/skills) cover adding entries to each section (`add-fragment`, `add-signal`, `add-construct`, `add-hero`).
