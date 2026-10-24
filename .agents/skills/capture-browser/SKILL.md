---
name: capture-browser
description: >-
  Takes screenshots and videos of the site with agent-browser, using the
  Helium browser. Use when the user wants a screenshot, screen recording, or
  visual check of a page, local or deployed.
---

# Capture browser

Use `agent-browser` (via `npx agent-browser` if it isn't installed) with Helium:

```sh
H=/Applications/Helium.app/Contents/MacOS/Helium
```

Save output to the scratchpad unless the user says otherwise. Never save it in the repo.

## Don't take over the user's screen

The user keeps working while you capture, so:

- Stay headless. Don't use `--headed`, `inspect`, `dashboard`, `connect`, or `--auto-connect`.
- Start Vite with `--open false`. The config opens a browser tab by default.
- Don't open the output files. Give the user the paths, and Read PNGs yourself to check them.
- Don't use `clipboard`, `osascript`, or `screencapture`.

## 1. Start the dev server (local only)

```sh
bun run dev --open false   # run in background, serves http://localhost:3000
```

Wait until `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` prints `200`.

## 2. Open the page in Helium

`--executable-path` only takes effect when the browser starts, so close any running session first:

```sh
npx agent-browser close --all
npx agent-browser --executable-path "$H" open http://localhost:3000/
npx agent-browser set viewport 1440 900
npx agent-browser wait 2500   # let the lily and fonts load
```

- Mobile: `set viewport 390 844` or `set device "iPhone 15 Pro"`.
- Theme: `set media dark`, `light`, or `reduced-motion`.
- Check that it's Helium with `ps -axo command | grep '[H]elium.app/Contents/MacOS/Helium --remote-debugging'`. The user agent still says `HeadlessChrome`, so it won't tell you.

## 3. Screenshot

```sh
npx agent-browser screenshot <out>/home.png          # visible area
npx agent-browser screenshot --full <out>/full.png   # whole page
```

Read the PNG to check it. The canvas shouldn't be blank.

## 4. Video

You need `ffmpeg` (`brew install ffmpeg`). The output can be `.webm` or `.mp4`.

```sh
npx agent-browser record start <out>/demo.mp4 --fps 60 --cursor
npx agent-browser hover @e3   # interact here
npx agent-browser wait 3000
npx agent-browser record stop
```

- `--fps 60` for animations. Leave it out (30 fps) for normal flows.
- `--cursor` shows a pointer. The real cursor isn't recorded.
- `snapshot -i` lists `@eN` refs for `click` and `hover`. Use `mouse move <x> <y>` to point at the canvas.

Check the length with `ffprobe -v error -show_entries format=duration -of csv=p=0 <file>`.

## 5. Edit the video

Use `ffmpeg`. Write a new file each time so the original stays safe. Add `-c:v libx264 -pix_fmt yuv420p` to any `.mp4` output so it plays everywhere.

```sh
# Trim: keep 1s to 3s
ffmpeg -ss 1 -to 3 -i in.webm out.mp4

# Crop: crop=width:height:x:y
ffmpeg -i in.webm -vf "crop=480:360:480:120" out.mp4

# Resize: 720px wide, keep aspect ratio
ffmpeg -i in.webm -vf "scale=720:-2" out.mp4

# Speed up 2x (use 2*PTS to slow down)
ffmpeg -i in.webm -vf "setpts=0.5*PTS" -an out.mp4

# GIF
ffmpeg -i in.webm -vf "fps=15,scale=600:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" out.gif

# Last frame as a PNG
ffmpeg -sseof -0.1 -i in.webm -frames:v 1 frame.png
```

Video pixels match the viewport (1440×900 above). To crop to an element, run `npx agent-browser get box <selector>` and use its x, y, width, and height in `crop`.

To do several edits at once, join filters with commas: `-vf "crop=...,scale=720:-2"`.

## 6. Clean up

Run `npx agent-browser close`, then stop the dev server if you started it.
