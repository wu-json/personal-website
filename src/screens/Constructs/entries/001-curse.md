---
id: curse
title: Curse
subtitle: Terminal UI for process orchestration
date: '2025.09'
cover: cover
coverWidth: 2292
coverHeight: 1770
linkLabel: source code
link: https://github.com/wu-json/curse
---

![Curse terminal UI](/images/constructs/curse/cover-full.webp)

A dead simple Terminal UI for running processes, configured through a single `curse.toml` file. You define your processes, their dependencies, and optional health checks — and curse handles the rest. It shows each process in a table with live status, memory, and CPU usage, and lets you drill into scrollable logs for any of them.

Built with TypeScript, [React Ink](https://github.com/vadimdemedes/ink), and [Bun](https://bun.sh/).

## Local Development Setups Are Cursed

If you've been writing code for a while, you're no stranger to the sacred art that is reading unmaintained instructions in READMEs.

```
# start local pg and redis
docker compose up

# watch everything in monorepo
pnpm watch:all

# start local dev server
pnpm start:dev:local

# start client app
cd app/client yarn start
```

Existing solutions to this problem have come in various forms.

- **Shell scripts**: How do you view the ongoing output of each process? You could hook into TMux or Wezterm panes but that isn't ideal for everyone.
- **docker-compose**: Requires containerizing all local resources for your application. Not ideal unless you have a neckbeard.
- **process-compose**: Has a lot of features I don't use and feels sluggish.

Out of all of the options above, `process-compose` got the closest to the experience I wanted but was still far from it. It felt quite slow, had limited tooling around logging, and resulted in composed configuration files that were unpleasant to maintain.

So I built curse. A TOML file defines your processes, you run curse, and everything spins up in a single terminal window.

> Building curse exposed a flickering problem in React Ink's renderer — it repaints the entire terminal on every state change, which doesn't hold up when a dozen processes are all streaming output at once. So I [fixed it at the source](https://github.com/vadimdemedes/ink/pull/781), adding incremental rendering that diffs the previous and current output and only rewrites the lines that actually changed.

## Design Principles

I wanted curse to feel like a tool that gets out of the way. A few things guided the design:

**Simplicity.** Scoping curse to the local development use-case means we can drop a lot of the beefier orchestration features that `process-compose` has (e.g. replicas, process forking, etc.). This keeps the feature-set minimal and the config files short.

**Make interacting with logs delightful.** Local logs are really useful, and are often the reason we want to run things locally in the first place. Navigating and interacting with logs should feel like a first-class experience.

**Familiarity.** Coming from `k9s`, constantly having to context switch shortcuts between `k9s` and `process-compose` was unpleasant, especially given that they look so similar. The key-binds in curse are meant to feel warm and familiar so that anyone using vim motions should feel right at home.
