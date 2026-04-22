---
status: implemented
---

# Rename Transmissions → Signals

Rename the **Transmissions** section of the site to **Signals** end-to-end: route, screen folder, components, types, CSS class namespace, copy, image asset path, and both the Cursor skill (`add-transmission`) and Claude Code slash command (`/add-transmission`) that drive new-entry workflows.

## Goals

- All user-facing labels read **Signals** / "signal" instead of **Transmissions** / "transmission".
- Canonical route is `/signals` and `/signals/:id`. No compatibility redirects (site is personal, low-traffic, no SEO commitment).
- Code identifiers (`Transmission`, `TransmissionsScreen`, `TransmissionDetail`, `transmission-prose`, etc.) are renamed to the `Signal` family.
- Agent workflows that currently create "transmission" entries become `add-signal` workflows, in both `.cursor/skills/` and `.claude/commands/`.
- `AGENTS.md` + `README.md` describe the Signals section, not Transmissions.
- Build passes, `bun run lint` and `bun run format` are clean, no dangling `transmission` references except in archived `docs/wu-json/specs/archived/**` (historical record — not touched).

## Non-goals

- No change to rendering behavior, markdown pipeline, footnote styling, infinite-scroll behavior, or lightbox behavior. Pure rename.
- No redirect shim from `/transmissions` → `/signals`. Stale links (including the one in `src/screens/Memories/fragments/010-stay-safe-out-there.md`) are updated inline.
- Not renaming the CSS-level concept of "long-form entry prose" classes to something neutral like `entry-prose`. We keep them tied to the section name and rename to `signal-prose` / `signal-entry` / `signal-list`. (Called out because it is a judgment call; see **Open questions** if we'd rather decouple.)
- Not renaming the archived specs under `docs/wu-json/specs/archived/` even though they reference "transmissions". Those are historical.

## Scope map

Based on a full repo scan (`grep -i transmission`), there are three axes of change.

### 1. App code (`src/`)

| File                                                              | What changes                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/App.tsx`                                                     | Import `SignalsScreen`, `SignalDetail`; routes become `/signals` and `/signals/:id`.                                                                                                                                                                                                                                                                                   |
| `src/components/Sidebar/index.tsx`                                | `to='/signals'`, `pathname.startsWith('/signals')`, link label `Signals`.                                                                                                                                                                                                                                                                                              |
| `src/screens/Transmissions/` → `src/screens/Signals/`             | Entire directory renamed.                                                                                                                                                                                                                                                                                                                                              |
| `src/screens/Signals/index.tsx`                                   | `TransmissionsScreen` → `SignalsScreen`; variable `transmissions` → `signals`; `aria-label` wording ("View full signal…"); class names updated; navigate target `/signals/${s.id}`; header subtitle `// stream open` → `// live`; keep existing literal copy `// preview truncated — open for full signal` / `// loading more signal…` (already on-theme, just stays). |
| `src/screens/Signals/TransmissionDetail.tsx` → `SignalDetail.tsx` | File rename; component `TransmissionDetail` → `SignalDetail`; import from `./data`; back-link target `/signals`; placeholder text `// transmission not found in relay logs` → `// signal not found in relay logs`; `// end of transmission` → `// end of signal`; class name updates.                                                                                  |
| `src/screens/Signals/data.ts`                                     | Type `Transmission` → `Signal`; exported array `transmissions` → `signals`.                                                                                                                                                                                                                                                                                            |
| `src/screens/Signals/preview.ts`                                  | Rename helpers: `parseFirstImgFromTransmissionBody` → `parseFirstImgFromSignalBody`, `shouldCollapseTransmissionList` → `shouldCollapseSignalList`, `transmissionPlainExcerpt` → `signalPlainExcerpt`. Update callers.                                                                                                                                                 |
| `src/screens/Signals/MarkdownBody.tsx`                            | JSDoc comments reference "signal" instead of "transmission"; `@see AGENTS.md → "Signals markdown reference"`.                                                                                                                                                                                                                                                          |
| `src/screens/Signals/entries/*.md`                                | **Files stay in place**, no content rename. Bodies still reference `/images/transmissions/<id>/…` — updated in step 2 below.                                                                                                                                                                                                                                           |

### 2. CSS + asset paths

| Where                                                     | Change                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.css`                                           | Rename class namespace: `.transmission-prose` → `.signal-prose`, `.transmission-entry` → `.signal-entry`, `.transmission-list` → `.signal-list`. Update the footnotes header `content: '// ref nodes'` → `content: '// refs'`. Keep the comment `/* Focus ring (used on signal list previews) */`. This is a ~60-occurrence rename inside one file; do it with a scoped replace. |
| Consumers of `.transmission-prose` outside Signals        | Update class names in: `src/screens/Memories/FragmentDetail.tsx`, `src/screens/Memories/components/GroupLightbox.tsx`, `src/screens/Memories/components/Lightbox.tsx`, `src/screens/Heroes/HeroDetail.tsx`, `src/screens/Constructs/ConstructDetail.tsx`. (These currently piggyback on Signals prose styling — keep that coupling, just rename.)                                |
| `public/images/transmissions/` → `public/images/signals/` | Rename the on-disk folder. Currently contains `002/` and `003/`.                                                                                                                                                                                                                                                                                                                 |
| Signal entry markdown bodies                              | Swap `<img src="/images/transmissions/…">` → `<img src="/images/signals/…">` in `src/screens/Signals/entries/002-sidewalk-freq.md` and `003-chinatown-wars.md`.                                                                                                                                                                                                                  |
| Cross-link in Memories                                    | `src/screens/Memories/fragments/010-stay-safe-out-there.md` — `[Stay Safe Out There](/transmissions/004)` → `[Stay Safe Out There](/signals/004)`.                                                                                                                                                                                                                               |

### 3. Agent workflows + docs

| Where                                                                     | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.cursor/skills/add-transmission/` → `.cursor/skills/add-signal/`         | Directory rename.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `.cursor/skills/add-signal/SKILL.md`                                      | Frontmatter `name: add-signal`; description rewritten ("Adds a new Signals entry…"); body rewritten to say _signal_ / `signals` / `src/screens/Signals/entries/`, and to use `/tmp/signal-stage` + `bun scripts/optimize-photos.ts /tmp/signal-stage <id> signals`. Output path: `public/images/signals/<id>/`. Routes: `/signals` and `/signals/<id>`. Cross-ref `AGENTS.md → "Signals markdown reference"`.                                                                                                                                                                                                           |
| `.claude/commands/add-transmission.md` → `.claude/commands/add-signal.md` | Same content overhaul as the Cursor skill, matched to Claude Code's prompt style.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Agent doc footnote references                                             | Both renamed skill/command docs mention the `// ref nodes` block when explaining footnote rendering — update those to `// refs`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `optimize-photos.ts` category arg                                         | The script currently takes a category string (`transmissions` is what callers pass). **Check whether the script hardcodes known categories**; if it does, add `signals` (and decide whether to keep `transmissions` for backward compat — probably drop it once assets are moved). If it's a pass-through string, nothing to do beyond updating the agent docs. **Action item during rip: read `scripts/optimize-photos.ts` first and handle this before touching skills.**                                                                                                                                             |
| `AGENTS.md`                                                               | Replace every "Transmissions" section-name occurrence with "Signals" (lines 7, 46, 50, 106, 108, 116, 117, 122). Rename the heading "Transmissions markdown reference" → "Signals markdown reference". Update the workflow list from `add-transmission` → `add-signal`. Update path `src/screens/Transmissions/entries/*.md` → `src/screens/Signals/entries/*.md` and `/images/transmissions/<id>/` → `/images/signals/<id>/`. Update the footnotes description that references `// ref nodes` → `// refs`, and the class path `.transmission-prose section[data-footnotes]` → `.signal-prose section[data-footnotes]`. |
| `README.md`                                                               | `├── Transmissions — writing and thoughts` → `├── Signals — writing and thoughts`. `add-transmission` → `add-signal` in the agent workflows paragraph.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Design notes

### Why rename the CSS classes too

`transmission-prose` is applied outside the Signals screen (Memories lightbox, Fragment detail, Hero detail, Construct detail). Those consumers just want "the long-form prose styling we already defined." Renaming to `signal-prose` keeps the tie to the canonical section. An alternative is to rename it to something neutral (`entry-prose`), but that's a wider semantic change and is out of scope for this rename. Listed under open questions.

### Route + file coupling

We use `import.meta.glob('./entries/*.md', …)` in `data.ts` — the entry filenames are not user-visible, so they stay as-is (`001-initial-boot-seq.md`, etc.). Only the folder they live in (`Transmissions/entries/` → `Signals/entries/`) and their image-src paths change.

### Single-grep acceptance

After the rip, `rg -i transmission -g '!docs/wu-json/specs/archived/**'` should return zero hits. That's the acceptance gate.

## Implementation plan (rip order)

Do it in this order so the app keeps building between steps where possible, and so the big mechanical renames happen before the manual cleanup.

1. **Move the image folder** — `git mv public/images/transmissions public/images/signals`.
2. **Move the screen folder** — `git mv src/screens/Transmissions src/screens/Signals` and `git mv src/screens/Signals/TransmissionDetail.tsx src/screens/Signals/SignalDetail.tsx`.
3. **Rename type + identifiers inside `src/screens/Signals/`** — `Transmission` → `Signal`, `transmissions` → `signals`, component names, helper names in `preview.ts`, JSDoc.
4. **Update callers** — `src/App.tsx`, `src/components/Sidebar/index.tsx`, signals screen body copy, and cross-link in `src/screens/Memories/fragments/010-stay-safe-out-there.md`.
5. **Rename CSS classes in `src/index.css`** — `.transmission-prose` / `.transmission-entry` / `.transmission-list` → `.signal-*`. Then update every consumer in `src/screens/Memories/…`, `src/screens/Heroes/HeroDetail.tsx`, `src/screens/Constructs/ConstructDetail.tsx`.
6. **Update signal entry markdown bodies** — swap `/images/transmissions/` → `/images/signals/` inside `src/screens/Signals/entries/002-*.md` and `003-*.md`.
7. **Handle `scripts/optimize-photos.ts`** — read it, see if `transmissions` is a hardcoded category; if so, replace with `signals`.
8. **Rename agent workflow directories**
   - `git mv .cursor/skills/add-transmission .cursor/skills/add-signal`
   - `git mv .claude/commands/add-transmission.md .claude/commands/add-signal.md`
9. **Rewrite the two agent docs** (`.cursor/skills/add-signal/SKILL.md`, `.claude/commands/add-signal.md`) end-to-end with the new naming, new stage dir (`/tmp/signal-stage`), new category (`signals`), new output path (`public/images/signals/<id>/`), and new routes.
10. **Rewrite `AGENTS.md`** sections that mention Transmissions.
11. **Rewrite `README.md`** tree + workflows list.
12. **Verify**
    - `rg -i transmission -g '!docs/wu-json/specs/archived/**'` → no hits.
    - `bun run lint`
    - `bun run format`
    - `bun run build`
    - `bun dev` — manually click through `/signals`, `/signals/002`, `/signals/003`, sidebar link, and the `/signals/004` link from the Memories fragment.

## Risks / watch-outs

- **Class-rename typos.** `transmission-prose` appears in 6 files and ~60 lines of CSS. One stray `transmission-prose` in JSX leaves prose unstyled. Do a final `rg transmission-` pass.
- **Signal entry image paths.** Easy to miss the two `<img src="/images/transmissions/…">` lines inside the entry markdown bodies.
- **`scripts/optimize-photos.ts` category literal.** If it's hardcoded, the new skill's command `bun scripts/optimize-photos.ts … signals` will fail silently (wrong path) or loudly (unknown category) without a script edit.
- **Memories cross-link.** `/transmissions/004` inside `010-stay-safe-out-there.md` will 404 after the route change if not updated.
- **Archived docs under `docs/wu-json/specs/archived/`** still say "transmissions" — intentional, do not touch.

## Copy tweaks folded in

Taken alongside the rename:

- Signals page subtitle: `// stream open` → `// live`.
- Footnote block header: `// ref nodes` → `// refs` (CSS `content:` string in `src/index.css`, plus the references in `AGENTS.md` and the renamed agent skill/command docs).

## Open questions

1. Do we want to also rename `.transmission-prose` → a section-neutral class like `.entry-prose`, given it's used by five sections (Memories, Heroes, Constructs, Signals, and lightboxes)? Out of scope for this spec, but worth flagging for a follow-up.
2. Confirm: no redirect from `/transmissions` → `/signals`. (Assumed yes; personal site.)
