---
id: curse
title: Curse
subtitle: Terminal UI for process orchestration
date: '2025.09'
cover: cover
coverWidth: 2292
coverHeight: 1770
repo: https://github.com/wu-json/curse
---

A terminal UI for running and managing multiple processes in parallel. Built with Go and BubbleTea.

Curse reads a simple YAML config and spins up each process in its own pane — scrollable, color-coded, and easy to monitor. When one crashes, you see it immediately. When you're done, `Ctrl+C` tears everything down cleanly.

The motivation was simple: I got tired of juggling multiple terminal tabs during local development. Docker Compose works for containers, but not every project is containerized. Curse fills that gap — a lightweight orchestrator for bare-metal processes.
