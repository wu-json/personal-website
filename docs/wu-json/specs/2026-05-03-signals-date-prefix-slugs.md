---
status: ready
---

# Signals: date-prefix slug naming

## Goals

- Replace the sequential numeric ID scheme (`001`, `002`, …) for signals with **date-prefixed slugs**: `YYYY-MM-DD-<title-slug>`
- Match URLs like `https://mariozechner.at/posts/2026-04-08-ive-sold-out/` — date prefix in front, kebab-slug after
- More robust than a sequence: dates are globally meaningful, no collision issues from reordering or inserting entries, self-documenting filenames
- No backwards compatibility needed (no external links, no readers to break)

## Non-goals

- Changing the `timestamp` frontmatter field format (stays `YYYY.MM.DD // HH:MM:SS`)
- Changing the routing parameter name (`:id` stays `:id`; the value just changes shape)
- Changing any other content type (Memories, Constructs, Heroes)
- Changing sort order behavior (current `b.id.localeCompare(a.id)` is preserved and remains correct)

## Design

### File naming

| Before                                                | After                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `src/screens/Signals/entries/001-initial-boot-seq.md` | `src/screens/Signals/entries/2026-02-14-initial-boot-seq.md` |
| `src/screens/Signals/entries/002-sidewalk-freq.md`    | `src/screens/Signals/entries/2026-02-21-sidewalk-freq.md`    |
| `src/screens/Signals/entries/003-chinatown-wars.md`   | `src/screens/Signals/entries/2026-03-22-chinatown-wars.md`   |
| `…`                                                   | `…`                                                          |

The date prefix comes from the existing `timestamp` frontmatter (the date portion, `.` → `-`). The title-slug portion stays unchanged from the current filename (everything after `NNN-`).

For **new entries** going forward, the date prefix is the `timestamp` date (same convention).

### `id` field

The `id` frontmatter field changes from `'001'` to the full date-slug:

```yaml
# Before
id: '001'

# After
id: '2026-02-14-initial-boot-seq'
```

We keep `id` in frontmatter (rather than deriving from filename) so the RSS plugin (`src/plugins/rss.ts`) doesn't need a separate filename→id convention. The id must exactly match the filename stem.

### Image paths

Images live at `public/images/signals/<id>/`. Directories get renamed to match the new date-slug IDs:

```
public/images/signals/002/  →  public/images/signals/2026-02-21-sidewalk-freq/
public/images/signals/003/  →  public/images/signals/2026-03-22-chinatown-wars/
```

Entries 001, 004, 005, 006, and 007 have no image directories — nothing to rename for them.

Image references **inside markdown bodies** must also be updated. Only entries 002 and 003 contain `<img>` tags with path references:

| Entry                   | Old path               | New path                                     |
| ----------------------- | ---------------------- | -------------------------------------------- |
| `002-sidewalk-freq.md`  | `/images/signals/002/` | `/images/signals/2026-02-21-sidewalk-freq/`  |
| `003-chinatown-wars.md` | `/images/signals/003/` | `/images/signals/2026-03-22-chinatown-wars/` |

The `scripts/optimize-photos.ts` script accepts `category` and `slug` arguments — passing the date-slug as the slug works unchanged (it writes into `public/images/<category>/<slug>/`).

### Sorting

Current sort in `data.ts`: `b.id.localeCompare(a.id)`.

Date-prefixed slugs like `'2026-02-14-initial-boot-seq'` sort correctly with `localeCompare` because ISO date strings are lexicographically monotonic. The same comparator produces the same ordering behavior (ascending by date, which matches ascending by numeric id).

If two entries share the same date, the title-slug portion acts as an alphabetical tiebreaker. This is acceptable — same-date entries are rare and alphabetical ordering is deterministic.

### Routing

Routes stay the same:

```
/signals       — list
/signals/:id   — detail (id is now a date-slug, e.g. /signals/2026-02-14-initial-boot-seq)
```

No router or component changes needed. Only param values change shape.

### RSS feed

`src/plugins/rss.ts` constructs links as `${BASE_URL}/signals/${s.id}`. Since `id` is now the date-slug, RSS permalinks automatically update:

```
https://jasonwu.ink/signals/2026-02-14-initial-boot-seq
```

The feed sorts by `id.localeCompare` which remains correct.

### Edge case: date collisions

If two entries have the same date AND same title-slug, the filenames would collide. This is extremely unlikely (same day + same title), but for future entries the add-signal skill should note: pick a unique slug. The existing migration has no collisions.

## Files to change

| File                                                | Change                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/screens/Signals/entries/001-…` through `007-…` | Rename files; update `id` frontmatter; update image paths in body (002, 003 only)    |
| `public/images/signals/002/`                        | Rename to `2026-02-21-sidewalk-freq/`                                                |
| `public/images/signals/003/`                        | Rename to `2026-03-22-chinatown-wars/`                                               |
| `src/screens/Signals/data.ts`                       | No code changes (reads `id` from frontmatter, sort works as-is)                      |
| `src/screens/Signals/SignalDetail.tsx`              | No changes (uses `id` param + `.find()`)                                             |
| `src/screens/Signals/index.tsx`                     | No changes (uses `s.id` for routing)                                                 |
| `src/App.tsx`                                       | No changes                                                                           |
| `src/plugins/rss.ts`                                | No code changes (links use `s.id`)                                                   |
| `src/plugins/rss.test.ts`                           | No changes (tests parsing mechanics, not ID format; fixtures use placeholder values) |
| `scripts/optimize-photos.ts`                        | No changes (takes arbitrary slug string)                                             |
| `.agents/skills/add-signal/SKILL.md`                | Rewrite naming convention steps                                                      |
| `AGENTS.md`                                         | Update Signal file naming reference if it mentions `NNN-` pattern                    |

## Migration plan

### Step 1: Compute new IDs

For each existing entry, extract `YYYY-MM-DD` from `timestamp` and combine with the existing title-slug from the filename:

| Old file                     | Timestamp                | New id                           |
| ---------------------------- | ------------------------ | -------------------------------- |
| `001-initial-boot-seq.md`    | `2026.02.14 // 21:00:00` | `2026-02-14-initial-boot-seq`    |
| `002-sidewalk-freq.md`       | `2026.02.21 // 15:30:00` | `2026-02-21-sidewalk-freq`       |
| `003-chinatown-wars.md`      | `2026.03.22 // 12:00:00` | `2026-03-22-chinatown-wars`      |
| `004-stay-safe-out-there.md` | `2026.03.29 // 12:00:00` | `2026-03-29-stay-safe-out-there` |
| `005-david.md`               | `2026.04.12 // 12:11:00` | `2026-04-12-david`               |
| `006-throw-it-away.md`       | `2026.04.16 // 16:50:12` | `2026-04-16-throw-it-away`       |
| `007-farewells.md`           | `2026.04.28 // 09:55:10` | `2026-04-28-farewells`           |

### Step 2: Rename entry files

```sh
git mv src/screens/Signals/entries/001-initial-boot-seq.md "src/screens/Signals/entries/2026-02-14-initial-boot-seq.md"
git mv src/screens/Signals/entries/002-sidewalk-freq.md "src/screens/Signals/entries/2026-02-21-sidewalk-freq.md"
# … etc for all 7
```

### Step 3: Update frontmatter `id` in each renamed file

Replace `id: '001'` → `id: '2026-02-14-initial-boot-seq'` etc.

### Step 4: Rename image directories

```sh
git mv public/images/signals/002 public/images/signals/2026-02-21-sidewalk-freq
git mv public/images/signals/003 public/images/signals/2026-03-22-chinatown-wars
```

### Step 5: Update image path references in markdown bodies

In `002-sidewalk-freq.md` (now `2026-02-21-sidewalk-freq.md`):

- `/images/signals/002/IMG_4072-full.webp` → `/images/signals/2026-02-21-sidewalk-freq/IMG_4072-full.webp`

In `003-chinatown-wars.md` (now `2026-03-22-chinatown-wars.md`):

- `/images/signals/003/DSCF1142-full.webp` → `/images/signals/2026-03-22-chinatown-wars/DSCF1142-full.webp`

### Step 6: Update add-signal skill

Rewrite `.agents/skills/add-signal/SKILL.md`:

- **Step 1** ("Next signal ID") → **"Determine date slug"**: from user-provided timestamp (date portion, `.` → `-`) + kebab-slug. No sequence scanning needed.
- **Step 2** ("Optimize photos"): pass the date-slug (not numeric id) as the slug argument to `scripts/optimize-photos.ts`. Output goes to `public/images/signals/<date-slug>/`.
- **Step 3** ("Create the entry file"): `id` frontmatter value is the full date-slug string. File saved as `src/screens/Signals/entries/YYYY-MM-DD-<slug>.md`. Image references in the body use `/images/signals/<date-slug>/…`.

### Step 7: Update AGENTS.md

If the Signals section or any reference mentions `NNN-` naming, update it to `YYYY-MM-DD-<slug>.md`.

### Step 8: Verify

```sh
bun dev          # check list, detail, and image pages render
bun run build    # verify production build succeeds
bun run lint     # no regressions
bun test         # rss tests still pass (they test parsing, not ID values)
```
