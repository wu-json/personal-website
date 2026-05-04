---
status: implemented
---

# Signals collapsed preview shows raw footnote references

## Summary

On the Signals list page (`/signals`), collapsed preview rows show raw GFM footnote reference markers (e.g. `[^ga]`, `[^coke]`) and footnote definition lines as unrendered plain text. This only affects the collapsed teaser path; the detail page and non-collapsed (expanded/short) list rows render footnotes correctly through `MarkdownBody`.

The bug is **latent** with current data — signal `004` has `[^ga]` etc. at byte offset 1162 in the plain body, past the 300-char excerpt cutoff. It will surface immediately when a collapsed signal has footnote references in its first ~300 characters.

## Steps to reproduce

1. Write a signal with `expanded: false` and a body longer than 520 plain-text characters.
2. Place a GFM footnote reference (`[^id]`) within the first ~300 characters of the body.
3. Navigate to `/signals` and observe the preview excerpt.

**Expected:** The excerpt reads naturally — footnote reference markers and definition lines are omitted.

**Actual:** The excerpt contains raw markers like `"The aquarium[^ga] with..."`.

## Root cause

`signalPlainExcerpt` in `src/screens/Signals/preview.ts` strips markdown link syntax (`[text](url)`), backticks, headings, and emphasis characters — but does **not** strip GFM footnote references (`[^id]`) or footnote definition lines (`[^id]: ...`).

Relevant code:

```ts
export function signalPlainExcerpt(body: string, maxLen = 300): string {
  const noImg = body.replace(/<img\s[^>]*\/?>/gi, ' ').trim();
  const plain = noImg
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`#>*_-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // ...
}
```

The detail page and non-collapsed list rows both use `MarkdownBody` (`remark-gfm`), which properly resolves footnotes — so there is no issue in those paths.

## Proposed fix

Add two regex replacements to `signalPlainExcerpt`, in this order (before the `\s+` collapse so whitespace artifacts are cleaned up):

1. **Strip footnote definition lines** (multiline): remove entire lines matching `^\[\^[^\]]+\]:.*$`.
   - This must run first so definition lines don't leave `: text` residue after step 2 strips the `[^id]` portion.
2. **Strip footnote reference markers** (inline): replace `/\[\^[^\]]+\]/g` with empty string.
   - Distinguishable from normal `[bracketed text]` by the `^` immediately after `[`.

Order with existing pipeline:

```ts
const plain = noImg
  .replace(/^\[\^[^\]]+\]:.*$\n?/gm, '') // NEW: strip footnote def lines
  .replace(/\[\^[^\]]+\]/g, '') // NEW: strip footnote ref markers
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // existing: inline links
  .replace(/[`#>*_-]/g, '') // existing: formatting chars
  .replace(/\s+/g, ' ') // existing: collapse whitespace
  .trim();
```

Note on the multiline regex: `\n?` at the end consumes the trailing newline so definitions don't leave blank lines that turn into doubled spaces after whitespace collapse.

## Tests

Add `src/screens/Signals/preview.test.ts` with tests for `signalPlainExcerpt`. Use `bun:test` (`describe`/`it`/`expect`) following the pattern in `src/plugins/rss.test.ts`.

### Test cases

| #   | Description                                                     | Input                                                  | Expected behavior                                    |
| --- | --------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| 1   | Strips inline footnote references                               | `"The aquarium[^ga] is big."`                          | `"The aquarium is big."`                             |
| 2   | Strips multiple footnote refs in one sentence                   | `"A[^1] and B[^2] and C."`                             | `"A and B and C."`                                   |
| 3   | Strips numeric footnote refs                                    | `"See note[^42] for details."`                         | `"See note for details."`                            |
| 4   | Strips footnote ref adjacent to punctuation                     | `"The garden[^abg]."`                                  | `"The garden."` (no doubled space)                   |
| 5   | Strips footnote definition lines                                | `"Body.\n\n[^ga]: https://x.com"`                      | `"Body."`                                            |
| 6   | Strips multiple definition lines                                | `"Body.\n\n[^a]: foo\n[^b]: bar"`                      | `"Body."`                                            |
| 7   | Does not strip normal bracketed text                            | `"See [the docs] online."`                             | `"See [the docs] online."` (unchanged)               |
| 8   | Does not strip markdown links                                   | `"Click [here](https://x.com)"`                        | `"Click here"` (existing behavior, regression guard) |
| 9   | Strips footnotes + defs together                                | `"Foo[^a] bar.\n\n[^a]: baz"`                          | `"Foo bar."`                                         |
| 10  | Late footnote beyond excerpt cutoff with early text < 300 chars | Short body with footnote ref at position 50, maxLen=80 | Footnote is stripped from within the excerpt range   |

## Affected files

- `src/screens/Signals/preview.ts` — `signalPlainExcerpt` function.
