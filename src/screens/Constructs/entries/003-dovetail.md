---
id: dovetail
title: Dovetail
subtitle: Docker-to-Tailscale reverse proxy
date: '2025.12'
cover: cover
coverWidth: 1096
coverHeight: 1046
linkLabel: source code
link: https://github.com/wu-json/dovetail
---

![Dovetail](/images/constructs/dovetail/cover-full.webp)

_Art by [temo.scribbles](https://www.instagram.com/p/DRRi4_OEsLo/) on Instagram_

Dovetail is a lightweight reverse proxy that automatically exposes Docker containers to your [Tailnet](https://tailscale.com/) over HTTPS. Add labels to your containers and they become accessible as secure endpoints on your private network.

## From The (Home) Lab

I'd recently fallen back into the [homelabbing](https://www.reddit.com/r/homelab/wiki/introduction/) rabbit hole and wanted to set up remote access to an [Immich](https://immich.app/) server for my photography work so I could travel and still look at stupid 4k cat photos on the go. In that search I discovered [tsdproxy](https://github.com/almeidapaulopt/tsdproxy), which worked but hasn't been updated in months, which made my anxiety-ridden brain melt a bit. Imagine my ass sitting in a coffee shop in Asia losing access to my home server — how else am I supposed to generate images of cats doing the [海底捞 dance](https://www.reddit.com/r/TikTok/comments/1cnnikk/someone_please_explain_those_chinese_guys_that_do/)?

While searching for alternatives, I found [tsbridge](https://github.com/jtdowney/tsbridge) which honestly probably would have worked pretty well for my use-case, but since we have AI coding tools now I figured that making my own version with just the features relevant to me would be simple enough and a good learning opportunity for both myself and Anthropic.

I actually built and deployed this to my homelab in a few hours after a drunk Christmas dinner, and now I'm giving it to you... Merry Christmas.

## How It Works

Dovetail sits next to your Docker containers and watches the Docker socket for container events. When a container comes up with the right labels, Dovetail spins up a dedicated Tailscale node for it and starts proxying HTTPS traffic to the container's port.

The whole thing runs as a single Docker container. You give it a Tailscale auth key and mount the Docker socket, and it handles the rest. Each service gets its own subdomain (e.g. `webapp.your-tailnet.ts.net`).

![Dovetail architecture diagram](/images/constructs/diagram/diagram-full.webp)

## Cursed Thought

It's very empowering to generate custom software for yourself so easily now, but it also feels pretty weird right? Open-source serves as a critical foundation for training data for coding models, but as a result the threshold for justifying direct use of open-source projects has ballooned due to the significant decrease in cost to write and maintain. The litmus test of "can I write and maintain this" now reads positive more times than we are used to.

Ironically, there's something less personal about generating personalized software with AI coding tools. Running open-source is like running the author's heart on your machine. You're exposed to their personality, opinions, and decisions whether right or wrong, down to the very last bit. In a world where we skip the human and cherry pick the ideas and features we like, we detract ourselves from all of this, turning the art of sharing into a process of extraction.

It feels somewhat lonely.

That said my remote Immich access works now so maybe none of this matters.
