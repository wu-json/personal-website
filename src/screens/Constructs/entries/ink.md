---
id: ink
title: Ink
subtitle: React for CLIs
date: '2025.04'
cover: cover
coverWidth: 894
coverHeight: 474
linkLabel: source code
link: https://github.com/vadimdemedes/ink
---

![Ink](/images/constructs/ink/cover-full.webp)

[Ink](https://github.com/vadimdemedes/ink) is a React renderer for the terminal. You build CLI interfaces with the same component model you'd use for a web app — JSX, hooks, flexbox layout — but the output is your terminal. It's maintained by [Vadim Demedes](https://github.com/vadimdemedes) and [Sindre Sorhus](https://github.com/sindresorhus).

I didn't create Ink, but I use it heavily (curse is built on it) and have contributed a few things upstream:

- [**Incremental rendering**](https://github.com/vadimdemedes/ink/pull/781) — Ink's renderer used to repaint the entire terminal on every state change. When a dozen processes are streaming output at once, this causes visible flickering. I added a diffing layer that tracks the previous frame and only rewrites the lines that actually changed.
- [**Flicker fix**](https://github.com/vadimdemedes/ink/pull/836) — A follow-up fix for edge cases in the incremental renderer where certain repaints still caused flicker.
- [**Terminal resize handling**](https://github.com/vadimdemedes/ink/pull/828) — Fixed how Ink responds to terminal resize events so layouts reflow correctly.
