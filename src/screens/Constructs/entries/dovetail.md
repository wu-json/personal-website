---
id: dovetail
title: Dovetail
subtitle: Docker-to-Tailscale reverse proxy
date: '2025.12'
cover: cover
coverWidth: 1196
coverHeight: 1196
repo: https://github.com/wu-json/dovetail
---

A reverse proxy that automatically connects Docker containers to your Tailscale network. Run a container with a label, and Dovetail handles the rest — provisioning a Tailscale node and proxying traffic to the right port.

No port forwarding. No DNS fiddling. Just `docker compose up` and your service is reachable by name on your tailnet.

Dovetail watches the Docker socket for container events and manages Tailscale nodes as sidecars. When a container comes up, Dovetail spins up a corresponding Tailscale instance. When it goes down, the node is cleaned up automatically.
