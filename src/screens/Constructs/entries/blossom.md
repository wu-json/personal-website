---
id: blossom
title: Blossom
subtitle: AI conversational language learning
date: '2025.12'
cover: cover
coverWidth: 2238
coverHeight: 2794
linkLabel: source code
link: https://github.com/wu-json/blossom
---

![Blossom](/images/constructs/blossom/cover-full.webp)

Blossom is an AI language learning app for Japanese, Chinese, and Korean. It's built with Bun, React, and Claude — and compiles to a single binary that runs locally on your machine.

## How It Works

You have conversations with an AI tutor that adapts to your level. The app tracks vocabulary you encounter and organizes it into a system inspired by flowers — each word is a petal, and groups of related vocabulary bloom into flowers. There's a Meadow where you can see everything you've learned growing over time.

## Local-First

Blossom runs entirely on your machine. Your data stays local — no accounts, no cloud sync, no telemetry. You bring your own Anthropic API key and that's the only external dependency. The whole thing ships as a single binary, so installation is just downloading a file and running it.

For local development, it uses [curse](https://github.com/wu-json/curse) to orchestrate all the processes — which felt like a nice excuse to dogfood my own tooling.
